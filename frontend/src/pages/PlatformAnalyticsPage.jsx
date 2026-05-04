import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import api from '../services/api';
import {
  ArrowLeft, Loader2, Linkedin, Twitter, Instagram,
  ExternalLink, Eye, Heart, MessageCircle, Share2,
  TrendingUp, Users, BarChart3, Clock, AlertCircle,
  CheckCircle2, XCircle, Globe, Activity, Zap
} from 'lucide-react';

const PLATFORMS = {
  twitter: {
    label: 'Twitter / X', icon: Twitter, color: '#1DA1F2',
    metrics: ['Impressions', 'Engagements', 'Retweets', 'Likes', 'Replies', 'Profile Clicks'],
  },
  linkedin: {
    label: 'LinkedIn', icon: Linkedin, color: '#0A66C2',
    metrics: ['Impressions', 'Clicks', 'Reactions', 'Comments', 'Shares', 'Engagement Rate'],
  },
  instagram: {
    label: 'Instagram', icon: Instagram, color: '#E1306C',
    metrics: ['Reach', 'Impressions', 'Likes', 'Comments', 'Saves', 'Shares'],
  },
};

const METRIC_ICONS = {
  Impressions: Eye, Engagements: Activity, Retweets: Share2, Likes: Heart,
  Replies: MessageCircle, 'Profile Clicks': Users, Clicks: TrendingUp,
  Reactions: Heart, Comments: MessageCircle, Shares: Share2,
  'Engagement Rate': BarChart3, Reach: Globe, Saves: CheckCircle2,
};

/* Generate realistic demo analytics */
function generateMockAnalytics(platform, isPublished) {
  if (!isPublished) return null;
  const base = platform === 'linkedin' ? 800 : platform === 'twitter' ? 1200 : 600;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const data = {
    twitter: {
      Impressions: rand(base, base * 3), Engagements: rand(50, 200),
      Retweets: rand(5, 40), Likes: rand(20, 150),
      Replies: rand(2, 25), 'Profile Clicks': rand(10, 80),
    },
    linkedin: {
      Impressions: rand(base, base * 2.5), Clicks: rand(30, 150),
      Reactions: rand(15, 120), Comments: rand(3, 30),
      Shares: rand(2, 20), 'Engagement Rate': `${(rand(20, 80) / 10).toFixed(1)}%`,
    },
    instagram: {
      Reach: rand(base * 0.8, base * 2), Impressions: rand(base, base * 3),
      Likes: rand(30, 250), Comments: rand(5, 40),
      Saves: rand(3, 35), Shares: rand(2, 20),
    },
  };
  return data[platform] || {};
}

/* Metric card */
function MetricCard({ label, value, icon: Icon, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 + index * 0.05 }}
      className="surface-card p-4 text-center"
    >
      <Icon size={15} style={{ color: `${color}90` }} className="mx-auto mb-2.5" />
      <p className="text-2xl font-bold text-[#fafafa] mb-1 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-[11px] text-[#52525b] font-medium uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

