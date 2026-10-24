// src/routes/task.routes.js
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const taskController = require("../controllers/task.controller");
const taskAiController = require("../controllers/taskAi.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");

router.use(authenticate);

/*
 * IMPORTANT:
 * Keep /stats BEFORE /:id
 */

router.get("/stats", taskController.getTaskStats);
router.post("/ai/create-plan", taskAiController.createPlan);
router.post("/ai/recommendation", taskAiController.recommendation);
router.post("/ai/daily-plan", taskAiController.dailyPlan);

router.get("/", taskController.getTasks);

router.post(
  "/",
  [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required"),

    body("priority")
      .optional()
      .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
      .withMessage("Invalid priority"),

    body("difficulty")
      .optional()
      .isIn(["EASY", "MEDIUM", "HARD"])
      .withMessage("Invalid difficulty"),

    body("taskType")
      .optional()
      .isIn([
        "ASSIGNMENT",
        "STUDY",
        "EXAM_PREPARATION",
        "PROJECT",
        "READING",
        "PRACTICE",
        "REVISION",
        "PERSONAL_LEARNING",
      ])
      .withMessage("Invalid task type"),
  ],
  validate,
  taskController.createTask
);

router.patch(
  "/:id/status",
  taskController.updateStatus
);

router.patch(
  "/:id/progress",
  taskController.updateProgress
);

router.get("/:id", taskController.getTask);

router.put("/:id", taskController.updateTask);

router.delete("/:id", taskController.deleteTask);

module.exports = router;