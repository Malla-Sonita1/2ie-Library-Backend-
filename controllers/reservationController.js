const db = require('../config/db');

// Créer une réservation (étudiant, livre dispo ou non)
exports.createReservation = async (req, res) => {
  const { bookId, reservationDate } = req.body;
  const userId = req.user.id;
  try {
    // Vérifier que le livre existe
    const [books] = await db.query('SELECT id FROM books WHERE id = ?', [bookId]);
    if (!books.length) {
      return res.status(404).json({ message: "Livre introuvable", success: false });
    }
    // Calculer la position dans la file d'attente pour ce livre
    const [queue] = await db.query('SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = "en_attente"', [bookId]);
    const queuePosition = queue[0].count + 1;
    // Créer la réservation
    const [result] = await db.query(
      'INSERT INTO reservations (book_id, user_id, status, reserved_at, reservation_date, created_at, updated_at, queue_position) VALUES (?, ?, ?, NOW(), ?, NOW(), NOW(), ?)',
      [bookId, userId, 'en_attente', reservationDate, queuePosition]
    );
    res.status(201).json({ message: 'Réservation créée', reservationId: result.insertId, queuePosition, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la réservation', success: false });
  }
};

// Lister toutes les réservations (admin)
exports.getAllReservations = async (req, res) => {
  try {
    const [reservations] = await db.execute('SELECT * FROM reservations');
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Annuler une réservation (étudiant)
exports.cancelReservation = async (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.id;
  try {
    // Vérifier que la réservation existe et appartient à l'utilisateur
    const [rows] = await db.query('SELECT * FROM reservations WHERE id = ? AND user_id = ?', [reservationId, userId]);
    if (!rows.length) {
      return res.status(404).json({ message: "Réservation introuvable", success: false });
    }
    // Supprimer la réservation
    await db.query('DELETE FROM reservations WHERE id = ?', [reservationId]);
    res.json({ message: "Réservation annulée", success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'annulation", success: false });
  }
};

// Transformer une réservation en emprunt (si livre dispo et date atteinte)
exports.fulfillReservation = async (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.id;
  try {
    // Vérifier la réservation
    const [rows] = await db.query('SELECT * FROM reservations WHERE id = ? AND user_id = ? AND status = "en_attente"', [reservationId, userId]);
    if (!rows.length) {
      return res.status(404).json({ message: "Réservation introuvable ou déjà honorée/annulée", success: false });
    }
    const reservation = rows[0];
    // Vérifier disponibilité du livre
    const [books] = await db.query('SELECT available FROM books WHERE id = ?', [reservation.book_id]);
    if (!books.length || !books[0].available) {
      return res.status(400).json({ message: "Livre non disponible", success: false });
    }
    // Créer l'emprunt
    await db.query(
      'INSERT INTO emprunts (book_id, user_id, status, reserved_at, due_date, created_at, updated_at) VALUES (?, ?, ?, NOW(), NULL, NOW(), NOW())',
      [reservation.book_id, userId, 'active']
    );
    // Mettre à jour la réservation comme honorée
    await db.query('UPDATE reservations SET status = "honoree", updated_at = NOW() WHERE id = ?', [reservationId]);
    // Marquer le livre comme non disponible
    await db.query('UPDATE books SET available = 0 WHERE id = ?', [reservation.book_id]);
    res.json({ message: "Réservation honorée et emprunt créé", success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la transformation en emprunt", success: false });
  }
};

// Récupérer les réservations de l'utilisateur connecté avec position dans la file d'attente
exports.getUserReservationsWithQueue = async (req, res) => {
  const userId = req.user.id;
  try {
    // On récupère toutes les réservations de l'utilisateur, jointes avec le livre
    const [reservations] = await db.query(`
      SELECT r.id, r.book_id, r.status, r.reserved_at, r.reservation_date, r.queue_position, b.title, b.author, b.image
      FROM reservations r
      JOIN books b ON r.book_id = b.id
      WHERE r.user_id = ?
      ORDER BY r.reserved_at DESC
    `, [userId]);
    res.json(reservations);
  } catch (error) {
    console.error('Erreur SQL getUserReservationsWithQueue:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des réservations", error: error.message, success: false });
  }
};