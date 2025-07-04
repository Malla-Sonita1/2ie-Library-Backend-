const db = require('../config/db');

exports.createComment = async ({ bookId, userId, rating, comment }) => {
  const [result] = await db.execute(
    'INSERT INTO comments (book_id, user_id, rating, comment, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [bookId, userId, rating, comment]
  );
  return result;
};

exports.getAllComments = async () => {
  const [rows] = await db.execute('SELECT * FROM comments');
  return rows;
};

// Récupérer les commentaires d'un livre avec le nom de l'utilisateur
exports.getCommentsByBook = async (bookId) => {
  const [rows] = await db.execute(
    `SELECT c.*, u.name as user_name FROM comments c
     JOIN users u ON c.user_id = u.id
     WHERE c.book_id = ?
     ORDER BY c.created_at DESC`,
    [bookId]
  );
  return rows;
};