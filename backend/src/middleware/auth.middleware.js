const { verifyAccessToken } = require('../utils/jwt');

exports.authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Access token required' });
  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch { return res.status(401).json({ error: 'Invalid or expired access token' }); }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
  next();
};
exports.requireAdmin = exports.requireRole('ADMIN');
exports.requireTeacher = exports.requireRole('TEACHER');
exports.requireStudent = exports.requireRole('STUDENT');
