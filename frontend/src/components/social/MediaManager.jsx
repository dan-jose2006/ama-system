import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image, Film, X, Plus, Upload, Sparkles,
  AlertCircle, Move, ExternalLink, Copy, CheckCheck, Loader2,
} from 'lucide-react';
import api from '../../services/api';

/* ─── per-platform limits and allowed types ───────────────────────────── */
const LIMITS = { instagram: 20, linkedin: 9, twitter: 4 };
const ACCEPTS = {
  instagram: { image: true, video: true  },
  linkedin:  { image: true, video: true  },
  twitter:   { image: true, video: true  },
};

/* ─── helpers ──────────────────────────────────────────────────────────── */
function uid() {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isVideo(item) {
  return item.type === 'video' || /\.(mp4|mov|avi|webm|mkv)$/i.test(item.url);
}

/* ─── single media tile ────────────────────────────────────────────────── */
function MediaTile({ item, index, onRemove, isEditable, color }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.75 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* media preview */}
      {isVideo(item) ? (
        <video
          src={item.url}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
          loop
          onMouseEnter={e => e.target.play()}
          onMouseLeave={e => e.target.pause()}
        />
      ) : (
        <img
          src={item.url}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 40%, transparent)',
        transition: 'opacity 0.2s',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8,
      }}
        className="media-tile-overlay"
      >
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', marginBottom: 4, truncate: true }}>
          {item.name}
        </p>
        <div style={{ display: 'flex', gap: 4 }}>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            style={{ padding: '3px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <ExternalLink size={10} />
          </a>
          <button onClick={copyUrl}
            style={{ padding: '3px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', border: 'none', cursor: 'pointer' }}>
            {copied ? <CheckCheck size={10} /> : <Copy size={10} />}
          </button>
        </div>
      </div>

      {/* type badge */}
      <div style={{
        position: 'absolute', top: 6, left: 6,
        padding: '2px 6px', borderRadius: 4,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', gap: 3,
      }}>
        {isVideo(item)
          ? <Film size={9} style={{ color }} />
          : <Image size={9} style={{ color }} />}
        <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
          {isVideo(item) ? 'VIDEO' : 'IMAGE'}
        </span>
      </div>

      {/* index badge */}
      <div style={{
        position: 'absolute', top: 6, right: 32,
        width: 18, height: 18, borderRadius: '50%',
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{index + 1}</span>
      </div>

      {/* remove button */}
      {isEditable && (
        <button
          onClick={() => onRemove(item.id)}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(220,38,38,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s',
          }}
        >
          <X size={11} color="#fff" />
        </button>
      )}

      {/* source tag */}
      {item.source === 'ai' && (
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          padding: '2px 5px', borderRadius: 3,
          background: `${color}25`, border: `1px solid ${color}40`,
        }}>
          <span style={{ fontSize: 7, fontFamily: 'monospace', color, letterSpacing: '0.1em' }}>AI</span>
        </div>
      )}
    </motion.div>
  );
}

