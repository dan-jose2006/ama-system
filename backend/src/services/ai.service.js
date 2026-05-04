const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { env } = require('../config/env');
const logger = require('../utils/logger');

let anthropicClient = null;
let openaiClient = null;

function getAnthropicClient() {
  if (!anthropicClient && env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getOpenAIClient() {
  if (!openaiClient && env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate content with Gemini via direct REST API (no SDK version issues)
 */
async function generateWithGemini(prompt) {
  if (!env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');

  logger.info('🤖 Calling Gemini API (REST)...');
  const startTime = Date.now();

  // Correct model names discovered from ListModels API
  const models = [
    { name: 'gemini-2.5-flash',          version: 'v1' },
    { name: 'gemini-2.5-flash-lite',     version: 'v1' },
    { name: 'gemini-2.0-flash',          version: 'v1' },
    { name: 'gemini-2.0-flash-lite',     version: 'v1' },
  ];

  for (const { name: modelName, version } of models) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    });

    const data = await response.json();

    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const responseText = data.candidates[0].content.parts[0].text;
      const duration = Date.now() - startTime;
      logger.info(`✅ Gemini (${modelName}) responded in ${duration}ms`);
      return { responseText, model: modelName, duration };
    }

    const errMsg = data.error?.message || `HTTP ${response.status}`;
    logger.warn(`⚠️ Gemini model ${modelName} failed: ${errMsg}`);
  }

  throw new Error('All Gemini models failed or quota exhausted');
}

/**
 * Generate content with Claude (fallback)
 */
async function generateWithClaude(prompt) {
  const client = getAnthropicClient();
  if (!client) throw new Error('Anthropic API key not configured');

  logger.info('🤖 Calling Claude API...');
  const startTime = Date.now();

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const duration = Date.now() - startTime;
  const responseText = message.content[0].text;
  return { responseText, model: 'claude-3-5-sonnet', duration };
}

/**
 * Generate content with GPT-4o (fallback)
 */
async function generateWithGPT(prompt) {
  const client = getOpenAIClient();
  if (!client) throw new Error('OpenAI API key not configured');

  logger.info('🤖 Calling GPT-4o API...');
  const startTime = Date.now();

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a marketing content generator. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const duration = Date.now() - startTime;
  const responseText = completion.choices[0].message.content;
  return { responseText, model: 'gpt-4o', duration };
}

/**
 * Parse and validate AI response JSON
 */
function parseAIResponse(responseText) {
  let jsonStr = responseText.trim();

  // Remove markdown code block if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  if (!parsed.linkedin || typeof parsed.linkedin !== 'string') throw new Error('Missing linkedin field');
  if (!parsed.twitter || typeof parsed.twitter !== 'string') throw new Error('Missing twitter field');
  if (!parsed.instagram || typeof parsed.instagram !== 'string') throw new Error('Missing instagram field');
  if (!Array.isArray(parsed.hashtags) || parsed.hashtags.length < 3) throw new Error('Hashtags must have at least 3 items');

  if (parsed.linkedin.length > 3000) parsed.linkedin = parsed.linkedin.substring(0, 3000);
  if (parsed.twitter.length > 280) parsed.twitter = parsed.twitter.substring(0, 280);
  if (parsed.instagram.length > 2200) parsed.instagram = parsed.instagram.substring(0, 2200);
  if (parsed.hashtags.length > 10) parsed.hashtags = parsed.hashtags.slice(0, 10);

  parsed.hashtags = parsed.hashtags.map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag));

  return parsed;
}

/**
 * Generate content with fallback chain:
 * Gemini → Claude → GPT-4o → Smart Mock
 */
async function generateContent(prompt) {
  // 1. Try Gemini (free)
  if (env.GEMINI_API_KEY) {
    try {
      const { responseText, model, duration } = await generateWithGemini(prompt);
      const parsed = parseAIResponse(responseText);
      logger.info(`🎉 Content generated via ${model}`);
      return { ...parsed, model, duration };
    } catch (err) {
      logger.warn(`Gemini failed: ${err.message}. Trying next...`);
    }
  }

  // 2. Try Claude
  if (env.ANTHROPIC_API_KEY) {
    try {
      const { responseText, model, duration } = await generateWithClaude(prompt);
      const parsed = parseAIResponse(responseText);
      logger.info(`🎉 Content generated via ${model}`);
      return { ...parsed, model, duration };
    } catch (err) {
      logger.warn(`Claude failed: ${err.message}. Trying next...`);
    }
  }

  // 3. Try GPT-4o
  if (env.OPENAI_API_KEY) {
    try {
      const { responseText, model, duration } = await generateWithGPT(prompt);
      const parsed = parseAIResponse(responseText);
      logger.info(`🎉 Content generated via ${model}`);
      return { ...parsed, model, duration };
    } catch (err) {
      logger.warn(`GPT-4o failed: ${err.message}.`);
    }
  }

  // 4. Smart mock — uses actual submission content
  logger.warn('⚠️ All AI APIs unavailable. Using smart mock.');
  return generateSmartMock(prompt);
}

