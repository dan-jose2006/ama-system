const express  = require('express');
const router    = express.Router();
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const { authenticate } = require('../middleware/auth');
const logger    = require('../utils/logger');

// Directory where AI-generated images are stored
const AI_IMG_DIR = path.join(__dirname, '..', '..', 'uploads', 'ai-generated');
if (!fs.existsSync(AI_IMG_DIR)) fs.mkdirSync(AI_IMG_DIR, { recursive: true });

// ── Derive a deterministic numeric seed from any string (draft ID) ──────────
// Same draft ID → same seed → same image every time
function seedFromId(id) {
  if (!id) return Math.floor(Math.random() * 999999);
  const hex = crypto.createHash('md5').update(String(id)).digest('hex').substring(0, 8);
  return parseInt(hex, 16) % 999999;
}

// ── Extract the most meaningful phrase from post content ─────────────────────
function extractSubject({ title, description, postText }) {
  // Priority: use actual post text > description > title
  const raw = (postText || description || title || '').trim();

  // Take the first meaningful sentence (up to 150 chars) — this is the core topic
  const firstSentence = raw.split(/[.\n!?]/)[0].trim();
  const subject = (firstSentence || raw).substring(0, 150).trim();

  // Strip markdown, hashtags, URLs, emojis, and special chars — keep words + commas
  return subject
    .replace(/(https?:\/\/\S+)/g, '')
    .replace(/#\w+/g, '')
    .replace(/[^\w\s,.'"-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120);
}

// ── Extract top keywords from post text for image search ─────────────────────
function extractKeywords({ title, description, postText }, maxWords = 8) {
  const combined = `${title} ${description} ${postText}`.toLowerCase();
  // Strip stop-words and short tokens
  const stopWords = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'is','are','was','were','be','been','being','have','has','had','do','does',
    'did','will','would','could','should','may','might','shall','can','this',
    'that','these','those','it','its','we','our','you','your','they','their',
    'i','my','me','us','he','she','him','her','what','how','when','where','why',
    'which','who','not','no','so','if','as','from','by','about','into','than',
    'more','also','just','very','all','any','some','each','new','get','make',
    'use','take','give','go','come','know','see','look','want','need','help',
  ]);
  const words = combined
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  // Count frequency
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords)
    .map(([w]) => w)
    .join(' ');
}

// ── Build a rich, content-specific prompt for image generation ────────────────
function buildPrompt({ title, description, contentType, tone, postText }) {
  const subject = extractSubject({ title, description, postText });

  const typeKeywords = {
    course:       'online learning, students with laptops, digital education platform, e-learning',
    event:        'corporate conference, audience listening, professional speakers, networking event',
    announcement: 'team celebrating achievement, office success, business milestone, professionals',
    webinar:      'virtual presentation, online seminar, digital screen, remote learning',
    workshop:     'collaborative workshop, whiteboard session, hands-on training, team brainstorming',
    post:         'professional business setting, modern office, corporate environment',
  }[contentType] || 'professional business corporate modern';

  const toneMood = {
    formal:        'clean minimalist composition, navy and white corporate tones, formal elegant',
    casual:        'warm friendly natural light, vibrant approachable colors, candid modern',
    promotional:   'bold vibrant colors, dynamic composition, marketing visual, eye-catching energetic',
    inspirational: 'golden hour light, uplifting aspirational, bright airy hopeful atmosphere',
    professional:  'sleek high-contrast, premium polished look, sophisticated corporate',
    educational:   'bright clean classroom aesthetic, knowledge growth, learning focused',
  }[tone] || 'professional modern sleek polished';

  // The subject is the actual content — make it the primary focus of the prompt
  return [
    `professional high-quality photo depicting: ${subject}`,
    typeKeywords,
    toneMood,
    'photorealistic sharp focus, good lighting, centered versatile composition',
    'no text overlays, no watermarks, no logos, clean background',
  ].join(' — ');
}


