/**
 * AI Prompt Templates for content generation
 * Version-controlled for audit trail
 */

const PROMPT_VERSION = 1;

function buildGenerationPrompt({ content_title, content_description, tone_preference, content_type, attachmentContext = '' }) {
  return `You are an expert marketing content generator for a professional training company.

Generate 3 platform-specific social media posts and 5-10 relevant hashtags based on the following content:

TITLE: "${content_title || 'Untitled Content'}"
DESCRIPTION: "${content_description}"
TONE: ${tone_preference || 'formal'}
TYPE: ${content_type || 'post'}${attachmentContext}

REQUIREMENTS:
1. LinkedIn: Professional, detailed (max 3000 characters), B2B focus, thought leadership style. Include a compelling hook in the first line.
2. Twitter/X: Concise, engaging (MAXIMUM 280 characters including spaces), use 1-2 relevant emojis. Must be impactful and shareable.
3. Instagram: Emotional, storytelling approach (max 2200 characters), visual-first language. Include line breaks for readability.

CRITICAL RULES:
- Twitter text MUST be 280 characters or less. Count carefully.
- All content must be original and professional.
- Hashtags should be relevant to the content and industry.
- Do not include hashtags within the post texts themselves.
- Generate between 5 and 10 hashtags.
- If ATTACHMENTS are provided above, reference their content to make the posts more specific and accurate.

Output ONLY valid JSON in this exact format, no other text:
{
  "linkedin": "full linkedin post text here",
  "twitter": "tweet text here (max 280 chars)",
  "instagram": "full instagram caption here",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;
}

function getPromptVersion() {
  return PROMPT_VERSION;
}

module.exports = { buildGenerationPrompt, getPromptVersion };
