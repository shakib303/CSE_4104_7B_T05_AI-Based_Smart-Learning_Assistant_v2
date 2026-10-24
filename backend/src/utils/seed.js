// src/utils/seed.js
try { require("dotenv").config(); } catch {}
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { newId, now } = require("./dbHelpers");

async function main() {
  console.log("🌱 Seeding database...");

  const subjects = [
    { name: "Mathematics", color: "#3B82F6", icon: "📐" },
    { name: "Physics", color: "#8B5CF6", icon: "⚛️" },
    { name: "Chemistry", color: "#10B981", icon: "🧪" },
    { name: "Computer Science", color: "#EF4444", icon: "💻" },
    { name: "Literature", color: "#EC4899", icon: "📖" },
  ];

  const subjectIds = {};
  for (const subj of subjects) {
    const existing = db.prepare("SELECT id FROM subjects WHERE name = ?").get(subj.name);
    if (existing) {
      subjectIds[subj.name] = existing.id;
      continue;
    }
    const id = newId();
    db.prepare("INSERT INTO subjects (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, subj.name, subj.color, subj.icon, now());
    subjectIds[subj.name] = id;
  }

  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get("demo@smartlearning.app");
  let userId;
  if (existingUser) {
    userId = existingUser.id;
    console.log("Demo user already exists, skipping creation.");
  } else {
    const hashedPwd = await bcrypt.hash("Demo@1234", 12);
    userId = newId();
    const timestamp = now();
    db.prepare(`
      INSERT INTO users (id, name, email, password, email_verified, study_goal_hrs, streak, bio, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).run(userId, "Demo Student", "demo@smartlearning.app", hashedPwd, 5, 7,
      "Passionate learner exploring computer science and mathematics.", timestamp, timestamp);
  }

  const enroll = [["Computer Science", 75], ["Mathematics", 60], ["Physics", 45]];
  for (const [subjName, prof] of enroll) {
    const subjId = subjectIds[subjName];
    const existing = db.prepare("SELECT id FROM user_subjects WHERE user_id = ? AND subject_id = ?").get(userId, subjId);
    if (!existing) {
      db.prepare("INSERT INTO user_subjects (id, user_id, subject_id, proficiency, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(newId(), userId, subjId, prof, now());
    }
  }


  // Demo accounts for role-based testing. Change these passwords before deployment.
  const adminHash = await bcrypt.hash("Admin@1234", 12);
  const admin = db.prepare("SELECT id FROM users WHERE email=?").get("admin@smartlearning.app");
  if (!admin) db.prepare("INSERT INTO users(id,name,email,password,role,status,email_verified,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").run(newId(),"SmartLearn Admin","admin@smartlearning.app",adminHash,"ADMIN","ACTIVE",1,now(),now());
  else db.prepare("UPDATE users SET password=?,role='ADMIN',status='ACTIVE',email_verified=1,updated_at=? WHERE id=?").run(adminHash,now(),admin.id);
  const teacherHash = await bcrypt.hash("Teacher@1234", 12);
  const teacher = db.prepare("SELECT id FROM users WHERE email=?").get("teacher@smartlearning.app");
  let teacherId = teacher?.id;
  if (!teacher) { teacherId=newId(); db.prepare("INSERT INTO users(id,name,email,password,role,status,email_verified,department,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").run(teacherId,"Demo Educator","teacher@smartlearning.app",teacherHash,"TEACHER","ACTIVE",1,"Computer Science",now(),now()); db.prepare("INSERT INTO educators(id,user_id,teacher_id,designation,department,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(newId(),teacherId,"T-001","Lecturer","Computer Science",now(),now()); }
  else db.prepare("UPDATE users SET password=?,role='TEACHER',status='ACTIVE',email_verified=1,updated_at=? WHERE id=?").run(teacherHash,now(),teacherId);
  if (!db.prepare("SELECT id FROM students WHERE user_id=?").get(userId)) db.prepare("INSERT INTO students(id,user_id,student_id,approval_status,assigned_teacher_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(newId(),userId,"STU-DEMO","APPROVED",teacherId,now(),now());
  db.prepare("UPDATE students SET approval_status='APPROVED',assigned_teacher_id=?,updated_at=? WHERE user_id=?").run(teacherId,now(),userId);
  db.prepare("UPDATE users SET status='ACTIVE',email_verified=1 WHERE id=?").run(userId);

  console.log("✅ Seed complete!");
  console.log("🔑 Demo admin: admin@smartlearning.app / Admin@1234");
  console.log("👨‍🏫 Demo teacher: teacher@smartlearning.app / Teacher@1234");
  console.log("📧 Demo login: demo@smartlearning.app / Demo@1234");
}

main().catch((err) => { console.error(err); process.exit(1); });
