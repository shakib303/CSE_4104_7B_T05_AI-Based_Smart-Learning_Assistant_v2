const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { newId, now, toCamel } = require('../utils/dbHelpers');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

function safeUser(row){ const u=toCamel(row); delete u.password; delete u.googleId; return u; }
function issueSession(row,res){
  const user=safeUser(row), accessToken=generateAccessToken(user), refreshToken=generateRefreshToken(user);
  db.prepare('INSERT INTO refresh_tokens (id,token,user_id,expires_at,created_at) VALUES (?,?,?,?,?)')
    .run(newId(),refreshToken,row.id,new Date(Date.now()+7*86400000).toISOString(),now());
  res.cookie('refreshToken',refreshToken,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:7*86400000});
  return {user,accessToken};
}

exports.register = async (req,res,next)=>{try{
  const {name,email,password,studentId,department,phone,academicLevel,learningGoals,studyPreferences}=req.body;
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.status(409).json({error:'Email already registered'});
  if(!studentId) return res.status(422).json({error:'Student ID is required'});
  if(db.prepare('SELECT id FROM students WHERE student_id=?').get(studentId)) return res.status(409).json({error:'Student ID already registered'});
  const id=newId(), ts=now(), hash=await bcrypt.hash(password,12);
  db.prepare(`INSERT INTO users(id,email,name,password,role,status,phone,department,academic_level,learning_goals,study_preferences,email_verified,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,email,name,hash,'STUDENT','PENDING',phone||null,department||null,academicLevel||null,JSON.stringify(learningGoals||[]),JSON.stringify(studyPreferences||{}),0,ts,ts);
  db.prepare(`INSERT INTO students(id,user_id,student_id,approval_status,created_at,updated_at) VALUES(?,?,?,?,?,?)`).run(newId(),id,studentId,'PENDING',ts,ts);
  db.prepare(`INSERT INTO notifications(id,user_id,title,message,type,created_at) VALUES(?,?,?,?,?,?)`).run(newId(),id,'Account submitted','Your student account is waiting for administrator approval.','account',ts);
  return res.status(201).json({message:'Registration submitted. Your account is waiting for administrator approval.',status:'PENDING',user:{id,name,email,role:'STUDENT',status:'PENDING'}});
}catch(e){next(e)}};

async function login(req,res,next,expectedRole){try{
  const {email,password}=req.body; const row=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(!row||!row.password) return res.status(401).json({error:'Invalid credentials'});
  if(expectedRole && row.role!==expectedRole) return res.status(403).json({error:`This account is not a ${expectedRole.toLowerCase()} account.`});
  if(row.role==='STUDENT'){
    const st=db.prepare('SELECT approval_status FROM students WHERE user_id=?').get(row.id);
    const status=st?.approval_status||row.status;
    if(status!=='APPROVED') return res.status(403).json({error: status==='PENDING'?'Your account is waiting for administrator approval.':status==='REJECTED'?'Your student account was rejected.':'Your student account is suspended.'});
  }
  if(row.status==='SUSPENDED') return res.status(403).json({error:'This account is suspended.'});
  if(!(await bcrypt.compare(password,row.password))) return res.status(401).json({error:'Invalid credentials'});
  db.prepare('UPDATE users SET last_active_at=?,updated_at=? WHERE id=?').run(now(),now(),row.id);
  return res.json(issueSession(row,res));
}catch(e){next(e)}}
exports.login=(req,res,next)=>login(req,res,next,req.body.role==='TEACHER'?'TEACHER':req.body.role==='ADMIN'?'ADMIN':undefined);
exports.studentLogin=(req,res,next)=>login(req,res,next,'STUDENT');
exports.teacherLogin=(req,res,next)=>login(req,res,next,'TEACHER');
exports.adminLogin=(req,res,next)=>login(req,res,next,'ADMIN');
exports.logout=(req,res,next)=>{try{if(req.cookies.refreshToken)db.prepare('DELETE FROM refresh_tokens WHERE token=?').run(req.cookies.refreshToken);res.clearCookie('refreshToken');res.json({message:'Logged out successfully'})}catch(e){next(e)}};
exports.refreshToken=(req,res,next)=>{try{const token=req.cookies.refreshToken||req.body.refreshToken;if(!token)return res.status(401).json({error:'No refresh token'});const st=db.prepare('SELECT * FROM refresh_tokens WHERE token=?').get(token);if(!st||new Date(st.expires_at)<new Date())return res.status(401).json({error:'Invalid or expired refresh token'});const p=verifyRefreshToken(token),row=db.prepare('SELECT * FROM users WHERE id=?').get(p.id);if(!row)return res.status(401).json({error:'User not found'});res.json({accessToken:generateAccessToken(safeUser(row))})}catch(e){next(e)}};
exports.getMe=(req,res,next)=>{try{const row=db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);if(!row)return res.status(404).json({error:'User not found'});const user=safeUser(row);if(row.role==='STUDENT')user.student=db.prepare('SELECT * FROM students WHERE user_id=?').get(row.id);if(row.role==='TEACHER')user.educator=db.prepare('SELECT * FROM educators WHERE user_id=?').get(row.id);res.json({user})}catch(e){next(e)}};
