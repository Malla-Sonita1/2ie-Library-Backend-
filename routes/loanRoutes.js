const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const loanController = require('../controllers/loanController');
const reservationController = require('../controllers/reservationController');

// Créer un nouvel emprunt (loan)
router.post('/', authMiddleware, loanController.createLoan);

// Lister tous les emprunts (admin)
router.get('/', authMiddleware, loanController.getAllLoans);
// Lister tous les emprunts avec infos livre + étudiant (admin)
router.get('/admin', authMiddleware, loanController.getAllLoansWithDetails);

// Retour d'un livre
router.post('/:id/return', authMiddleware, loanController.returnBook);
// Retour manuel d'un livre par l'admin
router.post('/:id/admin-return', authMiddleware, loanController.adminReturnBook);

// Honorer une réservation (transformer en emprunt)
router.post('/fulfill/:id', authMiddleware, loanController.fulfillReservation);

// Historique des emprunts/retours de l'utilisateur connecté
router.get('/history', authMiddleware, loanController.getUserHistory);

// Récupérer les emprunts actifs de l'utilisateur connecté
router.get('/mes-emprunts', authMiddleware, loanController.getUserLoans);

// Statistiques annuelles des emprunts
router.get('/stats', authMiddleware, loanController.getLoanStats);

module.exports = router;
