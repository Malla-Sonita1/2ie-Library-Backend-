const db = require('../config/db');

exports.getAllBooks = async () => {
  const [rows] = await db.execute('SELECT * FROM books');
  return rows;
};

exports.createBook = async (book) => {
  const [result] = await db.execute(
    'INSERT INTO books (title, author, genre, description, available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
    [book.title, book.author, book.genre, book.description, true]
  );
  return result;
};