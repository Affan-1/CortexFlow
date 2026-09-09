const mongoose = require("mongoose");
const Workflow = require("../models/Workflow");
const {
  syncTrigger,
  removeSchedule,
  generateWebhookToken,
  generateWebhookSecret,
} = require("../services/triggerService");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeNodes = (nodes) => {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((node) => ({
    id: node.id,
    type: node.type || "custom",
    position: {
      x: Number(node.position?.x) || 0,
      y: Number(node.position?.y) || 0,
    },
    data: {
      label: node.data?.label || "Untitled Node",
      kind: node.data?.kind || "action",
      key: node.data?.key || "",
      config: node.data?.config || {},
    },
  }));
};

const normalizeEdges = (edges) => {
  if (!Array.isArray(edges)) return [];

  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || null,
    branch: edge.branch || edge.sourceHandle || null,
    label: edge.label || "",
  }));
};

const ALLOWED_TRIGGER_TYPES = ["manual", "webhook", "schedule", "event"];

const normalizeTrigger = (trigger, existing = {}) => {
  if (!trigger || typeof trigger !== "object") {
    return existing;
  }

  const type = ALLOWED_TRIGGER_TYPES.includes(trigger.type)
    ? trigger.type
    : existing.type || "manual";

  const incomingSecret = trigger.webhook?.secret;

  const preservedSecret =
    typeof incomingSecret === "string" && incomingSecret.trim()
      ? incomingSecret.trim()
      : existing.webhook?.secret || null;

  return {
    type,

    schedule: {
      cron: trigger.schedule?.cron ?? existing.schedule?.cron ?? null,

      timezone:
        trigger.schedule?.timezone ?? existing.schedule?.timezone ?? "UTC",
    },

    webhook: {
      token: existing.webhook?.token || trigger.webhook?.token || null,

      secret: preservedSecret,
    },

    event: {
      name: trigger.event?.name ?? existing.event?.name ?? null,
    },
  };
};

/*
|--------------------------------------------------------------------------
| GET /api/workflows
|--------------------------------------------------------------------------
*/

const getWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find({ owner: req.user._id }).sort({
      updatedAt: -1,
    });

    return res.status(200).json(workflows);
  } catch (error) {
    console.error("Get workflows error:", error);
    return res.status(500).json({ message: "Failed to fetch workflows." });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/workflows/:id
|--------------------------------------------------------------------------
*/

const getWorkflowById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid workflow ID." });
    }

    const workflow = await Workflow.findOne({ _id: id, owner: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found." });
    }

    return res.status(200).json(workflow);
  } catch (error) {
    console.error("Get workflow error:", error);
    return res.status(500).json({ message: "Failed to fetch workflow." });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/workflows
|--------------------------------------------------------------------------
*/

const createWorkflow = async (req, res) => {
  try {
    const { name, description, status, nodes, edges, trigger } = req.body;

    const workflowName =
      typeof name === "string" && name.trim()
        ? name.trim()
        : "Untitled Workflow";

    const workflowDescription =
      typeof description === "string" ? description.trim() : "";

    const allowedStatuses = ["Active", "Paused", "Draft"];
    const workflowStatus = allowedStatuses.includes(status) ? status : "Draft";

    const normalizedTrigger = normalizeTrigger(trigger);

    // Webhook triggers need a token to exist before the workflow is
    // ever activated, so the URL is stable/shareable immediately.
    if (
      normalizedTrigger.type === "webhook" &&
      !normalizedTrigger.webhook.token
    ) {
      normalizedTrigger.webhook.token = generateWebhookToken();
      if (!normalizedTrigger.webhook.secret) {
        normalizedTrigger.webhook.secret = generateWebhookSecret();
      }
    }

    const workflow = await Workflow.create({
      name: workflowName,
      description: workflowDescription,
      status: workflowStatus,
      nodes: normalizeNodes(nodes),
      edges: normalizeEdges(edges),
      trigger: normalizedTrigger,
      owner: req.user._id,
    });

    await syncTrigger(workflow);

    return res.status(201).json({
      message: "Workflow created successfully.",
      workflow,
    });
  } catch (error) {
    console.error("Create workflow error:", error);
    return res.status(500).json({ message: "Failed to create workflow." });
  }
};

/*
|--------------------------------------------------------------------------
| PUT /api/workflows/:id
|--------------------------------------------------------------------------
*/

const updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid workflow ID." });
    }

    const workflow = await Workflow.findOne({ _id: id, owner: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found." });
    }

    const { name, description, status, nodes, edges, trigger } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res
          .status(400)
          .json({ message: "Workflow name cannot be empty." });
      }
      workflow.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res
          .status(400)
          .json({ message: "Workflow description must be text." });
      }
      workflow.description = description.trim();
    }

    if (status !== undefined) {
      const allowedStatuses = ["Active", "Paused", "Draft"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid workflow status. Use Active, Paused, or Draft.",
        });
      }
      workflow.status = status;
    }

    if (nodes !== undefined) {
      if (!Array.isArray(nodes)) {
        return res
          .status(400)
          .json({ message: "Workflow nodes must be an array." });
      }
      workflow.nodes = normalizeNodes(nodes);
    }

    if (edges !== undefined) {
      if (!Array.isArray(edges)) {
        return res
          .status(400)
          .json({ message: "Workflow edges must be an array." });
      }
      workflow.edges = normalizeEdges(edges);
    }

    if (trigger !== undefined) {
      const normalizedTrigger = normalizeTrigger(trigger, workflow.trigger);

      if (
        normalizedTrigger.type === "webhook" &&
        !normalizedTrigger.webhook.token
      ) {
        normalizedTrigger.webhook.token = generateWebhookToken();
        if (!normalizedTrigger.webhook.secret) {
          normalizedTrigger.webhook.secret = generateWebhookSecret();
        }
      }

      workflow.trigger = normalizedTrigger;
    }

    await workflow.save();
    await syncTrigger(workflow);

    return res.status(200).json({
      message: "Workflow updated successfully.",
      workflow,
    });
  } catch (error) {
    console.error("Update workflow error:", error);
    return res.status(500).json({ message: "Failed to update workflow." });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/workflows/:id
|--------------------------------------------------------------------------
*/

const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid workflow ID." });
    }

    const workflow = await Workflow.findOne({ _id: id, owner: req.user._id });

    if (!workflow) {
      return res.status(404).json({ message: "Workflow not found." });
    }

    await removeSchedule(workflow);
    await workflow.deleteOne();

    return res.status(200).json({ message: "Workflow deleted successfully." });
  } catch (error) {
    console.error("Delete workflow error:", error);
    return res.status(500).json({ message: "Failed to delete workflow." });
  }
};

module.exports = {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
};
