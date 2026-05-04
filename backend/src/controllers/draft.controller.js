const { draftQueries } = require('../models/queries');
const { addGenerationJob } = require('../queues/aiQueue');
const { generateContentStreaming } = require('../services/ai.service');
const { buildGenerationPrompt, getPromptVersion } = require('../utils/promptBuilder');
const { extractAttachmentContext } = require('../utils/attachmentExtractor');
const logger = require('../utils/logger');

async function getDrafts(req, res, next) {
  try {
    const { status, team, limit = 20, offset = 0, mine, teamOnly } = req.query;

    const submittedBy  = mine     === 'true' ? req.user.id : undefined;
    const excludeUser  = teamOnly === 'true' ? req.user.id : undefined;

    const result = await draftQueries.findAll({
      status:      status || undefined,
      team:        team   || undefined,
      submittedBy,
      excludeUser,
      limit:  parseInt(limit),
      offset: parseInt(offset),
    });

    const countResult = await draftQueries.countByStatus(); // always global — stat cards show totals across all tabs
    const statusCounts = {};
    countResult.rows.forEach((row) => {
      statusCounts[row.status] = parseInt(row.count);
    });

    res.json({ success: true, drafts: result.rows, count: result.rows.length, statusCounts });
  } catch (err) {
    next(err);
  }
}


async function getDraftById(req, res, next) {
  try {
    const result = await draftQueries.findById(req.params.id);
    const draft = result.rows[0];
    if (!draft) return res.status(404).json({ success: false, error: 'Draft not found.' });
    res.json({ success: true, draft });
  } catch (err) {
    next(err);
  }
}

async function regenerateDraft(req, res, next) {
  try {
    const { id } = req.params;
    const result = await draftQueries.findById(id);
    const draft = result.rows[0];
    if (!draft) return res.status(404).json({ success: false, error: 'Draft not found.' });

    await draftQueries.updateStatus(id, 'regenerating');
    await addGenerationJob(draft.submission_id);

    logger.info(`🔄 Draft regeneration queued: ${id}`);
    res.json({ success: true, message: 'Draft regeneration queued.', draft_id: id });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/drafts/:id/regenerate-stream
 * SSE endpoint — streams AI-generated text chunks in real-time, saves the
 * completed draft, then emits a "done" event with the final structured content.
 */
async function regenerateStream(req, res) {
  const { id } = req.params;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);

  try {
    // 1. Load draft (includes submission data via JOIN)
    const draftResult = await draftQueries.findById(id);
    const draft = draftResult.rows[0];
    if (!draft) { send('error', { message: 'Draft not found' }); return res.end(); }

    // Guard: reject if already regenerating (prevents infinite loop from EventSource reconnect)
    if (draft.status === 'regenerating') {
      send('error', { message: 'Draft is already being regenerated. Please wait.' });
      return res.end();
    }

    // 2. Mark as regenerating
    await draftQueries.updateStatus(id, 'regenerating');
    send('status', { status: 'regenerating' });

    // 3. Extract attachment context from original submission files
    let fileUrls = draft.file_urls || [];
    if (typeof fileUrls === 'string') {
      try { fileUrls = JSON.parse(fileUrls); } catch { fileUrls = []; }
    }
    const attachmentContext = await extractAttachmentContext(fileUrls);

    // 4. Build prompt from stored submission data + attachments
    const prompt = buildGenerationPrompt({
      content_title:       draft.content_title,
      content_description: draft.content_description,
      tone_preference:     draft.tone_preference,
      content_type:        draft.content_type,
      attachmentContext,
    });

    // 4. Stream AI generation — every chunk forwarded to client in real-time
    const parsed = await generateContentStreaming(prompt, (chunk) => {
      send('chunk', { text: chunk });
    });

    // 5. Save new content to the draft row
    const { query } = require('../config/database');
    await query(
      'UPDATE ai_drafts SET linkedin_text = ?, twitter_text = ?, instagram_text = ?, hashtags = ?, status = ?, llm_model = ?, prompt_version = ? WHERE id = ?',
      [
        parsed.linkedin,
        parsed.twitter,
        parsed.instagram,
        JSON.stringify(parsed.hashtags),
        'ready_for_review',
        parsed.model || 'unknown',
        getPromptVersion(),
        id,
      ]
    );

    // 6. Send completion event with parsed result
    send('done', {
      linkedin:  parsed.linkedin,
      twitter:   parsed.twitter,
      instagram: parsed.instagram,
      hashtags:  parsed.hashtags,
      model:     parsed.model,
      duration:  parsed.duration,
    });

    logger.info(`✅ Draft ${id} regenerated via streaming (${parsed.model})`);
  } catch (err) {
    logger.error(`❌ Stream regeneration failed: ${err.message}`);
    send('error', { message: err.message || 'Regeneration failed' });
    try { await draftQueries.updateStatus(id, 'ready_for_review'); } catch (_) {}
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
}

module.exports = { getDrafts, getDraftById, regenerateDraft, regenerateStream };
