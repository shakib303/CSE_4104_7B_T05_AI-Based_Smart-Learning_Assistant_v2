-- database/schema.sql
-- AI-Based Smart Learning Assistant — Database Schema
-- Engine: SQLite (local dev) — fully portable to PostgreSQL for production
-- (see docs/DatabaseDesign.md for the production migration note)

PRAGMA foreign_keys = ON;

-- ── USERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  avatar          TEXT,
  password        TEXT,
  google_id       TEXT UNIQUE,
  role            TEXT NOT NULL DEFAULT 'STUDENT',
  bio             TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  phone           TEXT,
  department      TEXT,
  academic_level  TEXT,
  learning_goals  TEXT,
  study_preferences TEXT,
  notification_preferences TEXT,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  study_goal_hrs  REAL NOT NULL DEFAULT 4,
  streak          INTEGER NOT NULL DEFAULT 0,
  last_active_at  TEXT,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── REFRESH TOKENS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  token       TEXT UNIQUE NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ── SUBJECTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          TEXT PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  icon        TEXT,
  color       TEXT NOT NULL DEFAULT '#3B82F6',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── USER_SUBJECTS (many-to-many) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subjects (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id    TEXT NOT NULL REFERENCES subjects(id),
  proficiency   INTEGER NOT NULL DEFAULT 50,
  target_score  REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, subject_id)
);

-- ── TASKS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO','IN_PROGRESS','DONE','CANCELLED')),
  priority       TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  task_type      TEXT NOT NULL DEFAULT 'STUDY' CHECK(task_type IN ('ASSIGNMENT','STUDY','EXAM_PREPARATION','PROJECT','READING','PRACTICE','REVISION','PERSONAL_LEARNING')),
  difficulty     TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(difficulty IN ('EASY','MEDIUM','HARD')),
  progress       INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  notes          TEXT,
  due_date       TEXT,
  estimated_min  INTEGER,
  actual_min     INTEGER,
  tags           TEXT NOT NULL DEFAULT '[]',
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id     TEXT REFERENCES subjects(id),
  completed_at   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  recurrence     TEXT NOT NULL DEFAULT 'NONE',
  recurrence_end TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ── STUDY PLANS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_plans (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','ARCHIVED')),
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── CHAT SESSIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

-- ── CHAT MESSAGES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK(role IN ('USER','ASSISTANT','SYSTEM')),
  content     TEXT NOT NULL,
  tokens      INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- ── RECOMMENDATIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  type        TEXT NOT NULL CHECK(type IN ('VIDEO','ARTICLE','EXERCISE','BOOK','PODCAST','COURSE')),
  subject_id  TEXT REFERENCES subjects(id),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tags        TEXT NOT NULL DEFAULT '[]',
  rating      REAL,
  saved       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── STUDY LOGS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id    TEXT REFERENCES subjects(id),
  duration_min  INTEGER NOT NULL,
  notes         TEXT,
  productivity_rating INTEGER,
  date          TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_study_logs_user ON study_logs(user_id);

-- ── NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',
  read        INTEGER NOT NULL DEFAULT 0,
  link        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);


-- QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, topic TEXT NOT NULL, score REAL NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0, answers TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);

-- DOCUMENT ANALYSIS HISTORY
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, mime_type TEXT, size_bytes INTEGER, summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);


-- ── ROLE / COMMUNICATION TABLES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT UNIQUE NOT NULL,
  assigned_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  approval_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS educators (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT UNIQUE NOT NULL,
  designation TEXT,
  department TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,type TEXT NOT NULL,
  content TEXT,url TEXT,created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS resource_assignments (
  id TEXT PRIMARY KEY,resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),UNIQUE(resource_id,user_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,message TEXT NOT NULL,
  read_status INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,
  description TEXT,date TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,category TEXT,description TEXT NOT NULL,attachment TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',admin_response TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,details TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(assigned_teacher_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,read);
