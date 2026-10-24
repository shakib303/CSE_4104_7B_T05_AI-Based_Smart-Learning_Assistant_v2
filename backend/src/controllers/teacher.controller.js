const db=require('../config/db');const {newId,now,toCamel}=require('../utils/dbHelpers');
function assigned(req,id){return !!db.prepare('SELECT 1 FROM students WHERE user_id=? AND assigned_teacher_id=?').get(id,req.user.id)}
exports.dashboard=(req,res,next)=>{try{const teacher=db.prepare(`SELECT u.id,u.name,u.email,u.avatar,u.phone,u.department,e.teacher_id,e.designation FROM users u JOIN educators e ON e.user_id=u.id WHERE u.id=?`).get(req.user.id);const students=db.prepare(`SELECT s.*,u.name,u.email,u.avatar FROM students s JOIN users u ON u.id=s.user_id WHERE s.assigned_teacher_id=? ORDER BY u.name`).all(req.user.id);const resources=db.prepare('SELECT * FROM resources WHERE created_by=? ORDER BY created_at DESC LIMIT 8').all(req.user.id);const messages=db.prepare(`SELECT m.*,u.name sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.receiver_id=? ORDER BY m.created_at DESC LIMIT 8`).all(req.user.id);const reminders=db.prepare(`SELECT r.*,u.name student_name FROM reminders r JOIN users u ON u.id=r.student_id WHERE r.teacher_id=? ORDER BY r.date DESC LIMIT 8`).all(req.user.id);res.json({teacher:toCamel(teacher),students:students.map(toCamel),resources:resources.map(toCamel),messages:messages.map(toCamel),reminders:reminders.map(toCamel)})}catch(e){next(e)}};
exports.students=(req,res,next)=>{try{res.json({students:db.prepare(`SELECT s.*,u.name,u.email,u.avatar,u.department FROM students s JOIN users u ON u.id=s.user_id WHERE s.assigned_teacher_id=? ORDER BY u.name`).all(req.user.id).map(toCamel)})}catch(e){next(e)}};
exports.sendMessage=(req,res,next)=>{try{const {studentId,message}=req.body;if(!assigned(req,studentId))return res.status(403).json({error:'You can only message assigned students'});const id=newId();db.prepare('INSERT INTO messages(id,sender_id,receiver_id,message,created_at) VALUES(?,?,?,?,?)').run(id,req.user.id,studentId,message,now());db.prepare('INSERT INTO notifications(id,user_id,title,message,type,link,created_at) VALUES(?,?,?,?,?,?,?)').run(newId(),studentId,'New message from educator',message,'message','/messages',now());res.status(201).json({message:'Message sent'})}catch(e){next(e)}};
exports.createReminder=(req,res,next)=>{try{const {studentId,title,description,date}=req.body;if(!assigned(req,studentId))return res.status(403).json({error:'Student is not assigned to you'});db.prepare('INSERT INTO reminders(id,teacher_id,student_id,title,description,date,created_at) VALUES(?,?,?,?,?,?,?)').run(newId(),req.user.id,studentId,title,description||null,date,now());db.prepare('INSERT INTO notifications(id,user_id,title,message,type,link,created_at) VALUES(?,?,?,?,?,?,?)').run(newId(),studentId,title,description||'New educator reminder','reminder','/notifications',now());res.status(201).json({message:'Reminder created'})}catch(e){next(e)}};
exports.resources=(req,res,next)=>{try{res.json({resources:db.prepare('SELECT * FROM resources WHERE created_by=? ORDER BY created_at DESC').all(req.user.id).map(toCamel)})}catch(e){next(e)}};
exports.createResource=(req,res,next)=>{try{const {title,description,type,content,url,studentIds=[]}=req.body;if(!title||!type)return res.status(422).json({error:'Title and resource type are required'});const id=newId(),ts=now();db.prepare('INSERT INTO resources(id,title,description,type,content,url,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,title,description||null,type,content||null,url||null,req.user.id,ts,ts);for(const sid of studentIds){if(assigned(req,sid))db.prepare('INSERT OR IGNORE INTO resource_assignments(id,resource_id,user_id) VALUES(?,?,?)').run(newId(),id,sid)}res.status(201).json({message:'Resource created',id})}catch(e){next(e)}};
exports.deleteResource=(req,res,next)=>{try{const r=db.prepare('SELECT id FROM resources WHERE id=? AND created_by=?').get(req.params.id,req.user.id);if(!r)return res.status(404).json({error:'Resource not found'});db.prepare('DELETE FROM resources WHERE id=?').run(req.params.id);res.json({message:'Resource deleted'})}catch(e){next(e)}};

exports.studentAnalysis=(req,res,next)=>{try{
  const id=req.params.id;
  if(!assigned(req,id))return res.status(403).json({error:'You can only analyze students assigned to you'});
  const user=db.prepare(`SELECT u.id,u.name,u.email,u.avatar,u.department,u.academic_level,u.streak,u.last_active_at,
    s.student_id,s.approval_status FROM users u JOIN students s ON s.user_id=u.id
    WHERE u.id=? AND u.role='STUDENT'`).get(id);
  if(!user)return res.status(404).json({error:'Student not found'});
  const quiz=db.prepare(`SELECT COUNT(*) attempts,COALESCE(AVG(score),0) average_score,
    COALESCE(SUM(total_questions),0) questions FROM quiz_attempts WHERE user_id=?`).get(id);
  const study=db.prepare(`SELECT COALESCE(SUM(duration_min),0) minutes,COUNT(*) sessions,
    COALESCE(AVG(productivity_rating),0) productivity FROM study_logs WHERE user_id=?`).get(id);
  const tasks=db.prepare(`SELECT COUNT(*) total,COALESCE(SUM(status='DONE'),0) done,
    COALESCE(SUM(status='IN_PROGRESS'),0) in_progress,COALESCE(SUM(status='TODO'),0) pending,
    COALESCE(SUM(status NOT IN ('DONE','CANCELLED') AND due_date IS NOT NULL
      AND datetime(due_date)<datetime('now')),0) overdue FROM tasks WHERE user_id=?`).get(id);
  const subjects=db.prepare(`SELECT s.id,s.name,s.color,us.proficiency,us.target_score,
    COALESCE(SUM(sl.duration_min),0) study_minutes FROM user_subjects us
    JOIN subjects s ON s.id=us.subject_id
    LEFT JOIN study_logs sl ON sl.subject_id=s.id AND sl.user_id=?
    WHERE us.user_id=? GROUP BY s.id ORDER BY us.proficiency ASC`).all(id,id);
  const recentTasks=db.prepare(`SELECT t.id,t.title,t.status,t.priority,t.progress,t.due_date,t.estimated_min,
    s.name subject_name FROM tasks t LEFT JOIN subjects s ON s.id=t.subject_id
    WHERE t.user_id=? ORDER BY t.updated_at DESC LIMIT 8`).all(id).map(toCamel);
  const recentQuizzes=db.prepare(`SELECT title,topic,score,total_questions,created_at
    FROM quiz_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 8`).all(id).map(toCamel);
  res.json({
    student:toCamel(user),
    quiz:{attempts:Number(quiz.attempts),averageScore:Math.round(Number(quiz.average_score)),questions:Number(quiz.questions)},
    study:{minutes:Number(study.minutes),sessions:Number(study.sessions),productivity:Math.round(Number(study.productivity))},
    tasks:{total:Number(tasks.total),done:Number(tasks.done),inProgress:Number(tasks.in_progress),pending:Number(tasks.pending),overdue:Number(tasks.overdue)},
    subjects:subjects.map(toCamel),recentTasks,recentQuizzes
  });
}catch(e){next(e)}};
