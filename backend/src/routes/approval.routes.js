const express = require('express');
const router = express.Router();
const { createApproval, getApprovals } = require('../controllers/approval.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate, schemas } = require('../middleware/validate');

// POST /api/v1/approvals - Create approval/rejection (Marketing/Admin only)
router.post(
  '/',
  authenticate,
  requireRole('marketing_head', 'admin'),
  validate(schemas.approval),
  createApproval
);

// GET /api/v1/approvals - List all approvals (Marketing/Admin only)
router.get(
  '/',
  authenticate,
  requireRole('marketing_head', 'admin'),
  getApprovals
);

module.exports = router;
