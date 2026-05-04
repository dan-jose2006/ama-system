import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/* ── Dot-matrix letter definitions (5×7 grid) ───────── */
const LETTERS = {
  K: [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  I: [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  A: [[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  S: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
};

const DOT     = 12;
const GAP     = 6;
const SPACING = 68;

function DotLetter({ letter, letterIndex, started }) {
  const grid = LETTERS[letter];
  const dots = [];
  for (let r = 0; r < 7; r++)
    for (let c = 0; c < 5; c++)
      if (grid[r][c]) dots.push({ r, c, key: `${r}-${c}` });

  const xOff = letterIndex * SPACING;

  return (
    <g>
      {dots.map(({ r, c, key }, i) => {
        const tx = xOff + c * (DOT + GAP);
        const ty = r * (DOT + GAP);
        /* Drops in cleanly from above — no random scatter */
        return (
          <motion.circle
            key={key}
            cx={tx + DOT / 2}
            cy={ty + DOT / 2}
            r={DOT / 2}
            initial={{ cy: ty + DOT / 2 - 40, opacity: 0 }}
            animate={started ? { cy: ty + DOT / 2, opacity: 1 } : {}}
            transition={{
              duration: 0.55,
              delay: letterIndex * 0.14 + i * 0.008,
              ease: [0.22, 1, 0.36, 1],
            }}
            fill="#0F62FE"
          />
        );
      })}
    </g>
  );
}

function DotMatrix({ started }) {
  const word = ['K', 'I', 'A', 'S'];
  const totalW = word.length * SPACING - GAP;
  const totalH = 7 * (DOT + GAP) - GAP;

  return (
    <svg width={totalW} height={totalH} style={{ overflow: 'visible' }}>
      {word.map((l, i) => (
        <DotLetter key={l} letter={l} letterIndex={i} started={started} />
      ))}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN IntroScreen — clean & premium
   ════════════════════════════════════════════════════════ */
export default function IntroScreen({ onComplete }) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStarted(true), 200);
    const t2 = setTimeout(() => onComplete(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#0A0A12' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
    >
      {/* Soft blue ambient glow — not harsh, just depth */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 560, height: 280,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(15,98,254,0.09) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative flex flex-col items-center" style={{ gap: 40 }}>

        {/* ── Dot-matrix KIAS ── */}
        <div className="relative px-8 py-4">
          <DotMatrix started={started} />
        </div>

        {/* ── Thin separator line ── */}
        <motion.div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(15,98,254,0.4), transparent)',
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={started ? { width: 300, opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* ── Wordmark + subtitle ── */}
        <motion.div
          className="flex flex-col items-center"
          style={{ gap: 10 }}
          initial={{ opacity: 0, y: 8 }}
          animate={started ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          <span style={{
            fontSize: 13, fontWeight: 600, color: '#f4f4f5',
            letterSpacing: '0.22em', textTransform: 'uppercase',
            fontFamily: '"Inter", sans-serif',
          }}>
            Nexus Platform
          </span>
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: '"Inter", sans-serif',
          }}>
            AI Content Hub
          </span>
        </motion.div>

        {/* ── Loading indicator — simple dots ── */}
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={started ? { opacity: 1 } : {}}
          transition={{ delay: 1.8 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{ width: 4, height: 4, borderRadius: '50%', background: '#0F62FE' }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.0, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </motion.div>

      </div>
    </motion.div>
  );
}
