// src/controllers/chat.controller.js

const db = require("../config/db");
const {
  newId,
  now,
  toCamel,
  toCamelList,
} = require("../utils/dbHelpers");

const aiService = require("../services/ai.service");

const SYSTEM_PROMPT = `
You are SmartLearn AI, an intelligent academic study assistant for university students.

Your primary goal is to help students learn concepts effectively, solve academic problems,
prepare for exams, and improve their study habits.

Response guidelines:

- Explain concepts clearly and accurately.
- Use simple language unless the student asks for advanced detail.
- Break difficult topics into smaller steps.
- For mathematical or programming problems, show the solution step by step.
- Use examples whenever they improve understanding.
- Use headings, bullet points, numbered steps, and tables when appropriate.
- Keep answers focused on the student's question.
- Do not give unnecessarily long answers.
- If the student asks for a definition, give a concise definition first, followed by a short explanation.
- If the student asks for an exam answer, provide an exam-friendly answer.
- If the student asks for code, provide clean and properly formatted code with a brief explanation.
- If the student makes a mistake, correct it politely and explain why.
- Encourage the student without being overly conversational.
- Never claim information that you are not confident about.
- If a question is unclear, ask the student for clarification.

Formatting guidelines:

- Use Markdown formatting for headings, lists, bold text, and code blocks.
- Use fenced code blocks with the appropriate programming language for code.
- Use LaTeX for mathematical equations.
- Use inline LaTeX for short mathematical expressions.
- Use display LaTeX for equations that should appear on their own line.
- Do not output raw HTML.

Language support: answer in the same language the student uses. Support English, Bangla, and Banglish naturally. If the student mixes languages, you may use Banglish when it improves clarity.

You are an educational assistant, not a replacement for a teacher.
`;

// ============================================================
// GET /api/chat/sessions
// Get all chat sessions for the logged-in user
// ============================================================

