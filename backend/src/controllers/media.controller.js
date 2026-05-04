const { draftQueries } = require('../models/queries');
const logger = require('../utils/logger');

const VALID_PLATFORMS = ['linkedin', 'twitter', 'instagram'];
const PLATFORM_LIMITS = { instagram: 20, linkedin: 9, twitter: 4 };

/**
 * PATCH /api/v1/drafts/:id/media
 * Body: { platform: 'instagram'|'twitter'|'linkedin', media: [...] }
 *
 * Each media item shape:
 * {
 *   id:     string  – client-generated unique ID
 *   url:    string  – publicly-accessible URL (or data-URL for new uploads)
 *   name:   string  – display filename
 *   type:   'image'|'video'
 *   source: 'upload'|'ai'|'user'
 * }
 */
async function updateDraftMedia(req, res, next) {
  try {
    const { id } = req.params;
    const { platform, media } = req.body;

    // Validation
    if (!VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    if (!Array.isArray(media)) {
      return res.status(400).json({ success: false, error: '`media` must be an array' });
    }

    const limit = PLATFORM_LIMITS[platform];
    if (media.length > limit) {
      return res.status(400).json({
        success: false,
        error: `${platform} supports a maximum of ${limit} media items`,
      });
    }

    // Verify draft exists
    const draftResult = await draftQueries.findById(id);
    const draft = draftResult.rows[0];
    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found' });
    }

    if (draft.status !== 'ready_for_review') {
      return res.status(400).json({
        success: false,
        error: 'Media can only be updated on drafts that are ready_for_review',
      });
    }

    // Sanitise items – only keep allowed fields
    const sanitised = media.map((item, idx) => ({
      id:     item.id     || `media-${Date.now()}-${idx}`,
      url:    item.url    || '',
      name:   item.name   || `Media ${idx + 1}`,
      type:   item.type === 'video' ? 'video' : 'image',
      source: item.source || 'user',
    })).filter(item => item.url);

    const result = await draftQueries.updateMedia(id, platform, sanitised);

    logger.info(`📸 Updated ${platform} media for draft ${id}: ${sanitised.length} items`);

    res.json({
      success: true,
      draft_id: id,
      platform,
      media: sanitised,
      count: sanitised.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { updateDraftMedia };
