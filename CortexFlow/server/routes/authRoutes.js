const express = require("express");

const {
  register,
  login,
  getMe,
  updateProfile,
  updateWorkspace,
  deleteWorkspace,
  getApiKey,
  regenerateApiKey,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// =============================================================
// AUTHENTICATION
// =============================================================

router.post("/register", register);
router.post("/login", login);

// =============================================================
// CURRENT USER
// =============================================================

router.get("/me", protect, getMe);

// =============================================================
// PROFILE
// =============================================================

router.put("/profile", protect, updateProfile);

// =============================================================
// WORKSPACE
// =============================================================

router.put("/workspace", protect, updateWorkspace);
router.delete("/workspace", protect, deleteWorkspace);

// =============================================================
// API KEY
// =============================================================

router.get("/api-key", protect, getApiKey);

router.post(
  "/api-key/regenerate",
  protect,
  regenerateApiKey
);

module.exports = router;