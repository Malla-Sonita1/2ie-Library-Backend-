const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.registerStudent = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)', [name, email, hashedPassword, 'student', true]);
    res.json({ message: 'Student registered', userId: result.insertId, success: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already exists', success: false });
    }
    res.status(500).json({ message: 'Error registering student', success: false });
  }
};

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    if (!rows.length) {
      return res.status(401).json({ message: 'Admin not found', success: false });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(403).json({ message: 'Invalid password', success: false });
    }
    // Add logging for secrets
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    // Ajout d'un log pour la date système
    console.log('Date système (server):', new Date().toISOString());
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    const refreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))', [user.id, refreshToken]);
    // Add logging for token
    console.log('Generated token for admin:', token);
    res.json({ token, refreshToken, user: { id: user.id, name: user.name, email, role: user.role }, success: true });
  } catch (error) {
    console.error('Login error:', error); // Ajout de log pour débogage
    res.status(500).json({ message: 'Server error', success: false });
  }
};

exports.studentLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'student']);
    if (!rows.length) return res.status(401).json({ message: 'Student not found', success: false });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ message: 'Invalid password', success: false });
    // Add logging for secrets
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    // Ajout d'un log pour la date système
    console.log('Date système (server):', new Date().toISOString());
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    const refreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))', [user.id, refreshToken]);
    // Add logging for token
    console.log('Generated token for student:', token);
    res.json({ token, refreshToken, user: { id: user.id, name: user.name, email, role: user.role }, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', success: false });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Chercher d'abord un admin
    let [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(401).json({ message: 'Utilisateur non trouvé', success: false });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(403).json({ message: 'Mot de passe invalide', success: false });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))', [user.id, refreshToken]);
    res.json({ token, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role }, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', success: false });
  }
};

exports.checkDatabase = async (req, res) => {
  try {
    const [tables] = await db.query('SHOW TABLES');
    if (tables.length > 0) {
      res.json({ message: 'Database is initialized', tables: tables.map(row => row[Object.keys(row)[0]]), success: true });
    } else {
      res.status(500).json({ message: 'Database not initialized', success: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking database', success: false });
  }
};

exports.borrowBook = async (req, res) => {
  const { bookId, dueDate } = req.body;
  const userId = req.user.id;
  try {
    const [books] = await db.query('SELECT * FROM books WHERE id = ? AND available = true', [bookId]);
    if (!books.length) {
      return res.status(400).json({ message: 'Livre non disponible ou inexistant', success: false });
    }
    const [result] = await db.query(
      'INSERT INTO reservations (book_id, user_id, status, reserved_at, due_date, created_at, updated_at) VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())',
      [bookId, userId, 'active', dueDate]
    );
    await db.query('UPDATE books SET available = false WHERE id = ?', [bookId]);
    res.status(201).json({ message: 'Livre emprunté avec succès', reservationId: result.insertId, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'emprunt', success: false });
  }
};

// Lister tous les étudiants
exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.execute("SELECT * FROM users WHERE role = 'student'");
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Modifier un étudiant
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    await db.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ? AND role = 'student'",
      [name, email, id]
    );
    res.json({ message: 'Étudiant modifié' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un étudiant
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(
      "DELETE FROM users WHERE id = ? AND role = 'student'",
      [id]
    );
    res.json({ message: 'Étudiant supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// /me endpoint should return full user info from DB
exports.getMe = async (req, res) => {
  try {
    // Debug: log the decoded user from JWT
    console.log('getMe req.user:', req.user);
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié', success: false });
    }
    const [rows] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
    if (!rows.length) {
      return res.status(404).json({ message: 'Utilisateur non trouvé', success: false });
    }
    res.json({ user: rows[0], success: true });
  } catch (error) {
    console.error('Erreur dans getMe:', error);
    res.status(500).json({ message: 'Erreur serveur', success: false });
  }
};

// Rafraîchissement du token d'accès à partir du refresh token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token manquant', success: false });
  }
  try {
    // Vérifier la présence du token en base
    const [rows] = await db.query('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);
    if (!rows.length) {
      return res.status(403).json({ message: 'Refresh token invalide', success: false });
    }
    // Vérifier la validité du token (signature, expiration)
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(403).json({ message: 'Refresh token expiré ou invalide', success: false });
    }
    // Générer un nouveau token d'accès
    const accessToken = jwt.sign({ id: payload.id, role: payload.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    // (Optionnel) Générer un nouveau refresh token et remplacer l'ancien
    // const newRefreshToken = jwt.sign({ id: payload.id, role: payload.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    // await db.query('UPDATE refresh_tokens SET token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY) WHERE token = ?', [newRefreshToken, refreshToken]);
    // Retourner le nouveau token d'accès (et éventuellement le nouveau refresh token)
    res.json({ token: accessToken, /* refreshToken: newRefreshToken, */ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', success: false });
  }
};

// Modifier le profil utilisateur (nom, email, mot de passe)
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, password } = req.body;
  try {
    let updateFields = [];
    let params = [];
    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      params.push(hashed);
    }
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour', success: false });
    }
    params.push(userId);
    await db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Profil mis à jour', success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil", success: false });
  }
};