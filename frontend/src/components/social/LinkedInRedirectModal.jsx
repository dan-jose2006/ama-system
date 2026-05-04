import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

const COUNTDOWN_SECS = 4;
const LINKEDIN_COMPOSE_URL = 'https://www.linkedin.com/feed/';

export default function LinkedInRedirectModal({ visible, content, onClose }) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [opened, setOpened] = useState(false);
  const intervalRef = useRef(null);
  const hasOpenedRef = useRef(false);
  // Hidden anchor — clicking a real <a> element is never blocked by popup blockers
  const anchorRef = useRef(null);

  /* ── Open LinkedIn via the hidden anchor (never blocked) ── */
  const openLinkedIn = () => {
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    if (anchorRef.current) {
      anchorRef.current.click();
    }
    setOpened(true);
    setTimeout(() => onClose?.(), 1800);
  };

  /* ── Copy to clipboard on mount ───────────────────────── */
  useEffect(() => {
    if (!visible || !content) return;

    // Reset state whenever modal opens
    setCountdown(COUNTDOWN_SECS);
    setCopied(false);
    setCopyError(false);
    setOpened(false);
    hasOpenedRef.current = false;

    // Copy content
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
    }).catch(() => {
      setCopyError(true);
    });
  }, [visible, content]);

  /* ── Countdown timer ───────────────────────────────────── */
  useEffect(() => {
    if (!visible) return;

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(intervalRef.current);
          openLinkedIn();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* ── Manual open ───────────────────────────────────────── */
  const handleOpenNow = () => {
    clearInterval(intervalRef.current);
    openLinkedIn();
  };

  /* ── Manual copy ───────────────────────────────────────── */
  const handleCopyAgain = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setCopyError(false);
    });
  };

  /* ── SVG progress ring ─────────────────────────────────── */
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / COUNTDOWN_SECS;
  const strokeDashoffset = circumference * (1 - progress);



  return (
    <>
      {/* Hidden anchor — browser never blocks clicks on real anchor elements */}
      <a
        ref={anchorRef}
        href={LINKEDIN_COMPOSE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />

      <AnimatePresence>
      {visible && (
        <motion.div
          key="linkedin-redirect-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            key="linkedin-redirect-card"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0f1117 0%, #0a0d14 100%)',
              border: '1px solid rgba(10, 102, 194, 0.35)',
              boxShadow: '0 0 0 1px rgba(10,102,194,0.08), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(10,102,194,0.08)',
            }}
          >
            {/* Top accent bar */}
            <div
              className="h-1 w-full"
              style={{ background: 'linear-gradient(90deg, #0A66C2, #0099e6, #0A66C2)' }}
            />

            <div className="p-8">
              {/* Icon + Title */}
              <div className="flex flex-col items-center text-center mb-8">
                <motion.div
                  animate={{ boxShadow: ['0 0 0 0px rgba(10,102,194,0.3)', '0 0 0 12px rgba(10,102,194,0)', '0 0 0 0px rgba(10,102,194,0)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'rgba(10,102,194,0.12)', border: '1px solid rgba(10,102,194,0.3)' }}
                >
                  <Linkedin size={30} style={{ color: '#0A66C2' }} />
                </motion.div>

                <h2 className="text-xl font-bold text-white mb-2">
                  {opened ? 'LinkedIn Opened!' : 'Opening LinkedIn…'}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#a1a1aa' }}>
                  {opened
                    ? 'LinkedIn is open in a new tab. Paste your copied content into the post composer.'
                    : 'Your post content has been copied to clipboard. You\'ll be redirected to LinkedIn to paste and publish.'}
                </p>
              </div>

              {/* Clipboard status */}
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
                style={{
                  background: copyError
                    ? 'rgba(239,68,68,0.06)'
                    : 'rgba(10,102,194,0.06)',
                  border: `1px solid ${copyError ? 'rgba(239,68,68,0.2)' : 'rgba(10,102,194,0.2)'}`,
                }}
              >
                {copyError ? (
                  <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                ) : copied ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Check size={15} style={{ color: '#0A66C2' }} className="flex-shrink-0" />
                  </motion.div>
                ) : (
                  <Copy size={15} style={{ color: '#0A66C2' }} className="flex-shrink-0" />
                )}
                <p className="text-xs flex-1" style={{ color: copyError ? '#f87171' : '#a1a1aa' }}>
                  {copyError
                    ? 'Clipboard access denied — use the copy button below.'
                    : '✓ LinkedIn post content copied to clipboard'}
                </p>
                {(copyError || !copied) && (
                  <button
                    onClick={handleCopyAgain}
                    className="text-xs font-semibold px-2 py-1 rounded-lg transition-colors"
                    style={{ color: '#0A66C2', background: 'rgba(10,102,194,0.1)' }}
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* Countdown ring + number */}
              {!opened && (
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg
                      className="absolute inset-0 -rotate-90"
                      width="96"
                      height="96"
                      viewBox="0 0 96 96"
                    >
                      {/* Track */}
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        stroke="rgba(10,102,194,0.12)"
                        strokeWidth="5"
                      />
                      {/* Progress */}
                      <motion.circle
                        cx="48"
                        cy="48"
                        r={radius}
                        fill="none"
                        stroke="#0A66C2"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                      />
                    </svg>
                    <div className="relative flex flex-col items-center">
                      <span className="text-3xl font-bold text-white leading-none">
                        {countdown}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: '#52525b' }}>
                        sec
                      </span>
                    </div>
                  </div>
                  <p className="text-xs mt-3" style={{ color: '#52525b' }}>
                    LinkedIn opens automatically
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {!opened && (
                  <button
                    id="linkedin-open-now-btn"
                    onClick={handleOpenNow}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #0A66C2, #0099e6)',
                      color: '#fff',
                      boxShadow: '0 4px 20px rgba(10,102,194,0.35)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <ExternalLink size={15} />
                    Open LinkedIn Now
                  </button>
                )}
                <button
                  id="linkedin-redirect-close-btn"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: '#71717a',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
                  onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
                >
                  {opened ? 'Done' : 'Skip'}
                </button>
              </div>

              {/* Hint text */}
              {!opened && (
                <p className="text-center text-[11px] mt-4" style={{ color: '#3f3f46' }}>
                  On LinkedIn: click <strong style={{ color: '#52525b' }}>"Start a post"</strong> → Ctrl+V to paste
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
