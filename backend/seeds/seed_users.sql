-- ============================================
-- Seed Default Users
-- Password: AMA2026! (bcrypt hash)
-- ============================================

-- Hash generated with bcrypt, 12 rounds for 'AMA2026!'
-- $2a$12$LJ3a4FqGR8XJoBRNYtQKHOYFGPpVv1VjLjKqRe2jN1Q5vYEasPGKq

INSERT INTO users (name, email, password_hash, role) VALUES
  ('Demo Trainer', 'trainer@company.com', '$2a$12$LJ3a4FqGR8XJoBRNYtQKHOYFGPpVv1VjLjKqRe2jN1Q5vYEasPGKq', 'trainer'),
  ('Marketing Head', 'marketing@company.com', '$2a$12$LJ3a4FqGR8XJoBRNYtQKHOYFGPpVv1VjLjKqRe2jN1Q5vYEasPGKq', 'marketing_head'),
  ('System Admin', 'admin@company.com', '$2a$12$LJ3a4FqGR8XJoBRNYtQKHOYFGPpVv1VjLjKqRe2jN1Q5vYEasPGKq', 'admin')
ON CONFLICT (email) DO NOTHING;
