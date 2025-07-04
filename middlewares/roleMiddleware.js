function roleMiddleware(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: 'Accès refusé : rôle requis' });
    }
    next();
  };
}

module.exports = roleMiddleware;