const { env, validateEnv } = require('./src/config/env');

// Validate environment before anything else
validateEnv();

const app = require('./src/app');
const { connectDB, getDB } = require('./src/config/database');
const logger = require('./src/utils/logger');
const bcrypt = require('bcryptjs');

async function seedDefaultUsers() {
  try {
    const db = getDB();
    const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    if (existing.count === 0) {
      logger.info('📝 Seeding default users...');
      const hash = bcrypt.hashSync('AMA2026!', 12);
      
      const stmt = db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role) 
         VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), ?, ?, ?, ?)`
      );
      
      stmt.run('Demo Trainer', 'trainer@company.com', hash, 'trainer');
      stmt.run('Marketing Head', 'marketing@company.com', hash, 'marketing_head');
      stmt.run('System Admin', 'admin@company.com', hash, 'admin');
      
      logger.info('✅ Default users created (password: AMA2026!)');
    } else {
      logger.info(`✅ ${existing.count} users already exist in database`);
    }
  } catch (err) {
    logger.error('⚠️ Could not seed users', { error: err.message });
  }
}

async function startServer() {
  try {
    // 1. Connect to SQLite database (auto-creates schema)
    await connectDB();

    // 2. Seed default users if empty
    await seedDefaultUsers();

    // 3. AI Worker uses sync fallback (no Redis needed)
    logger.info('🏭 AI Processing: Synchronous mode (no Redis required)');

    // 4. Start Express server
    const server = app.listen(env.PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════╗
║   AI Marketing Automation System v1.0            ║
║   Server: http://localhost:${env.PORT}                ║
║   Database: SQLite (backend/data/ama.db)         ║
║   AI Mode: ${(env.GEMINI_API_KEY ? 'Gemini 2.5 Flash (Free)  ' : env.ANTHROPIC_API_KEY ? 'Claude API' : env.OPENAI_API_KEY ? 'GPT-4o API' : 'Mock (no API key)').padEnd(37)}║
║   Storage: ${(env.USE_LOCAL_STORAGE ? 'Local (backend/uploads/)' : 'AWS S3').padEnd(37)}║
║   Health: http://localhost:${env.PORT}/api/health     ║
╚══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('❌ Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

startServer();
