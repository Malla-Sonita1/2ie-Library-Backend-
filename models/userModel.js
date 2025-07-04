const db = require('../config/db');

exports.findByEmail = async (email) => {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};

exports.createUser = async (user) => {
  const { name, email, password, role, studentId, department } = user;
  const [result] = await db.query(
    'INSERT INTO users (name, email, password, role, studentId, department, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())',
    [name, email, password, role, studentId || null, department || null]
  );
  return result;
};

exports.updateUser = async (id, user) => {
  const { name, email, department } = user;
  const [result] = await db.query(
    'UPDATE users SET name = ?, email = ?, department = ?, updated_at = NOW() WHERE id = ?',
    [name, email, department, id]
  );
  return result;
};