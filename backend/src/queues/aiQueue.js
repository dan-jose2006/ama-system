const { isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');

let aiQueue = null;

function getAIQueue() {
  if (!isRedisAvailable()) return null;
  if (aiQueue) return aiQueue;

  try {
    const { Queue } = require('bullmq');
    const { getRedisConnection } = require('../config/redis');
    const connection = getRedisConnection();
    
    if (!connection) return null;

    aiQueue = new Queue('ai_generation_queue', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });

    logger.info('✅ AI Generation Queue initialized');
    return aiQueue;
  } catch (err) {
    logger.warn('⚠️ Could not initialize BullMQ queue', { error: err.message });
    return null;
  }
}

async function addGenerationJob(submissionId) {
  const queue = getAIQueue();

  if (!queue) {
    logger.info('📥 Queue not available. Processing submission synchronously...');
    // Fallback: process inline (for dev without Redis)
    const { processSubmission } = require('../workers/aiWorker');
    // Use setImmediate to not block the response
    setImmediate(async () => {
      try {
        await processSubmission(submissionId);
      } catch (err) {
        logger.error('Sync processing failed', { error: err.message });
      }
    });
    return { id: 'sync-fallback', submissionId };
  }

  const job = await queue.add(
    'generate_content',
    { submissionId },
    {
      jobId: `gen-${submissionId}`,
      timeout: 180000,
    }
  );

  logger.info(`📥 Job queued: ${job.id} for submission ${submissionId}`);
  return job;
}

module.exports = { getAIQueue, addGenerationJob };
