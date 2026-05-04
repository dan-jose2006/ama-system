import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Dot-matrix mini text renderer ─────────────────────────────────────── */
const MINI = {
  A:[[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]], B:[[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
  C:[[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]], D:[[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
  E:[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]], F:[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
  G:[[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]], H:[[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  I:[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]], J:[[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
  K:[[1,0,1],[1,1,0],[1,0,0],[1,1,0],[1,0,1]], L:[[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  M:[[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]], N:[[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  O:[[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]], P:[[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
  R:[[1,1,0],[1,0,1],[1,1,0],[1,1,0],[1,0,1]], S:[[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
  T:[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]], U:[[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  W:[[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]], X:[[1,0,1],[0,1,0],[0,1,0],[0,1,0],[1,0,1]],
  Y:[[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]], Z:[[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
  ' ':[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  '.':[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,1,0]],
  '…':[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[1,0,1]],
};

function DotText({ text, color = '#00E5FF', size = 3, gap = 2, opacity = 1 }) {
  const chars = text.toUpperCase().split('');
  const dotSize = size;
  const dotGap = gap;
  const charW = 3 * (dotSize + dotGap);
  const charGap = dotGap * 2;
  const totalW = chars.length * (charW + charGap);
  const totalH = 5 * (dotSize + dotGap);

  return (
    <svg width={totalW} height={totalH} style={{ overflow: 'visible', opacity }}>
      <defs>
        <filter id={`dg-${color.replace('#','')}`}>
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {chars.map((ch, ci) => {
        const grid = MINI[ch] || MINI[' '];
        const xBase = ci * (charW + charGap);
        return grid.map((row, ri) =>
          row.map((on, oi) => on ? (
            <motion.circle
              key={`${ci}-${ri}-${oi}`}
              cx={xBase + oi * (dotSize + dotGap) + dotSize / 2}
              cy={ri * (dotSize + dotGap) + dotSize / 2}
              r={dotSize / 2}
              fill={color}
              filter={`url(#dg-${color.replace('#','')})`}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5 + Math.random(), repeat: Infinity, delay: (ci * 0.08 + ri * 0.05) % 1.2 }}
            />
          ) : null)
        );
      })}
    </svg>
  );
}

/* ── Neural ring animation ──────────────────────────────────────────────── */
function NeuralRings() {
  const rings = [
    { r: 110, dur: 8,  dashes: '4 8',  color: 'rgba(0,229,255,0.25)' },
    { r: 86,  dur: 6,  dashes: '3 12', color: 'rgba(139,92,246,0.3)' },
    { r: 62,  dur: 4,  dashes: '2 6',  color: 'rgba(0,229,255,0.2)' },
    { r: 40,  dur: 10, dashes: '1 4',  color: 'rgba(139,92,246,0.2)' },
  ];

  return (
    <svg width={240} height={240} style={{ overflow: 'visible' }}>
      <defs>
        <filter id="rglow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {rings.map((ring, i) => (
        <motion.circle key={i} cx={120} cy={120} r={ring.r}
          fill="none" stroke={ring.color} strokeWidth={1.5}
          strokeDasharray={ring.dashes} filter="url(#rglow)"
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: ring.dur, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '120px 120px' }}
        />
      ))}
      {/* Center brain dot */}
      <motion.circle cx={120} cy={120} r={14} fill="rgba(0,229,255,0.08)"
        stroke="rgba(0,229,255,0.5)" strokeWidth={1.5}
        animate={{ r: [14, 18, 14], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.circle cx={120} cy={120} r={5} fill="#00E5FF"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
      {/* Node dots on outer ring */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <motion.circle key={i}
            cx={120 + 110 * Math.cos(rad)} cy={120 + 110 * Math.sin(rad)} r={3}
            fill="rgba(0,229,255,0.7)"
            animate={{ opacity: [0.3, 1, 0.3], r: [2, 4, 2] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.33, ease: 'easeInOut' }} />
        );
      })}
    </svg>
  );
}

/* ── Waveform ───────────────────────────────────────────────────────────── */
function Waveform() {
  const bars = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 40 }}>
      {bars.map(i => (
        <motion.div key={i} style={{ width: 3, borderRadius: 2, background: 'linear-gradient(to top, rgba(0,229,255,0.2), rgba(0,229,255,0.8))' }}
          animate={{ height: [4, 6 + Math.random() * 28, 4] }}
          transition={{ duration: 0.5 + Math.random() * 0.8, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' }} />
      ))}
    </div>
  );
}

/* ── Scrolling data stream ──────────────────────────────────────────────── */
const DATA_LINES = [
  'INIT NEURAL_CORE 0x4A2F >> OK',
  'LOAD MODEL gemini-2.5-flash >> READY',
  'PARSE INPUT_VECTOR [768d] >> DONE',
  'RUN TOKENIZER batch=512 >> ACTIVE',
  'EMBED SEMANTIC layer=12 >> 94%',
  'GENERATE LINKEDIN_POST >> IN PROGRESS',
  'OPTIMIZE TONE:PROMOTIONAL >> RUNNING',
  'COMPUTE HASHTAG_VECTOR >> DONE',
  'RUN TWITTER_FORMATTER 280chr >> ACTIVE',
  'PROCESS INSTAGRAM_CAPTION >> IN PROGRESS',
  'FINALIZE OUTPUT_BUFFER >> PENDING',
];

function DataStream() {
  const [lines, setLines] = useState([DATA_LINES[0]]);
  const ref = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      ref.current = (ref.current + 1) % DATA_LINES.length;
      setLines(prev => [...prev.slice(-6), DATA_LINES[ref.current]]);
    }, 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ fontFamily: '"Courier New",monospace', fontSize: 10, lineHeight: 1.8, color: 'rgba(0,229,255,0.45)', textAlign: 'left', minHeight: 80 }}>
      {lines.map((l, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i === lines.length - 1 ? 1 : 0.4, x: 0 }}
          transition={{ duration: 0.3 }}>
          <span style={{ color: 'rgba(139,92,246,0.7)' }}>{'>'}</span> {l}
        </motion.div>
      ))}
    </div>
  );
}

/* ── Status steps ───────────────────────────────────────────────────────── */
const STATUS_STEPS = [
  'Analyzing input parameters…',
  'Loading AI language model…',
  'Processing semantic vectors…',
  'Generating LinkedIn post…',
  'Crafting Twitter content…',
  'Composing Instagram caption…',
  'Optimizing tone & style…',
  'Extracting hashtags…',
  'Finalizing AI output…',
  'Almost ready…',
];

function StatusText() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % STATUS_STEPS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div key={idx}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.35 }}
        style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', fontFamily: '"Inter",sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
        <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5FF', flexShrink: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity }} />
        {STATUS_STEPS[idx]}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── HUD corner brackets ────────────────────────────────────────────────── */
function Corner({ pos }) {
  const isTop = pos.includes('top');
  const isLeft = pos.includes('left');
  const style = {
    position: 'absolute',
    [isTop ? 'top' : 'bottom']: 20,
    [isLeft ? 'left' : 'right']: 20,
    width: 36, height: 36,
    borderTop: isTop ? '1.5px solid rgba(0,229,255,0.35)' : 'none',
    borderBottom: !isTop ? '1.5px solid rgba(0,229,255,0.35)' : 'none',
    borderLeft: isLeft ? '1.5px solid rgba(0,229,255,0.35)' : 'none',
    borderRight: !isLeft ? '1.5px solid rgba(0,229,255,0.35)' : 'none',
  };
  return <div style={style} />;
}

/* ── CountUp mini component ─────────────────────────────────────────────── */
function CountUp({ pct, delay }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let start = 0;
      const step = setInterval(() => {
        start += 2;
        setVal(Math.min(start, pct));
        if (start >= pct) clearInterval(step);
      }, 30);
    }, delay * 1000 + 800);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return <>{val}</>;
}

