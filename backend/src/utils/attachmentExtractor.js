const fs   = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../middleware/upload');
const logger = require('./logger');

const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const PDF_EXT    = /\.pdf$/i;

/**
 * Given a file_urls array (stored on a submission), read each file from disk
 * and extract context text the AI can use when generating content.
 *
 * Returns a single string block ready to be injected into the prompt.
 * Returns empty string if no files or extraction fails.
 */
async function extractAttachmentContext(fileUrls) {
  if (!fileUrls || fileUrls.length === 0) return '';

  const sections = [];

  for (const f of fileUrls) {
    // file_urls entries can be strings or {url, originalName, filename, mimetype}
    const relUrl      = typeof f === 'string' ? f : f.url;           // e.g. "<uploadId>/filename.pdf"
    const origName    = typeof f === 'object' ? (f.originalName || f.name || '') : relUrl.split('/').pop();
    const mimetype    = typeof f === 'object' ? f.mimetype : '';

    const absPath = path.join(UPLOAD_DIR, relUrl);

    // ── PDF: extract text ─────────────────────────────────────────────
    if (PDF_EXT.test(origName) || mimetype === 'application/pdf') {
      try {
        if (!fs.existsSync(absPath)) {
          logger.warn(`Attachment not found on disk: ${absPath}`);
          sections.push(`[PDF: ${origName} — file not found on disk]`);
          continue;
        }

        const pdfParse = require('pdf-parse');
        const buffer   = fs.readFileSync(absPath);
        const data     = await pdfParse(buffer);
        const text     = (data.text || '').trim().replace(/\s+/g, ' ').slice(0, 3000); // cap at 3k chars

        if (text) {
          sections.push(`[PDF Attachment: "${origName}"]\n${text}`);
        } else {
          sections.push(`[PDF Attachment: "${origName}" — no extractable text (scanned document)]`);
        }
      } catch (err) {
        logger.warn(`PDF extraction failed for ${origName}: ${err.message}`);
        sections.push(`[PDF Attachment: "${origName}" — extraction failed]`);
      }
    }

    // ── Image: describe by name/type for AI awareness ─────────────────
    else if (IMAGE_EXTS.test(origName) || (mimetype && mimetype.startsWith('image/'))) {
      sections.push(`[Image Attachment: "${origName}" — use this image as visual reference or inspiration for the content tone and style]`);
    }
  }

  if (sections.length === 0) return '';

  return `\nATTACHMENTS PROVIDED (use these to enrich content):\n${sections.join('\n\n')}`;
}

module.exports = { extractAttachmentContext };
