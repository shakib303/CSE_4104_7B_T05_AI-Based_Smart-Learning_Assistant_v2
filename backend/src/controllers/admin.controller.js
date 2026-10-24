const bcrypt=require('bcryptjs');
const db=require('../config/db');
const {newId,now,toCamel}=require('../utils/dbHelpers');

exports.overview=(req,res,next)=>{try{
  const q=(sql)=>db.prepare(sql).get();
  res.json({
    students:{
      total:q("SELECT COUNT(*) c FROM students").c,
      pending:q("SELECT COUNT(*) c FROM students WHERE approval_status='PENDING'").c,
      approved:q("SELECT COUNT(*) c FROM students WHERE approval_status='APPROVED'").c,
      suspended:q("SELECT COUNT(*) c FROM students WHERE approval_status='SUSPENDED'").c
    },
    teachers:{
      total:q("SELECT COUNT(*) c FROM users WHERE role='TEACHER'").c,
      active:q("SELECT COUNT(*) c FROM users WHERE role='TEACHER' AND status='ACTIVE'").c
    },
    resources:q("SELECT COUNT(*) c FROM resources").c,
    complaints:q("SELECT COUNT(*) c FROM complaints WHERE status IN ('PENDING','IN_REVIEW')").c,
    activity:q("SELECT COUNT(*) c FROM audit_logs WHERE created_at>=datetime('now','-7 day')").c,
    tasks:q("SELECT COUNT(*) c FROM tasks").c,
    completedTasks:q("SELECT COUNT(*) c FROM tasks WHERE status='DONE'").c,
    activeUsers:q("SELECT COUNT(*) c FROM users WHERE status='ACTIVE'").c
  });
}catch(e){next(e)}};

exports.stats=exports.overview;

exports.students=(req,res,next)=>{try{
  const {status,search}=req.query;
  let sql=`SELECT s.*,u.name,u.email,u.phone,u.department,u.avatar,t.name teacher_name
           FROM students s JOIN users u ON u.id=s.user_id
           LEFT JOIN users t ON t.id=s.assigned_teacher_id WHERE 1=1`;
  const p=[];
  if(status){sql+=' AND s.approval_status=?';p.push(status)}
  if(search){sql+=' AND (u.name LIKE ? OR u.email LIKE ? OR s.student_id LIKE ?)';const x=`%${search}%`;p.push(x,x,x)}
  sql+=' ORDER BY s.created_at DESC';
  res.json({students:db.prepare(sql).all(...p).map(toCamel)});
}catch(e){next(e)}};

exports.setStudentStatus=(req,res,next)=>{try{
  const {status}=req.body;
  if(!['PENDING','APPROVED','REJECTED','SUSPENDED'].includes(status))
    return res.status(422).json({error:'Invalid status'});
  const st=db.prepare('SELECT * FROM students WHERE user_id=?').get(req.params.id);
  if(!st)return res.status(404).json({error:'Student not found'});
  const ts=now();
  db.prepare('UPDATE students SET approval_status=?,updated_at=? WHERE user_id=?').run(status,ts,req.params.id);
  db.prepare('UPDATE users SET status=?,updated_at=? WHERE id=?')
    .run(status==='SUSPENDED'?'SUSPENDED':'ACTIVE',ts,req.params.id);
  db.prepare('INSERT INTO notifications(id,user_id,title,message,type,created_at) VALUES(?,?,?,?,?,?)')
    .run(newId(),req.params.id,'Account status updated',`Your student account is now ${status.toLowerCase()}.`,'account',ts);
  db.prepare('INSERT INTO audit_logs(id,user_id,action,details) VALUES(?,?,?,?)')
    .run(newId(),req.user.id,'STUDENT_STATUS',`${req.params.id}:${status}`);
  res.json({message:'Student status updated'});
}catch(e){next(e)}};

exports.deleteStudent=(req,res,next)=>{try{
  db.prepare("DELETE FROM users WHERE id=? AND role='STUDENT'").run(req.params.id);
  res.json({message:'Student deleted'});
}catch(e){next(e)}};

exports.teachers=(req,res,next)=>{try{
  const rows=db.prepare(`SELECT u.id,u.name,u.email,u.phone,u.department,u.avatar,u.status,
    e.teacher_id,e.designation,
    (SELECT COUNT(*) FROM students s WHERE s.assigned_teacher_id=u.id) assigned_students
    FROM users u JOIN educators e ON e.user_id=u.id
    WHERE u.role='TEACHER' ORDER BY u.name`).all();
  res.json({teachers:rows.map(toCamel)});
}catch(e){next(e)}};

