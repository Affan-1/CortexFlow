const express = require("express");

const {
  triggerWebhook,
} = require("../controllers/webhookController");

const router = express.Router();

// Public — deliberately NOT behind `protect`.
// The token in the URL (and optional shared-secret header)
// is the authentication mechanism.
router.post("/:token", triggerWebhook);

module.exports = router;