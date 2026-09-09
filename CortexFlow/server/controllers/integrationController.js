const mongoose = require("mongoose");
const Integration = require("../models/Integration");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ALLOWED_PROVIDERS = [
  "gmail",
  "slack",
  "discord",
  "googleSheets",
  "notion",
  "hubspot",
  "webhook",
];

// Never send raw credentials back to the client.
const formatIntegration = (integration) => ({
  id: integration._id,
  provider: integration.provider,
  name: integration.name,
  status: integration.status,
  lastError: integration.lastError,
  lastUsedAt: integration.lastUsedAt,
  createdAt: integration.createdAt,
  updatedAt: integration.updatedAt,
  hasCredentials: true,
});

/*
|--------------------------------------------------------------------------
| GET /api/integrations
|--------------------------------------------------------------------------
*/

const getIntegrations = async (req, res) => {
  try {
    const integrations = await Integration.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json(integrations.map(formatIntegration));
  } catch (error) {
    console.error("Get integrations error:", error);
    return res.status(500).json({ message: "Failed to fetch integrations." });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/integrations
|--------------------------------------------------------------------------
*/

const connectIntegration = async (req, res) => {
  try {
    const { provider, name, credentials } = req.body;

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        message: `Invalid provider. Use one of: ${ALLOWED_PROVIDERS.join(", ")}.`,
      });
    }

    if (!credentials || typeof credentials !== "object") {
      return res.status(400).json({ message: "Credentials are required." });
    }

    const integration = await Integration.create({
      owner: req.user._id,
      provider,
      name: name || provider,
      credentials,
      status: "connected",
    });

    return res.status(201).json({
      message: "Integration connected successfully.",
      integration: formatIntegration(integration),
    });
  } catch (error) {
    console.error("Connect integration error:", error);
    return res.status(500).json({ message: "Failed to connect integration." });
  }
};

/*
|--------------------------------------------------------------------------
| PUT /api/integrations/:id
|--------------------------------------------------------------------------
*/

const updateIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid integration ID." });
    }

    const integration = await Integration.findOne({
      _id: id,
      owner: req.user._id,
    }).select("+credentials");

    if (!integration) {
      return res.status(404).json({ message: "Integration not found." });
    }

    const { name, credentials } = req.body;

    if (name !== undefined) integration.name = name;
    if (credentials !== undefined) {
      integration.credentials = { ...integration.credentials, ...credentials };
    }

    integration.status = "connected";
    integration.lastError = null;

    await integration.save();

    return res.status(200).json({
      message: "Integration updated successfully.",
      integration: formatIntegration(integration),
    });
  } catch (error) {
    console.error("Update integration error:", error);
    return res.status(500).json({ message: "Failed to update integration." });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/integrations/:id
|--------------------------------------------------------------------------
*/

const disconnectIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid integration ID." });
    }

    const integration = await Integration.findOneAndDelete({
      _id: id,
      owner: req.user._id,
    });

    if (!integration) {
      return res.status(404).json({ message: "Integration not found." });
    }

    return res.status(200).json({ message: "Integration disconnected." });
  } catch (error) {
    console.error("Disconnect integration error:", error);
    return res.status(500).json({ message: "Failed to disconnect integration." });
  }
};

module.exports = {
  getIntegrations,
  connectIntegration,
  updateIntegration,
  disconnectIntegration,
};
