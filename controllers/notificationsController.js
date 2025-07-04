const { sendEmail } = require('../utils/mailer');
const db = require('../config/db');

exports.sendLateNotification = async (req, res) => {
  try {
    const { email, bookTitle, studentName } = req.body;
    await sendEmail(
      email,
      'Rappel de retour de livre',
      `Bonjour ${studentName},\n\nVeuillez retourner le livre "${bookTitle}" à la bibliothèque.\nMerci.`
    );
    res.json({ message: 'Notification envoyée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l’envoi de la notification:', error); // Affiche l'erreur complète dans la console
    res.status(500).json({ message: "Erreur lors de l’envoi de la notification.", error: error.message });
  }
};

// Récupérer les notifications de l'utilisateur connecté
exports.getUserNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications pour user_id=", userId, error);
    // Toujours retourner un tableau vide pour éviter les plantages côté frontend
    res.status(200).json([]);
  }
};

// Marquer une notification comme lue
exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;
  try {
    // Vérifier que la notification appartient à l'utilisateur
    const [rows] = await db.query('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [notificationId, userId]);
    if (!rows.length) {
      return res.status(404).json({ message: "Notification introuvable", success: false });
    }
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
    res.json({ message: "Notification marquée comme lue", success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", success: false });
  }
};

// Récupérer toutes les notifications (admin uniquement)
exports.getAllNotifications = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé', success: false });
  }
  try {
    const [rows] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des notifications", success: false });
  }
};
