const cron = require('node-cron');
const db = require('../config/db');
const { sendEmail } = require('../utils/mailer');

async function checkLateReservations() {
  try {
    const [rows] = await db.execute(`
      SELECT r.id, r.due_date, s.email, s.name as studentName, b.title as bookTitle
      FROM reservations r
      JOIN students s ON r.student_id = s.id
      JOIN books b ON r.book_id = b.id
      WHERE r.status = 'active' AND r.due_date < NOW()
    `);

    for (const row of rows) {
      await sendEmail(
        row.email,
        '📚 Livre en retard',
        `Bonjour ${row.studentName},\n\nLe livre "${row.bookTitle}" est en retard. Veuillez le retourner rapidement.`
      );
      await db.execute('UPDATE reservations SET status = ? WHERE id = ?', ['expired', row.id]);
    }

    console.log(`${rows.length} notifications de retard envoyées et mises à jour effectuées.`);
  } catch (error) {
    console.error('Erreur dans checkLateReservations:', error);
  }
}

const expireReservationsJob = cron.schedule('0 0 * * *', async () => {
  try {
    // Expire les réservations dont la date de retour est dépassée
    await db.execute(
      "UPDATE reservations SET status = 'expired' WHERE status = 'active' AND due_date < NOW()"
    );
    // Rendre les livres à nouveau disponibles
    await db.execute(
      "UPDATE books SET available = 1 WHERE id IN (SELECT book_id FROM reservations WHERE status = 'expired' AND due_date < NOW())"
    );
    console.log('Cron: Réservations expirées traitées');
  } catch (error) {
    console.error('Erreur lors de l\'expiration des réservations:', error);
  }
}, { scheduled: false });

module.exports = { checkLateReservations, expireReservationsJob };