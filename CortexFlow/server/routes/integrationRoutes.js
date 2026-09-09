const express = require("express");

const {
  getIntegrations,
  connectIntegration,
  updateIntegration,
  disconnectIntegration,
} = require("../controllers/integrationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getIntegrations);
router.post("/", protect, connectIntegration);
router.put("/:id", protect, updateIntegration);
router.delete("/:id", protect, disconnectIntegration);

module.exports = router;
