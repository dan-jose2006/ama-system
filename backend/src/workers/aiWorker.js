const { isRedisAvailable } = require('../config/redis');
const { submissionQueries, draftQueries } = require('../models/queries');
const { generateContent } = require('../services/ai.service');
const { notifyDraftReady } = require('../services/email.service');
const { buildGenerationPrompt, getPromptVersion } = require('../utils/promptBuilder');
const { extractAttachmentContext } = require('../utils/attachmentExtractor');
const logger = require('../utils/logger');

/**
 * Process a single submission through the AI pipeline
 * Used both by BullMQ worker and synchronous fallback
 */
async function processSubmission(submissionId) {
  logger.info(`🔄 Processing submission: ${submissionId}`);

  try {
    // 1. Fetch submission
    const result = await submissionQueries.findById(submissionId);
    const submission = result.rows[0];

    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    // 2. Update status to processing
    await submissionQueries.updateStatus(submissionId, 'processing');

    // 3. Parse file_urls (stored as JSON string in SQLite)
    let fileUrls = submission.file_urls || [];
    if (typeof fileUrls === 'string') {
      try { fileUrls = JSON.parse(fileUrls); } catch { fileUrls = []; }
    }

    // 4. Extract text/context from attachments for the AI prompt
    const attachmentContext = await extractAttachmentContext(fileUrls);
    if (attachmentContext) {
      logger.info(`📎 Attachment context extracted for ${submissionId} (${fileUrls.length} file(s))`);
    }

    // 5. Build prompt
    const prompt = buildGenerationPrompt({
      content_title:       submission.content_title,
      content_description: submission.content_description,
      tone_preference:     submission.tone_preference,
      content_type:        submission.content_type,
      attachmentContext,
    });

    // 6. Call AI
    const aiResult = await generateContent(prompt);

    // 7. Build platform-specific media lists from uploaded files
    const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const VIDEO_EXTS = /\.(mp4|mov|avi|webm|mkv)$/i;

    const mediaItems = fileUrls.map((f, idx) => {
      const url = typeof f === 'string' ? f : f.url;
      const name = typeof f === 'string' ? f.split('/').pop() : f.name;
      let type = 'image';
      if (VIDEO_EXTS.test(url)) type = 'video';
      return { id: `file-${idx}`, url, name, type, source: 'upload' };
    }).filter(m => IMAGE_EXTS.test(m.url) || VIDEO_EXTS.test(m.url));

    // Backwards-compat: single image_reference from first image
    const imageReference = mediaItems.find(m => m.type === 'image')?.url || null;

    // 8. Store draft
    const draft = await draftQueries.create({
      submission_id: submissionId,
      linkedin_text: aiResult.linkedin,
      twitter_text: aiResult.twitter,
      instagram_text: aiResult.instagram,
      hashtags: aiResult.hashtags,
      linkedin_media: mediaItems,
      twitter_media: mediaItems,
      instagram_media: mediaItems,
      image_reference: imageReference,
      llm_model: aiResult.model,
      prompt_version: getPromptVersion(),
    });

    // 9. Update submission status
    await submissionQueries.updateStatus(submissionId, 'completed');

    // 10. Notify marketing
    await notifyDraftReady({
      draftId: draft.rows[0].id,
      submitterName: submission.name,
      contentTitle: submission.content_title,
    });

    logger.info(`✅ Draft generated for submission ${submissionId}`, {
      draftId: draft.rows[0].id,
      model: aiResult.model,
      duration: aiResult.duration,
    });

    return draft.rows[0];
  } catch (err) {
    logger.error(`❌ Failed to process submission ${submissionId}`, {
      error: err.message,
      stack: err.stack,
    });

    // Update submission to failed
    try {
      await submissionQueries.updateStatus(submissionId, 'failed', err.message);
    } catch (updateErr) {
      logger.error('Failed to update submission status', { error: updateErr.message });
    }

    throw err;
  }
}

/**
 * Start the BullMQ worker (only if Redis is available)
 */
function startWorker() {
  if (!isRedisAvailable()) {
    logger.info('🏭 AI Worker: Using synchronous processing (no Redis)');
    return null;
  }

  try {
    const { Worker } = require('bullmq');
    const { getRedisConnection } = require('../config/redis');
    const connection = getRedisConnection();

    const worker = new Worker(
      'ai_generation_queue',
      async (job) => {
        const { submissionId } = job.data;
        logger.info(`🏭 Worker processing job ${job.id}`, { submissionId, attempt: job.attemptsMade + 1 });
        return processSubmission(submissionId);
      },
      {
        connection,
        concurrency: 3,
      }
    );

    worker.on('completed', (job) => {
      logger.info(`✅ Job completed: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`❌ Job failed: ${job?.id}`, {
        error: err.message,
        attempts: job?.attemptsMade,
      });
    });

    worker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });

    logger.info('🏭 AI Worker started (concurrency: 3)');
    return worker;
  } catch (err) {
    logger.warn('⚠️ Could not start BullMQ worker. Using sync fallback.', {
      error: err.message,
    });
    return null;
  }
}

module.exports = { processSubmission, startWorker };
