import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Twitter, Instagram, Sparkles, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * BLINKING CURSOR
 * ──────────────────────────────────────────────────────────────────────────── */
function Cursor({ color }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
      style={{
        display: 'inline-block',
        width: 2,
        height: '0.9em',
        background: color,
        marginLeft: 2,
        verticalAlign: 'text-bottom',
        borderRadius: 1,
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PLATFORM STREAMING CARD
 * ──────────────────────────────────────────────────────────────────────────── */
function StreamCard({ label, Icon, color, text, done, charLimit }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [text]);

  const over = charLimit && text.length > charLimit;

  return (
    <div style={{
      background: 'rgba(8,8,20,0.95)',
      border: `1px solid ${done ? color + '55' : color + '22'}`,
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 220,
      transition: 'border-color 0.5s, box-shadow 0.5s',
      boxShadow: done ? `0 0 24px ${color}18` : 'none',
    }}>
      {/* Top glow bar */}
      <motion.div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }}
        animate={done ? { opacity: 1 } : { opacity: [0.2, 0.9, 0.2] }}
        transition={{ duration: 1.4, repeat: done ? 0 : Infinity }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `${color}12`, border: `1px solid ${color}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={13} color={color} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>{label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {text.length > 0 && (
            <span style={{ fontSize: 9, fontFamily: 'monospace', color: over ? '#f87171' : 'rgba(255,255,255,0.2)' }}>
              {text.length}{charLimit ? `/${charLimit}` : ''}
            </span>
          )}
          {done
            ? <CheckCircle2 size={13} color={color} />
            : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Zap size={11} color={color} style={{ opacity: 0.55 }} />
              </motion.div>
            )
          }
        </div>
      </div>

      {/* Streaming text body */}
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          padding: '4px 14px 14px',
          overflowY: 'auto',
          fontSize: 12,
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.75,
          fontFamily: '"Inter", sans-serif',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text
          ? (<>{text}{!done && <Cursor color={color} />}</>)
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
              {[100, 85, 90].map((w, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.04, 0.10, 0.04] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.08)', width: `${w}%` }}
                />
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS — extract platform text from partial / complete AI JSON stream
 * ──────────────────────────────────────────────────────────────────────────── */
function extractField(text, field) {
  // Try to grab the value of a JSON field from partial or complete JSON
  // Matches both complete: "field": "value" and partial (unclosed) strings
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`);
  const m = text.match(re);
  if (!m) return '';
  return m[1]
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 *
 * Props:
 *   visible       – boolean, show/hide
 *   draftId       – string, draft ID to regenerate
 *   token         – JWT from localStorage
 *   onDone(result)– called with final { linkedin, twitter, instagram, hashtags }
 *   onError(msg)  – called on failure
 *   onClose()     – called when user clicks "View Draft"
 * ──────────────────────────────────────────────────────────────────────────── */
export default function RegeneratingOverlay({ visible, draftId, token, onDone, onError, onClose }) {
  const [linkedin, setLinkedin]   = useState('');
  const [twitter, setTwitter]     = useState('');
  const [instagram, setInstagram] = useState('');
  const [hashtags, setHashtags]   = useState([]);
  const [model, setModel]         = useState('');
  const [phase, setPhase]         = useState('idle'); // idle | connecting | streaming | done | error
  const [errorMsg, setErrorMsg]   = useState('');
  const esRef  = useRef(null);
  const accRef = useRef('');
  const closedRef = useRef(false); // Prevents EventSource auto-reconnect loop

  // ── Parse partial JSON stream into platform previews ─────────────────────
  const parseLive = (acc) => {
    setLinkedin(extractField(acc, 'linkedin'));
    setTwitter(extractField(acc, 'twitter'));
    setInstagram(extractField(acc, 'instagram'));
  };

  // ── Connect SSE when overlay becomes visible ──────────────────────────────
  useEffect(() => {
    if (!visible || !draftId) return;

    // Reset
    setLinkedin(''); setTwitter(''); setInstagram('');
    setHashtags([]); setModel(''); setErrorMsg('');
    setPhase('connecting');
    accRef.current = '';
    closedRef.current = false;

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${baseUrl}/api/v1/drafts/${draftId}/regenerate-stream?token=${encodeURIComponent(token || '')}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('status', () => {
      setPhase('streaming');
    });

    es.addEventListener('chunk', (e) => {
      const { text } = JSON.parse(e.data);
      if (!text) return;
      accRef.current += text;
      setPhase('streaming');
      parseLive(accRef.current);
    });

    es.addEventListener('done', (e) => {
      closedRef.current = true; // Mark as finished BEFORE anything else
      const result = JSON.parse(e.data);
      setLinkedin(result.linkedin || '');
      setTwitter(result.twitter || '');
      setInstagram(result.instagram || '');
      setHashtags(result.hashtags || []);
      setModel(result.model || '');
      setPhase('done');
      es.close();
      onDone?.(result);
    });

    es.addEventListener('error', (e) => {
      if (closedRef.current) return; // Already handled — ignore reconnect attempt
      closedRef.current = true;
      let msg = 'Regeneration failed. Please try again.';
      try { msg = JSON.parse(e.data)?.message || msg; } catch (_) {}
      setErrorMsg(msg);
      setPhase('error');
      es.close();
      onError?.(msg);
    });

    // EventSource fires onerror when the server closes the connection.
    // Without this guard, it auto-reconnects → infinite loop.
    es.onerror = () => {
      if (closedRef.current) return; // Already done/errored — do nothing
      closedRef.current = true;
      setErrorMsg('Connection lost. Please try again.');
      setPhase('error');
      es.close();
    };

    return () => {
      closedRef.current = true;
      es.close();
    };
  }, [visible, draftId]); // eslint-disable-line


  const isDone      = phase === 'done';
  const isError     = phase === 'error';
  const isConnecting = phase === 'connecting';
  const isStreaming  = phase === 'streaming';

  const headerLabel = isDone
    ? 'Regeneration Complete ✓'
    : isError
      ? 'Regeneration Failed'
      : isConnecting
        ? 'Connecting to AI…'
        : 'AI Generating Content…';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="regen-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.35 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'radial-gradient(ellipse 120% 100% at 50% 40%, #06061A 0%, #0A0A0A 80%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-start',
            padding: '28px 20px 32px',
            overflowY: 'auto',
          }}
        >
          {/* Dot grid background */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="rg-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="0.75" cy="0.75" r="0.75" fill="rgba(0,229,255,0.07)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#rg-dots)" />
          </svg>

          {/* Ambient glow */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 700, height: 350,
            background: 'radial-gradient(ellipse, rgba(0,229,255,0.06) 0%, transparent 70%)',
            filter: 'blur(60px)', pointerEvents: 'none',
          }} />

          {/* HUD corner brackets */}
          {['top-left','top-right','bottom-left','bottom-right'].map(pos => {
            const t = pos.includes('top'), l = pos.includes('left');
            return (
              <div key={pos} style={{
                position: 'fixed',
                [t ? 'top' : 'bottom']: 18, [l ? 'left' : 'right']: 18,
                width: 32, height: 32,
                borderTop: t ? '1.5px solid rgba(0,229,255,0.3)' : 'none',
                borderBottom: !t ? '1.5px solid rgba(0,229,255,0.3)' : 'none',
                borderLeft: l ? '1.5px solid rgba(0,229,255,0.3)' : 'none',
                borderRight: !l ? '1.5px solid rgba(0,229,255,0.3)' : 'none',
              }} />
            );
          })}

          {/* Top system label */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, zIndex: 1 }}
          >
            <motion.div
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E5FF' }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
            <span style={{ fontSize: 9, letterSpacing: '0.42em', color: 'rgba(0,229,255,0.4)', fontFamily: '"Courier New",monospace', textTransform: 'uppercase' }}>
              KIAS AI CORE · {isDone ? 'COMPLETE' : isError ? 'ERROR' : 'GENERATING'}
            </span>
            <motion.div
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E5FF' }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: 0.45 }}
            />
          </motion.div>

          {/* Content container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', maxWidth: 920, zIndex: 1 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <motion.div
                  animate={isDone ? { scale: 1 } : { scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.3, repeat: isDone ? 0 : Infinity }}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Sparkles size={18} color="#00E5FF" />
                </motion.div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                    {headerLabel}
                  </h2>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontFamily: 'monospace', letterSpacing: '0.12em', marginTop: 2 }}>
                    {isDone
                      ? `POWERED BY ${(model || 'AI').toUpperCase()}`
                      : isError
                        ? 'STREAM FAILED'
                        : isConnecting
                          ? 'ESTABLISHING SSE CONNECTION…'
                          : 'LIVE TOKEN STREAM · SSE ACTIVE'
                    }
                  </p>
                </div>
              </div>

              {/* Pulsing dots while streaming */}
              {(isStreaming || isConnecting) && (
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      animate={{ opacity: [0.15, 1, 0.15] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.22 }}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5FF' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Error banner */}
            {isError && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 18px', borderRadius: 10, marginBottom: 20,
                  background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.22)',
                }}
              >
                <AlertCircle size={16} color="#f87171" />
                <p style={{ fontSize: 13, color: '#fca5a5' }}>{errorMsg}</p>
              </motion.div>
            )}

            {/* ── Three streaming cards ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
              <StreamCard label="LinkedIn"    Icon={Linkedin}  color="#0A66C2" text={linkedin}  done={isDone} charLimit={3000} />
              <StreamCard label="Twitter / X" Icon={Twitter}   color="#1DA1F2" text={twitter}   done={isDone} charLimit={280}  />
              <StreamCard label="Instagram"   Icon={Instagram} color="#E1306C" text={instagram} done={isDone} charLimit={2200} />
            </div>

            {/* Segmented progress bar (animates while streaming) */}
            {(isStreaming || isConnecting) && (
              <div style={{ display: 'flex', gap: 3, marginBottom: 18 }}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div key={i}
                    style={{ flex: 1, height: 2, borderRadius: 1 }}
                    animate={{ background: ['rgba(0,229,255,0.06)', 'rgba(0,229,255,0.55)', 'rgba(0,229,255,0.06)'] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.075, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            )}

            {/* Hashtags — fade in when done */}
            <AnimatePresence>
              {isDone && hashtags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px 14px',
                    borderRadius: 10, marginBottom: 20,
                    background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.1)',
                  }}
                >
                  {hashtags.map((tag, i) => (
                    <motion.span key={tag}
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 4,
                        fontFamily: 'monospace', letterSpacing: '0.06em',
                        background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', color: '#00E5FF',
                      }}
                    >
                      #{tag}
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA buttons */}
            {(isDone || isError) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', justifyContent: 'center', gap: 12 }}
              >
                {isDone && (
                  <button
                    onClick={onClose}
                    style={{
                      padding: '11px 32px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
                      fontSize: 11, letterSpacing: '0.14em', fontFamily: 'monospace',
                      background: 'rgba(0,229,255,0.08)', color: '#00E5FF',
                      border: '1px solid rgba(0,229,255,0.38)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.08)'}
                  >
                    VIEW UPDATED DRAFT →
                  </button>
                )}
                {isError && (
                  <button
                    onClick={onClose}
                    style={{
                      padding: '11px 32px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
                      fontSize: 11, letterSpacing: '0.14em', fontFamily: 'monospace',
                      background: 'transparent', color: 'rgba(255,255,255,0.4)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    CLOSE
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Bottom label */}
          <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
            <span style={{ fontSize: 8, letterSpacing: '0.42em', color: 'rgba(255,255,255,0.1)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              KIAS · LIVE AI STREAM · DO NOT CLOSE TAB
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
