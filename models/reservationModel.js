const db = require('../config/db');

exports.createReservation = async ({ bookId, userId, dueDate }) => {
  const [result] = await db.execute(
    'INSERT INTO reservations (book_id, user_id, status, reserved_at, due_date, created_at, updated_at) VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())',
    [bookId, userId, 'active', dueDate]
  );
  return result;
};