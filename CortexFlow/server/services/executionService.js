const Execution = require("../models/Execution");
const Workflow = require("../models/Workflow");

/*
|--------------------------------------------------------------------------
| NORMALIZE ID
|--------------------------------------------------------------------------
*/

const normalizeId = (value) => {
  if (!value) return null;

  if (typeof value === "object" && value._id) {
    return value._id;
  }

  return value;
};


/*
|--------------------------------------------------------------------------
| CREATE QUEUED EXECUTION
|--------------------------------------------------------------------------
|
| Called before a workflow is placed into BullMQ.
|
|--------------------------------------------------------------------------
*/

const createQueuedExecution = async ({
  workflowId,
  ownerId,
  triggerType = "manual",
  input = {},
}) => {
  const workflow = normalizeId(workflowId);
  const owner = normalizeId(ownerId);

  if (!workflow) {
    throw new Error(
      "workflowId is required to create an execution."
    );
  }

  if (!owner) {
    throw new Error(
      "ownerId is required to create an execution."
    );
  }

  const execution = await Execution.create({
    workflow,
    owner,

    triggerType,

    status: "queued",

    input:
      input && typeof input === "object"
        ? input
        : {},

    output: {},

    results: [],

    error: "",

    startedAt: null,

    completedAt: null,

    duration: 0,
  });

  return execution;
};


/*
|--------------------------------------------------------------------------
| MARK EXECUTION RUNNING
|--------------------------------------------------------------------------
*/

const markRunning = async (
  executionId,
  extra = {}
) => {
  const id = normalizeId(executionId);

  if (!id) {
    throw new Error(
      "Execution ID is required."
    );
  }

  const now = new Date();

  const update = {
    status: "running",

    startedAt: now,

    completedAt: null,

    error: "",
  };

  /*
   * Worker can optionally provide BullMQ job ID.
   */

  if (extra.jobId !== undefined) {
    update.jobId = String(
      extra.jobId
    );
  }

  /*
   * IMPORTANT:
   *
   * findOneAndUpdate is used instead of:
   *
   * execution.status = ...
   * await execution.save()
   *
   * This prevents Mongoose VersionError problems when multiple
   * node callbacks update the execution at nearly the same time.
   */

  const execution =
    await Execution.findByIdAndUpdate(
      id,
      {
        $set: update,
      },
      {
        returnDocument: "after",
      }
    );

  if (!execution) {
    throw new Error(
      `Execution ${id} was not found.`
    );
  }

  return execution;
};


/*
|--------------------------------------------------------------------------
| NORMALIZE NODE RESULT
|--------------------------------------------------------------------------
*/

const normalizeNodeResult = (
  result = {}
) => {
  const startedAt =
    result.startedAt
      ? new Date(result.startedAt)
      : null;

  const completedAt =
    result.completedAt
      ? new Date(result.completedAt)
      : null;

  let duration =
    Number(result.duration) || 0;

  if (
    !duration &&
    startedAt &&
    completedAt
  ) {
    duration =
      completedAt.getTime() -
      startedAt.getTime();
  }

  return {
    nodeId:
      String(result.nodeId || ""),

    nodeType:
      result.nodeType ||
      "custom",

    kind:
      result.kind ||
      "",

    key:
      result.key ||
      "",

    label:
      result.label ||
      "Untitled Node",

    status:
      result.status ||
      "pending",

    order:
      Number.isFinite(
        Number(result.order)
      )
        ? Number(result.order)
        : 0,

    attempts:
      Number(result.attempts) || 1,

    startedAt,

    completedAt,

    duration,

    input:
      result.input &&
      typeof result.input ===
        "object"
        ? result.input
        : {},

    output:
      result.output &&
      typeof result.output ===
        "object"
        ? result.output
        : {},

    error:
      result.error
        ? String(result.error)
        : "",
  };
};


/*
|--------------------------------------------------------------------------
| UPSERT NODE RESULT
|--------------------------------------------------------------------------
|
| The previous implementation could load an Execution document,
| change results[], and save it.
|
| If AI/logic callbacks updated results concurrently, Mongoose
| could throw:
|
| No matching document found ... version ... modifiedPaths ...
|
| We avoid that by updating MongoDB atomically.
|
|--------------------------------------------------------------------------
*/

