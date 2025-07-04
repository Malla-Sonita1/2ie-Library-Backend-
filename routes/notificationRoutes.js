const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const notificationsController = require('../controllers/notificationsController');

// Récupérer les notifications de l'utilisateur connecté
router.get('/', auth, notificationsController.getUserNotifications);

router.post('/late', notificationsController.sendLateNotification);

// Marquer une notification comme lue
router.patch('/:id/read', auth, notificationsController.markAsRead);

// Récupérer toutes les notifications (admin uniquement)
router.get('/all', auth, notificationsController.getAllNotifications);

module.exports = router;