const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('authHeader:', authHeader);
  // Log all headers for debug
  console.log('All headers:', req.headers);
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    // Add logging for decoded token
    console.log('Decoded JWT:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    // Log the token that failed
    console.error('Failed token:', token);
    return res.status(401).json({ message: 'Token invalide' });
  }
};
