const loanController = require('../controllers/loanController');
const cron = require('node-cron');
const db = require('../config/db');
const mailer = require('../utils/mailer');

// Envoi d'un mail de rappel 2 jours avant la date de retour
async function notifyUpcomingDueDates() {
  try {
    const [rows] = await db.query(`
      SELECT e.id, e.user_id, e.book_id, e.due_date, u.email, u.name, b.title
      FROM emprunts e
      JOIN users u ON e.user_id = u.id
      JOIN books b ON e.book_id = b.id
      WHERE e.status = 'active' AND e.due_date > NOW() AND e.due_date < DATE_ADD(NOW(), INTERVAL 2 DAY)
    `);
    for (const emprunt of rows) {
      await mailer.sendMail({
        to: emprunt.email,
        subject: 'Rappel : Retour de livre imminent',
        text: `Bonjour ${emprunt.name},\n\nLe livre : "${emprunt.title}" doit être retourné avant le ${new Date(emprunt.due_date).toLocaleDateString('fr-FR')}. Merci de respecter la date limite.\n\nCordialement,\nLa bibliothèque.`
      });
      await db.query(
        'INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, NOW())',
        [emprunt.user_id, 'rappel', `Rappel : retour du livre "${emprunt.title}" avant le ${new Date(emprunt.due_date).toLocaleDateString('fr-FR')}`]
      );
    }
  } catch (error) {
    console.error('Erreur lors de la notification des rappels :', error);
  }
}

// Planifie le job tous les jours à 8h
cron.schedule('0 8 * * *', notifyUpcomingDueDates);

// Script à exécuter via cron ou tâche planifiée
(async () => {
  await loanController.checkLateReturnsAndNotify();
  console.log('Vérification des retards et notifications envoyées (si besoin)');
  process.exit(0);
})();

module.exports = { notifyUpcomingDueDates };
