const bcrypt = require('bcryptjs');
const { userQueries } = require('../models/queries');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await userQueries.findByEmail(email);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    logger.info(`🔐 User logged in: ${user.email} (${user.role})`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const result = await userQueries.findById(req.user.id);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, getProfile };