/**
 * Variation mock: produces genuinely different content on every call.
 * Randomly selects from multiple hooks, angles, CTAs and structures
 * so each regeneration looks and feels different.
 */
function generateSmartMock(prompt) {
  const titleMatch = prompt.match(/TITLE:\s*"([^"]+)"/);
  const descMatch  = prompt.match(/DESCRIPTION:\s*"([^"]+)"/);
  const toneMatch  = prompt.match(/TONE:\s*(\w+)/);
  const typeMatch  = prompt.match(/TYPE:\s*(\w+)/);

  const title       = titleMatch?.[1] || 'Our Latest Initiative';
  const description = descMatch?.[1]  || 'An exciting new development from our team.';
  const tone        = (toneMatch?.[1]  || 'professional').toLowerCase();
  const type        = (typeMatch?.[1]  || 'post').toLowerCase();

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const seed = Date.now(); // ensures different output each call

  // ── Emoji sets per type ───────────────────────────────────────────────────
  const emojis = {
    course:       ['🎓', '📚', '🧑‍💻', '💡', '🎯'],
    event:        ['📅', '🎤', '🌟', '🏆', '🎪'],
    announcement: ['📢', '🔔', '✨', '🚨', '💥'],
    default:      ['🚀', '💼', '🔥', '⚡', '🎉'],
  };
  const emojiSet = emojis[type] || emojis.default;
  const e1 = pick(emojiSet), e2 = pick(emojiSet);

  // ── LinkedIn hooks ────────────────────────────────────────────────────────
  const liHooks = [
    `Something we've been working on for a while is finally here.`,
    `Big news from our team — and we couldn't be more excited to share it.`,
    `We asked ourselves: what would actually make a difference? Here's our answer.`,
    `Not every announcement changes things. We believe this one does.`,
    `The feedback we've heard most: "we needed something like this." Today, it's here.`,
    `After months of work, research, and iteration — we're ready to share this.`,
  ];

  // ── LinkedIn value props ──────────────────────────────────────────────────
  const liProps = [
    ['Built for real-world impact, not just theory', 'Designed around how professionals actually work', 'Backed by research and practitioner insight'],
    ['Practical from day one', 'Structured for busy schedules', 'Results you can measure immediately'],
    ['Crafted with your challenges in mind', 'Focused on outcomes, not just content', 'Community-driven and continuously improved'],
    ['Zero fluff — pure, applicable knowledge', 'Flexible enough to fit any workflow', 'Designed to compound value over time'],
  ];

  // ── LinkedIn CTAs ─────────────────────────────────────────────────────────
  const liCTAs = {
    casual:       ['Drop a comment — we read every one 👇', 'Hit the link and check it out 👀', 'Share with someone who needs this 🙌'],
    promotional:  ['Spots are limited — register now 🔥', 'Early access closes soon — don\'t wait ⚡', 'Reserve your spot before it fills up 🎯'],
    formal:       ['We welcome your thoughts and questions.', 'Please feel free to reach out directly.', 'We look forward to your engagement.'],
    professional: ['Learn more and join us today.', 'Connect with us to find out how.', 'Follow for more updates as this evolves.'],
  };

  // ── Twitter angles ────────────────────────────────────────────────────────
  const twAngles = [
    `${e1} Just launched: ${title}\n\n${description.substring(0, 140)}\n\nThread 🧵👇`,
    `${e1} We've been building something.\n\nToday it's live: ${title}\n\n${description.substring(0, 100)}`,
    `Introducing ${title} ${e1}\n\n${description.substring(0, 120)}\n\nMore below 👇`,
    `${e1} ${title}\n\n${description.substring(0, 150)}\n\n— The KIAS Team`,
    `Hot off the press ${e1}\n\n${title}: ${description.substring(0, 120)}`,
  ];

  // ── Instagram angles ──────────────────────────────────────────────────────
  const igStructures = [
    // Structure A: bold opener + benefits + CTA
    () => `${e1} ${title.toUpperCase()} ${e1}\n\n${description}\n\n✨ Why this matters:\n→ ${pick(['Real skills, real outcomes', 'Built for people like you', 'No fluff, all impact'])}\n→ ${pick(['Start immediately', 'Learn at your own pace', 'Community-backed'])}\n→ ${pick(['Instantly applicable', 'Proven frameworks', 'Expert-led content'])}\n\n${pick(['Save this post 📌', 'Share with someone who needs this 🙌', 'Tag a friend below 👇'])}\n\n${pick(['Link in bio!', 'DM us to learn more.', 'Tap the link in our bio to get started.'])}`,
    // Structure B: storytelling
    () => `${e2} Here's something we're genuinely proud of.\n\n${title}\n\n${description}\n\nWe built this because we kept hearing the same thing — people needed something better. So we made it.\n\n💬 Tell us in the comments: what's been your biggest challenge with this?\n\n${pick(['📌 Save to come back to this', '🔗 Link in bio', '🙌 Share if this resonates'])}`,
    // Structure C: list format
    () => `${e1} ${title} — here's what you need to know:\n\n1️⃣ ${description.substring(0, 60)}...\n2️⃣ ${pick(['Completely free to get started', 'No prior experience needed', 'Results from day one'])}\n3️⃣ ${pick(['Join a growing community', 'Backed by industry experts', 'Flexible and self-paced'])}\n\n${pick(['Drop a ❤️ if this is for you!', 'Save this for later 📌', 'Tag someone who should see this 👇'])}`,
  ];

  // ── Hashtag pools ─────────────────────────────────────────────────────────
  const hashtagPool = [
    'ProfessionalDevelopment', 'CareerGrowth', 'Innovation', 'Learning',
    'SkillBuilding', 'FutureOfWork', 'Leadership', 'Growth', 'Upskilling',
    'WorkSmart', 'KnowledgeSharing', 'CommunityFirst', 'MindsetMatters',
    title.replace(/\s+/g, ''), 'KIAS2026', 'LifelongLearning',
  ];
  // Pick 6 random hashtags (different each call)
  const shuffled = [...hashtagPool].sort(() => Math.random() - 0.5);
  const hashtags = shuffled.slice(0, 6);

  // ── Build LinkedIn post ───────────────────────────────────────────────────
  const hook   = pick(liHooks);
  const props  = pick(liProps);
  const ctaArr = liCTAs[tone] || liCTAs.professional;
  const cta    = pick(ctaArr);

  const linkedin = [
    `${e1} ${hook}`,
    '',
    `Introducing: **${title}**`,
    '',
    description,
    '',
    `Here's what sets it apart:`,
    `✅ ${props[0]}`,
    `✅ ${props[1]}`,
    `✅ ${props[2]}`,
    '',
    cta,
    '',
    `${hashtags.slice(0,3).map(h=>'#'+h).join(' ')} 💼`,
  ].join('\n');

  const twitter  = pick(twAngles);
  const instagram = pick(igStructures)();

  logger.info(`🎲 Smart-mock variation generated (seed: ${seed})`);

  return {
    linkedin,
    twitter,
    instagram,
    hashtags,
    model: 'smart-mock',
    duration: 80,
  };
}


