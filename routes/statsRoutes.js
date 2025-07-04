const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');

router.get('/borrowed-books', auth, role('admin'), statsController.getBorrowedBooksStats);

module.exports = router;