export default function PlatformAnalyticsPage() {
  const { id, platform } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  const meta = PLATFORMS[platform];

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/v1/submissions/${id}`);
        setData(res.data);
        const pr = res.data.drafts?.[0]?.publish_results;
        const platformResult = pr?.results?.[platform];
        setAnalytics(generateMockAnalytics(platform, platformResult?.success));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, platform]);

  if (!meta) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-[#71717a]">Unknown platform</p>
        </div>
      </AppLayout>
    );
  }

  const Icon = meta.icon;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </AppLayout>
    );
  }

  const submission = data?.submission;
  const latestDraft = data?.drafts?.[0];
  const publishResults = latestDraft?.publish_results;
  const platformResult = publishResults?.results?.[platform];
  const isPublished = platformResult?.success;
  const isLive = platformResult?.live;

  const contentMap = {
    twitter: latestDraft?.twitter_text,
    linkedin: latestDraft?.linkedin_text,
    instagram: latestDraft?.instagram_text,
  };
  const content = contentMap[platform];

  let statusLabel = 'Not Published';
  let statusClass = 'text-[#52525b]';
  let dotClass = 'bg-[#3f3f46]';
  let dotPulse = false;

  if (isPublished && platformResult?.connected && platformResult?.rateLimited) {
    statusLabel = 'Connected'; statusClass = 'text-blue-400'; dotClass = 'bg-blue-400'; dotPulse = true;
  } else if (isPublished) {
    statusLabel = 'Published'; statusClass = 'text-[#14B8A6]'; dotClass = 'bg-[#14B8A6]'; dotPulse = true;
  } else if (platformResult && !isPublished) {
    statusLabel = 'Failed'; statusClass = 'text-red-400'; dotClass = 'bg-red-500';
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">

        {/* Back */}
        <button
          onClick={() => navigate(`/submissions/${id}`)}
          className="btn-secondary mb-6 inline-flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Back to Submission
        </button>

        {/* ── Platform Header ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="surface-card p-6 mb-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left — platform identity */}
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${meta.color}14`, border: `1px solid ${meta.color}28` }}
              >
                <Icon size={22} style={{ color: meta.color }} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-[#fafafa] mb-0.5">{meta.label}</h1>
                {platformResult?.account && (
                  <p className="text-[12px] text-[#52525b] flex items-center gap-1.5">
                    {platformResult.account.handle}
                    {platformResult.account.verified && (
                      <span style={{ color: meta.color }} className="text-[10px]">✓ verified</span>
                    )}
                  </p>
                )}
                {submission?.content_title && (
                  <p className="text-[11px] text-[#3f3f46] mt-1 truncate max-w-xs">{submission.content_title}</p>
                )}
              </div>
            </div>

            {/* Right — status */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {isLive && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
                    LIVE
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
                    animate={dotPulse ? { opacity: [0.4, 1, 0.4] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className={`text-sm font-medium ${statusClass}`}>{statusLabel}</span>
                </div>
              </div>
              {platformResult?.postUrl && (
                <a
                  href={platformResult.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] font-medium text-[#0F62FE] hover:text-[#60a5fa] transition-colors"
                >
                  View Post <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Analytics Grid ──────────────────────────── */}
        {analytics ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-[#52525b]" />
                <h2 className="text-sm font-semibold text-[#a1a1aa] tracking-wider uppercase">Post Analytics</h2>
              </div>
              <span className="text-[11px] text-[#3f3f46]">
                Demo data · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              {meta.metrics.map((metricName, i) => {
                const MetricIcon = METRIC_ICONS[metricName] || Activity;
                return (
                  <MetricCard
                    key={metricName}
                    label={metricName}
                    value={analytics[metricName]}
                    icon={MetricIcon}
                    color={meta.color}
                    index={i}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="surface-card p-10 text-center mb-5"
          >
            <BarChart3 size={28} className="mx-auto mb-3 text-[#27272a]" />
            <h3 className="text-sm font-semibold text-[#71717a] mb-1">No Analytics Available</h3>
            <p className="text-[12px] text-[#52525b]">
              Analytics will appear here once content is published on {meta.label}.
            </p>
          </motion.div>
        )}

        {/* ── Full Content Preview ─────────────────── */}
        {content && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="surface-card p-5 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon size={13} style={{ color: meta.color }} />
                <span className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">Published Content</span>
              </div>
              <span className="text-[11px] text-[#52525b]">{content.length} chars</span>
            </div>

            <div className="bg-[#0F0F13] border border-[#27272a] rounded-xl p-4">
              <p className="text-sm text-[#a1a1aa] leading-relaxed whitespace-pre-wrap">{content}</p>
            </div>

            {latestDraft?.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {latestDraft.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: `${meta.color}10`,
                      border: `1px solid ${meta.color}20`,
                      color: meta.color,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Publish Details ─────────────────────── */}
        {platformResult && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="surface-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap size={13} className="text-[#52525b]" />
              <span className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">Publish Details</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
              {[
                { label: 'Post ID',       value: platformResult.postId || '—' },
                { label: 'Published At',  value: platformResult.publishedAt ? new Date(platformResult.publishedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' },
                { label: 'Characters',    value: platformResult.charCount || '—' },
                { label: 'Mode',          value: platformResult.live ? 'Live API' : 'Demo Mode' },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-1 font-medium">{item.label}</p>
                  <p className="text-[12px] text-[#a1a1aa] font-medium break-all">{item.value}</p>
                </div>
              ))}
            </div>

            {platformResult.note && (
              <p className="text-[11px] text-yellow-500/50 mt-4 pt-3 border-t border-[#27272a]">
                ⚡ {platformResult.note}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