/* ── Live stream preview panel (NEW) ───────────────────────────────────── */
function StreamPreview({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);

  if (!text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(0,229,255,0.02)', border: '1px solid rgba(0,229,255,0.1)',
        borderRadius: 10, padding: '12px 16px', width: '100%', maxHeight: 160, position: 'relative',
      }}
    >
      <div style={{ fontSize: 8, letterSpacing: '0.4em', color: 'rgba(0,229,255,0.3)', marginBottom: 8, fontFamily: 'monospace', textTransform: 'uppercase' }}>
        LIVE OUTPUT
      </div>
      <div
        ref={ref}
        style={{
          fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          overflowY: 'auto', maxHeight: 110, fontFamily: '"Inter",sans-serif',
        }}
      >
        {text}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, repeatType: 'reverse' }}
          style={{ display: 'inline-block', width: 2, height: '0.85em', background: '#00E5FF', marginLeft: 2, verticalAlign: 'text-bottom', borderRadius: 1 }}
        />
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * MAIN AIProcessingOverlay
 *
 * Props:
 *   visible       – show/hide the overlay
 *   streamContent – optional string of live AI text (shows a scrolling preview)
 * ══════════════════════════════════════════════════════════════════════════ */
export default function AIProcessingOverlay({ visible, streamContent }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse 120% 100% at 50% 50%, #08081A 0%, #0A0A0A 80%)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: 'blur(16px)' }}
          transition={{ duration: 0.5 }}
        >
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="agd" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="0.75" cy="0.75" r="0.75" fill="rgba(0,229,255,0.08)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#agd)" />
          </svg>

          {/* Ambient glows */}
          <div className="absolute pointer-events-none" style={{ top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(0,229,255,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute pointer-events-none" style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />

          {/* HUD corners */}
          <Corner pos="top-left" />
          <Corner pos="top-right" />
          <Corner pos="bottom-left" />
          <Corner pos="bottom-right" />

          {/* System label top */}
          <motion.div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <motion.div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E5FF' }}
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity }} />
            <span style={{ fontSize: 9, letterSpacing: '0.45em', color: 'rgba(60, 178, 191, 0.4)', fontFamily: '"Courier New",monospace', textTransform: 'uppercase' }}>
              KIAS AI CORE · PROCESSING
            </span>
            <motion.div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00E5FF' }}
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
          </motion.div>

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-7" style={{ maxWidth: 700, width: '100%', padding: '0 24px' }}>

            {/* Dot-matrix KIAS AI */}
            <motion.div className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
              <DotText text="KIAS AI" color="#00E5FF" size={5} gap={2} />
              <motion.div style={{ height: '0.5px', background: 'linear-gradient(90deg,transparent,rgba(0,229,255,0.6),rgba(139,92,246,0.5),transparent)' }}
                animate={{ width: ['0%','100%'] }} transition={{ duration: 0.8, delay: 0.5 }} />
              <DotText text="PROCESSING" color="rgba(139,92,246,0.85)" size={3} gap={2} />
            </motion.div>

            {/* Neural rings + side panels */}
            <motion.div className="flex items-center gap-8 w-full justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>

              {/* Left: data stream */}
              <div style={{ flex: 1, maxWidth: 220, background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 8, padding: '14px 14px' }}>
                <div style={{ fontSize: 8, letterSpacing: '0.4em', color: 'rgba(0,229,255,0.3)', marginBottom: 8, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                  SYSTEM LOG
                </div>
                <DataStream />
              </div>

              {/* Center: neural rings */}
              <NeuralRings />

              {/* Right: metrics */}
              <div style={{ flex: 1, maxWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'LINKEDIN', pct: 68, color: '#0A66C2' },
                  { label: 'TWITTER', pct: 42, color: '#8B5CF6' },
                  { label: 'INSTAGRAM', pct: 25, color: '#E1306C' },
                ].map((m, i) => (
                  <div key={m.label}>
                    <div className="flex justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{m.label}</span>
                      <motion.span style={{ fontSize: 9, color: 'rgba(0,229,255,0.6)', fontFamily: 'monospace' }}
                        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}>
                        <CountUp pct={m.pct} delay={i * 0.5} />%
                      </motion.span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                      <motion.div style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, rgba(0,229,255,0.6), ${m.color})` }}
                        initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 1.5, delay: 0.8 + i * 0.3, ease: 'easeOut' }} />
                    </div>
                  </div>
                ))}

                {/* Waveform */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 8, letterSpacing: '0.4em', color: 'rgba(0,229,255,0.3)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'monospace' }}>SIGNAL</div>
                  <Waveform />
                </div>
              </div>
            </motion.div>

            {/* Status text */}
            <motion.div className="flex flex-col items-center gap-3 w-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <StatusText />
              {/* Segmented progress bar */}
              <div className="flex gap-1" style={{ width: 280 }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div key={i} style={{ flex: 1, height: 3, borderRadius: 1, background: 'rgba(255,255,255,0.06)' }}
                    animate={{ background: ['rgba(255,255,255,0.06)', 'rgba(0,229,255,0.6)', 'rgba(255,255,255,0.06)'] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }} />
                ))}
              </div>
            </motion.div>

            {/* Live stream preview (visible when streamContent is passed) */}
            <StreamPreview text={streamContent} />
          </div>

          {/* Bottom label */}
          <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.15)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              KIAS · GEMINI 2.5 FLASH · DO NOT INTERRUPT
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
