const { approvalQueries, draftQueries } = require('../models/queries');
const { notifySubmitter } = require('../services/email.service');
const { publishToAllPlatforms } = require('../services/social.service');
const logger = require('../utils/logger');

async function createApproval(req, res, next) {
  try {
    const {
      draft_id,
      reviewer_name,
      reviewer_email,
      decision,
      feedback,
      edited_linkedin,
      edited_twitter,
      edited_instagram,
      scheduled_time,
    } = req.body;

    // Verify draft exists
    const draftResult = await draftQueries.findById(draft_id);
    const draft = draftResult.rows[0];

    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft not found.' });
    }

    if (draft.status !== 'ready_for_review') {
      return res.status(400).json({
        success: false,
        error: `Cannot ${decision} a draft with status "${draft.status}". Only "ready_for_review" drafts can be processed.`,
      });
    }

    if (decision === 'rejected' && (!feedback || feedback.trim().length < 5)) {
      return res.status(400).json({
        success: false,
        error: 'Feedback is required when rejecting a draft (minimum 5 characters).',
      });
    }

    // Create approval record (audit log)
    const approvalResult = await approvalQueries.create({
      draft_id,
      reviewer_id: req.user.id,
      reviewer_name: reviewer_name || req.user.name,
      reviewer_email: reviewer_email || req.user.email,
      edited_linkedin,
      edited_twitter,
      edited_instagram,
      decision,
      feedback,
      scheduled_time: scheduled_time || null,
    });

    // Update draft status
    await draftQueries.updateStatus(draft_id, decision);

    // Notify submitter via email
    await notifySubmitter({
      email: draft.submitter_email,
      name: draft.submitter_name,
      contentTitle: draft.content_title,
      draftId: draft_id,
      status: decision,
    });

    logger.info(`📋 Draft ${decision}: ${draft_id}`, {
      reviewer: reviewer_name || req.user.name,
    });

    // ── Social Publishing (only on approval) ──────────────────────
    let publishResults = null;

    if (decision === 'approved') {
      logger.info(`🚀 Triggering social publish for draft ${draft_id}`);

      // Use edited content if reviewer made changes, otherwise use original
      const linkedinContent  = edited_linkedin  || draft.linkedin_text;
      const twitterContent   = edited_twitter   || draft.twitter_text;
      const instagramContent = edited_instagram || draft.instagram_text;

      // Parse hashtags — stored as JSON string or array
      let hashtags = [];
      try {
        hashtags = typeof draft.hashtags === 'string'
          ? JSON.parse(draft.hashtags)
          : (Array.isArray(draft.hashtags) ? draft.hashtags : []);
      } catch {}

      try {
        publishResults = await publishToAllPlatforms({
          linkedin:  linkedinContent,
          twitter:   twitterContent,
          instagram: instagramContent,
          hashtags,
        });

        // Persist publish results to DB for later viewing
        await draftQueries.savePublishResults(draft_id, publishResults);

        logger.info(`✅ Published to ${publishResults.successCount}/3 platforms`);
      } catch (pubErr) {
        // Publishing failure must NOT block the approval response
        logger.error('⚠️ Social publish error (non-blocking)', { error: pubErr.message });
        publishResults = { error: pubErr.message, successCount: 0, totalPlatforms: 3 };
      }
    }

    // Detect LinkedIn redirect mode — surface content so frontend can copy-to-clipboard
    const linkedinIsRedirect = publishResults?.results?.linkedin?.redirectMode === true;
    const linkedinPostContent = linkedinIsRedirect
      ? publishResults.results.linkedin.content
      : null;

    res.status(201).json({
      success: true,
      approval: approvalResult.rows[0],
      message: `Draft ${decision} successfully.`,
      publishResults,
      // LinkedIn-specific redirect signal
      linkedinRedirect: linkedinIsRedirect,
      linkedinContent:  linkedinPostContent,
    });

  } catch (err) {
    next(err);
  }
}

async function getApprovals(req, res, next) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await approvalQueries.findAll(parseInt(limit), parseInt(offset));
    res.json({ success: true, approvals: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { createApproval, getApprovals };