exports.getSessions = (req, res, next) => {
  try {
    const rows = db
      .prepare(`
        SELECT
          cs.*,
          (
            SELECT COUNT(*)
            FROM chat_messages
            WHERE session_id = cs.id
          ) AS message_count
        FROM chat_sessions cs
        WHERE cs.user_id = ?
        ORDER BY cs.updated_at DESC
      `)
      .all(req.user.id);

    return res.json({
      sessions: toCamelList(rows),
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// POST /api/chat/sessions
// Create a new chat session
// ============================================================

exports.createSession = (req, res, next) => {
  try {
    const { title } = req.body;

    const id = newId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO chat_sessions
      (
        id,
        title,
        user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      title || "New Chat",
      req.user.id,
      timestamp,
      timestamp
    );

    const row = db
      .prepare(`
        SELECT *
        FROM chat_sessions
        WHERE id = ?
      `)
      .get(id);

    return res.status(201).json({
      session: toCamel(row),
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PATCH /api/chat/sessions/:id
// Rename a chat session
// ============================================================

exports.renameSession = (req, res, next) => {
  try {
    const { title } = req.body;
    const sessionId = req.params.id;

    // --------------------------------------------------------
    // Validate title
    // --------------------------------------------------------

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: "Chat title cannot be empty",
      });
    }

    const cleanTitle = title.trim();

    // --------------------------------------------------------
    // Title length limit
    // --------------------------------------------------------

    if (cleanTitle.length > 100) {
      return res.status(400).json({
        error: "Chat title must be 100 characters or less",
      });
    }

    // --------------------------------------------------------
    // Verify ownership
    // --------------------------------------------------------

    const session = db
      .prepare(`
        SELECT id
        FROM chat_sessions
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        sessionId,
        req.user.id
      );

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // --------------------------------------------------------
    // Update title
    // --------------------------------------------------------

    db.prepare(`
      UPDATE chat_sessions
      SET
        title = ?,
        updated_at = ?
      WHERE id = ?
      AND user_id = ?
    `).run(
      cleanTitle,
      now(),
      sessionId,
      req.user.id
    );

    // --------------------------------------------------------
    // Get updated session
    // --------------------------------------------------------

    const updatedSession = db
      .prepare(`
        SELECT *
        FROM chat_sessions
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        sessionId,
        req.user.id
      );

    return res.json({
      message: "Chat renamed successfully",
      session: toCamel(updatedSession),
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/chat/sessions/:id
// Open a specific chat session
// ============================================================

exports.getSession = (req, res, next) => {
  try {
    const session = db
      .prepare(`
        SELECT *
        FROM chat_sessions
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        req.params.id,
        req.user.id
      );

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    const messages = db
      .prepare(`
        SELECT *
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
      `)
      .all(req.params.id);

    const result = toCamel(session);

    result.messages = toCamelList(messages);

    return res.json({
      session: result,
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================
// DELETE /api/chat/sessions/:id/messages
// Clear all messages from a chat
// The chat session itself remains.
// ============================================================

exports.clearMessages = (req, res, next) => {
  try {
    const sessionId = req.params.id;

    // --------------------------------------------------------
    // Verify chat ownership
    // --------------------------------------------------------

    const session = db
      .prepare(`
        SELECT id
        FROM chat_sessions
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        sessionId,
        req.user.id
      );

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // --------------------------------------------------------
    // Delete all messages
    // --------------------------------------------------------

    db.prepare(`
      DELETE FROM chat_messages
      WHERE session_id = ?
    `).run(sessionId);

    // --------------------------------------------------------
    // Reset title so the next message can generate
    // a new automatic title.
    // --------------------------------------------------------

    db.prepare(`
      UPDATE chat_sessions
      SET
        title = ?,
        updated_at = ?
      WHERE id = ?
      AND user_id = ?
    `).run(
      "New Chat",
      now(),
      sessionId,
      req.user.id
    );

    return res.json({
      message: "Chat messages cleared successfully",
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================
// DELETE /api/chat/sessions/:id
// Delete the entire chat session
// ============================================================

exports.deleteSession = (req, res, next) => {
  try {
    const sessionId = req.params.id;

    // --------------------------------------------------------
    // Verify ownership
    // --------------------------------------------------------

    const session = db
      .prepare(`
        SELECT id
        FROM chat_sessions
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        sessionId,
        req.user.id
      );

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // --------------------------------------------------------
    // Delete chat session
    // --------------------------------------------------------

    db.prepare(`
      DELETE FROM chat_sessions
      WHERE id = ?
      AND user_id = ?
    `).run(
      sessionId,
      req.user.id
    );

    return res.json({
      message: "Session deleted",
    });

  } catch (err) {
    next(err);
  }
};

// ============================================================
// POST /api/chat/sessions/:id/messages
// Send a message
// ============================================================

exports.sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const sessionId = req.params.id;

    // --------------------------------------------------------
    // 1. Verify chat belongs to user
    // --------------------------------------------------------

    const session = db
      .prepare(`
        SELECT *
        FROM chat_sessions
        WHERE id = ?
        AND user_id = ?
      `)
      .get(
        sessionId,
        req.user.id
      );

    if (!session) {
      return res.status(404).json({
        error: "Session not found",
      });
    }

    // --------------------------------------------------------
    // 2. Get previous messages for AI context
    // --------------------------------------------------------

    const priorMessages = db
      .prepare(`
        SELECT *
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT 20
      `)
      .all(sessionId);

    // --------------------------------------------------------
    // 3. Save user's message
    // --------------------------------------------------------

    const userMsgId = newId();
    const timestamp = now();

    db.prepare(`
      INSERT INTO chat_messages
      (
        id,
        session_id,
        role,
        content,
        created_at
      )
      VALUES (?, ?, 'USER', ?, ?)
    `).run(
      userMsgId,
      sessionId,
      content,
      timestamp
    );

    // --------------------------------------------------------
    // 4. Prepare conversation history for Gemini
    // --------------------------------------------------------

    const history = priorMessages.map((m) => ({
      role: m.role.toLowerCase(),
      content: m.content,
    }));

    history.push({
      role: "user",
      content,
    });

    // 5. Send message to AI

    const { reply, tokens } = await aiService.chat(
      SYSTEM_PROMPT,
      history
    );

    // 6. Save AI response

    const assistantMsgId = newId();

    db.prepare(`
      INSERT INTO chat_messages
      (
        id,
        session_id,
        role,
        content,
        tokens,
        created_at
      )
      VALUES (?, ?, 'ASSISTANT', ?, ?, ?)
    `).run(
      assistantMsgId,
      sessionId,
      reply,
      tokens,
      now()
    );

    // 7. Generate title only for a "New Chat"
    
    if (session.title === "New Chat") {
      const title =
        content.trim().length > 60
          ? content.trim().slice(0, 60) + "..."
          : content.trim();

      db.prepare(`
        UPDATE chat_sessions
        SET
          title = ?,
          updated_at = ?
        WHERE id = ?
        AND user_id = ?
      `).run(
        title,
        now(),
        sessionId,
        req.user.id
      );

    } else {

      // Existing title remains unchanged.
      // Only update the timestamp.

      db.prepare(`
        UPDATE chat_sessions
        SET updated_at = ?
        WHERE id = ?
        AND user_id = ?
      `).run(
        now(),
        sessionId,
        req.user.id
      );
    }

    // --------------------------------------------------------
    // 8. Get saved messages
    // --------------------------------------------------------

    const userMessage = toCamel(
      db
        .prepare(`
          SELECT *
          FROM chat_messages
          WHERE id = ?
        `)
        .get(userMsgId)
    );

    const assistantMessage = toCamel(
      db
        .prepare(`
          SELECT *
          FROM chat_messages
          WHERE id = ?
        `)
        .get(assistantMsgId)
    );

    // --------------------------------------------------------
    // 9. Return response
    // --------------------------------------------------------

    return res.json({
      userMessage,
      assistantMessage,
    });

  } catch (err) {
    next(err);
  }
};