const express = require("express");

const {
  getExecutions,
  getExecutionById,
  runWorkflow,
  retryExecution,
  deleteExecution,
} = require("../controllers/executionController");

const { protect, protectWithApiKey } = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Execution Routes
|--------------------------------------------------------------------------
*/

// Get all executions for the logged-in user (optionally ?workflowId=&status=)
router.get("/", protect, getExecutions);

// Get a single execution (also used for live-status polling)
router.get("/:id", protect, getExecutionById);

// Run a workflow manually — enqueues a real job, doesn't execute inline.
// Accepts either a JWT (browser) or an X-API-Key header (external systems).
router.post("/run/:workflowId", protectWithApiKey, runWorkflow);

// Re-run a previous execution with the same input
router.post("/:id/retry", protect, retryExecution);

// Delete an execution record
router.delete("/:id", protect, deleteExecution);

module.exports = router;
