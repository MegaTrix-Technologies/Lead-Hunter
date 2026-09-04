const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'megatrix_jwt_super_secret_key_2026';

/**
 * Verify JWT token and attach active user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No Bearer token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid token. Please log in again.'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account not found.'
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by the Super Administrator. Please contact support.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(500).json({ success: false, message: 'Authentication verification error.' });
  }
};

/**
 * Check if user has superadmin role
 */
const isUserSuperAdmin = (user) => {
  if (!user) return false;
  if (user.roles && Array.isArray(user.roles) && user.roles.includes('super_admin')) return true;
  return user.role === 'superadmin';
};

/**
 * Enforce Super Administrator privilege
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !isUserSuperAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted: Super Administrator privileges required.'
    });
  }
  next();
};

/**
 * Enforce role requirement. Super Admin always has bypass access.
 * Usage: requireRoles('sales_closer', 'sales_agent')
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (isUserSuperAdmin(req.user)) {
      return next();
    }

    const userRoles = req.user.roles || (req.user.role === 'superadmin' ? ['super_admin'] : ['sales_agent']);
    const hasRole = allowedRoles.some(r => userRoles.includes(r));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Access restricted: Requires one of [${allowedRoles.join(', ')}] role(s).`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireSuperAdmin,
  requireRoles,
  isUserSuperAdmin,
  JWT_SECRET
};
