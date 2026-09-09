// *
// |--------------------------------------------------------------------------
// | CortexFlow Workflow Worker
// |--------------------------------------------------------------------------
// |
// | This file runs as a separate Node.js process.
// |
// | Flow:
// |
// | Frontend
// |    ↓
// | Express API
// |    ↓
// | BullMQ Queue
// |    ↓
// | Redis
// |    ↓
// | THIS WORKER
// |    ↓
// | Workflow Engine
// |    ↓
// | AI / Logic / Integrations
// |
// |--------------------------------------------------------------------------
// */

require("dotenv").config();

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


/*
|--------------------------------------------------------------------------
| WORKER SETTINGS
|--------------------------------------------------------------------------
*/

const CONCURRENCY =
  Number(process.env.WORKER_CONCURRENCY) || 5;


/*
|--------------------------------------------------------------------------
| PROCESS ONE JOB
|--------------------------------------------------------------------------
*/

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


  /*
  |--------------------------------------------------------------------------
  | VALIDATE JOB DATA
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | LOAD WORKFLOW
  |--------------------------------------------------------------------------
  */

  const workflow = await Workflow.findOne({
    _id: workflowId,
    owner: ownerId,
  });

  if (!workflow) {
    throw new Error(
      "Workflow no longer exists or access was denied."
    );
  }


  /*
  |--------------------------------------------------------------------------
  | CHECK WORKFLOW STATUS
  |--------------------------------------------------------------------------
  |
  | Scheduled jobs can remain in Redis for a short period after a
  | workflow is paused/deleted.
  |
  | Don't execute an inactive scheduled workflow.
  |
  */

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


  /*
  |--------------------------------------------------------------------------
  | CREATE EXECUTION FOR SCHEDULED JOBS
  |--------------------------------------------------------------------------
  |
  | Manual/webhook/event executions already have an execution
  | document created by the API.
  |
  | Schedule jobs are repeatable BullMQ jobs, so every schedule
  | tick needs a brand-new Execution document.
  |
  */

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


  /*
  |--------------------------------------------------------------------------
  | MARK EXECUTION AS RUNNING
  |--------------------------------------------------------------------------
  */

  await markRunning(
    executionId,
    {
      jobId: String(job.id),
    }
  );


  /*
  |--------------------------------------------------------------------------
  | EXECUTE WORKFLOW
  |--------------------------------------------------------------------------
  */

  try {
    const executionResult =
      await executeWorkflow({
        workflowId: workflow._id,
        ownerId: workflow.owner,
        input: input || {},

        /*
        |--------------------------------------------------------------------------
        | NODE START CALLBACK
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | NODE COMPLETE CALLBACK
        |--------------------------------------------------------------------------
        */

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


    /*
    |--------------------------------------------------------------------------
    | FINALIZE SUCCESS
    |--------------------------------------------------------------------------
    */

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
      executionId: String(executionId),
    };
  } catch (error) {

    /*
    |--------------------------------------------------------------------------
    | FINALIZE FAILED EXECUTION
    |--------------------------------------------------------------------------
    |
    | Keep partial results so the Executions page can show which
    | nodes completed before the failure.
    |
    */

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


    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    |
    | Re-throwing allows BullMQ to apply:
    |
    | attempts: 3
    | exponential backoff
    |
    */

    throw error;
  }
};


/*
|--------------------------------------------------------------------------
| START WORKER
|--------------------------------------------------------------------------
*/

const startWorker = async () => {
  try {

    /*
    |--------------------------------------------------------------------------
    | CONNECT DATABASE
    |--------------------------------------------------------------------------
    */

    await connectDB();


    /*
    |--------------------------------------------------------------------------
    | CREATE BULLMQ WORKER
    |--------------------------------------------------------------------------
    */

    const worker = new Worker(
      QUEUE_NAME,
      processJob,
      {
        connection: getConnection(),

        concurrency:
          CONCURRENCY,

        /*
         * Prevent a job from being considered stalled too quickly
         * during longer AI/API operations.
         */

        stalledInterval: 30000,

        maxStalledCount: 2,
      }
    );


    /*
    |--------------------------------------------------------------------------
    | WORKER READY
    |--------------------------------------------------------------------------
    */

    worker.on(
      "ready",
      () => {
        console.log(
          `[worker] Connected to Redis and listening on "${QUEUE_NAME}"`
        );

        console.log(
          `[worker] Concurrency: ${CONCURRENCY}`
        );
      }
    );


    /*
    |--------------------------------------------------------------------------
    | COMPLETED
    |--------------------------------------------------------------------------
    */

    worker.on(
      "completed",
      (job) => {
        console.log(
          `[worker] Job ${job.id} completed`
        );
      }
    );


    /*
    |--------------------------------------------------------------------------
    | FAILED
    |--------------------------------------------------------------------------
    */

    worker.on(
      "failed",
      (job, error) => {
        console.error(
          `[worker] Job ${job?.id || "unknown"} failed: ${error.message}`
        );
      }
    );


    /*
    |--------------------------------------------------------------------------
    | STALLED
    |--------------------------------------------------------------------------
    */

    worker.on(
      "stalled",
      (jobId) => {
        console.warn(
          `[worker] Job ${jobId} stalled and will be retried`
        );
      }
    );


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    worker.on(
      "error",
      (error) => {
        console.error(
          `[worker] Worker error: ${error.message}`
        );
      }
    );


    /*
    |--------------------------------------------------------------------------
    | GRACEFUL SHUTDOWN
    |--------------------------------------------------------------------------
    */

    const shutdown = async (
      signal
    ) => {
      console.log(
        `[worker] ${signal} received. Shutting down...`
      );

      try {
        await worker.close();

        console.log(
          "[worker] Worker closed successfully."
        );

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

    console.error(
      "[worker] Failed to start:",
      error
    );

    process.exit(1);
  }
};


/*
|--------------------------------------------------------------------------
| BOOT
|--------------------------------------------------------------------------
*/

startWorker();