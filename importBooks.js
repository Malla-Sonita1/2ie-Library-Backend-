const axios = require('axios');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // adapte si besoin
  database: 'library',
});

const domaines = [
  'eau', 'assainissement', 'hydraulique',
  'énergie', 'électricité', 'solaire',
  'environnement', 'développement durable',
  'génie civil', 'bâtiment', 'infrastructure',
  'intelligence artificielle', 'informatique',
  'management', 'entrepreneuriat'
];

const MAX_BOOKS = 50;

async function fetchBooksFromOpenLibrary(query, limit = 10) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
  const { data } = await axios.get(url);
  return data.docs;
}

async function fetchBookDetails(olid) {
  // Récupère les détails complets d'un livre via son OLID
  const url = `https://openlibrary.org${olid}.json`;
  try {
    const { data } = await axios.get(url);
    return data;
  } catch {
    return null;
  }
}

function hasImage(doc) {
  return !!doc.cover_i;
}

function hasDescription(doc, details) {
  // Vérifie la présence d'une description dans la recherche ou dans les détails
  if (doc.first_sentence) return true;
  if (details && details.description) return true;
  return false;
}

function extractDescription(doc, details) {
  if (doc.first_sentence) {
    return typeof doc.first_sentence === 'string' ? doc.first_sentence : doc.first_sentence[0];
  }
  if (details && details.description) {
    if (typeof details.description === 'string') return details.description;
    if (details.description.value) return details.description.value;
  }
  return '';
}

async function insertBook(book) {
  // Vérifie si le livre existe déjà (par ISBN)
  if (book.isbn) {
    const [rows] = await db.query('SELECT id FROM books WHERE isbn = ?', [book.isbn]);
    if (rows.length > 0) return false;
  }
  const [result] = await db.query(
    `INSERT INTO books (title, author, isbn, category, image, available, description, publishedYear, pages, language, publisher)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.title, book.author, book.isbn, book.category, book.image, book.available,
      book.description, book.publishedYear, book.pages, book.language, book.publisher
    ]
  );
  const bookId = result.insertId;

  // Tags
  for (const tag of book.tags) {
    let [rows] = await db.query('SELECT id FROM tags WHERE name = ?', [tag]);
    let tagId;
    if (rows.length === 0) {
      const [tagResult] = await db.query('INSERT INTO tags (name) VALUES (?)', [tag]);
      tagId = tagResult.insertId;
    } else {
      tagId = rows[0].id;
    }
    await db.query('INSERT IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)', [bookId, tagId]);
  }
  return true;
}

async function main() {
  let total = 0;
  for (const domaine of domaines) {
    if (total >= MAX_BOOKS) break;
    const toFetch = 5;
    const books = await fetchBooksFromOpenLibrary(domaine, toFetch);
    for (const doc of books) {
      if (total >= MAX_BOOKS) break;
      if (!hasImage(doc)) continue;
      const details = await fetchBookDetails(doc.key);
      if (!hasDescription(doc, details)) continue;
      const book = {
        title: doc.title || '',
        author: (doc.author_name && doc.author_name[0]) || '',
        isbn: (doc.isbn && doc.isbn[0]) || '',
        category: domaine,
        image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
        available: true,
        description: extractDescription(doc, details),
        publishedYear: doc.first_publish_year || null,
        pages: doc.number_of_pages_median || null,
        language: (doc.language && doc.language[0]) || 'fr',
        publisher: (doc.publisher && doc.publisher[0]) || '',
        tags: doc.subject ? doc.subject.slice(0, 5) : [],
      };
      const inserted = await insertBook(book);
      if (inserted) {
        total++;
        console.log(`Ajouté : ${book.title} (${domaine})`);
      }
    }
  }
  console.log(`Import terminé ! Total livres importés : ${total}`);
  process.exit(0);
}

main().catch(console.error);
