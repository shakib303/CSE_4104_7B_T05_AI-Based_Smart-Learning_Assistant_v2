// src/controllers/dashboard.controller.js

const db = require("../config/db");
const { newId, now, toCamel } = require("../utils/dbHelpers");
const aiService = require("../services/ai.service");

// ============================================================
// HELPERS
// ============================================================

function startOfWeek() {
  const d = new Date();

  // Sunday = start of week
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);

  return d.toISOString();
}

function startOfDay(date = new Date()) {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);

  return d.toISOString();
}

function getLast7Days() {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();

    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    days.push(d);
  }

  return days;
}

function formatDay(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}


// ============================================================
// GET /api/dashboard
// ============================================================

exports.getDashboard = (req, res, next) => {
  try {
    const userId = req.user.id;

    const weekStart = startOfWeek();
    const nowIso = now();

    // --------------------------------------------------------
    // TASK SUMMARY
    // --------------------------------------------------------

    const statusRows = db
      .prepare(`
        SELECT
          status,
          COUNT(*) AS c
        FROM tasks
        WHERE user_id = ?
        GROUP BY status
      `)
      .all(userId);

    const taskSummary = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      CANCELLED: 0,
    };

    statusRows.forEach((row) => {
      taskSummary[row.status] = Number(row.c || 0);
    });


    // --------------------------------------------------------
    // WEEKLY STUDY HOURS
    // --------------------------------------------------------

    const studyMinRow = db
      .prepare(`
        SELECT
          COALESCE(SUM(duration_min), 0) AS total
        FROM study_logs
        WHERE user_id = ?
        AND date >= ?
      `)
      .get(userId, weekStart);

    const studyMinutes = Number(studyMinRow?.total || 0);

    const weeklyStudyHours = +(studyMinutes / 60).toFixed(1);


    // --------------------------------------------------------
    // USER STUDY GOAL + STREAK
    // --------------------------------------------------------

    const user = db
      .prepare(`
        SELECT
          streak,
          study_goal_hrs
        FROM users
        WHERE id = ?
      `)
      .get(userId);


    // --------------------------------------------------------
    // UPCOMING TASKS
    // --------------------------------------------------------

    const upcomingRows = db
      .prepare(`
        SELECT
          t.*,
          s.name AS subject_name,
          s.color AS subject_color
        FROM tasks t
        LEFT JOIN subjects s
          ON t.subject_id = s.id
        WHERE
          t.user_id = ?
          AND t.status != 'DONE'
          AND t.due_date >= ?
        ORDER BY t.due_date ASC
        LIMIT 5
      `)
      .all(userId);

    const upcomingTasks = upcomingRows.map((row) => {
      const task = toCamel(row);

      task.tags = task.tags
        ? JSON.parse(task.tags)
        : [];

      return task;
    });


    // ========================================================
    // SUBJECT PROFICIENCY
    // ========================================================
    //
    // Calculated from actual study_logs.
    //
    // More study activity = higher relative proficiency.
    //
    // This is NOT an AI-generated fake percentage.
    // ========================================================

    const subjectRows = db
      .prepare(`
        SELECT
          s.id,
          s.name,
          s.color,
          COALESCE(SUM(sl.duration_min), 0) AS study_minutes
        FROM subjects s
        LEFT JOIN study_logs sl
          ON sl.subject_id = s.id
          AND sl.user_id = ?
        GROUP BY
          s.id,
          s.name,
          s.color
        ORDER BY study_minutes DESC
      `)
      .all(userId);

    const maxSubjectMinutes = Math.max(
      ...subjectRows.map((row) =>
        Number(row.study_minutes || 0)
      ),
      0
    );

    const subjectProficiency = subjectRows.map((row) => {
      const minutes = Number(row.study_minutes || 0);

      let proficiency = 0;

      if (maxSubjectMinutes > 0) {
        proficiency = Math.round(
          (minutes / maxSubjectMinutes) * 100
        );
      }

      return {
        id: row.id,
        name: row.name,
        color: row.color || "#2563eb",
        studyMinutes: minutes,
        studyHours: +(minutes / 60).toFixed(1),
        proficiency,
      };
    });


    // ========================================================
    // LAST 7 DAYS ANALYTICS
    // ========================================================

    const last7Days = getLast7Days();

    const analytics = last7Days.map((day) => {
      const start = startOfDay(day);

      const endDate = new Date(day);
      endDate.setDate(endDate.getDate() + 1);

      const end = endDate.toISOString();

      const row = db
        .prepare(`
          SELECT
            COALESCE(SUM(duration_min), 0) AS minutes
          FROM study_logs
          WHERE
            user_id = ?
            AND date >= ?
            AND date < ?
        `)
        .get(
          userId,
          start,
          end
        );

      return {
        date: formatDateOnly(day),
        day: formatDay(day),
        minutes: Number(row?.minutes || 0),
        hours: +(
          Number(row?.minutes || 0) / 60
        ).toFixed(1),
      };
    });


    // ========================================================
    // TOTAL TASKS
    // ========================================================

    const totalTasks =
      Object.values(taskSummary).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );

    const completedTasks =
      Number(taskSummary.DONE || 0);

    const taskCompletionRate =
      totalTasks > 0
        ? Math.round(
            (completedTasks / totalTasks) * 100
          )
        : 0;


    // ========================================================
    // WEEKLY GOAL PROGRESS
    // ========================================================

    const studyGoalHrs =
      Number(user?.study_goal_hrs || 4);

    const weeklyGoalProgress =
      studyGoalHrs > 0
        ? Math.min(
            100,
            Math.round(
              (weeklyStudyHours / studyGoalHrs) * 100
            )
          )
        : 0;


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.json({
      taskSummary,

      totalTasks,

      completedTasks,

      taskCompletionRate,

      weeklyStudyHours,

      studyGoalHrs,

      weeklyGoalProgress,

      streak: Number(user?.streak || 0),

      upcomingTasks,

      subjectProficiency,

      analytics,

      generatedAt: now(),
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// POST /api/dashboard/study-log
// ============================================================

exports.logStudySession = (req, res, next) => {
  try {
    const {
      durationMin,
      subjectId,
      notes,
      productivityRating,
    } = req.body;

    const duration = parseInt(
      durationMin,
      10
    );

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!duration || duration <= 0) {
      return res.status(400).json({
        error:
          "Study duration must be greater than 0",
      });
    }


    const id = newId();
    const timestamp = now();


    // --------------------------------------------------------
    // INSERT
    // --------------------------------------------------------

    db.prepare(`
      INSERT INTO study_logs
      (
        id,
        user_id,
        subject_id,
        duration_min,
        notes,
        productivity_rating,
        date,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      subjectId || null,
      duration,
      notes || null,
      productivityRating ? Math.max(1, Math.min(5, Number(productivityRating))) : null,
      timestamp,
      timestamp
    );


    // --------------------------------------------------------
    // RETURN CREATED LOG
    // --------------------------------------------------------

    const row = db
      .prepare(`
        SELECT *
        FROM study_logs
        WHERE id = ?
      `)
      .get(id);


    return res.status(201).json({
      log: toCamel(row),
    });

  } catch (err) {
    next(err);
  }
};


// ============================================================
// GET /api/dashboard/ai-insight
// ============================================================

exports.getAIInsight = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const weekStart = startOfWeek();

    // --------------------------------------------------------
    // STUDY DATA
    // --------------------------------------------------------

    const studyRow = db
      .prepare(`
        SELECT
          COALESCE(SUM(duration_min), 0) AS total
        FROM study_logs
        WHERE
          user_id = ?
          AND date >= ?
      `)
      .get(
        userId,
        weekStart
      );

    const weeklyMinutes =
      Number(studyRow?.total || 0);

    const weeklyHours =
      +(weeklyMinutes / 60).toFixed(1);


    // --------------------------------------------------------
    // TASK DATA
    // --------------------------------------------------------

    const taskRows = db
      .prepare(`
        SELECT
          status,
          COUNT(*) AS count
        FROM tasks
        WHERE user_id = ?
        GROUP BY status
      `)
      .all(userId);

    const tasks = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      CANCELLED: 0,
    };

    taskRows.forEach((row) => {
      tasks[row.status] =
        Number(row.count || 0);
    });


    // --------------------------------------------------------
    // SUBJECT DATA
    // --------------------------------------------------------

    const subjects = db
      .prepare(`
        SELECT
          s.name,
          COALESCE(
            SUM(sl.duration_min),
            0
          ) AS study_minutes
        FROM subjects s
        LEFT JOIN study_logs sl
          ON sl.subject_id = s.id
          AND sl.user_id = ?
        GROUP BY
          s.id,
          s.name
        ORDER BY study_minutes DESC
      `)
      .all(userId)
      .map((row) => ({
        name: row.name,
        studyHours: +(
          Number(row.study_minutes || 0) / 60
        ).toFixed(1),
      }));


    // --------------------------------------------------------
    // RECENT ANALYTICS
    // --------------------------------------------------------

    const recentStudy = db
      .prepare(`
        SELECT
          date,
          duration_min,
          subject_id
        FROM study_logs
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 30
      `)
      .all(userId);


    // ========================================================
    // PROMPT
    // ========================================================

    const systemPrompt = `
You are SmartLearn AI, an AI study assistant.

Your task is to analyze a student's actual study activity
and provide a short, practical dashboard recommendation.

Rules:

1. Only use the supplied student data.
2. Do not invent grades or academic results.
3. Do not claim that study time is the same as actual mastery.
4. Identify useful patterns from study activity.
5. Suggest realistic next actions.
6. Keep the response concise.
7. Use Markdown.
8. Do not mention internal database details.
9. If there is insufficient data, clearly say that more study activity
   is needed before making a strong recommendation.

Return these sections:

### Study Insight
One short observation.

### Focus Area
The subject or activity that deserves attention.

### Recommendation
2-3 practical actions.

### Motivation
One short encouraging sentence.
`;


    const userPrompt = `
Here is the student's current study data:

Weekly study hours:
${weeklyHours}

Task status:
${JSON.stringify(tasks)}

Subject study activity:
${JSON.stringify(subjects)}

Recent study sessions:
${JSON.stringify(recentStudy)}

Analyze this data and provide the SmartLearn dashboard recommendation.
`;


    // ========================================================
    // GEMINI
    // ========================================================

    const result =
      await aiService.chat(
        systemPrompt,
        [
          {
            role: "user",
            content: userPrompt,
          },
        ]
      );


    return res.json({
      insight: result.reply,
      generatedAt: now(),
    });

  } catch (err) {
    console.error(
      "Dashboard AI error:",
      err
    );

    next(err);
  }
};