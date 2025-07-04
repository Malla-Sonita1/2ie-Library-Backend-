const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const loanController = require('../controllers/loanController');

// Liste des emprunts enrichie (admin)
router.get('/admin', authMiddleware, loanController.getAllLoansWithDetails);
// Statistiques annuelles
router.get('/stats', authMiddleware, loanController.getLoanStats);
// Retour manuel par l'admin
router.post('/:id/return', authMiddleware, loanController.adminReturnBook);

module.exports = router;
