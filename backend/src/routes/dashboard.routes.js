// src/routes/dashboard.routes.js

const express = require("express");

const router = express.Router();

const dashboardController =
  require("../controllers/dashboard.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");


router.use(authenticate);


// Dashboard data
router.get(
  "/",
  dashboardController.getDashboard
);


// Log study session
router.post(
  "/study-log",
  dashboardController.logStudySession
);


// Gemini-powered dashboard insight
router.get(
  "/ai-insight",
  dashboardController.getAIInsight
);


module.exports = router;