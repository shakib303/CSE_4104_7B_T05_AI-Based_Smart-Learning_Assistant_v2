const db = require('../config/db');
const { newId, now } = require('../utils/dbHelpers');
const ai = require('../services/ai.service');

exports.list = (req,res,next) => {
  try { res.json({ documents: db.prepare('SELECT id,name,mime_type,size_bytes,summary,created_at FROM documents WHERE user_id=? ORDER BY created_at DESC').all(req.user.id) }); }
  catch(e){ next(e); }
};

exports.analyze = async (req,res,next) => {
  try {
    const { name, mimeType, data, instruction } = req.body;
    if (!name || !data) return res.status(422).json({ error:'File name and data are required' });
    const allowed = ['application/pdf','image/png','image/jpeg','image/webp','text/plain'];
    const mime = allowed.includes(mimeType) ? mimeType : 'application/pdf';
    const raw = String(data).replace(/^data:[^;]+;base64,/, '');
    if (raw.length > 8 * 1024 * 1024) return res.status(413).json({ error:'File is too large. Keep uploads under 6 MB.' });
    const result = await ai.analyzeDocument(mime, raw, instruction || 'Explain this study material in simple English. Identify key concepts, important definitions, examples, and likely exam points. If appropriate, also provide a short study checklist.');
    const summary = result.reply;
    const id = newId();
    db.prepare('INSERT INTO documents (id,user_id,name,mime_type,size_bytes,summary,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(id, req.user.id, String(name), mime, Math.floor(raw.length * 0.75), summary, now());
    res.status(201).json({ document:{ id,name,mimeType:mime,sizeBytes:Math.floor(raw.length*0.75),summary,createdAt:now() } });
  } catch(e){ next(e); }
};