/* ─── add media panel (modal) ──────────────────────────────────────────── */
function AddMediaPanel({ platform, color, onAdd, onClose, draftContext = {} }) {
  const fileRef = useRef();
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genPrompt, setGenPrompt] = useState('');

  const handleFiles = useCallback((files) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        onAdd({
          id: uid(),
          url: e.target.result,
          name: file.name,
          type: file.type.startsWith('video') ? 'video' : 'image',
          source: 'user',
        });
      };
      reader.readAsDataURL(file);
    });
    onClose();
  }, [onAdd, onClose]);

  const handleUrlAdd = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch {
      setUrlError('Please enter a valid URL');
      return;
    }
    const isVid = /\.(mp4|mov|avi|webm|mkv)$/i.test(trimmed);
    onAdd({ id: uid(), url: trimmed, name: trimmed.split('/').pop(), type: isVid ? 'video' : 'image', source: 'user' });
    onClose();
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    setGenError('');
    setGenPrompt('Building contextual prompt…');
    try {
      const res = await api.post('/api/v1/media/generate-image', {
        title:       draftContext.title       || '',
        description: draftContext.description || '',
        contentType: draftContext.contentType || 'post',
        tone:        draftContext.tone        || 'professional',
        platform,
        postText:    draftContext.postText    || '',
      });
      const { imageUrl, prompt, provider } = res.data;
      setGenPrompt(`[${provider}] ${prompt}`);

      // Add immediately — let the browser's <img> handle loading natively.
      // No pre-loader needed; it avoids 30s+ hangs on Pollinations.
      onAdd({
        id:     uid(),
        url:    imageUrl,
        name:   `ai-${platform}-${Date.now()}.jpg`,
        type:   'image',
        source: 'ai',
      });
      onClose();
    } catch (err) {
      console.error('AI image generation failed:', err);
      setGenError(
        err?.response?.data?.error ||
        'Generation failed. Try again or paste a URL instead.'
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(15,15,20,0.98)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18, padding: 24, width: '100%', maxWidth: 420,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={15} color={color} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Add Media</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>{platform}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Upload from device */}
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.background = `${color}08`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Upload size={16} color={color} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Upload from Device</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>JPG, PNG, GIF, WEBP, MP4, MOV · Max 10 MB</p>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/mov,video/avi,video/webm"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />

          {/* AI Generate */}
          <button
            onClick={handleAIGenerate}
            disabled={generating}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 16px', borderRadius: 12, cursor: generating ? 'wait' : 'pointer',
              background: generating ? `${color}12` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${generating ? color + '40' : 'rgba(255,255,255,0.08)'}`,
              opacity: generating ? 1 : 1, transition: 'border-color 0.2s, background 0.2s',
              width: '100%', textAlign: 'left',
            }}
            onMouseEnter={e => { if (!generating) { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.background = `${color}08`; }}}
            onMouseLeave={e => { if (!generating) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              {generating
                ? <Loader2 size={16} color={color} style={{ animation: 'spin 1s linear infinite' }} />
                : <Sparkles size={16} color={color} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                {generating ? 'Generating image…' : 'Generate with AI'}
              </p>
              {generating && genPrompt ? (
                <p style={{ fontSize: 10, color: `${color}80`, fontFamily: 'monospace', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {genPrompt.length > 100 ? genPrompt.substring(0, 100) + '…' : genPrompt}
                </p>
              ) : (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  Creates a contextual image based on your post content
                </p>
              )}
              {genError && (
                <p style={{ fontSize: 10, color: '#f87171', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={10} /> {genError}
                </p>
              )}
            </div>
          </button>

          {/* URL input */}
          <div style={{ marginTop: 4 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Or paste a URL</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUrlAdd()}
                placeholder="https://example.com/image.jpg"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 12,
                  fontFamily: 'Inter, sans-serif', outline: 'none',
                }}
              />
              <button
                onClick={handleUrlAdd}
                style={{
                  padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: color, color: '#000', fontWeight: 700, fontSize: 12,
                }}
              >
                Add
              </button>
            </div>
            {urlError && (
              <p style={{ fontSize: 10, color: '#f87171', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={10} /> {urlError}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── main MediaManager component ──────────────────────────────────────── */
/**
 * Props:
 *   platform     : 'instagram' | 'twitter' | 'linkedin'
 *   color        : hex colour for platform branding
 *   media        : MediaItem[]
 *   onChange     : (newMedia: MediaItem[]) => void
 *   isEditable   : bool
 *   saving       : bool  – shows a spinner on the panel header while API call is in flight
 *   draftContext : { title, description, contentType, tone, postText } – used for AI image generation
 */
export default function MediaManager({ platform, color, media = [], onChange, isEditable = false, saving = false, draftContext = {} }) {
  const [showPanel, setShowPanel] = useState(false);
  const limit = LIMITS[platform] || 4;

  const handleRemove = useCallback((id) => {
    onChange(media.filter(m => m.id !== id));
  }, [media, onChange]);

  const handleAdd = useCallback((item) => {
    if (media.length >= limit) return;
    onChange([...media, item]);
  }, [media, limit, onChange]);

  const atLimit = media.length >= limit;
  const postType = media.length > 1
    ? (media.some(isVideo) ? 'Reel / Carousel' : 'Carousel')
    : (media.length === 1 ? (isVideo(media[0]) ? 'Reel' : 'Single Image') : 'Text Only');

  return (
    <div>
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image size={13} color={color} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>MEDIA</span>
          {saving && (
            <span style={{ fontSize: 11, color: color }}>Saving…</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
            {media.length}/{limit} · {postType}
          </span>
          {isEditable && !atLimit && (
            <button
              onClick={() => setShowPanel(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                borderRadius: 6, border: `1px solid ${color}40`, background: `${color}10`,
                color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${color}22`}
              onMouseLeave={e => e.currentTarget.style.background = `${color}10`}
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
      </div>

      {/* grid or empty state */}
      {media.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            border: '2px dashed rgba(255,255,255,0.07)', borderRadius: 12,
            padding: '28px 16px', textAlign: 'center',
          }}
        >
          <Image size={24} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>No media attached</p>
          {isEditable && (
            <button
              onClick={() => setShowPanel(true)}
              style={{
                fontSize: 11, padding: '5px 14px', borderRadius: 6, border: `1px solid ${color}40`,
                background: `${color}10`, color, cursor: 'pointer', marginTop: 4,
              }}
            >
              + Add Media
            </button>
          )}
          {!isEditable && (
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>POST WILL BE TEXT-ONLY</p>
          )}
        </motion.div>
      ) : (
        <motion.div
          layout
          style={{
            display: 'grid',
            gridTemplateColumns: media.length === 1 ? '1fr' : media.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          <AnimatePresence mode="popLayout">
            {media.map((item, idx) => (
              <MediaTile
                key={item.id}
                item={item}
                index={idx}
                onRemove={handleRemove}
                isEditable={isEditable}
                color={color}
              />
            ))}
          </AnimatePresence>

          {/* add tile (if editable and under limit) */}
          {isEditable && !atLimit && (
            <motion.button
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setShowPanel(true)}
              style={{
                aspectRatio: '1/1', borderRadius: 12, border: '2px dashed rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}50`; e.currentTarget.style.background = `${color}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            >
              <Plus size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Add</span>
            </motion.button>
          )}
        </motion.div>
      )}

      {/* limit warning */}
      {atLimit && isEditable && (
        <p style={{ fontSize: 10, color: `${color}80`, fontFamily: 'monospace', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={10} />
          Maximum {limit} items for {platform}
        </p>
      )}

      {/* add panel modal */}
      <AnimatePresence>
        {showPanel && (
          <AddMediaPanel
            platform={platform}
            color={color}
            onAdd={handleAdd}
            onClose={() => setShowPanel(false)}
            draftContext={draftContext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
