require('dotenv').config();

const requiredVars = ['JWT_SECRET'];

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Storage
  USE_LOCAL_STORAGE: process.env.USE_LOCAL_STORAGE === 'true',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  S3_BUCKET: process.env.S3_BUCKET || 'ama-content-uploads',

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@company.com',
  MARKETING_EMAIL: process.env.MARKETING_EMAIL || 'marketing@company.com',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Social Media — Twitter/X
  TWITTER_API_KEY:       process.env.TWITTER_API_KEY,
  TWITTER_API_SECRET:    process.env.TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN:  process.env.TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,

  // Social Media — LinkedIn
  LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN,
  LINKEDIN_AUTHOR_URN:   process.env.LINKEDIN_AUTHOR_URN,

  // Social Media — Instagram
  INSTAGRAM_ACCESS_TOKEN:         process.env.INSTAGRAM_ACCESS_TOKEN,
  INSTAGRAM_BUSINESS_ACCOUNT_ID:  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
};

function validateEnv() {
  const missing = requiredVars.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('   Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  if (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    console.warn('⚠️  No AI API keys configured. AI generation will use mock responses.');
  }

  if (env.USE_LOCAL_STORAGE) {
    console.log('📁 Using local file storage (set USE_LOCAL_STORAGE=false for S3)');
  }
}

module.exports = { env, validateEnv };
