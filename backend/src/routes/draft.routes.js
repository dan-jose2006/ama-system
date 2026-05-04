const express = require('express');
const router = express.Router();
const { getDrafts, getDraftById, regenerateDraft, regenerateStream } = require('../controllers/draft.controller');
const { updateDraftMedia } = require('../controllers/media.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate, schemas } = require('../middleware/validate');

// GET /api/v1/drafts - List drafts (Marketing/Admin only)
router.get(
  '/',
  authenticate,
  requireRole('marketing_head', 'admin'),
  validate(schemas.draftQuery, 'query'),
  getDrafts
);

// GET /api/v1/drafts/:id - Single draft detail (Marketing/Admin only)
router.get(
  '/:id',
  authenticate,
  requireRole('marketing_head', 'admin'),
  getDraftById
);

// POST /api/v1/drafts/:id/regenerate - Queue regeneration (legacy / non-streaming)
router.post(
  '/:id/regenerate',
  authenticate,
  requireRole('marketing_head', 'admin'),
  regenerateDraft
);

// GET /api/v1/drafts/:id/regenerate-stream - Real-time SSE streaming regeneration
router.get(
  '/:id/regenerate-stream',
  authenticate,
  requireRole('marketing_head', 'admin'),
  regenerateStream
);

// PATCH /api/v1/drafts/:id/media - Update platform-specific media items
router.patch(
  '/:id/media',
  authenticate,
  requireRole('marketing_head', 'admin'),
  updateDraftMedia
);

module.exports = router;