module.exports = { generateContent, generateWithGemini, generateWithClaude, generateWithGPT, parseAIResponse, generateContentStreaming };

/**
 * Stream AI content generation — forwards chunks to onChunk(text) callback in real-time.
 * Falls back to simulated streaming (character by character) if streaming API unavailable.
 * Returns the final parsed { linkedin, twitter, instagram, hashtags, model, duration }.
 */
async function generateContentStreaming(prompt, onChunk) {
  const startTime = Date.now();

  // ── 1. Try Gemini streaming ─────────────────────────────────────────
  if (env.GEMINI_API_KEY) {
    try {
      const models = [
        { name: 'gemini-2.5-flash', version: 'v1' },
        { name: 'gemini-2.0-flash', version: 'v1' },
        { name: 'gemini-2.0-flash-lite', version: 'v1' },
      ];

      for (const { name: modelName, version } of models) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:streamGenerateContent?key=${env.GEMINI_API_KEY}&alt=sse`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          logger.warn(`⚠️ Gemini streaming ${modelName} failed: ${res.status} ${errText.slice(0, 120)}`);
          continue;
        }

        let fullText = '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          // SSE lines are "data: {...}" — extract the JSON payload
          const lines = raw.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const obj = JSON.parse(jsonStr);
              const chunk = obj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunk) {
                fullText += chunk;
                onChunk(chunk);
              }
            } catch (_) { /* partial JSON line — skip */ }
          }
        }

        if (fullText.trim()) {
          const parsed = parseAIResponse(fullText);
          const duration = Date.now() - startTime;
          logger.info(`✅ Gemini streaming (${modelName}) finished in ${duration}ms`);
          return { ...parsed, model: modelName, duration };
        }
      }
    } catch (err) {
      logger.warn(`Gemini streaming error: ${err.message}. Falling back.`);
    }
  }

  // ── 2. Try Claude streaming ─────────────────────────────────────────
  if (env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

      let fullText = '';
      const stream = await client.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const chunk = event.delta.text || '';
          fullText += chunk;
          onChunk(chunk);
        }
      }

      if (fullText.trim()) {
        const parsed = parseAIResponse(fullText);
        const duration = Date.now() - startTime;
        logger.info(`✅ Claude streaming finished in ${duration}ms`);
        return { ...parsed, model: 'claude-3-5-sonnet', duration };
      }
    } catch (err) {
      logger.warn(`Claude streaming error: ${err.message}. Falling back.`);
    }
  }

  // ── 3. Simulate streaming from smart-mock ──────────────────────────
  logger.warn('⚠️ No streaming API available — simulating stream from smart-mock');
  const mock = generateSmartMock(prompt);
  const fullJson = JSON.stringify(mock, null, 2);

  // Drip the JSON in 8-char chunks to simulate typing
  for (let i = 0; i < fullJson.length; i += 8) {
    const chunk = fullJson.slice(i, i + 8);
    onChunk(chunk);
    await new Promise(r => setTimeout(r, 18));
  }

  return { ...mock, duration: Date.now() - startTime };
}
