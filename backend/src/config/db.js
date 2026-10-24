const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const DB_DIR = path.join(__dirname, '../../database');
const DB_PATH = path.join(DB_DIR, 'dev.db');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// Safe additive migration for the original database. The role CHECK in older
// schemas only allowed STUDENT/ADMIN, so rebuild users once if needed.
const userSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql || '';
if (!userSql.includes("'TEACHER'")) {
  db.exec('PRAGMA foreign_keys = OFF; BEGIN;');
  db.exec(`CREATE TABLE users_new (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, avatar TEXT,
    password TEXT, google_id TEXT UNIQUE, role TEXT NOT NULL DEFAULT 'STUDENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE', bio TEXT, timezone TEXT NOT NULL DEFAULT 'UTC',
    study_goal_hrs REAL NOT NULL DEFAULT 4, streak INTEGER NOT NULL DEFAULT 0,
    last_active_at TEXT, email_verified INTEGER NOT NULL DEFAULT 0,
    phone TEXT, department TEXT, academic_level TEXT, learning_goals TEXT,
    study_preferences TEXT, notification_preferences TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
  const oldCols = db.prepare('PRAGMA table_info(users)').all().map(x=>x.name);
  const get = (name, fallback) => oldCols.includes(name) ? name : fallback;
  db.exec(`INSERT INTO users_new (id,email,name,avatar,password,google_id,role,status,bio,timezone,study_goal_hrs,streak,last_active_at,email_verified,created_at,updated_at)
           SELECT id,email,name,avatar,password,google_id,role,'ACTIVE',bio,timezone,study_goal_hrs,streak,last_active_at,email_verified,created_at,updated_at FROM users;`);
  db.exec('DROP TABLE users; ALTER TABLE users_new RENAME TO users;');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);');
  db.exec('COMMIT; PRAGMA foreign_keys = ON;');
}

const add = [
 ['task_type', "ALTER TABLE tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'STUDY'"],
 ['difficulty', "ALTER TABLE tasks ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'MEDIUM'"],
 ['progress', "ALTER TABLE tasks ADD COLUMN progress INTEGER NOT NULL DEFAULT 0"],
 ['notes', 'ALTER TABLE tasks ADD COLUMN notes TEXT'],
 ['status', "ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'"],
 ['phone', 'ALTER TABLE users ADD COLUMN phone TEXT'],
 ['department', 'ALTER TABLE users ADD COLUMN department TEXT'],
 ['academic_level', 'ALTER TABLE users ADD COLUMN academic_level TEXT'],
 ['learning_goals', 'ALTER TABLE users ADD COLUMN learning_goals TEXT'],
 ['study_preferences', 'ALTER TABLE users ADD COLUMN study_preferences TEXT'],
 ['notification_preferences', 'ALTER TABLE users ADD COLUMN notification_preferences TEXT'],
 ['recurrence', "ALTER TABLE tasks ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'NONE'"],
 ['recurrence_end', 'ALTER TABLE tasks ADD COLUMN recurrence_end TEXT'],
 ['productivity_rating', 'ALTER TABLE study_logs ADD COLUMN productivity_rating INTEGER'],
];
for (const [col, sql] of add) {
  const table = ['task_type','difficulty','progress','notes','recurrence','recurrence_end'].includes(col) ? 'tasks' : (col === 'productivity_rating' ? 'study_logs' : 'users');
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name);
  if (!cols.includes(col)) db.exec(sql);
}

const extra = [
`CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY,user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,student_id TEXT UNIQUE NOT NULL,assigned_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,approval_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(approval_status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')));`,
`CREATE TABLE IF NOT EXISTS educators (id TEXT PRIMARY KEY,user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,teacher_id TEXT UNIQUE NOT NULL,designation TEXT,department TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')));`,
`CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,type TEXT NOT NULL CHECK(type IN ('PDF','DOCUMENT','LINK','TEXT','VIDEO','ARTICLE','EXERCISE','COURSE')),content TEXT,url TEXT,created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')));`,
`CREATE TABLE IF NOT EXISTS resource_assignments (id TEXT PRIMARY KEY,resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,created_at TEXT NOT NULL DEFAULT(datetime('now')),UNIQUE(resource_id,user_id));`,
`CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY,sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,message TEXT NOT NULL,read_status INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT(datetime('now')));`,
`CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY,teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,description TEXT,date TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING',created_at TEXT NOT NULL DEFAULT(datetime('now')));`,
`CREATE TABLE IF NOT EXISTS complaints (id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,subject TEXT NOT NULL,category TEXT,description TEXT NOT NULL,attachment TEXT,status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_REVIEW','RESOLVED','REJECTED')),admin_response TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')));`,
`CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE SET NULL,action TEXT NOT NULL,details TEXT,created_at TEXT NOT NULL DEFAULT(datetime('now')));`,
`CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(assigned_teacher_id);`,
`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);`,
`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id,read);`
];
for (const sql of extra) db.exec(sql);
module.exports = db;
