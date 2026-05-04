import { motion } from 'framer-motion';
import { ExternalLink, CheckCircle, XCircle, Linkedin, Twitter, Instagram } from 'lucide-react';

/* Platform config */
const PLATFORM_META = {
  twitter:   { label: 'Twitter / X', icon: Twitter,   color: '#1DA1F2', bgClass: 'bg-blue-400/10',  borderClass: 'border-blue-400/20'  },
  linkedin:  { label: 'LinkedIn',    icon: Linkedin,  color: '#0A66C2', bgClass: 'bg-blue-600/10',  borderClass: 'border-blue-600/20'  },
  instagram: { label: 'Instagram',   icon: Instagram, color: '#E1306C', bgClass: 'bg-pink-500/10',  borderClass: 'border-pink-500/20'  },
};

/* Single platform publish row */
function PlatformCard({ platformKey, result, index, onClick }) {
  const meta = PLATFORM_META[platformKey];
  const Icon = meta.icon;
  const success = result?.success;
  const account = result?.account;
  const isRedirect = result?.redirectMode === true;

  // ── LinkedIn Redirect variant ───────────────────────────────
  if (isRedirect) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.08 }}
        className="flex items-start gap-4 p-4 rounded-xl border"
        style={{
          background: 'rgba(10,102,194,0.05)',
          borderColor: 'rgba(10,102,194,0.25)',
        }}
      >
        {/* Platform icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.25)' }}
        >
          <Linkedin size={16} style={{ color: '#0A66C2' }} strokeWidth={1.75} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[#f4f4f5]">{meta.label}</p>
              {account && (
                <span className="text-[11px] text-[#52525b]">{account.handle}</span>
              )}
            </div>

            {/* Redirect badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                style={{
                  background: 'rgba(10,102,194,0.1)',
                  color: '#0A66C2',
                  borderColor: 'rgba(10,102,194,0.3)',
                }}
              >
                REDIRECT
              </span>
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#0A66C2' }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-[11px] font-medium" style={{ color: '#0A66C2' }}>Pending Paste</span>
              </div>
            </div>
          </div>

          {/* Preview text */}
          {result.preview && (
            <p className="text-[12px] text-[#71717a] leading-relaxed mt-2 line-clamp-2 bg-[#09090b]/60 border border-[#27272a] rounded-lg px-3 py-2">
              {result.preview}
            </p>
          )}

          {/* Footer hint */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-[#52525b]">
              📋 Content copied · Open LinkedIn → Start a post → Paste
            </span>
            <a
              href="https://www.linkedin.com/feed/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-medium transition-colors"
              style={{ color: '#0A66C2' }}
              onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
              onMouseLeave={e => e.currentTarget.style.color = '#0A66C2'}
            >
              Open LinkedIn <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      } ${success
        ? `${meta.bgClass} ${meta.borderClass} hover:border-opacity-50`
        : 'bg-red-500/5 border-red-500/15 hover:border-red-500/25'
      }`}
    >
      {/* Platform icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: success ? `${meta.color}15` : 'rgba(239,68,68,0.08)', border: `1px solid ${success ? meta.color + '28' : 'rgba(239,68,68,0.2)'}` }}
      >
        <Icon size={16} style={{ color: success ? meta.color : 'rgba(239,68,68,0.7)' }} strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#f4f4f5]">{meta.label}</p>
            {account && (
              <span className="text-[11px] text-[#52525b]">
                {account.handle}
                {account.verified && <span style={{ color: meta.color }} className="ml-1 text-[9px]">✓</span>}
              </span>
            )}
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {result?.live ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">LIVE</span>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">DEMO</span>
            )}

            {result?.connected && result?.rateLimited ? (
              <div className="flex items-center gap-1.5">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-blue-400" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <span className="text-[11px] font-medium text-blue-400">Connected</span>
              </div>
            ) : success ? (
              <div className="flex items-center gap-1.5">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <span className="text-[11px] font-medium text-[#14B8A6]">Published</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <XCircle size={13} className="text-red-400" />
                <span className="text-[11px] font-medium text-red-400">Failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Preview text */}
        {success && result.preview && (
          <p className="text-[12px] text-[#71717a] leading-relaxed mt-2 line-clamp-2 bg-[#09090b]/60 border border-[#27272a] rounded-lg px-3 py-2">
            {result.preview}
          </p>
        )}

        {/* Error */}
        {!success && result?.error && (
          <p className="text-[11px] text-red-400/70 mt-2 bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/10">
            {result.error}
          </p>
        )}

        {/* Footer */}
        {success && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {result.charCount && (
                <span className="text-[11px] text-[#52525b]">{result.charCount} chars</span>
              )}
              {result.note && (
                <span className="text-[11px] text-yellow-500/60">⚠ {result.note}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {result.postUrl && (
                <a
                  href={result.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[11px] font-medium text-[#0F62FE] hover:text-[#60a5fa] transition-colors"
                >
                  View Post <ExternalLink size={10} />
                </a>
              )}
              {onClick && (
                <span className="text-[11px] text-[#52525b]">Analytics →</span>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* Main PublishResultsPanel */
export default function PublishResultsPanel({ publishResults, onPlatformClick }) {
  if (!publishResults) return null;

  const { results, successCount, totalPlatforms, publishedAt, isMock } = publishResults;
  if (!results) return null;

  const allSuccess = successCount === totalPlatforms;
  const someSuccess = successCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="surface-card overflow-hidden mt-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181b]">
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${allSuccess ? 'bg-[#14B8A6]' : someSuccess ? 'bg-yellow-500' : 'bg-red-500'}`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <div>
            <p className="text-sm font-semibold text-[#f4f4f5]">Social Publish Results</p>
            <p className="text-[11px] text-[#52525b] mt-0.5">
              {successCount}/{totalPlatforms} platforms · {publishedAt ? new Date(publishedAt).toLocaleTimeString('en-IN') : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMock && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              Demo
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
            allSuccess
              ? 'bg-[#14B8A6]/10 text-[#14B8A6] border-[#14B8A6]/20'
              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
          }`}>
            {allSuccess ? '✓ All Published' : `${successCount} Published`}
          </span>
        </div>
      </div>

      {/* Platform cards */}
      <div className="p-4 flex flex-col gap-3">
        {['twitter', 'linkedin', 'instagram'].map((platform, i) => (
          <PlatformCard
            key={platform}
            platformKey={platform}
            result={results[platform]}
            index={i}
            onClick={onPlatformClick ? () => onPlatformClick(platform) : undefined}
          />
        ))}
      </div>

      {/* Demo mode notice */}
      {isMock && (
        <div className="px-5 py-3 border-t border-[#27272a] bg-yellow-500/3">
          <p className="text-[11px] text-yellow-500/50 leading-relaxed">
            ⚡ Running in demo mode — post IDs & URLs are simulated. Add real API keys to .env to enable live publishing.
          </p>
        </div>
      )}
    </motion.div>
  );
}
