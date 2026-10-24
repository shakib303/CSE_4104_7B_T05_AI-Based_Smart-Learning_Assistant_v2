const db = require("../config/db");
const { newId, now, toCamel } = require("../utils/dbHelpers");

function serializeTask(row) {
  if (!row) return null;

  const task = toCamel(row);

  try {
    task.tags = task.tags ? JSON.parse(task.tags) : [];
  } catch {
    task.tags = [];
  }

  if (task.subjectId) {
    task.subject = {
      id: task.subjectId,
      name: task.subjectName,
      color: task.subjectColor,
      icon: task.subjectIcon,
    };
  } else {
    task.subject = null;
  }

  delete task.subjectName;
  delete task.subjectColor;
  delete task.subjectIcon;

  return task;
}

const TASK_JOIN_SELECT = `
  SELECT
    t.*,
    s.name AS subject_name,
    s.color AS subject_color,
    s.icon AS subject_icon
  FROM tasks t
  LEFT JOIN subjects s ON t.subject_id = s.id
`;

/* -------------------------------------------------------------------------- */
/* GET /api/tasks                                                             */
/* -------------------------------------------------------------------------- */

exports.getTasks = (req, res, next) => {
  try {
    const {
      status,
      priority,
      subjectId,
      difficulty,
      taskType,
      search,
      due,
      sort = "created",
      order = "desc",
    } = req.query;

    let query = TASK_JOIN_SELECT + " WHERE t.user_id = ?";
    const params = [req.user.id];

    if (status) {
      query += " AND t.status = ?";
      params.push(status);
    }

    if (priority) {
      query += " AND t.priority = ?";
      params.push(priority);
    }

    if (subjectId) {
      query += " AND t.subject_id = ?";
      params.push(subjectId);
    }

    if (difficulty) {
      query += " AND t.difficulty = ?";
      params.push(difficulty);
    }

    if (taskType) {
      query += " AND t.task_type = ?";
      params.push(taskType);
    }

    if (search) {
      query += `
        AND (
          t.title LIKE ?
          OR t.description LIKE ?
          OR t.tags LIKE ?
        )
      `;

      const searchValue = `%${search}%`;

      params.push(
        searchValue,
        searchValue,
        searchValue
      );
    }

    if (due === "today") {
      query += " AND date(t.due_date) = date('now')";
    }

    if (due === "overdue") {
      query += `
        AND t.due_date IS NOT NULL
        AND datetime(t.due_date) < datetime('now')
        AND t.status NOT IN ('DONE', 'CANCELLED')
      `;
    }

    if (due === "upcoming") {
      query += `
        AND t.due_date IS NOT NULL
        AND datetime(t.due_date) >= datetime('now')
        AND t.status NOT IN ('DONE', 'CANCELLED')
      `;
    }

    const allowedSorts = {
      created: "t.created_at",
      due: "t.due_date",
      priority: `
        CASE t.priority
          WHEN 'URGENT' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END
      `,
      progress: "t.progress",
      difficulty: `
        CASE t.difficulty
          WHEN 'HARD' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'EASY' THEN 3
          ELSE 4
        END
      `,
    };

    const sortColumn = allowedSorts[sort] || allowedSorts.created;
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const rows = db.prepare(query).all(...params);

    const tasks = rows.map(serializeTask);

    return res.json({
      tasks,
      count: tasks.length,
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* POST /api/tasks                                                            */
/* -------------------------------------------------------------------------- */

exports.createTask = (req, res, next) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      estimatedMin,
      tags,
      subjectId,
      taskType,
      difficulty,
      progress,
      notes,
      recurrence,
      recurrenceEnd,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(422).json({
        error: "Task title is required",
      });
    }

    const validPriorities = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "URGENT",
    ];

    const validTypes = [
      "ASSIGNMENT",
      "STUDY",
      "EXAM_PREPARATION",
      "PROJECT",
      "READING",
      "PRACTICE",
      "REVISION",
      "PERSONAL_LEARNING",
    ];

    const validDifficulties = [
      "EASY",
      "MEDIUM",
      "HARD",
    ];

    const finalPriority = priority || "MEDIUM";
    const finalType = taskType || "STUDY";
    const finalDifficulty = difficulty || "MEDIUM";

    if (!validPriorities.includes(finalPriority)) {
      return res.status(422).json({
        error: "Invalid priority",
      });
    }

    if (!validTypes.includes(finalType)) {
      return res.status(422).json({
        error: "Invalid task type",
      });
    }

    if (!validDifficulties.includes(finalDifficulty)) {
      return res.status(422).json({
        error: "Invalid difficulty",
      });
    }

    const taskProgress = Math.min(
      100,
      Math.max(0, Number(progress) || 0)
    );

    const id = newId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO tasks (
        id,
        title,
        description,
        priority,
        task_type,
        difficulty,
        progress,
        due_date,
        estimated_min,
        tags,
        notes,
        recurrence,
        recurrence_end,
        subject_id,
        user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title.trim(),
      description || null,
      finalPriority,
      finalType,
      finalDifficulty,
      taskProgress,
      dueDate || null,
      estimatedMin ? parseInt(estimatedMin, 10) : null,
      JSON.stringify(Array.isArray(tags) ? tags : []),
      notes || null,
      recurrence || "NONE",
      recurrenceEnd || null,
      subjectId || null,
      req.user.id,
      timestamp,
      timestamp
    );

    const row = db
      .prepare(TASK_JOIN_SELECT + " WHERE t.id = ? AND t.user_id = ?")
      .get(id, req.user.id);

    return res.status(201).json({
      task: serializeTask(row),
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* GET /api/tasks/:id                                                         */
/* -------------------------------------------------------------------------- */

exports.getTask = (req, res, next) => {
  try {
    const row = db
      .prepare(
        TASK_JOIN_SELECT +
          " WHERE t.id = ? AND t.user_id = ?"
      )
      .get(req.params.id, req.user.id);

    if (!row) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    return res.json({
      task: serializeTask(row),
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* PUT /api/tasks/:id                                                         */
/* -------------------------------------------------------------------------- */

exports.updateTask = (req, res, next) => {
  try {
    const existing = db
      .prepare(
        "SELECT id FROM tasks WHERE id = ? AND user_id = ?"
      )
      .get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const {
      title,
      description,
      priority,
      dueDate,
      estimatedMin,
      actualMin,
      tags,
      subjectId,
      taskType,
      difficulty,
      progress,
      notes,
      recurrence,
      recurrenceEnd,
    } = req.body;

    const fields = [];
    const params = [];

    if (title !== undefined) {
      fields.push("title = ?");
      params.push(title.trim());
    }

    if (description !== undefined) {
      fields.push("description = ?");
      params.push(description || null);
    }

    if (priority !== undefined) {
      fields.push("priority = ?");
      params.push(priority);
    }

    if (taskType !== undefined) {
      fields.push("task_type = ?");
      params.push(taskType);
    }

    if (difficulty !== undefined) {
      fields.push("difficulty = ?");
      params.push(difficulty);
    }

    if (progress !== undefined) {
      const safeProgress = Math.min(
        100,
        Math.max(0, Number(progress) || 0)
      );

      fields.push("progress = ?");
      params.push(safeProgress);
    }

    if (dueDate !== undefined) {
      fields.push("due_date = ?");
      params.push(dueDate || null);
    }

    if (estimatedMin !== undefined) {
      fields.push("estimated_min = ?");
      params.push(
        estimatedMin === null || estimatedMin === ""
          ? null
          : parseInt(estimatedMin, 10)
      );
    }

    if (actualMin !== undefined) {
      fields.push("actual_min = ?");
      params.push(
        actualMin === null || actualMin === ""
          ? null
          : parseInt(actualMin, 10)
      );
    }

    if (tags !== undefined) {
      fields.push("tags = ?");
      params.push(
        JSON.stringify(Array.isArray(tags) ? tags : [])
      );
    }

    if (subjectId !== undefined) {
      fields.push("subject_id = ?");
      params.push(subjectId || null);
    }

    if (notes !== undefined) {
      fields.push("notes = ?");
      params.push(notes || null);
    }

    if (recurrence !== undefined) { fields.push("recurrence = ?"); params.push(recurrence || 'NONE'); }
    if (recurrenceEnd !== undefined) { fields.push("recurrence_end = ?"); params.push(recurrenceEnd || null); }

    fields.push("updated_at = ?");
    params.push(now());

    params.push(req.params.id);
    params.push(req.user.id);

    db.prepare(`
      UPDATE tasks
      SET ${fields.join(", ")}
      WHERE id = ? AND user_id = ?
    `).run(...params);

    const row = db
      .prepare(
        TASK_JOIN_SELECT +
          " WHERE t.id = ? AND t.user_id = ?"
      )
      .get(req.params.id, req.user.id);

    return res.json({
      task: serializeTask(row),
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* PATCH /api/tasks/:id/status                                                */
/* -------------------------------------------------------------------------- */

exports.updateStatus = (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      "TODO",
      "IN_PROGRESS",
      "DONE",
      "CANCELLED",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(422).json({
        error: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const existing = db
      .prepare(
        "SELECT id FROM tasks WHERE id = ? AND user_id = ?"
      )
      .get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const completedAt =
      status === "DONE" ? now() : null;

    const progress =
      status === "DONE" ? 100 : undefined;

    if (progress !== undefined) {
      db.prepare(`
        UPDATE tasks
        SET
          status = ?,
          progress = ?,
          completed_at = ?,
          updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        status,
        progress,
        completedAt,
        now(),
        req.params.id,
        req.user.id
      );
    } else {
      db.prepare(`
        UPDATE tasks
        SET
          status = ?,
          completed_at = ?,
          updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        status,
        completedAt,
        now(),
        req.params.id,
        req.user.id
      );
    }

    let nextOccurrence = null;
    if (status === "DONE") {
      const original = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
      if (original?.recurrence && original.recurrence !== "NONE" && original.due_date) {
        const d = new Date(original.due_date);
        if (original.recurrence === "DAILY") d.setDate(d.getDate()+1);
        else if (original.recurrence === "WEEKLY") d.setDate(d.getDate()+7);
        else if (original.recurrence === "MONTHLY") d.setMonth(d.getMonth()+1);
        const end = original.recurrence_end ? new Date(original.recurrence_end) : null;
        if (!end || d <= end) {
          nextOccurrence = newId();
          db.prepare(`INSERT INTO tasks(id,title,description,status,priority,task_type,difficulty,progress,notes,due_date,estimated_min,actual_min,tags,user_id,subject_id,created_at,updated_at,recurrence,recurrence_end) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
            .run(nextOccurrence,original.title,original.description,'TODO',original.priority,original.task_type,original.difficulty,0,original.notes,d.toISOString(),original.estimated_min,null,original.tags,original.user_id,original.subject_id,now(),now(),original.recurrence,original.recurrence_end);
        }
      }
    }

    const row = db
      .prepare(
        TASK_JOIN_SELECT +
          " WHERE t.id = ? AND t.user_id = ?"
      )
      .get(req.params.id, req.user.id);

    return res.json({
      task: serializeTask(row),
      nextOccurrence: nextOccurrence ? db.prepare(TASK_JOIN_SELECT + " WHERE t.id = ? AND t.user_id = ?").get(nextOccurrence, req.user.id) : null,
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* PATCH /api/tasks/:id/progress                                              */
/* -------------------------------------------------------------------------- */

exports.updateProgress = (req, res, next) => {
  try {
    const progress = Math.min(
      100,
      Math.max(0, Number(req.body.progress) || 0)
    );

    const task = db
      .prepare(
        "SELECT id, status FROM tasks WHERE id = ? AND user_id = ?"
      )
      .get(req.params.id, req.user.id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    let status = task.status;

    if (progress === 100) {
      status = "DONE";
    } else if (
      progress > 0 &&
      task.status === "TODO"
    ) {
      status = "IN_PROGRESS";
    }

    const completedAt =
      status === "DONE" ? now() : null;

    db.prepare(`
      UPDATE tasks
      SET
        progress = ?,
        status = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      progress,
      status,
      completedAt,
      now(),
      req.params.id,
      req.user.id
    );

    const row = db
      .prepare(
        TASK_JOIN_SELECT +
          " WHERE t.id = ? AND t.user_id = ?"
      )
      .get(req.params.id, req.user.id);

    return res.json({
      task: serializeTask(row),
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* DELETE /api/tasks/:id                                                      */
/* -------------------------------------------------------------------------- */

exports.deleteTask = (req, res, next) => {
  try {
    const existing = db
      .prepare(
        "SELECT id FROM tasks WHERE id = ? AND user_id = ?"
      )
      .get(req.params.id, req.user.id);

    if (!existing) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    db.prepare(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?"
    ).run(req.params.id, req.user.id);

    return res.json({
      message: "Task deleted",
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* GET /api/tasks/stats                                                       */
/* -------------------------------------------------------------------------- */

exports.getTaskStats = (req, res, next) => {
  try {
    const userId = req.user.id;

    const total = db
      .prepare(
        "SELECT COUNT(*) AS c FROM tasks WHERE user_id = ?"
      )
      .get(userId).c;

    const done = db
      .prepare(`
        SELECT COUNT(*) AS c
        FROM tasks
        WHERE user_id = ?
        AND status = 'DONE'
      `)
      .get(userId).c;

    const inProgress = db
      .prepare(`
        SELECT COUNT(*) AS c
        FROM tasks
        WHERE user_id = ?
        AND status = 'IN_PROGRESS'
      `)
      .get(userId).c;

    const pending = db
      .prepare(`
        SELECT COUNT(*) AS c
        FROM tasks
        WHERE user_id = ?
        AND status = 'TODO'
      `)
      .get(userId).c;

    const overdue = db
      .prepare(`
        SELECT COUNT(*) AS c
        FROM tasks
        WHERE user_id = ?
        AND due_date IS NOT NULL
        AND date(due_date) < date('now')
        AND status NOT IN ('DONE', 'CANCELLED')
      `)
      .get(userId).c;

    const dueToday = db
      .prepare(`
        SELECT COUNT(*) AS c
        FROM tasks
        WHERE user_id = ?
        AND due_date IS NOT NULL
        AND date(due_date) = date('now')
        AND status NOT IN ('DONE', 'CANCELLED')
      `)
      .get(userId).c;

    const completedMinutes = db
      .prepare(`
        SELECT COALESCE(SUM(actual_min), 0) AS minutes
        FROM tasks
        WHERE user_id = ?
        AND status = 'DONE'
      `)
      .get(userId).minutes;

    const estimatedMinutes = db
      .prepare(`
        SELECT COALESCE(SUM(estimated_min), 0) AS minutes
        FROM tasks
        WHERE user_id = ?
        AND status NOT IN ('DONE', 'CANCELLED')
      `)
      .get(userId).minutes;

    const completionRate =
      total > 0
        ? Math.round((done / total) * 100)
        : 0;

    return res.json({
      total,
      done,
      inProgress,
      pending,
      todo: pending,
      overdue,
      dueToday,
      completedMinutes,
      estimatedMinutes,
      completionRate,
    });
  } catch (err) {
    next(err);
  }
};