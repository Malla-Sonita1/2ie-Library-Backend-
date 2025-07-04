require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const commentsRoutes = require('./routes/commentsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const db = require('./config/db');
const { checkLateReservations, expireReservationsJob } = require('./jobs/expireReservationsJob');
const adminLoanRoutes = require('./routes/adminLoanRoutes');

const app = express();

// Middlewares globaux
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes API
app.use('/api', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/loans', adminLoanRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Gestion des erreurs centralisée
app.use(errorHandler);

// Connexion à la base de données et lancement du serveur
const PORT = process.env.PORT || 4000;
db.getConnection()
  .then(() => {
    console.log('Connected to MySQL database');
    // Lancer le cron job pour expirer les réservations
    expireReservationsJob.start();
    // Lancer le cron job pour envoyer les emails de retard
    setInterval(checkLateReservations, 1000 * 60 * 60 * 6); // toutes les 6h
    app.listen(PORT, () => {
      console.log(`Serveur à l’écoute sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });