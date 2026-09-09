const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Individual Node Execution Result
|--------------------------------------------------------------------------
*/

const nodeResultSchema = new mongoose.Schema(
  {
    nodeId: { type: String, required: true },
    nodeType: { type: String, default: "custom" },
    kind: { type: String, default: "action" }, // trigger | ai | logic | action
    key: { type: String, default: "" }, // e.g. "classifier", "sendEmail"
    label: { type: String, default: "Untitled Node" },

    status: {
      type: String,
      enum: ["pending", "running", "success", "failed", "skipped"],
      default: "pending",
    },

    // Which downstream branch this node produced, if any
    // (e.g. "yes" / "no" for a Condition or Decision node).
    branch: { type: String, default: null },

    order: { type: Number, default: 0 },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },

    attempts: { type: Number, default: 1 },

    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: {} },

    error: { type: String, default: null },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Execution Schema
|--------------------------------------------------------------------------
*/

const executionSchema = new mongoose.Schema(
  {
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workflow",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["queued", "pending", "running", "success", "failed", "cancelled"],
      default: "queued",
    },

    triggerType: {
      type: String,
      enum: ["manual", "webhook", "schedule", "event"],
      default: "manual",
    },

    // BullMQ job id, so we can look up job state / logs / retry it.
    jobId: { type: String, default: null },
    attempt: { type: Number, default: 1 },

    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },

    error: { type: String, default: null },

    input: { type: mongoose.Schema.Types.Mixed, default: {} },
    output: { type: mongoose.Schema.Types.Mixed, default: {} },

    results: {
      type: [nodeResultSchema],
      default: [],
    },
  },
  { timestamps: true }
);

executionSchema.index({ owner: 1, createdAt: -1 });
executionSchema.index({ workflow: 1, createdAt: -1 });
executionSchema.index({ jobId: 1 });

const Execution = mongoose.model("Execution", executionSchema);

module.exports = Execution;
