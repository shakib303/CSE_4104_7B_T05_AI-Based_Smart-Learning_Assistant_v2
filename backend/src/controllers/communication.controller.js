const db=require('../config/db');const {newId,now,toCamel}=require('../utils/dbHelpers');
exports.educator=(req,res,next)=>{try{const r=db.prepare(`SELECT u.id,u.name,u.email,u.avatar,u.department,e.teacher_id,e.designation FROM students s JOIN users u ON u.id=s.assigned_teacher_id JOIN educators e ON e.user_id=u.id WHERE s.user_id=?`).get(req.user.id);res.json({educator:r?toCamel(r):null})}catch(e){next(e)}};
exports.contacts=(req,res,next)=>{try{
  if(req.user.role==='TEACHER'){
    const students=db.prepare(`SELECT u.id,u.name,u.email,u.avatar,s.student_id,s.approval_status FROM students s JOIN users u ON u.id=s.user_id WHERE s.assigned_teacher_id=? ORDER BY u.name`).all(req.user.id);
    return res.json({contacts:students.map(toCamel)});
  }
  if(req.user.role==='STUDENT'){
    const educator=db.prepare(`SELECT u.id,u.name,u.email,u.avatar,e.teacher_id,e.designation,e.department FROM students s JOIN users u ON u.id=s.assigned_teacher_id JOIN educators e ON e.user_id=u.id WHERE s.user_id=?`).get(req.user.id);
    return res.json({contacts:educator?[toCamel(educator)]:[]});
  }
  return res.json({contacts:[]});
}catch(e){next(e)}};
exports.resources=(req,res,next)=>{try{const rows=db.prepare(`SELECT r.*,u.name creator_name FROM resources r JOIN users u ON u.id=r.created_by WHERE r.created_by=? OR EXISTS(SELECT 1 FROM resource_assignments a WHERE a.resource_id=r.id AND a.user_id=?) ORDER BY r.created_at DESC`).all(req.user.id,req.user.id);res.json({resources:rows.map(toCamel)})}catch(e){next(e)}};
exports.messages=(req,res,next)=>{try{const rows=db.prepare(`SELECT m.*,s.name sender_name,r.name receiver_name FROM messages m JOIN users s ON s.id=m.sender_id JOIN users r ON r.id=m.receiver_id WHERE m.sender_id=? OR m.receiver_id=? ORDER BY m.created_at ASC`).all(req.user.id,req.user.id);res.json({messages:rows.map(toCamel)})}catch(e){next(e)}};
exports.sendMessage=(req,res,next)=>{try{const {receiverId,message}=req.body;const allowed=db.prepare(`SELECT 1 FROM students s WHERE s.user_id=? AND s.assigned_teacher_id=?`).get(req.user.id,receiverId)||db.prepare(`SELECT 1 FROM students s WHERE s.user_id=? AND s.assigned_teacher_id=?`).get(receiverId,req.user.id);if(!allowed)return res.status(403).json({error:'Messaging is limited to an assigned educator/student'});db.prepare('INSERT INTO messages(id,sender_id,receiver_id,message,created_at) VALUES(?,?,?,?,?)').run(newId(),req.user.id,receiverId,message,now());db.prepare('INSERT INTO notifications(id,user_id,title,message,type,link,created_at) VALUES(?,?,?,?,?,?,?)').run(newId(),receiverId,'New message',message,'message','/messages',now());res.status(201).json({message:'Message sent'})}catch(e){next(e)}};
exports.notifications=(req,res,next)=>{try{res.json({notifications:db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.user.id).map(toCamel)})}catch(e){next(e)}};
exports.markRead=(req,res,next)=>{try{db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id,req.user.id);res.json({message:'Marked as read'})}catch(e){next(e)}};
exports.complaints=(req,res,next)=>{try{res.json({complaints:db.prepare('SELECT * FROM complaints WHERE student_id=? ORDER BY created_at DESC').all(req.user.id).map(toCamel)})}catch(e){next(e)}};
exports.createComplaint=(req,res,next)=>{try{const {subject,category,description}=req.body;if(!subject||!description)return res.status(422).json({error:'Subject and description are required'});db.prepare('INSERT INTO complaints(id,student_id,subject,category,description,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(newId(),req.user.id,subject,category||null,description,now(),now());res.status(201).json({message:'Complaint submitted'})}catch(e){next(e)}};