exports.createTeacher=async(req,res,next)=>{try{
  const {name,email,password,teacherId,designation,department,phone}=req.body;
  if(!name||!email||!password||!teacherId)
    return res.status(422).json({error:'Name, email, password and teacher ID are required'});
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email))
    return res.status(409).json({error:'Email already registered'});
  const id=newId(),ts=now(),hash=await bcrypt.hash(password,12);
  db.prepare(`INSERT INTO users(id,email,name,password,role,status,phone,department,email_verified,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,1,?,?)`).run(id,email,name,hash,'TEACHER','ACTIVE',phone||null,department||null,ts,ts);
  db.prepare(`INSERT INTO educators(id,user_id,teacher_id,designation,department,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?)`).run(newId(),id,teacherId,designation||null,department||null,ts,ts);
  res.status(201).json({message:'Teacher created'});
}catch(e){next(e)}};

exports.updateTeacher=(req,res,next)=>{try{
  const {name,email,phone,department,designation,status}=req.body;
  db.prepare(`UPDATE users SET name=COALESCE(?,name),email=COALESCE(?,email),
    phone=COALESCE(?,phone),department=COALESCE(?,department),
    status=COALESCE(?,status),updated_at=? WHERE id=? AND role='TEACHER'`)
    .run(name,email,phone,department,status,now(),req.params.id);
  db.prepare(`UPDATE educators SET designation=COALESCE(?,designation),
    department=COALESCE(?,department),updated_at=? WHERE user_id=?`)
    .run(designation,department,now(),req.params.id);
  res.json({message:'Teacher updated'});
}catch(e){next(e)}};

exports.deleteTeacher=(req,res,next)=>{try{
  db.prepare("DELETE FROM users WHERE id=? AND role='TEACHER'").run(req.params.id);
  res.json({message:'Teacher deleted'});
}catch(e){next(e)}};

exports.assignTeacher=(req,res,next)=>{try{
  const {teacherId}=req.body;
  const teacher=db.prepare("SELECT id FROM users WHERE id=? AND role='TEACHER' AND status='ACTIVE'").get(teacherId);
  if(!teacher)return res.status(404).json({error:'Active teacher not found'});
  db.prepare('UPDATE students SET assigned_teacher_id=?,updated_at=? WHERE user_id=?').run(teacherId,now(),req.params.studentId);
  res.json({message:'Teacher assigned'});
}catch(e){next(e)}};

exports.complaints=(req,res,next)=>{try{
  const rows=db.prepare(`SELECT c.*,u.name student_name,u.email student_email
    FROM complaints c JOIN users u ON u.id=c.student_id ORDER BY c.created_at DESC`).all();
  res.json({complaints:rows.map(toCamel)});
}catch(e){next(e)}};

exports.updateComplaint=(req,res,next)=>{try{
  const {status,adminResponse}=req.body;
  db.prepare('UPDATE complaints SET status=?,admin_response=?,updated_at=? WHERE id=?')
    .run(status,adminResponse||null,now(),req.params.id);
  const c=db.prepare('SELECT student_id FROM complaints WHERE id=?').get(req.params.id);
  if(c)db.prepare('INSERT INTO notifications(id,user_id,title,message,type,link,created_at) VALUES(?,?,?,?,?,?,?)')
    .run(newId(),c.student_id,'Complaint response',adminResponse ? `Admin response: ${adminResponse}` : `Your complaint status is ${status}.`,'complaint','/complaints',now());
  res.json({message:'Complaint updated'});
}catch(e){next(e)}};

exports.activity=(req,res,next)=>{try{
  res.json({logs:db.prepare(`SELECT a.*,u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
    ORDER BY a.created_at DESC LIMIT 100`).all().map(toCamel)});
}catch(e){next(e)}};

exports.resources=(req,res,next)=>{try{
  res.json({resources:db.prepare(`SELECT r.*,u.name creator_name FROM resources r
    JOIN users u ON u.id=r.created_by ORDER BY r.created_at DESC`).all().map(toCamel)});
}catch(e){next(e)}};

