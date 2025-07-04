const db = require('../config/db');
const mailer = require('../utils/mailer');

// NOTE: La table "emprunts" est utilisée ici pour stocker les emprunts (loans).
exports.createLoan = async (req, res) => {
  const { bookId, dueDate } = req.body;
  const userId = req.user.id;
  try {
    // Vérifier la disponibilité du livre
    const [books] = await db.query('SELECT available FROM books WHERE id = ?', [bookId]);
    if (!books.length) {
      return res.status(404).json({ message: "Livre introuvable", success: false });
    }
    if (!books[0].available) {
      return res.status(400).json({ message: "Livre déjà emprunté ou réservé", success: false });
    }
    // Marquer le livre comme non disponible
    await db.query('UPDATE books SET available = 0 WHERE id = ?', [bookId]);
    // Créer l'emprunt
    const [result] = await db.query(
      'INSERT INTO emprunts (book_id, user_id, status, reserved_at, due_date, created_at, updated_at) VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())',
      [bookId, userId, 'active', dueDate]
    );
    res.status(201).json({ message: "Emprunt créé", loanId: result.insertId, success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'emprunt", success: false });
  }
};

// Retourner un livre
exports.returnBook = async (req, res) => {
  const empruntId = req.params.id;
  const userId = req.user.id;
  try {
    // 1. Récupérer l'emprunt
    const [emprunts] = await db.query('SELECT * FROM emprunts WHERE id = ? AND user_id = ?', [empruntId, userId]);
    if (!emprunts.length) {
      return res.status(404).json({ message: "Emprunt introuvable", success: false });
    }
    const emprunt = emprunts[0];
    // 2. Marquer l'emprunt comme retourné
    await db.query('UPDATE emprunts SET status = "returned", updated_at = NOW() WHERE id = ?', [empruntId]);

    // 3. Vérifier s'il y a une réservation en attente pour ce livre
    const [reservations] = await db.query(
      'SELECT * FROM reservations WHERE book_id = ? AND status = "en_attente" ORDER BY queue_position ASC LIMIT 1',
      [emprunt.book_id]
    );
    if (reservations.length) {
      // Il y a une file d'attente, honorer la première réservation
      const reservation = reservations[0];
      // a. Mettre à jour la réservation comme honorée
      await db.query('UPDATE reservations SET status = "honoree", updated_at = NOW() WHERE id = ?', [reservation.id]);
      // b. Créer l'emprunt pour l'utilisateur en tête de file
      await db.query(
        'INSERT INTO emprunts (book_id, user_id, status, reserved_at, due_date, created_at, updated_at) VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())',
        [emprunt.book_id, reservation.user_id, 'active', null]
      );
      // c. Envoyer une notification/email à l'utilisateur (in-app + email)
      // (Supposons une fonction sendNotification existe)
      try {
        const [userRows] = await db.query('SELECT email, name FROM users WHERE id = ?', [reservation.user_id]);
        const [bookRows] = await db.query('SELECT title FROM books WHERE id = ?', [emprunt.book_id]);
        if (userRows.length && bookRows.length) {
          await mailer.sendEmail(
            userRows[0].email,
            'Votre réservation est disponible',
            `Bonjour ${userRows[0].name},\n\nLe livre "${bookRows[0].title}" est maintenant disponible pour vous. Merci de venir l\'emprunter rapidement.`
          );
          // Enregistrer une notification in-app
          await db.query(
            'INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, NOW())',
            [reservation.user_id, `Le livre "${bookRows[0].title}" est disponible pour vous.`]
          );
        }
      } catch (notifErr) {
        console.error('Erreur notification réservation:', notifErr);
      }
      // d. Décaler la file d'attente (queue_position -1 pour les suivants)
      await db.query(
        'UPDATE reservations SET queue_position = queue_position - 1 WHERE book_id = ? AND status = "en_attente" AND queue_position > 1',
        [emprunt.book_id]
      );
      return res.json({ message: "Livre retourné. Réservation honorée pour l'utilisateur suivant.", success: true });
    } else {
      // Pas de réservation en attente, rendre le livre disponible
      await db.query('UPDATE books SET available = 1 WHERE id = ?', [emprunt.book_id]);
      return res.json({ message: "Livre retourné et disponible.", success: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors du retour du livre", success: false });
  }
};

// Ajout d'une méthode pour honorer une réservation (transformer en emprunt)
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
      'INSERT INTO emprunts (book_id, user_id, status, reserved_at, due_date, created_at, updated_at) VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())',
      [reservation.book_id, userId, 'active', null]
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

// Récupérer l'historique des emprunts/retours d'un utilisateur
exports.getUserHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query('SELECT * FROM emprunts WHERE user_id = ? ORDER BY reserved_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique", success: false });
  }
};

// Vérification des retards et envoi d'un mail si un retour est en retard
exports.checkLateReturnsAndNotify = async () => {
  try {
    const [rows] = await db.query(`
      SELECT e.id, e.user_id, e.book_id, e.due_date, u.email, u.name, b.title
      FROM emprunts e
      JOIN users u ON e.user_id = u.id
      JOIN books b ON e.book_id = b.id
      WHERE e.status = 'active' AND e.due_date < NOW()
    `);
    for (const emprunt of rows) {
      // Envoi d'un mail de retard
      await mailer.sendMail({
        to: emprunt.email,
        subject: 'Retard de retour de livre',
        text: `Bonjour ${emprunt.name},\n\nVous avez un retard de retour pour le livre : "${emprunt.title}". Merci de le retourner au plus vite.\n\nCordialement,\nLa bibliothèque.`
      });
      // Ajout d'une notification en base
      await db.query(
        'INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, NOW())',
        [emprunt.user_id, 'retard', `Retard de retour pour le livre : "${emprunt.title}"`]
      );
    }
  } catch (error) {
    console.error('Erreur lors de la notification des retards :', error);
  }
};

// Lister tous les emprunts (admin)
exports.getAllLoans = async (req, res) => {
  try {
    const [loans] = await db.query('SELECT * FROM emprunts');
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des emprunts", success: false });
  }
};

// Récupérer les emprunts actifs de l'utilisateur connecté
exports.getUserLoans = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query('SELECT * FROM emprunts WHERE user_id = ? AND status = "active" ORDER BY reserved_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des emprunts", success: false });
  }
};

// Lister tous les emprunts avec infos livre + étudiant (admin)
exports.getAllLoansWithDetails = async (req, res) => {
  try {
    const [loans] = await db.query(`
      SELECT e.*, b.title as book_title, u.name as user_name, u.email as user_email
      FROM emprunts e
      JOIN books b ON e.book_id = b.id
      JOIN users u ON e.user_id = u.id
      ORDER BY e.reserved_at DESC
    `);
    const result = loans.map(l => ({
      ...l,
      book: { title: l.book_title },
      user: { name: l.user_name, email: l.user_email }
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des emprunts", success: false });
  }
};

// Statistiques annuelles des emprunts
exports.getLoanStats = async (req, res) => {
  try {
    const [yearStats] = await db.query(`SELECT COUNT(*) as totalYear FROM emprunts WHERE YEAR(reserved_at) = YEAR(NOW())`);
    const [active] = await db.query(`SELECT COUNT(*) as active FROM emprunts WHERE status = 'active'`);
    const [returned] = await db.query(`SELECT COUNT(*) as returned FROM emprunts WHERE status = 'returned'`);
    res.json({
      totalYear: yearStats[0].totalYear,
      active: active[0].active,
      returned: returned[0].returned
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur stats emprunts", success: false });
  }
};

// Retour manuel d'un livre par l'admin
exports.adminReturnBook = async (req, res) => {
  const empruntId = req.params.id;
  try {
    // Récupérer l'emprunt
    const [emprunts] = await db.query('SELECT * FROM emprunts WHERE id = ?', [empruntId]);
    if (!emprunts.length) {
      return res.status(404).json({ message: "Emprunt introuvable", success: false });
    }
    const emprunt = emprunts[0];
    if (emprunt.status === 'returned') {
      return res.status(400).json({ message: "Déjà retourné", success: false });
    }
    // Marquer l'emprunt comme retourné
    await db.query('UPDATE emprunts SET status = "returned", updated_at = NOW() WHERE id = ?', [empruntId]);
    // Rendre le livre disponible
    await db.query('UPDATE books SET available = 1 WHERE id = ?', [emprunt.book_id]);
    res.json({ message: "Livre marqué comme retourné", success: true });
  } catch (error) {
    res.status(500).json({ message: "Erreur retour manuel", success: false });
  }
};
