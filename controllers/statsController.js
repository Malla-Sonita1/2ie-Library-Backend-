const db = require('../config/db');

exports.getBorrowedBooksStats = async (req, res) => {
  try {
    // Statistiques d'emprunts par mois
    const [monthlyRows] = await db.execute(`
      SELECT 
        MONTH(reserved_at) AS month,
        COUNT(*) AS borrows
      FROM emprunts
      GROUP BY MONTH(reserved_at)
      ORDER BY month
    `);

    // Catégories populaires (nombre de livres par catégorie)
    const [categoryRows] = await db.execute(`
      SELECT category AS name, COUNT(*) AS count
      FROM books
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);
    const colors = [
      'bg-2ie-blue',
      'bg-2ie-yellow',
      'bg-2ie-red',
      'bg-2ie-green',
      'bg-2ie-purple',
      'bg-2ie-orange',
      'bg-2ie-gray',
    ];
    const popularCategories = categoryRows.map((cat, i) => ({
      ...cat,
      color: colors[i % colors.length],
    }));

    // Total livres
    const [[{ totalBooks }]] = await db.execute('SELECT COUNT(*) AS totalBooks FROM books');
    // Livres disponibles
    const [[{ availableBooks }]] = await db.execute('SELECT COUNT(*) AS availableBooks FROM books WHERE available = 1');
    // Livres empruntés actuellement
    const [[{ borrowedBooks }]] = await db.execute("SELECT COUNT(*) AS borrowedBooks FROM emprunts WHERE status = 'active'");
    // Total utilisateurs
    const [[{ totalUsers }]] = await db.execute('SELECT COUNT(*) AS totalUsers FROM users');
    // Utilisateurs actifs
    const [[{ activeUsers }]] = await db.execute('SELECT COUNT(*) AS activeUsers FROM users WHERE is_active = 1');
    // Nouveaux utilisateurs ce mois-ci
    const [[{ newUsersThisMonth }]] = await db.execute(`SELECT COUNT(*) AS newUsersThisMonth FROM users WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())`);
    // Total emprunts
    const [[{ totalBorrows }]] = await db.execute('SELECT COUNT(*) AS totalBorrows FROM emprunts');
    // Emprunts ce mois-ci
    const [[{ borrowsThisMonth }]] = await db.execute(`SELECT COUNT(*) AS borrowsThisMonth FROM emprunts WHERE MONTH(reserved_at) = MONTH(CURRENT_DATE()) AND YEAR(reserved_at) = YEAR(CURRENT_DATE())`);
    // Livres en retard
    const [[{ overdueBooks }]] = await db.execute(`SELECT COUNT(*) AS overdueBooks FROM emprunts WHERE status = 'active' AND due_date < NOW()`);

    res.json({
      totalBooks,
      availableBooks,
      borrowedBooks,
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalBorrows,
      borrowsThisMonth,
      overdueBooks,
      popularCategories,
      monthlyBorrows: monthlyRows,
      recentActivity: [], // À remplir si tu veux l'activité récente
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
};
