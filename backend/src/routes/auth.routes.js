const express = require('express');
const router = express.Router();
const { login, getProfile } = require('../controllers/auth.controller');
const { validate, schemas } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

// POST /api/v1/auth/login
router.post('/login', validate(schemas.login), login);

// GET /api/v1/auth/profile
router.get('/profile', authenticate, getProfile);

module.exports = router;
