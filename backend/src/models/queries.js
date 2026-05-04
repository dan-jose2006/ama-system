const { query } = require('../config/database');

// Helper: converts $1, $2 style params to ? style for SQLite
function pgToSqlite(sql) {
  let i = 0;
  return sql.replace(/\$\d+/g, () => '?');
}

// ============================================
// User Queries
// ============================================
const userQueries = {
  findByEmail: (email) =>
    query(pgToSqlite('SELECT * FROM users WHERE email = $1'), [email]),

  findById: (id) =>
    query(pgToSqlite('SELECT id, name, email, role, created_at FROM users WHERE id = $1'), [id]),

  create: (name, email, passwordHash, role) =>
    query(
      pgToSqlite('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *'),
      [name, email, passwordHash, role]
    ),
};

// ============================================
// Submission Queries
// ============================================
const submissionQueries = {
  create: (data) =>
    query(
      pgToSqlite(`INSERT INTO submissions (submitted_by, name, email, team, content_title, content_description, content_type, priority, tone_preference, file_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`),
      [
        data.submitted_by,
        data.name,
        data.email,
        data.team,
        data.content_title,
        data.content_description,
        data.content_type,
        data.priority || 'medium',
        data.tone_preference || 'formal',
        JSON.stringify(data.file_urls || []),
      ]
    ),

  findById: (id) =>
    query(pgToSqlite('SELECT * FROM submissions WHERE id = $1'), [id]),

  findByUser: (userId) =>
    query(
      pgToSqlite('SELECT * FROM submissions WHERE submitted_by = $1 ORDER BY created_at DESC'),
      [userId]
    ),

  updateStatus: (id, status, errorMessage = null) =>
    query(
      pgToSqlite('UPDATE submissions SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *'),
      [status, errorMessage, id]
    ),

  findAll: (limit = 50, offset = 0) =>
    query(
      pgToSqlite('SELECT * FROM submissions ORDER BY created_at DESC LIMIT $1 OFFSET $2'),
      [limit, offset]
    ),
};

// ============================================
// AI Draft Queries
// ============================================
const draftQueries = {
  create: (data) =>
    query(
      pgToSqlite(`INSERT INTO ai_drafts (submission_id, linkedin_text, twitter_text, instagram_text, hashtags, linkedin_media, twitter_media, instagram_media, image_reference, llm_model, prompt_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`),
      [
        data.submission_id,
        data.linkedin_text,
        data.twitter_text,
        data.instagram_text,
        JSON.stringify(data.hashtags),
        JSON.stringify(data.linkedin_media || []),
        JSON.stringify(data.twitter_media || []),
        JSON.stringify(data.instagram_media || []),
        data.image_reference || null,
        data.llm_model,
        data.prompt_version,
      ]
    ),

  findById: (id) =>
    query(
      pgToSqlite(`SELECT d.*, 
              s.name as submitter_name, s.email as submitter_email, 
              s.content_title, s.content_description, s.team, 
              s.content_type, s.priority, s.tone_preference, s.file_urls,
              s.created_at as submitted_at
       FROM ai_drafts d
       JOIN submissions s ON d.submission_id = s.id
       WHERE d.id = $1`),
      [id]
    ),

  updateMedia: (id, platform, mediaItems) =>
    query(
      pgToSqlite(`UPDATE ai_drafts SET ${platform}_media = $1 WHERE id = $2 RETURNING *`),
      [JSON.stringify(mediaItems), id]
    ),

  findBySubmission: (submissionId) =>
    query(pgToSqlite('SELECT * FROM ai_drafts WHERE submission_id = $1 ORDER BY generated_at DESC'), [
      submissionId,
    ]),

  findAll: ({ status, team, submittedBy, excludeUser, limit = 20, offset = 0 }) => {
    let sql = `
      SELECT d.*, 
             s.name as submitter_name, s.content_title, s.team, 
             s.submitted_by, s.created_at as submitted_at, s.priority
      FROM ai_drafts d
      JOIN submissions s ON d.submission_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND d.status = ?`;
      params.push(status);
    }
    if (team) {
      sql += ` AND s.team = ?`;
      params.push(team);
    }
    if (submittedBy) {
      sql += ` AND s.submitted_by = ?`;
      params.push(submittedBy);
    }
    if (excludeUser) {
      sql += ` AND s.submitted_by != ?`;
      params.push(excludeUser);
    }

    sql += ` ORDER BY d.generated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return query(sql, params);
  },


  updateStatus: (id, status) =>
    query(pgToSqlite('UPDATE ai_drafts SET status = $1 WHERE id = $2 RETURNING *'), [status, id]),

  savePublishResults: (id, publishResults) =>
    query(
      pgToSqlite('UPDATE ai_drafts SET publish_results = $1 WHERE id = $2 RETURNING *'),
      [JSON.stringify(publishResults), id]
    ),

  countByStatus: ({ submittedBy, excludeUser } = {}) => {
    let sql = `
      SELECT d.status, COUNT(*) as count
      FROM ai_drafts d
      JOIN submissions s ON d.submission_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (submittedBy) {
      sql += ` AND s.submitted_by = ?`;
      params.push(submittedBy);
    }
    if (excludeUser) {
      sql += ` AND s.submitted_by != ?`;
      params.push(excludeUser);
    }

    sql += ` GROUP BY d.status`;
    return query(sql, params);
  },
};

// ============================================
// Approval Queries
// ============================================
const approvalQueries = {
  create: (data) =>
    query(
      pgToSqlite(`INSERT INTO approvals (draft_id, reviewer_id, reviewer_name, reviewer_email, edited_linkedin, edited_twitter, edited_instagram, decision, feedback, scheduled_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`),
      [
        data.draft_id,
        data.reviewer_id,
        data.reviewer_name,
        data.reviewer_email,
        data.edited_linkedin || null,
        data.edited_twitter || null,
        data.edited_instagram || null,
        data.decision,
        data.feedback || null,
        data.scheduled_time || null,
      ]
    ),

  findByDraft: (draftId) =>
    query(
      pgToSqlite('SELECT * FROM approvals WHERE draft_id = $1 ORDER BY created_at DESC'),
      [draftId]
    ),

  findAll: (limit = 50, offset = 0) =>
    query(
      pgToSqlite(`SELECT a.*, d.submission_id, 
              s.content_title, s.name as submitter_name
       FROM approvals a
       JOIN ai_drafts d ON a.draft_id = d.id
       JOIN submissions s ON d.submission_id = s.id
       ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`),
      [limit, offset]
    ),
};

module.exports = { userQueries, submissionQueries, draftQueries, approvalQueries };
