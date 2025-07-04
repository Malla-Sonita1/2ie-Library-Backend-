const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, commentsController.createComment);
router.get('/', authMiddleware, commentsController.getAllComments);
// Récupérer les commentaires d'un livre
router.get('/book/:bookId', authMiddleware, commentsController.getCommentsByBook);

module.exports = router;
