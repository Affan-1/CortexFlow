// -----------------------------------------------------------------------------
// CortexFlow Workflow Worker
// -----------------------------------------------------------------------------
//
// Flow:
//
// Frontend
//    ↓
// Express API
//    ↓
// BullMQ Queue
//    ↓
// Redis
//    ↓
// THIS WORKER
//    ↓
// Workflow Engine
//    ↓
// AI / Logic / Integrations
//
// This process also exposes a tiny HTTP health endpoint so platforms such as
// Back4App can verify that the worker container is alive.
//
// -----------------------------------------------------------------------------

require("dotenv").config();

const http = require("http");
const { Worker } = require("bullmq");

const connectDB = require("../config/db");
const { getConnection } = require("./connection");
const { QUEUE_NAME } = require("./workflowQueue");

const Workflow = require("../models/Workflow");

const {
  executeWorkflow,
} = require("../services/workflowEngine");

const {
  createQueuedExecution,
  markRunning,
  upsertNodeResult,
  finalizeExecution,
} = require("../services/executionService");


// -----------------------------------------------------------------------------
// WORKER SETTINGS
// -----------------------------------------------------------------------------

const CONCURRENCY =
  Number(process.env.WORKER_CONCURRENCY) || 5;


// Back4App provides PORT automatically.
// Locally the worker will use 8080 unless WORKER_HEALTH_PORT is provided.
const HEALTH_PORT =
  Number(
    process.env.WORKER_HEALTH_PORT ||
    process.env.PORT
  ) || 8080;


// -----------------------------------------------------------------------------
// HEALTH SERVER
// -----------------------------------------------------------------------------

let healthServer = null;

let workerState = {
  status: "starting",
  mongoConnected: false,
  redisConnected: false,
  startedAt: new Date().toISOString(),
};


// Start a tiny HTTP server.
//
// Back4App checks whether something is listening on its assigned PORT.
// The BullMQ worker itself does not expose HTTP, so this server exists only
// for container health checks.
const startHealthServer = () => {
  healthServer = http.createServer((req, res) => {
    if (
      req.url === "/" ||
      req.url === "/health"
    ) {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });

      res.end(
        JSON.stringify({
          status: workerState.status,
          service: "CortexFlow Worker",
          mongoConnected:
            workerState.mongoConnected,
          redisConnected:
            workerState.redisConnected,
          queue: QUEUE_NAME,
          concurrency: CONCURRENCY,
          startedAt: workerState.startedAt,
          timestamp: new Date().toISOString(),
        })
      );

      return;
    }


    res.writeHead(404, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        message: "Not Found",
      })
    );
  });


  healthServer.listen(
    HEALTH_PORT,
    "0.0.0.0",
    () => {
      console.log(
        `[worker] Health server listening on port ${HEALTH_PORT}`
      );
    }
  );


  healthServer.on(
    "error",
    (error) => {
      console.error(
        `[worker] Health server error: ${error.message}`
      );
    }
  );
};


// -----------------------------------------------------------------------------
// PROCESS ONE JOB
// -----------------------------------------------------------------------------

