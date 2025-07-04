const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const db = require('../config/db');

// Authentification & inscription
router.post('/students/register', authController.registerStudent);
router.post('/admins/login', authController.adminLogin);
router.post('/students/login', authController.studentLogin);
router.post('/login', authController.login);

// Vérifier la connexion et récupérer l'utilisateur courant
router.get('/me', authMiddleware, authController.getMe);

// Lister tous les étudiants (admin)
router.get('/students', authMiddleware, roleMiddleware('admin'), authController.getAllStudents);

// Modifier un étudiant (admin)
router.put('/students/:id', authMiddleware, roleMiddleware('admin'), authController.updateStudent);

// Supprimer un étudiant (admin)
router.delete('/students/:id', authMiddleware, roleMiddleware('admin'), authController.deleteStudent);

// Lister tous les admins (admin)
router.get('/admins', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [admins] = await db.execute("SELECT * FROM users WHERE role = 'admin'");
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Lister tous les refresh tokens (admin)
router.get('/refresh-tokens', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [tokens] = await db.execute('SELECT * FROM refresh_tokens');
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Rafraîchir le token d'accès
router.post('/refresh-token', authController.refreshToken);

// Route de test protégée
router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const [users] = await db.execute("SELECT * FROM users");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Modifier le profil utilisateur (nom, email, mot de passe)
router.put('/profile', authMiddleware, authController.updateProfile);

// Modifier un utilisateur (admin)
router.put('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;
    await db.execute(
      "UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE id = ?",
      [name, email, role, is_active, id]
    );
    res.json({ message: 'Utilisateur modifié' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Supprimer un utilisateur (admin)
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    );
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter un utilisateur (admin)
router.post('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Le mot de passe est requis.' });
    }
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      "INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role, 1]
    );
    res.json({ message: 'Utilisateur ajouté' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;