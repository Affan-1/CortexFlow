const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Integration
|--------------------------------------------------------------------------
|
| One document per (owner, provider). Action nodes reference an
| integration by its _id in node.data.config.integrationId, so a
| workflow never stores raw credentials itself.
|
| `credentials` shape depends on provider:
|   gmail          -> { user, appPassword }            (SMTP)
|   slack          -> { webhookUrl }                    or { botToken, defaultChannel }
|   discord        -> { webhookUrl }
|   googleSheets   -> { serviceAccountEmail, privateKey, spreadsheetId }
|   notion         -> { apiKey, defaultDatabaseId }
|   hubspot        -> { apiKey }
|   webhook        -> { url, headers }
|
*/

const integrationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    provider: {
      type: String,
      enum: [
        "gmail",
        "slack",
        "discord",
        "googleSheets",
        "notion",
        "hubspot",
        "webhook",
      ],
      required: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    // Free-form, provider-specific. Never returned to the client
    // in full (see integrationController#formatIntegration).
    credentials: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      select: false,
    },

    status: {
      type: String,
      enum: ["connected", "error", "disconnected"],
      default: "connected",
    },

    lastError: {
      type: String,
      default: null,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

integrationSchema.index({ owner: 1, provider: 1 });

const Integration = mongoose.model("Integration", integrationSchema);

module.exports = Integration;
