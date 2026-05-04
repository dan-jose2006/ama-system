const express = require('express');
const router = express.Router();
const { createSubmission, getMySubmissions, getTeamSubmissions, getSubmissionById } = require('../controllers/submission.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const { setUploadId, upload, handleUploadErrors } = require('../middleware/upload');

// POST /api/v1/submissions - Create new submission (all authenticated users)
router.post(
  '/',
  authenticate,
  setUploadId,
  upload.array('files', 5),
  handleUploadErrors,
  createSubmission
);

// GET /api/v1/submissions/my - Get current user's submissions
router.get('/my', authenticate, getMySubmissions);

// GET /api/v1/submissions/team - All submissions (marketing_head / admin only)
router.get('/team', authenticate, requireRole(['marketing_head', 'admin']), getTeamSubmissions);

// GET /api/v1/submissions/:id - Get single submission
router.get('/:id', authenticate, getSubmissionById);

module.exports = router;

