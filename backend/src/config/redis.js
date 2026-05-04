const { env } = require('./env');
const logger = require('../utils/logger');

let connection = null;
let redisAvailable = false;

function getRedisConnection() {
  if (connection) return connection;

  try {
    const IORedis = require('ioredis');
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('Redis: max retries reached. Giving up.');
          return null; // stop retrying
        }
        return Math.min(times * 500, 3000);
      },
    });

    connection.on('connect', () => {
      redisAvailable = true;
      logger.info('✅ Redis connected');
    });

    connection.on('error', (err) => {
      redisAvailable = false;
      // Don't spam logs
    });

    connection.on('close', () => {
      redisAvailable = false;
    });

    return connection;
  } catch (err) {
    logger.warn('⚠️ Redis module not available');
    return null;
  }
}

async function connectRedis() {
  try {
    const conn = getRedisConnection();
    if (!conn) {
      logger.warn('⚠️ Redis not configured. Using synchronous processing.');
      return null;
    }
    await conn.connect();
    await conn.ping();
    redisAvailable = true;
    logger.info('✅ Redis ping successful');
    return conn;
  } catch (err) {
    redisAvailable = false;
    logger.warn('⚠️ Redis not available. Queue features will use sync fallback.', {
      error: err.message,
    });
    return null;
  }
}

function isRedisAvailable() {
  return redisAvailable;
}

module.exports = { getRedisConnection, connectRedis, isRedisAvailable };
