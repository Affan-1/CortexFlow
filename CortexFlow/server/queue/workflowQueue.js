const { Queue } = require("bullmq");
const { getConnection } = require("./connection");

/*
|--------------------------------------------------------------------------
| Workflow Execution Queue
|--------------------------------------------------------------------------
|
| Every workflow run — manual, webhook, schedule, or event — goes
| through this single queue. A separate worker process (worker.js)
| consumes jobs so execution never depends on the API request or
| the user's browser staying open.
|
*/

const QUEUE_NAME = "workflow-execution";

let queue;

const getWorkflowQueue = () => {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getConnection() });
  }

  return queue;
};

/*
 * Enqueues one workflow run. `executionId` is a pre-created
 * Execution document's _id, so the API can return it to the
 * client immediately while the worker fills in results.
 */
const enqueueWorkflowRun = async ({
  workflowId,
  ownerId,
  executionId,
  input = {},
  triggerType = "manual",
}) => {
  const job = await getWorkflowQueue().add(
    "run-workflow",
    { workflowId, ownerId, executionId, input, triggerType },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 7 * 24 * 3600, count: 1000 },
      removeOnFail: { age: 30 * 24 * 3600 },
    }
  );

  return job;
};

module.exports = {
  QUEUE_NAME,
  getWorkflowQueue,
  enqueueWorkflowRun,
};
