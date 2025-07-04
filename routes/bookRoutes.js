const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const bookController = require('../controllers/bookController');

router.get('/', bookController.getAll);
router.post('/', auth, role('admin'), bookController.create);
router.put('/:id', auth, role('admin'), bookController.update);
router.delete('/:id', auth, role('admin'), bookController.delete);
// Recherche avancée de livres avec filtres dynamiques
router.get('/search', bookController.advancedSearch);

module.exports = router;