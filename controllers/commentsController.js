const commentModel = require('../models/commentModel');

exports.createComment = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Utilisateur non authentifié" });
  }
  try {
    console.log('createComment appelé', req.body);
    const { bookId, rating, comment } = req.body;
    const userId = req.user.id;

    // Vérification des champs requis
    if (
      typeof bookId === 'undefined' ||
      typeof userId === 'undefined' ||
      typeof rating === 'undefined' ||
      typeof comment === 'undefined'
    ) {
      return res.status(400).json({ message: "Champs manquants ou invalides" });
    }

    await commentModel.createComment({ bookId, userId, rating, comment });
    res.status(201).json({ message: "Commentaire ajouté" });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.getAllComments = async (req, res) => {
  try {
    const comments = await commentModel.getAllComments();
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.getCommentsByBook = async (req, res) => {
  const bookId = req.params.bookId;
  try {
    const comments = await commentModel.getCommentsByBook(bookId);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
