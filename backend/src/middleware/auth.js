const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const logger = require('../utils/logger');

function authenticate(req, res, next) {
  try {
    // Primary: Authorization header (standard API calls)
    // Fallback: ?token= query param (needed for EventSource / SSE, which can't set headers)
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    } else {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
      });
    }
    logger.error('Auth middleware error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Authentication error.',
    });
  }
}

// Role guard — usage: requireRole(['marketing_head', 'admin'])
function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Access denied: insufficient role.' });
    }
    next();
  };
}

function generateToken(user) {
  return require('jsonwebtoken').sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    require('../config/env').env.JWT_SECRET,
    { expiresIn: require('../config/env').env.JWT_EXPIRES_IN }
  );
}

module.exports = { authenticate, generateToken, requireRole };


