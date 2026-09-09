const asyncHandler = require("express-async-handler");

const {
  handleWebhookTrigger,
} = require("../services/triggerService");

/*
|--------------------------------------------------------------------------
| TRIGGER WEBHOOK
|--------------------------------------------------------------------------
|
| POST /api/webhooks/:token
|
| This endpoint is intentionally public.
|
| The webhook token identifies the workflow.
| An optional X-CortexFlow-Secret header provides an
| additional layer of security.
|
|--------------------------------------------------------------------------
*/

const triggerWebhook = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    res.status(400);
    throw new Error("Webhook token is required.");
  }

  const payload =
    req.body && typeof req.body === "object"
      ? req.body
      : {};

  // Pass the payload and request headers to the trigger service.
  const execution = await handleWebhookTrigger({
    token,
    payload,
    headers: req.headers,
  });

  // The workflow has been accepted and queued.
  // Return 202 instead of waiting for the workflow to finish.
  return res.status(202).json({
    message: "Workflow execution queued.",
    executionId: execution._id,
    workflowId: execution.workflow,
    status: execution.status,
  });
});

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
|
| GET /api/webhooks/health
|
|--------------------------------------------------------------------------
*/

const webhookHealth = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    service: "CortexFlow Webhooks",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  triggerWebhook,
  webhookHealth,
};