const upsertNodeResult = async (
  executionId,
  nodeResult
) => {
  const id = normalizeId(executionId);

  if (!id) {
    throw new Error(
      "Execution ID is required."
    );
  }

  if (!nodeResult?.nodeId) {
    throw new Error(
      "nodeId is required when saving a node result."
    );
  }

  const normalized =
    normalizeNodeResult(
      nodeResult
    );


  /*
  |--------------------------------------------------------------------------
  | TRY TO UPDATE EXISTING NODE RESULT
  |--------------------------------------------------------------------------
  |
  | This matches:
  |
  | results: [
  |   {
  |     nodeId: "node-123"
  |   }
  | ]
  |
  */

  const existingUpdate =
    await Execution.updateOne(
      {
        _id: id,

        "results.nodeId":
          normalized.nodeId,
      },

      {
        $set: {
          "results.$":
            normalized,
        },
      }
    );


  /*
  |--------------------------------------------------------------------------
  | EXISTING RESULT UPDATED
  |--------------------------------------------------------------------------
  */

  if (
    existingUpdate.matchedCount > 0
  ) {
    return Execution.findById(
      id
    ).lean();
  }


  /*
  |--------------------------------------------------------------------------
  | RESULT DOES NOT EXIST YET
  |--------------------------------------------------------------------------
  |
  | Only push when that nodeId is still absent.
  |
  | Adding the "results.nodeId": { $ne: ... } condition protects
  | us if two callbacks reach this point at almost the same time.
  |
  */

  const insertUpdate =
    await Execution.updateOne(
      {
        _id: id,

        "results.nodeId": {
          $ne: normalized.nodeId,
        },
      },

      {
        $push: {
          results:
            normalized,
        },
      }
    );


  /*
  |--------------------------------------------------------------------------
  | EXECUTION MUST EXIST
  |--------------------------------------------------------------------------
  */

  if (
    existingUpdate.matchedCount ===
      0 &&
    insertUpdate.matchedCount ===
      0
  ) {
    /*
     * matchedCount can also be zero if another callback inserted the
     * node between the two operations. Check that the execution itself
     * still exists before treating that situation as an error.
     */

    const exists =
      await Execution.exists({
        _id: id,
      });

    if (!exists) {
      throw new Error(
        `Execution ${id} was not found.`
      );
    }
  }


  return Execution.findById(
    id
  ).lean();
};


/*
|--------------------------------------------------------------------------
| FINALIZE EXECUTION
|--------------------------------------------------------------------------
|
| Called when the workflow finishes or fails.
|
|--------------------------------------------------------------------------
*/

const finalizeExecution = async (
  executionId,
  {
    status = "success",
    output = {},
    error = "",
    results = null,
  } = {}
) => {
  const id = normalizeId(executionId);

  if (!id) {
    throw new Error(
      "Execution ID is required."
    );
  }


  /*
  |--------------------------------------------------------------------------
  | READ START TIME
  |--------------------------------------------------------------------------
  |
  | We only read the minimum information needed to calculate duration.
  |
  */

  const currentExecution =
    await Execution.findById(id)
      .select(
        "startedAt workflow owner status"
      )
      .lean();

  if (!currentExecution) {
    throw new Error(
      `Execution ${id} was not found.`
    );
  }


  const completedAt =
    new Date();

  const startedAt =
    currentExecution.startedAt
      ? new Date(
          currentExecution.startedAt
        )
      : completedAt;

  const duration =
    Math.max(
      0,
      completedAt.getTime() -
        startedAt.getTime()
    );


  /*
  |--------------------------------------------------------------------------
  | BUILD FINAL UPDATE
  |--------------------------------------------------------------------------
  */

  const finalUpdate = {
    status,

    completedAt,

    duration,

    output:
      output &&
      typeof output === "object"
        ? output
        : {},

    error:
      error
        ? String(error)
        : "",
  };


  /*
   * Usually node results have already been written by
   * upsertNodeResult().
   *
   * Only replace the full results array when the workflow engine
   * explicitly provides one.
   */

  if (Array.isArray(results)) {
    finalUpdate.results =
      results.map(
        normalizeNodeResult
      );
  }


  /*
  |--------------------------------------------------------------------------
  | ATOMIC EXECUTION UPDATE
  |--------------------------------------------------------------------------
  */

  const execution =
    await Execution.findByIdAndUpdate(
      id,

      {
        $set:
          finalUpdate,
      },

      {
        returnDocument: "after",
      }
    );

  if (!execution) {
    throw new Error(
      `Execution ${id} could not be finalized.`
    );
  }


  /*
  |--------------------------------------------------------------------------
  | UPDATE WORKFLOW ANALYTICS
  |--------------------------------------------------------------------------
  |
  | Examples:
  |
  | totalExecutions
  | successfulExecutions
  | failedExecutions
  | lastRunAt
  |
  */

  const workflowId =
    normalizeId(
      currentExecution.workflow
    );

  if (workflowId) {
    const increments = {
      totalExecutions: 1,
    };

    if (status === "success") {
      increments.successfulExecutions =
        1;
    }

    if (status === "failed") {
      increments.failedExecutions =
        1;
    }

    await Workflow.updateOne(
      {
        _id: workflowId,
      },

      {
        $inc:
          increments,

        $set: {
          lastRunAt:
            completedAt,
        },
      }
    ).catch((workflowError) => {
      /*
       * Execution logging should still succeed even if analytics
       * counters fail.
       */

      console.error(
        `[executionService] Workflow statistics update failed: ${workflowError.message}`
      );
    });
  }


  return execution;
};


/*
|--------------------------------------------------------------------------
| GET EXECUTION
|--------------------------------------------------------------------------
*/

const getExecution = async (
  executionId
) => {
  const id =
    normalizeId(executionId);

  if (!id) {
    return null;
  }

  return Execution.findById(id)
    .populate(
      "workflow",
      "name status trigger"
    )
    .lean();
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createQueuedExecution,

  markRunning,

  upsertNodeResult,

  finalizeExecution,

  getExecution,
};