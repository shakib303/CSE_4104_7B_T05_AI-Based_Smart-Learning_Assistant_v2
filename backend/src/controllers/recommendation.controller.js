const db = require('../config/db');
const { newId, now } = require('../utils/dbHelpers');
const ai = require('../services/ai.service');

function context(userId){
  return {
    tasks: db.prepare(`SELECT title,status,priority,difficulty,due_date,progress,estimated_min FROM tasks WHERE user_id=? ORDER BY due_date LIMIT 20`).all(userId),
    subjects: db.prepare(`SELECT s.name,us.proficiency,us.target_score FROM user_subjects us JOIN subjects s ON s.id=us.subject_id WHERE us.user_id=?`).all(userId),
    study: db.prepare(`SELECT s.name,COALESCE(SUM(sl.duration_min),0) minutes FROM study_logs sl LEFT JOIN subjects s ON s.id=sl.subject_id WHERE sl.user_id=? GROUP BY sl.subject_id ORDER BY minutes DESC`).all(userId),
    quizzes: db.prepare(`SELECT topic,score,total_questions,created_at FROM quiz_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 15`).all(userId)
  };
}
exports.list=(req,res,next)=>{try{res.json({recommendations:db.prepare('SELECT * FROM recommendations WHERE user_id=? ORDER BY created_at DESC LIMIT 30').all(req.user.id)})}catch(e){next(e)}};
exports.generate=async(req,res,next)=>{try{
 const c=context(req.user.id);
 const r=await ai.chat('You are SmartLearn Personalized Recommendation Engine. Return JSON only: {items:[{title,description,type,subject,reason,url}]}. Use only evidence in the supplied data. Prefer actionable study materials, practice, videos or learning plans. Do not invent real URLs; set url to null unless a URL is supplied by the user.',[{role:'user',content:JSON.stringify(c)}]);
 const clean=String(r.reply).replace(/^```json\s*/i,'').replace(/^```/,'').replace(/```$/,'').trim(); const a=clean.indexOf('{'),b=clean.lastIndexOf('}'); const plan=JSON.parse(clean.slice(a,b+1));
 const items=Array.isArray(plan.items)?plan.items.slice(0,8):[];
 for(const x of items){const subject=db.prepare('SELECT id FROM subjects WHERE name=?').get(String(x.subject||''));db.prepare('INSERT INTO recommendations (id,title,description,url,type,subject_id,user_id,tags,rating,saved,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(newId(),String(x.title||'Study recommendation'),String(x.description||''),x.url||null,['VIDEO','ARTICLE','EXERCISE','BOOK','PODCAST','COURSE'].includes(x.type)?x.type:'ARTICLE',subject?.id||null,req.user.id,JSON.stringify([]),null,0,now())}
 res.json({items});
}catch(e){next(e)}};
