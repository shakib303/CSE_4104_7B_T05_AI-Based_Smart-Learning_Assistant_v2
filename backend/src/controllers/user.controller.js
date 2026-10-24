// src/controllers/user.controller.js
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { now, toCamel } = require("../utils/dbHelpers");

// GET /api/users/profile
exports.getProfile = (req, res, next) => {
  try {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
    if (!row) return res.status(404).json({ error: "User not found" });

    const user = toCamel(row);
    delete user.password;

    const subjectRows = db.prepare(`
      SELECT us.proficiency, us.target_score, s.id as subject_id, s.name, s.color, s.icon
      FROM user_subjects us
      JOIN subjects s ON us.subject_id = s.id
      WHERE us.user_id = ?
    `).all(req.user.id);

    user.subjects = subjectRows.map((r) => ({
      id: r.subject_id, name: r.name, color: r.color, icon: r.icon,
      proficiency: r.proficiency, targetScore: r.target_score,
    }));

    return res.json({ user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
exports.updateProfile = (req, res, next) => {
  try {
    const { name, bio, timezone, studyGoalHrs, avatar, phone, department, academicLevel, learningGoals, studyPreferences, notificationPreferences } = req.body;
    if (avatar && avatar.length > 3 * 1024 * 1024) return res.status(413).json({ error: 'Profile image is too large. Maximum 3 MB.' });
    const fields = [], params = [];
    const set = (column, value) => { if (value !== undefined) { fields.push(`${column} = ?`); params.push(value); } };
    set('name', name?.trim()); set('bio', bio); set('timezone', timezone);
    if (studyGoalHrs !== undefined) set('study_goal_hrs', Number(studyGoalHrs));
    set('avatar', avatar); set('phone', phone); set('department', department); set('academic_level', academicLevel);
    if (learningGoals !== undefined) set('learning_goals', JSON.stringify(learningGoals));
    if (studyPreferences !== undefined) set('study_preferences', JSON.stringify(studyPreferences));
    if (notificationPreferences !== undefined) set('notification_preferences', JSON.stringify(notificationPreferences));
    fields.push('updated_at = ?'); params.push(now()); params.push(req.user.id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id); const user = toCamel(row); delete user.password;
    return res.json({ user });
  } catch (err) { next(err); }
};

// PUT /api/users/password
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const row = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user.id);

    const valid = await bcrypt.compare(currentPassword, row.password);
    if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 12);
    db.prepare("UPDATE users SET password = ?, updated_at = ? WHERE id = ?").run(hashed, now(), req.user.id);
    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};
