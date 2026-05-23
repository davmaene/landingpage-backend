const jwt = require('jsonwebtoken');
const { User, Faculty } = require('../models');
const { Response } = require('../helpers/helper.response');

const sign = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, facultyId: user.facultyId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Non authentifié' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Faculty, as: 'faculty' }],
    });
    if (!user || !user.isActive) return res.status(401).json({ message: 'Utilisateur invalide' });
    req.user = user;
    next();
  } catch (e) {
    return Response(res, 401, { message: "'Token invalide ou expiré' ", data: e })
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Accès refusé' });
  next();
};

module.exports = { sign, requireAuth, requireRole };
