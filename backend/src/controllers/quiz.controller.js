const db = require('../config/db');
const { newId, now } = require('../utils/dbHelpers');
const ai = require('../services/ai.service');

function parseJson(text) {
  const clean = String(text || '').replace(/^```json\s*/i,'').replace(/^```/,'').replace(/```$/,'').trim();
  const a = clean.indexOf('{'), b = clean.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('AI returned invalid quiz JSON');
  return JSON.parse(clean.slice(a, b + 1));
}

exports.generate = async (req, res, next) => {
  try {
    const topic = String(req.body.topic || '').trim();
    const count = Math.min(10, Math.max(3, Number(req.body.count) || 5));
    const difficulty = ['EASY','MEDIUM','HARD'].includes(req.body.difficulty) ? req.body.difficulty : 'MEDIUM';
    if (!topic) return res.status(422).json({ error: 'Topic is required' });

    const prompt = `Create a ${count}-question academic multiple-choice quiz about "${topic}" at ${difficulty} difficulty. Return JSON only: {title,topic,questions:[{question,options:[4 strings],answerIndex,explanation}]} . Questions must have exactly four options and answerIndex must be 0-3. Use simple, accurate language suitable for university students.`;
    const result = await ai.chat('You are SmartLearn Quiz Generator. Generate accurate educational quizzes and return JSON only.', [{ role:'user', content: prompt }]);
    const quiz = parseJson(result.reply);
    quiz.questions = Array.isArray(quiz.questions) ? quiz.questions.slice(0,count).map(q => ({
      question: String(q.question || ''),
      options: Array.isArray(q.options) ? q.options.slice(0,4).map(String) : [],
      answerIndex: Math.min(3, Math.max(0, Number(q.answerIndex) || 0)),
      explanation: String(q.explanation || '')
    })).filter(q => q.question && q.options.length === 4) : [];
    if (!quiz.questions.length) throw new Error('AI generated no valid questions');
    res.json({ quiz });
  } catch (e) { next(e); }
};

exports.submit = (req, res, next) => {
  try {
    const { title, topic, questions, answers, score } = req.body;
    if (!Array.isArray(questions) || !Array.isArray(answers)) return res.status(422).json({ error:'Questions and answers are required' });
    const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    const id = newId();
    db.prepare(`INSERT INTO quiz_attempts (id,user_id,title,topic,score,total_questions,answers,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, req.user.id, String(title || 'Quiz'), String(topic || 'General'), safeScore, questions.length, JSON.stringify(answers), now());
    res.status(201).json({ attempt: db.prepare('SELECT * FROM quiz_attempts WHERE id=?').get(id) });
  } catch (e) { next(e); }
};

exports.history = (req,res,next) => {
  try {
    const attempts = db.prepare('SELECT * FROM quiz_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 30').all(req.user.id);
    res.json({ attempts });
  } catch(e){ next(e); }
};
