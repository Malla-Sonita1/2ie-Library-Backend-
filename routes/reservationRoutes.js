const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const loanController = require('../controllers/loanController');
const reservationController = require('../controllers/reservationController');

// Créer une nouvelle réservation (étudiant)
router.post('/', auth, reservationController.createReservation);

// Lister toutes les réservations (admin)
router.get('/', auth, role('admin'), reservationController.getAllReservations);

// Annulation de réservation
router.delete('/:id', auth, reservationController.cancelReservation);

// Récupérer les réservations de l'utilisateur connecté avec position dans la file d'attente
router.get('/mes-reservations', auth, reservationController.getUserReservationsWithQueue);

module.exports = router;