exports.createResource=(req,res,next)=>{try{
  const {title,description,type,content,url,studentIds=[]}=req.body;
  if(!title||!type)return res.status(422).json({error:'Title and type required'});
  if(!Array.isArray(studentIds)||studentIds.length===0)return res.status(422).json({error:'Select at least one student'});
  const valid=studentIds.filter(id=>db.prepare("SELECT id FROM users WHERE id=? AND role='STUDENT' AND status!='SUSPENDED'").get(id));
  if(!valid.length)return res.status(422).json({error:'No valid students selected'});
  const id=newId(),ts=now();
  db.prepare(`INSERT INTO resources(id,title,description,type,content,url,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).run(id,title,description||null,type,content||null,url||null,req.user.id,ts,ts);
  const insert=db.prepare('INSERT OR IGNORE INTO resource_assignments(id,resource_id,user_id) VALUES(?,?,?)');
  const notify=db.prepare('INSERT INTO notifications(id,user_id,title,message,type,link,created_at) VALUES(?,?,?,?,?,?,?)');
  // node:sqlite DatabaseSync does not expose better-sqlite3's db.transaction().
  // Use SQLite's native transaction statements so resource assignments and
  // notifications are committed atomically.
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const sid of valid) {
      insert.run(newId(), id, sid);
      notify.run(newId(), sid, 'New study resource', `A new resource “${title}” was shared with you.`, 'resource', '/resources', ts);
    }
    db.exec('COMMIT');
  } catch (transactionError) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    throw transactionError;
  }
  res.status(201).json({id,assignedCount:valid.length});
}catch(e){next(e)}};

exports.deleteResource=(req,res,next)=>{try{
  db.prepare('DELETE FROM resources WHERE id=?').run(req.params.id);
  res.json({message:'Resource deleted'});
}catch(e){next(e)}};

function studentAnalysis(studentUserId){
  const user=db.prepare(`SELECT u.id,u.name,u.email,u.avatar,u.department,u.academic_level,u.streak,u.last_active_at,
    s.student_id,s.approval_status,s.assigned_teacher_id,t.name teacher_name
    FROM users u JOIN students s ON s.user_id=u.id
    LEFT JOIN users t ON t.id=s.assigned_teacher_id
    WHERE u.id=? AND u.role='STUDENT'`).get(studentUserId);
  if(!user)return null;
  const quiz=db.prepare(`SELECT COUNT(*) attempts,COALESCE(AVG(score),0) average_score,
    COALESCE(SUM(total_questions),0) questions FROM quiz_attempts WHERE user_id=?`).get(studentUserId);
  const study=db.prepare(`SELECT COALESCE(SUM(duration_min),0) minutes,COUNT(*) sessions,
    COALESCE(AVG(productivity_rating),0) productivity FROM study_logs WHERE user_id=?`).get(studentUserId);
  const tasks=db.prepare(`SELECT COUNT(*) total,COALESCE(SUM(status='DONE'),0) done,
    COALESCE(SUM(status='IN_PROGRESS'),0) in_progress,COALESCE(SUM(status='TODO'),0) pending,
    COALESCE(SUM(status NOT IN ('DONE','CANCELLED') AND due_date IS NOT NULL
      AND datetime(due_date)<datetime('now')),0) overdue FROM tasks WHERE user_id=?`).get(studentUserId);
  const subjects=db.prepare(`SELECT s.id,s.name,s.color,us.proficiency,us.target_score,
    COALESCE(SUM(sl.duration_min),0) study_minutes FROM user_subjects us
    JOIN subjects s ON s.id=us.subject_id
    LEFT JOIN study_logs sl ON sl.subject_id=s.id AND sl.user_id=?
    WHERE us.user_id=? GROUP BY s.id ORDER BY us.proficiency ASC`).all(studentUserId,studentUserId);
  const recentTasks=db.prepare(`SELECT t.id,t.title,t.status,t.priority,t.progress,t.due_date,t.estimated_min,
    s.name subject_name FROM tasks t LEFT JOIN subjects s ON s.id=t.subject_id
    WHERE t.user_id=? ORDER BY t.updated_at DESC LIMIT 8`).all(studentUserId).map(toCamel);
  const recentQuizzes=db.prepare(`SELECT title,topic,score,total_questions,created_at
    FROM quiz_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 8`).all(studentUserId).map(toCamel);
  return {
    student:toCamel(user),
    quiz:{attempts:Number(quiz.attempts),averageScore:Math.round(Number(quiz.average_score)),questions:Number(quiz.questions)},
    study:{minutes:Number(study.minutes),sessions:Number(study.sessions),productivity:Math.round(Number(study.productivity))},
    tasks:{total:Number(tasks.total),done:Number(tasks.done),inProgress:Number(tasks.in_progress),pending:Number(tasks.pending),overdue:Number(tasks.overdue)},
    subjects:subjects.map(toCamel),recentTasks,recentQuizzes
  };
}
exports.studentAnalysis=(req,res,next)=>{try{
  const data=studentAnalysis(req.params.id);
  if(!data)return res.status(404).json({error:'Student not found'});
  res.json(data);
}catch(e){next(e)}};
