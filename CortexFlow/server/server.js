// CortexFlow API server entry point.
// This file only sets up Express and basic middleware.
// The MongoDB connection is added in the next step (config/db.js).

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const executionRoutes = require("./routes/executionRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/executions", executionRoutes);
app.use("/api/integrations", integrationRoutes);

// Public trigger endpoint for workflows with a "webhook" trigger.
// Not behind /api/auth-protected middleware — the token in the URL
// (plus optional shared secret header) is the auth mechanism.
app.use("/api/webhooks", webhookRoutes);

// Health check route — useful to confirm the server is running,
// and later for uptime monitoring / deployment checks (Render, Railway).
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "CortexFlow API",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`CortexFlow API running on http://localhost:${PORT}`);
});