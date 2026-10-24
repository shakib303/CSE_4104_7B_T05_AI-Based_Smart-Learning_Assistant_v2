const db=require('../config/db');
exports.overview=(req,res,next)=>{try{
 const uid=req.user.id;
 const quiz=db.prepare('SELECT COUNT(*) c,COALESCE(AVG(score),0) avg_score,COALESCE(SUM(total_questions),0) questions FROM quiz_attempts WHERE user_id=?').get(uid);
 const study=db.prepare('SELECT COALESCE(SUM(duration_min),0) minutes,COUNT(*) sessions FROM study_logs WHERE user_id=?').get(uid);
 const tasks=db.prepare(`SELECT COUNT(*) total, SUM(status='DONE') done, SUM(status='IN_PROGRESS') progress, SUM(status='TODO') todo FROM tasks WHERE user_id=?`).get(uid);
 const subjects=db.prepare(`SELECT s.id,s.name,s.color,us.proficiency,us.target_score,COALESCE(SUM(sl.duration_min),0) study_minutes FROM user_subjects us JOIN subjects s ON s.id=us.subject_id LEFT JOIN study_logs sl ON sl.subject_id=s.id AND sl.user_id=? WHERE us.user_id=? GROUP BY s.id`).all(uid,uid);
 const weaknesses=subjects.filter(s=>Number(s.proficiency)<60).sort((a,b)=>a.proficiency-b.proficiency).slice(0,5);
 res.json({quiz:{attempts:Number(quiz.c),averageScore:Math.round(Number(quiz.avg_score)),questions:Number(quiz.questions)},study:{minutes:Number(study.minutes),sessions:Number(study.sessions)},tasks:{total:Number(tasks.total||0),done:Number(tasks.done||0),inProgress:Number(tasks.progress||0),todo:Number(tasks.todo||0)},subjects,weaknesses});
}catch(e){next(e)}};
exports.weaknesses=(req,res,next)=>{try{const uid=req.user.id;const rows=db.prepare(`SELECT s.id,s.name,s.color,us.proficiency,COALESCE(AVG(qa.score),0) quiz_score,COALESCE(SUM(sl.duration_min),0) study_minutes FROM user_subjects us JOIN subjects s ON s.id=us.subject_id LEFT JOIN quiz_attempts qa ON qa.user_id=us.user_id AND LOWER(qa.topic) LIKE '%'||LOWER(s.name)||'%' LEFT JOIN study_logs sl ON sl.user_id=us.user_id AND sl.subject_id=s.id WHERE us.user_id=? GROUP BY s.id ORDER BY proficiency ASC, quiz_score ASC`).all(uid);res.json({weaknesses:rows});}catch(e){next(e)}};
