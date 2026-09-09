// Defines the shape of a "Workflow" document in MongoDB.
// This is what gets saved when a user builds and saves
// a workflow in the Workflow Builder (React Flow canvas).

const mongoose = require("mongoose");

// A single node on the canvas (Trigger, AI, Logic, or Action).
// Mirrors the shape used by @xyflow/react on the frontend.
//
// `data.key` carries the specific node subtype, e.g.:
//   trigger -> "manual" | "webhook" | "schedule" | "event"
//   ai      -> "aiAgent" | "classifier" | "extractor" | "generator" | "decision"
//   logic   -> "condition" | "delay" | "merge"
//   action  -> "sendEmail" | "slackMessage" | "discordMessage" |
//              "googleSheetsAppend" | "notionCreatePage" | "hubspotUpsert" | "webhookCall"
const nodeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, default: "custom" },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    data: {
      label: { type: String, required: true },
      kind: {
        type: String,
        enum: ["trigger", "ai", "logic", "action"],
        required: true,
      },
      key: { type: String, required: true }, // e.g. "aiAgent", "sendEmail"
      config: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
  },
  { _id: false } // nodes already have their own "id" field
);

// A connection line between two nodes.
//
// `sourceHandle` / `branch` let a single node fan out to multiple
// downstream paths (e.g. a Decision or Condition node with a
// "yes" output and a "no" output). The engine only walks an edge
// whose `branch` matches the branch the node actually produced;
// edges with no `branch` are always followed.
const edgeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    sourceHandle: { type: String, default: null },
    branch: { type: String, default: null }, // "yes" | "no" | "true" | "false" | custom label
    label: { type: String, default: "" },
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workflow name is required"],
      trim: true,
      default: "Untitled Workflow",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Paused", "Draft"],
      default: "Draft",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nodes: {
      type: [nodeSchema],
      default: [],
    },
    edges: {
      type: [edgeSchema],
      default: [],
    },

    // =========================================================
    // TRIGGER CONFIGURATION
    // =========================================================
    //
    // A workflow is only actually wired up to fire automatically
    // when status === "Active". Draft/Paused workflows can still
    // be run manually.
    trigger: {
      type: {
        type: String,
        enum: ["manual", "webhook", "schedule", "event"],
        default: "manual",
      },
      // schedule trigger
      schedule: {
        cron: { type: String, default: null }, // e.g. "*/15 * * * *"
        timezone: { type: String, default: "UTC" },
      },
      // webhook trigger
      webhook: {
        token: { type: String, default: null }, // unguessable path segment
        secret: { type: String, default: null }, // optional HMAC/shared-secret check
      },
      // event trigger (internal pub/sub, e.g. "contact.created")
      event: {
        name: { type: String, default: null },
      },
    },

    // Set by the trigger service once a schedule is actually
    // registered with BullMQ, so we know the repeatable job key
    // to remove later if the schedule changes or the workflow
    // is paused/deleted.
    scheduleJobKey: {
      type: String,
      default: null,
    },

    // Quick stats, updated whenever the workflow runs.
    // Kept here (denormalized) so the Workflows list page
    // doesn't need to calculate this from every execution record.
    totalExecutions: {
      type: Number,
      default: 0,
    },
    successfulExecutions: {
      type: Number,
      default: 0,
    },
    failedExecutions: {
      type: Number,
      default: 0,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

workflowSchema.index({ owner: 1, updatedAt: -1 });
workflowSchema.index({ "trigger.webhook.token": 1 });

const Workflow = mongoose.model("Workflow", workflowSchema);

module.exports = Workflow;