const processJob = async (job) => {
  const {
    workflowId,
    ownerId,
    input = {},
    triggerType = "manual",
    scheduled = false,
  } = job.data || {};


  let executionId =
    job.data?.executionId || null;


  console.log(
    `[worker] Starting job ${job.id} | workflow=${workflowId} | trigger=${triggerType} | attempt=${job.attemptsMade + 1}`
  );


  // ---------------------------------------------------------------------------
  // VALIDATE JOB DATA
  // ---------------------------------------------------------------------------

  if (!workflowId) {
    throw new Error(
      "Workflow ID is missing from queue job."
    );
  }


  if (!ownerId) {
    throw new Error(
      "Workflow owner ID is missing from queue job."
    );
  }


  // ---------------------------------------------------------------------------
  // LOAD WORKFLOW
  // ---------------------------------------------------------------------------

  const workflow = await Workflow.findOne({
    _id: workflowId,
    owner: ownerId,
  });


  if (!workflow) {
    throw new Error(
      "Workflow no longer exists or access was denied."
    );
  }


  // ---------------------------------------------------------------------------
  // CHECK WORKFLOW STATUS
  // ---------------------------------------------------------------------------

  // Scheduled jobs may remain in Redis briefly after a workflow has been
  // paused/deleted. Don't execute inactive scheduled workflows.

  if (
    scheduled &&
    workflow.status !== "Active"
  ) {
    console.log(
      `[worker] Skipping scheduled job ${job.id} because workflow is ${workflow.status}`
    );


    return {
      status: "skipped",
      reason: "Workflow is not active.",
    };
  }


  // ---------------------------------------------------------------------------
  // CREATE EXECUTION
  // ---------------------------------------------------------------------------

  // Manual/webhook/event executions normally already have an execution
  // document created by the API.
  //
  // Schedule jobs need a fresh execution document for every tick.

  if (!executionId) {
    const execution =
      await createQueuedExecution({
        workflowId: workflow._id,
        ownerId: workflow.owner,
        triggerType:
          triggerType || "schedule",
        input: input || {},
      });


    executionId = execution._id;
  }


  // ---------------------------------------------------------------------------
  // MARK EXECUTION AS RUNNING
  // ---------------------------------------------------------------------------

  await markRunning(
    executionId,
    {
      jobId: String(job.id),
    }
  );


  // ---------------------------------------------------------------------------
  // EXECUTE WORKFLOW
  // ---------------------------------------------------------------------------

  try {
    const executionResult =
      await executeWorkflow({
        workflowId: workflow._id,
        ownerId: workflow.owner,
        input: input || {},


        // ---------------------------------------------------------------------
        // NODE START CALLBACK
        // ---------------------------------------------------------------------

        onNodeStart: async ({
          node,
          order,
        }) => {
          await upsertNodeResult(
            executionId,
            {
              nodeId: node.id,

              nodeType:
                node.type || "custom",

              kind:
                node.data?.kind ||
                "action",

              key:
                node.data?.key ||
                "",

              label:
                node.data?.label ||
                "Untitled Node",

              status: "running",

              order,

              startedAt: new Date(),

              input: {},

              output: {},
            }
          ).catch((error) => {
            console.error(
              `[worker] Could not update node start: ${error.message}`
            );
          });
        },


        // ---------------------------------------------------------------------
        // NODE COMPLETE CALLBACK
        // ---------------------------------------------------------------------

        onNodeComplete: async (
          resultRecord
        ) => {
          await upsertNodeResult(
            executionId,
            resultRecord
          ).catch((error) => {
            console.error(
              `[worker] Could not update node result: ${error.message}`
            );
          });
        },
      });


    // -------------------------------------------------------------------------
    // FINALIZE SUCCESS
    // -------------------------------------------------------------------------

    await finalizeExecution(
      executionId,
      {
        status: "success",

        output:
          executionResult?.output ||
          {},

        results:
          executionResult?.results ||
          null,
      }
    );


    console.log(
      `[worker] Job ${job.id} completed successfully`
    );


    return {
      status: "success",
      executionId:
        String(executionId),
    };
  } catch (error) {

    // -------------------------------------------------------------------------
    // FINALIZE FAILED EXECUTION
    // -------------------------------------------------------------------------

    await finalizeExecution(
      executionId,
      {
        status: "failed",

        error:
          error.message ||
          "Workflow execution failed.",

        output:
          error.output ||
          {},

        results:
          error.results ||
          null,
      }
    ).catch((finalizeError) => {
      console.error(
        `[worker] Failed to finalize execution: ${finalizeError.message}`
      );
    });


    console.error(
      `[worker] Job ${job.id} failed: ${error.message}`
    );


    // Re-throw so BullMQ retries according to queue settings.
    throw error;
  }
};


// -----------------------------------------------------------------------------
// START WORKER
// -----------------------------------------------------------------------------

