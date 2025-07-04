const db = require('../config/db');

// Lister tous les livres avec leurs tags
exports.getAll = async (req, res) => {
  try {
    // Récupère tous les livres
    const [books] = await db.execute('SELECT * FROM books');
    // Pour chaque livre, récupère ses tags et la note moyenne
    for (const book of books) {
      const [tags] = await db.execute(
        `SELECT t.name FROM tags t
         JOIN book_tags bt ON bt.tag_id = t.id
         WHERE bt.book_id = ?`,
        [book.id]
      );
      book.tags = tags.map(t => t.name);
      // Ajoute la note moyenne
      const [ratingRows] = await db.execute(
        'SELECT AVG(rating) as average_rating FROM comments WHERE book_id = ?',
        [book.id]
      );
      book.average_rating = ratingRows[0].average_rating ? parseFloat(ratingRows[0].average_rating).toFixed(2) : null;
    }
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des livres' });
  }
};

// Créer un livre (admin)
exports.create = async (req, res) => {
  const { title, author, genre, description } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO books (title, author, genre, description, available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [title, author, genre, description, true]
    );
    res.status(201).json({ message: 'Livre ajouté', bookId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'ajout du livre' });
  }
};

// Modifier un livre (admin)
exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, author, genre, description } = req.body;
  try {
    await db.execute(
      'UPDATE books SET title = ?, author = ?, genre = ?, description = ?, updated_at = NOW() WHERE id = ?',
      [title, author, genre, description, id]
    );
    res.json({ message: 'Livre modifié avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la modification du livre' });
  }
};

// Supprimer un livre (admin)
exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM books WHERE id = ?', [id]);
    res.json({ message: 'Livre supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du livre' });
  }
};

// Recherche avancée de livres avec filtres dynamiques
exports.advancedSearch = async (req, res) => {
  const { title, author, category, tag } = req.query;
  let sql = `SELECT b.* FROM books b`;
  let joins = [];
  let wheres = [];
  let params = [];

  if (tag) {
    joins.push('JOIN book_tags bt ON bt.book_id = b.id');
    joins.push('JOIN tags t ON t.id = bt.tag_id');
    wheres.push('t.name = ?');
    params.push(tag);
  }
  if (title) {
    wheres.push('b.title LIKE ?');
    params.push(`%${title}%`);
  }
  if (author) {
    wheres.push('b.author LIKE ?');
    params.push(`%${author}%`);
  }
  if (category) {
    wheres.push('b.category LIKE ?');
    params.push(`%${category}%`);
  }

  if (joins.length) sql += ' ' + joins.join(' ');
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');

  try {
    const [books] = await db.query(sql, params);
    // Ajout des tags pour chaque livre
    for (const book of books) {
      const [tags] = await db.query(
        `SELECT t.name FROM tags t JOIN book_tags bt ON bt.tag_id = t.id WHERE bt.book_id = ?`,
        [book.id]
      );
      book.tags = tags.map(t => t.name);
    }
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la recherche avancée' });
  }
};