// ── Core download helper: Pollinations → Unsplash → Picsum (last resort) ─────
async function downloadImage({ prompt, seed, width, height, keywords }) {
  const polliUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
    + `?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=flux`;

  // 1. Try Pollinations
  try {
    const res = await fetch(polliUrl, { signal: AbortSignal.timeout(35000) });
    if (!res.ok) throw new Error(`Pollinations ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1000) throw new Error('Response too small');
    const ext = (res.headers.get('content-type') || '').includes('png') ? 'png' : 'jpg';
    logger.info('🎨 Pollinations OK', { bytes: buf.length, seed });
    return { buf, ext, provider: 'pollinations' };
  } catch (polliErr) {
    logger.warn(`🎨 Pollinations failed (${polliErr.message}), trying Unsplash`);
  }

  // 2. Try Unsplash Source
  try {
    const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keywords)}`;
    const res = await fetch(unsplashUrl, { signal: AbortSignal.timeout(12000), redirect: 'follow' });
    if (!res.ok) throw new Error(`Unsplash ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1000) throw new Error('Response too small');
    logger.info('🎨 Unsplash OK', { bytes: buf.length });
    return { buf, ext: 'jpg', provider: 'unsplash' };
  } catch (unsplashErr) {
    logger.warn(`🎨 Unsplash failed (${unsplashErr.message}), using Picsum`);
  }

  // 3. Final fallback: Picsum.photos — always available, deterministic with seed
  const picsumUrl = `https://picsum.photos/seed/${seed}/${width}/${height}`;
  const res = await fetch(picsumUrl, { signal: AbortSignal.timeout(10000), redirect: 'follow' });
  if (!res.ok) throw new Error(`Picsum ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  logger.info('🎨 Picsum fallback OK', { bytes: buf.length });
  return { buf, ext: 'jpg', provider: 'picsum' };
}


// ── Save buffer to disk and return local URL ─────────────────────────────────
function saveImage(buf, ext, tag) {
  const filename = `${tag}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(AI_IMG_DIR, filename), buf);
  return `/api/v1/files/ai-generated/${filename}`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/v1/media/generate-for-draft
   ══════════════════════════════════════════════════════════════════════════════
   Generates ONE consistent image set for a draft (all 3 platforms share the
   same visual — wide for LinkedIn/Twitter, square for Instagram).

   Body: { draftId, title, description, contentType, tone, postText }
   Returns: { wide: { url }, square: { url }, prompt, provider, seed }
*/
router.post('/generate-for-draft', authenticate, async (req, res) => {
  try {
    const {
      draftId     = '',
      title       = '',
      description = '',
      contentType = 'post',
      tone        = 'professional',
      postText    = '',
    } = req.body;

    const prompt   = buildPrompt({ title, description, contentType, tone, postText });
    const seed     = seedFromId(draftId);   // ← deterministic: same draft = same image
    const keywords = extractKeywords({ title, description, postText });

    logger.info('🎨 Generating for all platforms', {
      draftId: draftId.substring(0, 8),
      seed,
      subject: (title || description).substring(0, 40),
    });

    // Generate wide (LinkedIn + Twitter) and square (Instagram) in parallel
    const [wideResult, squareResult] = await Promise.all([
      downloadImage({ prompt, seed, width: 1200, height: 628,  keywords }),
      downloadImage({ prompt, seed, width: 800,  height: 800,  keywords }),
    ]);

    const wideUrl   = saveImage(wideResult.buf,   wideResult.ext,   'ai-wide');
    const squareUrl = saveImage(squareResult.buf, squareResult.ext, 'ai-square');

    logger.info('🎨 Images saved', {
      wide: wideUrl,
      square: squareUrl,
      provider: wideResult.provider,
    });

    return res.json({
      success:     true,
      wide:        { url: wideUrl,   width: 1200, height: 628 },
      square:      { url: squareUrl, width: 800,  height: 800 },
      prompt,
      provider:    wideResult.provider,
      seed,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    logger.error('🎨 generate-for-draft error', { error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   POST /api/v1/media/generate-image  (kept for single-platform use)
   ══════════════════════════════════════════════════════════════════════════════
*/
router.post('/generate-image', authenticate, async (req, res) => {
  try {
    const {
      draftId     = '',
      title       = '',
      description = '',
      contentType = 'post',
      tone        = 'professional',
      platform    = 'linkedin',
      postText    = '',
    } = req.body;

    const prompt   = buildPrompt({ title, description, contentType, tone, postText });
    const dims     = platform === 'instagram' ? { w: 800, h: 800 } : { w: 1200, h: 628 };
    const seed     = draftId ? seedFromId(draftId) : Math.floor(Math.random() * 999999);
    const keywords = extractKeywords({ title, description, postText });

    const { buf, ext, provider } = await downloadImage({
      prompt, seed, width: dims.w, height: dims.h, keywords,
    });

    const localUrl = saveImage(buf, ext, `ai-${platform}`);

    logger.info(`🎨 Image saved [${provider}]`, { platform, seed });

    return res.json({
      success:     true,
      imageUrl:    localUrl,
      provider,
      prompt,
      seed,
      platform,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    logger.error('🎨 generate-image error', { error: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
