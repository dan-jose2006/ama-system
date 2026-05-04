-- ============================================
-- AI Marketing Automation System
-- Initial Database Schema - Migration 001
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('trainer', 'marketing_head', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- Submissions Table
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  team VARCHAR(50),
  content_title VARCHAR(200),
  content_description TEXT NOT NULL CHECK (LENGTH(content_description) >= 20),
  content_type VARCHAR(20) CHECK (content_type IN ('post', 'event', 'course', 'announcement')),
  priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  tone_preference VARCHAR(20) CHECK (tone_preference IN ('formal', 'casual', 'promotional')) DEFAULT 'formal',
  file_urls JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_by ON submissions(submitted_by);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);

-- ============================================
-- AI Drafts Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  linkedin_text TEXT NOT NULL CHECK (LENGTH(linkedin_text) <= 3000),
  twitter_text TEXT NOT NULL CHECK (LENGTH(twitter_text) <= 280),
  instagram_text TEXT NOT NULL CHECK (LENGTH(instagram_text) <= 2200),
  hashtags TEXT[] NOT NULL CHECK (array_length(hashtags, 1) BETWEEN 3 AND 10),
  image_reference VARCHAR(500),
  status VARCHAR(20) DEFAULT 'ready_for_review' CHECK (status IN ('ready_for_review', 'approved', 'rejected', 'regenerating')),
  llm_model VARCHAR(50),
  prompt_version INTEGER DEFAULT 1,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_drafts_status ON ai_drafts(status);
CREATE INDEX idx_ai_drafts_submission ON ai_drafts(submission_id);
CREATE INDEX idx_ai_drafts_generated_at ON ai_drafts(generated_at DESC);

-- ============================================
-- Approvals Table (Audit Log)
-- ============================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES ai_drafts(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name VARCHAR(100) NOT NULL,
  reviewer_email VARCHAR(100),
  edited_linkedin TEXT,
  edited_twitter TEXT,
  edited_instagram TEXT,
  decision VARCHAR(10) CHECK (decision IN ('approved', 'rejected')),
  feedback TEXT,
  scheduled_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approvals_draft ON approvals(draft_id);
CREATE INDEX idx_approvals_decision ON approvals(decision);
CREATE INDEX idx_approvals_created_at ON approvals(created_at DESC);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
