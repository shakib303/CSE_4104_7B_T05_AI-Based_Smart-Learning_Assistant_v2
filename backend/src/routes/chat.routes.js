// src/routes/chat.routes.js

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const chatController = require("../controllers/chat.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");

// --------------------------------------------------
// Authentication
// --------------------------------------------------

router.use(authenticate);

// --------------------------------------------------
// Chat Sessions
// --------------------------------------------------

// Get all chat sessions
router.get(
  "/sessions",
  chatController.getSessions
);

// Create a new chat session
router.post(
  "/sessions",
  chatController.createSession
);

// Get/open a specific chat session with messages
router.get(
  "/sessions/:id",
  chatController.getSession
);

// Rename a chat session
router.patch(
  "/sessions/:id",
  chatController.renameSession
);

// Clear all messages from a chat
// The chat/session itself remains
router.delete(
  "/sessions/:id/messages",
  chatController.clearMessages
);

// Delete the entire chat session
router.delete(
  "/sessions/:id",
  chatController.deleteSession
);

// --------------------------------------------------
// Messages
// --------------------------------------------------

// Send a message to a chat session
router.post(
  "/sessions/:id/messages",
  [
    body("content")
      .trim()
      .notEmpty()
      .withMessage("Message content is required"),
  ],
  validate,
  chatController.sendMessage
);

// --------------------------------------------------
// Export Router
// --------------------------------------------------

module.exports = router;