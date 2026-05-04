const { submissionQueries, draftQueries, approvalQueries } = require('../models/queries');
const { addGenerationJob } = require('../queues/aiQueue');
const logger = require('../utils/logger');

// ── Enrich a submission row with its latest draft info ───────────────────────
async function enrichSubmission(sub) {
  const draftsResult = await draftQueries.findBySubmission(sub.id);
  const latestDraft = draftsResult.rows[0];

  // publish_results is stored as a JSON string in SQLite — parse it
  let publishResults = latestDraft?.publish_results || null;
  if (typeof publishResults === 'string') {
    try { publishResults = JSON.parse(publishResults); } catch { publishResults = null; }
  }

  return {
    ...sub,
    draft_status:    latestDraft?.status || null,
    draft_id:        latestDraft?.id     || null,
    publish_results: publishResults,
  };
}


// POST /api/v1/submissions — Create new submission (all authenticated users)
async function createSubmission(req, res, next) {
  try {
    const { name, email, team, content_title, content_description, content_type, priority, tone_preference } = req.body;

    const fileUrls = (req.files || []).map((file) => ({
      originalName: file.originalname,
      filename:     file.filename,
      mimetype:     file.mimetype,
      size:         file.size,
      url:          `${req.uploadId}/${file.filename}`,
    }));

    const result = await submissionQueries.create({
      submitted_by:        req.user.id,
      name,
      email,
      team:                team || null,
      content_title:       content_title || null,
      content_description,
      content_type:        content_type || 'post',
      priority:            priority || 'medium',
      tone_preference:     tone_preference || 'formal',
      file_urls:           fileUrls,
    });

    const submission = result.rows[0];
    logger.info(`📝 Submission created: ${submission.id}`, { name, contentType: content_type, files: fileUrls.length });

    await addGenerationJob(submission.id);

    res.status(201).json({
      success:       true,
      submission_id: submission.id,
      status:        'pending',
      message:       'Submission received and queued for AI processing',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/submissions/my — current user's own submissions
async function getMySubmissions(req, res, next) {
  try {
    const result = await submissionQueries.findByUser(req.user.id);
    const enriched = await Promise.all(result.rows.map(enrichSubmission));
    res.json({ success: true, submissions: enriched, count: enriched.length });
  } catch (err) {
    next(err);
  }
}


// GET /api/v1/submissions/team — ALL submissions from OTHER users (marketing_head / admin only)
async function getTeamSubmissions(req, res, next) {
  try {
    const result = await submissionQueries.findAll(100, 0);

    // Exclude the marketing head's own submissions — those belong in "My Generated Content"
    const otherUsersOnly = result.rows.filter(s => s.submitted_by !== req.user.id);

    const enriched = await Promise.all(otherUsersOnly.map(enrichSubmission));
    res.json({ success: true, submissions: enriched, count: enriched.length });
  } catch (err) {
    next(err);
  }
}


// GET /api/v1/submissions/:id — single submission
async function getSubmissionById(req, res, next) {
  try {
    const result = await submissionQueries.findById(req.params.id);
    const submission = result.rows[0];

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found.' });
    }

    // Trainers can only see their own submissions
    if (req.user.role === 'trainer' && submission.submitted_by !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Helper to safely parse a JSON string column
    const parseJson = (val, fallback = null) => {
      if (!val || typeof val !== 'string') return val ?? fallback;
      try { return JSON.parse(val); } catch { return fallback; }
    };

    const draftsResult = await draftQueries.findBySubmission(submission.id);
    const draftsWithApprovals = await Promise.all(
      draftsResult.rows.map(async (draft) => {
        const approvalsResult = await approvalQueries.findByDraft(draft.id);
        return {
          ...draft,
          // Parse all JSON string columns stored by SQLite
          publish_results:  parseJson(draft.publish_results),
          hashtags:         parseJson(draft.hashtags, []),
          linkedin_media:   parseJson(draft.linkedin_media, []),
          twitter_media:    parseJson(draft.twitter_media, []),
          instagram_media:  parseJson(draft.instagram_media, []),
          approvals: approvalsResult.rows,
        };
      })
    );

    // Also parse file_urls on the submission itself
    const enrichedSubmission = {
      ...submission,
      file_urls: parseJson(submission.file_urls, []),
    };

    res.json({ success: true, submission: enrichedSubmission, drafts: draftsWithApprovals });
  } catch (err) {
    next(err);
  }
}


module.exports = { createSubmission, getMySubmissions, getTeamSubmissions, getSubmissionById };
