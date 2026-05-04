const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const DB_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'ama.db');


let db = null;

function getDB() {
  if (db) return db;
  
  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  return db;
}

function connectDB() {
  try {
    const database = getDB();
    initializeSchema(database);
    logger.info(`✅ SQLite connected: ${DB_PATH}`);
    return Promise.resolve(database);
  } catch (err) {
    logger.error('❌ SQLite connection failed', { error: err.message });
    return Promise.reject(err);
  }
}

function initializeSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('trainer', 'marketing_head', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      team TEXT,
      content_title TEXT,
      content_description TEXT NOT NULL,
      content_type TEXT CHECK (content_type IN ('post', 'event', 'course', 'announcement')),
      priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      tone_preference TEXT CHECK (tone_preference IN ('formal', 'casual', 'promotional')) DEFAULT 'formal',
      file_urls TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_drafts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
      linkedin_text TEXT NOT NULL,
      twitter_text TEXT NOT NULL,
      instagram_text TEXT NOT NULL,
      hashtags TEXT NOT NULL DEFAULT '[]',
      linkedin_media TEXT DEFAULT '[]',
      twitter_media TEXT DEFAULT '[]',
      instagram_media TEXT DEFAULT '[]',
      image_reference TEXT,
      status TEXT DEFAULT 'ready_for_review' CHECK (status IN ('ready_for_review', 'approved', 'rejected', 'regenerating')),
      llm_model TEXT,
      prompt_version INTEGER DEFAULT 1,
      publish_results TEXT DEFAULT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      draft_id TEXT REFERENCES ai_drafts(id) ON DELETE CASCADE,
      reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewer_name TEXT NOT NULL,
      reviewer_email TEXT,
      edited_linkedin TEXT,
      edited_twitter TEXT,
      edited_instagram TEXT,
      decision TEXT CHECK (decision IN ('approved', 'rejected')),
      feedback TEXT,
      scheduled_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
    CREATE INDEX IF NOT EXISTS idx_submissions_submitted_by ON submissions(submitted_by);
    CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON ai_drafts(status);
    CREATE INDEX IF NOT EXISTS idx_ai_drafts_submission ON ai_drafts(submission_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_draft ON approvals(draft_id);
  `);

  // Migration: Add new columns if missing
  try {
    const tableInfo = database.prepare("PRAGMA table_info(ai_drafts)").all();
    const columns = tableInfo.map(c => c.name);
    
    // Add new media columns
    ['linkedin_media', 'twitter_media', 'instagram_media'].forEach(col => {
      if (!columns.includes(col)) {
        database.exec(`ALTER TABLE ai_drafts ADD COLUMN ${col} TEXT DEFAULT '[]'`);
        logger.info(`🔄 Migration: added ${col} column to ai_drafts`);
      }
    });

    // Migrate data from image_reference if new columns are empty
    const checkStmt = database.prepare("SELECT COUNT(*) as count FROM ai_drafts WHERE image_reference IS NOT NULL AND (linkedin_media = '[]' OR linkedin_media IS NULL)");
    const { count } = checkStmt.get();
    
    if (count > 0) {
      logger.info(`🚚 Migration: Migrating image_reference to platform-specific media for ${count} rows`);
      const rows = database.prepare("SELECT id, image_reference FROM ai_drafts WHERE image_reference IS NOT NULL").all();
      
      const updateStmt = database.prepare(`
        UPDATE ai_drafts 
        SET linkedin_media = ?, twitter_media = ?, instagram_media = ?
        WHERE id = ?
      `);
      
      const transaction = database.transaction((rowsToMigrate) => {
        for (const row of rowsToMigrate) {
          const mediaArray = JSON.stringify([{
            url: row.image_reference,
            type: 'image',
            source: 'ai'
          }]);
          updateStmt.run(mediaArray, mediaArray, mediaArray, row.id);
        }
      });
      
      transaction(rows);
      logger.info('✅ Migration: Successfully migrated image references');
    }

    if (!columns.includes('publish_results')) {
      database.exec("ALTER TABLE ai_drafts ADD COLUMN publish_results TEXT DEFAULT NULL");
      logger.info('🔄 Migration: added publish_results column to ai_drafts');
    }
  } catch (e) { 
    logger.error('❌ Migration failed', { error: e.message });
  }
}

// Parse all known JSON columns on a SQLite row in-place
function parseJsonFields(row) {
  const jsonCols = [
    'file_urls', 'hashtags', 'publish_results',
    'linkedin_media', 'twitter_media', 'instagram_media',
  ];
  jsonCols.forEach(col => {
    if (row[col] && typeof row[col] === 'string') {
      try { row[col] = JSON.parse(row[col]); } catch (e) {}
    }
  });
}

// Wrapper to match pg-style query interface: returns { rows: [...] }
function query(sql, params = []) {
  const database = getDB();
  
  const sqlTrimmed = sql.trim().toUpperCase();
  
  if (sqlTrimmed.startsWith('SELECT') || sqlTrimmed.startsWith('WITH')) {
    const stmt = database.prepare(sql);
    const rows = stmt.all(...params);
    // Parse JSON fields
    rows.forEach(row => parseJsonFields(row));
    return Promise.resolve({ rows, rowCount: rows.length });
  } else if (sqlTrimmed.startsWith('INSERT')) {
    // For INSERT ... RETURNING *, we need to handle differently
    // First do the insert, then select the inserted row
    const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
    
    if (returningMatch) {
      const insertSql = sql.replace(/\s+RETURNING\s+.+$/i, '');
      const stmt = database.prepare(insertSql);
      const info = stmt.run(...params);
      
      // Figure out which table we inserted into
      const tableMatch = insertSql.match(/INSERT\s+INTO\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        // Get the last inserted row - use rowid for SQLite
        const lastRow = database.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`).get(info.lastInsertRowid);
        if (lastRow) { parseJsonFields(lastRow); }
        return Promise.resolve({ rows: lastRow ? [lastRow] : [], rowCount: info.changes });
      }
      return Promise.resolve({ rows: [], rowCount: info.changes });
    }
    
    const stmt = database.prepare(sql);
    const info = stmt.run(...params);
    return Promise.resolve({ rows: [], rowCount: info.changes });
  } else {
    // UPDATE, DELETE, etc.
    const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
    
    if (returningMatch) {
      const baseSql = sql.replace(/\s+RETURNING\s+.+$/i, '');
      const stmt = database.prepare(baseSql);
      const info = stmt.run(...params);
      
      // For UPDATE ... WHERE id = $N RETURNING *, get the updated row
      // id is always the LAST param in our query convention
      const tableMatch = baseSql.match(/UPDATE\s+(\w+)/i);
      if (tableMatch && params.length > 0) {
        const tableName = tableMatch[1];
        const idValue = params[params.length - 1]; // id is always last param
        const row = database.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(idValue);
        if (row) { parseJsonFields(row); }
        return Promise.resolve({ rows: row ? [row] : [], rowCount: info.changes });
      }
      return Promise.resolve({ rows: [], rowCount: info.changes });
    }
    
    const stmt = database.prepare(sql);
    const info = stmt.run(...params);
    return Promise.resolve({ rows: [], rowCount: info.changes });
  }
}

function getClient() {
  return Promise.resolve({
    query: (sql, params) => query(sql, params),
    release: () => {},
  });
}

module.exports = { pool: null, connectDB, query, getClient, getDB };
