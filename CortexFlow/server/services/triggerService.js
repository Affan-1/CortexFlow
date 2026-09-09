const crypto = require("crypto");

const Workflow = require("../models/Workflow");
const {
  getWorkflowQueue,
  enqueueWorkflowRun,
} = require("../queue/workflowQueue");

const { createQueuedExecution } = require("./executionService");

/*
|--------------------------------------------------------------------------
| CortexFlow Trigger Service
|--------------------------------------------------------------------------
|
| Supported trigger types:
|
| 1. manual
| 2. webhook
| 3. schedule
| 4. event
|
| Normal execution flow:
|
| Trigger
|   ↓
| Create Execution
|   ↓
| BullMQ
|   ↓
| Redis
|   ↓
| Worker
|   ↓
| Workflow Engine
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| RUN WORKFLOW FROM ANY TRIGGER
|--------------------------------------------------------------------------
|
| Manual and webhook/event executions create their Execution document
| immediately so the frontend can display the queued execution.
|
| Scheduled executions are different:
| BullMQ creates a repeatable job and the worker creates a new
| Execution document for every individual schedule tick.
|--------------------------------------------------------------------------
*/

const runWorkflowFromTrigger = async ({
  workflow,
  triggerType = "manual",
  input = {},
}) => {
  if (!workflow) {
    const error = new Error("Workflow is required.");
    error.statusCode = 400;
    throw error;
  }

  if (!workflow._id) {
    const error = new Error("Workflow ID is missing.");
    error.statusCode = 400;
    throw error;
  }

  if (!workflow.owner) {
    const error = new Error("Workflow owner is missing.");
    error.statusCode = 400;
    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | Create execution record
  |--------------------------------------------------------------------------
  */

  const execution = await createQueuedExecution({
    workflowId: workflow._id,
    ownerId: workflow.owner,
    triggerType,
    input,
  });

  /*
  |--------------------------------------------------------------------------
  | Add execution job to BullMQ
  |--------------------------------------------------------------------------
  */

  try {
    const job = await enqueueWorkflowRun({
      workflowId: workflow._id,
      ownerId: workflow.owner,
      executionId: execution._id,
      input,
      triggerType,
    });

    execution.jobId = String(job.id);

    await execution.save();

    return execution;
  } catch (error) {
    /*
     * If queue insertion fails, don't leave a permanently queued
     * execution behind.
     */

    execution.status = "failed";
    execution.error = error.message;
    execution.completedAt = new Date();

    if (execution.startedAt) {
      execution.duration = execution.completedAt - execution.startedAt;
    }

    await execution.save();

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| WEBHOOK TOKEN / SECRET
|--------------------------------------------------------------------------
*/

const generateWebhookToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

const generateWebhookSecret = () => {
  return crypto.randomBytes(24).toString("hex");
};

/*
|--------------------------------------------------------------------------
| WEBHOOK TRIGGER
|--------------------------------------------------------------------------
|
| Public endpoint:
|
| POST /api/webhooks/:token
|
| Optional security:
|
| X-CortexFlow-Secret: <secret>
|--------------------------------------------------------------------------
*/

const handleWebhookTrigger = async ({ token, payload = {}, headers = {} }) => {
  if (!token) {
    const error = new Error("Webhook token is required.");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Find workflow using the webhook token.
   */

  const workflow = await Workflow.findOne({
    "trigger.type": "webhook",
    "trigger.webhook.token": token,
  });

  if (!workflow) {
    const error = new Error("No workflow is registered for this webhook.");

    error.statusCode = 404;

    throw error;
  }

  /*
   * Only active workflows can receive webhook executions.
   */

  if (workflow.status !== "Active") {
    const error = new Error("This workflow's webhook trigger is not active.");

    error.statusCode = 409;

    throw error;
  }

  /*
   * Optional secret validation.
   */

  const secret = workflow.trigger?.webhook?.secret;

  if (secret) {
    const providedSecret =
      headers["x-cortexflow-secret"] || headers["X-CortexFlow-Secret"];

    if (!providedSecret || providedSecret !== secret) {
      const error = new Error("Invalid webhook secret.");

      error.statusCode = 401;

      throw error;
    }
  }

  /*
   * Queue workflow execution.
   */

  return runWorkflowFromTrigger({
    workflow,
    triggerType: "webhook",
    input: {
      payload,
      headers,
    },
  });
};

/*
|--------------------------------------------------------------------------
| SCHEDULE TRIGGERS
|--------------------------------------------------------------------------
*/

const scheduleJobName = (workflowId) => {
  return `schedule:${String(workflowId)}`;
};

/*
|--------------------------------------------------------------------------
| REGISTER SCHEDULE
|--------------------------------------------------------------------------
|
| A repeatable BullMQ job is registered here.
|
| IMPORTANT:
| We intentionally DO NOT create an Execution document here.
|
| The repeatable job runs many times.
| The worker creates a fresh Execution for every tick.
|--------------------------------------------------------------------------
*/

const registerSchedule = async (workflow) => {
  if (!workflow) {
    throw new Error("Workflow is required.");
  }

  const cron = workflow.trigger?.schedule?.cron;

  if (!cron) {
    return;
  }

  const queue = getWorkflowQueue();

  /*
   * Remove previous schedule first.
   */

  await removeSchedule(workflow);

  const jobName = scheduleJobName(workflow._id);

  /*
   * Register repeatable BullMQ job.
   */

  const repeatableJob = await queue.add(
    "run-workflow",
    {
      workflowId: workflow._id,
      ownerId: workflow.owner,

      /*
       * No executionId here.
       *
       * The worker detects the missing executionId and creates
       * a new Execution for every schedule tick.
       */

      input: {},
      triggerType: "schedule",
      scheduled: true,
    },
    {
      repeat: {
        pattern: cron,
        tz: workflow.trigger?.schedule?.timezone || "UTC",
      },

      jobId: jobName,
    },
  );

  /*
   * BullMQ can expose a repeatJobKey.
   * Save it so the schedule can later be removed.
   */

  workflow.scheduleJobKey = repeatableJob.repeatJobKey || jobName;

  await workflow.save();

  return repeatableJob;
};

/*
|--------------------------------------------------------------------------
| REMOVE SCHEDULE
|--------------------------------------------------------------------------
*/

const removeSchedule = async (workflow) => {
  if (!workflow) {
    return;
  }

  if (!workflow.scheduleJobKey) {
    return;
  }

  const queue = getWorkflowQueue();

  try {
    await queue.removeRepeatableByKey(workflow.scheduleJobKey);
  } catch (error) {
    /*
     * The schedule may already have been removed from
     * BullMQ. We don't want that to break workflow deletion.
     */

    console.warn(
      `Could not remove schedule for workflow ${workflow._id}: ${error.message}`,
    );
  }

  workflow.scheduleJobKey = null;
};

/*
|--------------------------------------------------------------------------
| SYNCHRONIZE TRIGGER
|--------------------------------------------------------------------------
|
| Called after workflow creation/update.
|
| Examples:
|
| Active + Schedule
|      ↓
| Register BullMQ schedule
|
| Paused + Schedule
|      ↓
| Remove BullMQ schedule
|
| Active + Webhook
|      ↓
| Ensure webhook token exists
|--------------------------------------------------------------------------
*/

const syncTrigger = async (workflow) => {
  if (!workflow) {
    throw new Error("Workflow is required.");
  }

  const triggerType = workflow.trigger?.type || "manual";

  const isActive = workflow.status === "Active";

  /*
   |--------------------------------------------------------------------------
   | SCHEDULE
   |--------------------------------------------------------------------------
   */

  if (
    triggerType === "schedule" &&
    isActive &&
    workflow.trigger?.schedule?.cron
  ) {
    await registerSchedule(workflow);
  } else if (workflow.scheduleJobKey) {
    /*
     * Workflow is no longer an active scheduled workflow.
     */

    await removeSchedule(workflow);

    await workflow.save();
  }

  /*
   |--------------------------------------------------------------------------
   | WEBHOOK
   |--------------------------------------------------------------------------
   */

  if (triggerType === "webhook") {
    if (!workflow.trigger) {
      workflow.trigger = {
        type: "webhook",
      };
    }

    if (!workflow.trigger.webhook) {
      workflow.trigger.webhook = {};
    }

    /*
     * Generate token only when one doesn't already exist.
     */

    let webhookChanged = false;

    if (!workflow.trigger.webhook.token) {
      workflow.trigger.webhook.token = generateWebhookToken();

      webhookChanged = true;
    }

    if (!workflow.trigger.webhook.secret) {
      workflow.trigger.webhook.secret = generateWebhookSecret();

      webhookChanged = true;
    }

    if (webhookChanged) {
      await workflow.save();
    }
  }
};

/*
|--------------------------------------------------------------------------
| INTERNAL EVENT TRIGGERS
|--------------------------------------------------------------------------
|
| Example:
|
| emitEvent(
|   "contact.created",
|   {
|     name: "John",
|     email: "john@example.com"
|   }
| );
|
| Every active workflow listening for that event is queued.
|--------------------------------------------------------------------------
*/

const emitEvent = async (eventName, payload = {}) => {
  if (!eventName) {
    const error = new Error("Event name is required.");

    error.statusCode = 400;

    throw error;
  }

  /*
   * Find all active workflows subscribed to this event.
   */

  const workflows = await Workflow.find({
    status: "Active",
    "trigger.type": "event",
    "trigger.event.name": eventName,
  });

  /*
   * Nothing subscribed to this event.
   */

  if (!workflows.length) {
    return [];
  }

  /*
   * Queue every matching workflow.
   */

  const executions = await Promise.all(
    workflows.map((workflow) =>
      runWorkflowFromTrigger({
        workflow,
        triggerType: "event",
        input: {
          event: eventName,
          payload,
        },
      }),
    ),
  );

  return executions;
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  runWorkflowFromTrigger,

  generateWebhookToken,
  generateWebhookSecret,

  handleWebhookTrigger,

  registerSchedule,
  removeSchedule,
  syncTrigger,

  emitEvent,
};