const startWorker = async () => {
  let worker = null;


  try {

    // -------------------------------------------------------------------------
    // START HEALTH SERVER
    // -------------------------------------------------------------------------

    // Start this early so Back4App has a listening HTTP port while the worker
    // establishes MongoDB/Redis connections.

    startHealthServer();


    // -------------------------------------------------------------------------
    // CONNECT DATABASE
    // -------------------------------------------------------------------------

    console.log(
      "[worker] Connecting to MongoDB..."
    );


    await connectDB();


    workerState.mongoConnected = true;


    console.log(
      "[worker] MongoDB connection ready."
    );


    // -------------------------------------------------------------------------
    // CREATE BULLMQ WORKER
    // -------------------------------------------------------------------------

    worker = new Worker(
      QUEUE_NAME,
      processJob,
      {
        connection: getConnection(),

        concurrency:
          CONCURRENCY,

        // Prevent longer AI/API operations from being marked stalled too soon.
        stalledInterval: 30000,

        maxStalledCount: 2,
      }
    );


    // -------------------------------------------------------------------------
    // WORKER READY
    // -------------------------------------------------------------------------

    worker.on(
      "ready",
      () => {
        workerState.redisConnected = true;
        workerState.status = "ready";


        console.log(
          `[worker] Connected to Redis and listening on "${QUEUE_NAME}"`
        );


        console.log(
          `[worker] Concurrency: ${CONCURRENCY}`
        );


        console.log(
          `[worker] Health endpoint: http://0.0.0.0:${HEALTH_PORT}/health`
        );
      }
    );


    // -------------------------------------------------------------------------
    // COMPLETED
    // -------------------------------------------------------------------------

    worker.on(
      "completed",
      (job) => {
        console.log(
          `[worker] Job ${job.id} completed`
        );
      }
    );


    // -------------------------------------------------------------------------
    // FAILED
    // -------------------------------------------------------------------------

    worker.on(
      "failed",
      (job, error) => {
        console.error(
          `[worker] Job ${job?.id || "unknown"} failed: ${error.message}`
        );
      }
    );


    // -------------------------------------------------------------------------
    // STALLED
    // -------------------------------------------------------------------------

    worker.on(
      "stalled",
      (jobId) => {
        console.warn(
          `[worker] Job ${jobId} stalled and will be retried`
        );
      }
    );


    // -------------------------------------------------------------------------
    // ERROR
    // -------------------------------------------------------------------------

    worker.on(
      "error",
      (error) => {
        workerState.redisConnected = false;
        workerState.status = "degraded";


        console.error(
          `[worker] Worker error: ${error.message}`
        );
      }
    );


    // -------------------------------------------------------------------------
    // GRACEFUL SHUTDOWN
    // -------------------------------------------------------------------------

    const shutdown = async (
      signal
    ) => {
      console.log(
        `[worker] ${signal} received. Shutting down...`
      );


      workerState.status = "stopping";


      try {

        // Stop accepting new BullMQ jobs.
        if (worker) {
          await worker.close();


          console.log(
            "[worker] Worker closed successfully."
          );
        }


        // Stop HTTP health server.
        if (healthServer) {
          await new Promise(
            (resolve) => {
              healthServer.close(
                () => resolve()
              );
            }
          );


          console.log(
            "[worker] Health server closed successfully."
          );
        }


        process.exit(0);

      } catch (error) {
        console.error(
          `[worker] Shutdown error: ${error.message}`
        );


        process.exit(1);
      }
    };


    process.once(
      "SIGINT",
      () => shutdown("SIGINT")
    );


    process.once(
      "SIGTERM",
      () => shutdown("SIGTERM")
    );


  } catch (error) {

    workerState.status = "failed";


    console.error(
      "[worker] Failed to start:",
      error
    );


    if (healthServer) {
      healthServer.close(
        () => {
          process.exit(1);
        }
      );


      return;
    }


    process.exit(1);
  }
};


// -----------------------------------------------------------------------------
// BOOT
// -----------------------------------------------------------------------------

startWorker();