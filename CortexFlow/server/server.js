// CortexFlow API server entry point.

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

// =========================
// MongoDB
// =========================

connectDB();

// =========================
// CORS
// =========================

// Remove trailing slash if CLIENT_URL accidentally contains one.
const productionClientUrl = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.replace(/\/$/, "")
  : null;

const allowedOrigins = [
  productionClientUrl,
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // e.g. Postman, server-to-server requests, health checks.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],

  optionsSuccessStatus: 204,
};

// IMPORTANT:
// Keep CORS before JSON middleware and before all API routes.
// The cors package will also handle preflight OPTIONS requests.
app.use(cors(corsOptions));

// =========================
// Middleware
// =========================

app.use(express.json());

// =========================
// Routes
// =========================

app.use("/api/auth", authRoutes);

app.use("/api/workflows", workflowRoutes);

app.use("/api/executions", executionRoutes);

app.use("/api/integrations", integrationRoutes);

// Public webhook trigger endpoint.
app.use("/api/webhooks", webhookRoutes);

// =========================
// Health Check
// =========================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "CortexFlow API",
    timestamp: new Date().toISOString(),
  });
});

// =========================
// Start Server
// =========================

app.listen(PORT, () => {
  console.log(`CortexFlow API running on http://localhost:${PORT}`);

  console.log(
    `Allowed frontend origins: ${
      allowedOrigins.length
        ? allowedOrigins.join(", ")
        : "No CLIENT_URL configured"
    }`
  );
});