// Defines the API endpoints for workflows.
// Mounted in server.js under /api/workflows
//
// Every route here uses "protect", so a valid login (Bearer token)
// is required to access any of them.

const express = require("express");
const {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} = require("../controllers/workflowController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getWorkflows);
router.get("/:id", protect, getWorkflowById);
router.post("/", protect, createWorkflow);
router.put("/:id", protect, updateWorkflow);
router.delete("/:id", protect, deleteWorkflow);

module.exports = router;
