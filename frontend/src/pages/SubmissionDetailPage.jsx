import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import PublishResultsPanel from '../components/social/PublishResultsPanel';
import api from '../services/api';
import {
  ArrowLeft, Loader2, Clock, User,
  Linkedin, Twitter, Instagram, CheckCircle2, XCircle,
  AlertCircle, Sparkles, Eye, ExternalLink,
  Tag, MessageSquare, Activity, Hash, ChevronRight
} from 'lucide-react';

/* ── Status Timeline ──────────────────────────────── */
function TimelineStep({ label, time, completed, active, last }) {
  return (
    <div className="flex items-start gap-3 relative">
      {!last && (
        <div className="absolute left-[7px] top-4 w-[2px] h-[calc(100%+8px)]"
          style={{ background: completed ? '#14B8A6' : '#27272a' }}
        />
      )}
      <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center border-2 ${
        completed
          ? 'bg-[#14B8A6]/15 border-[#14B8A6]'
          : active
          ? 'bg-yellow-500/10 border-yellow-500/50'
          : 'bg-[#18181b] border-[#3f3f46]'
      }`}>
        {completed && <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />}
        {active && !completed && (
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-yellow-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </div>
      <div className={`pb-5 ${last ? 'pb-0' : ''}`}>
        <p className={`text-sm font-medium leading-none ${
          completed ? 'text-[#d4d4d8]' : active ? 'text-yellow-400' : 'text-[#52525b]'
        }`}>{label}</p>
        {time && (
          <p className="text-[11px] text-[#52525b] mt-1">
            {new Date(time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Platform Card ────────────────────────────────── */
const PLATFORMS = {
  twitter:   { label: 'Twitter / X', icon: Twitter,   color: '#1DA1F2', colorClass: 'text-blue-400' },
  linkedin:  { label: 'LinkedIn',    icon: Linkedin,  color: '#0A66C2', colorClass: 'text-blue-500' },
  instagram: { label: 'Instagram',   icon: Instagram, color: '#E1306C', colorClass: 'text-pink-500' },
};

function PlatformStatusCard({ platformKey, result, isApproved, onClick, index }) {
  const meta = PLATFORMS[platformKey];
  const Icon = meta.icon;

  let statusLabel = 'Awaiting Approval';
  let statusClass = 'text-[#52525b]';
  let dotClass = 'bg-[#3f3f46]';
  let dotPulse = false;

  if (result) {
    if (result.success) {
      if (result.connected && result.rateLimited) {
        statusLabel = 'Connected'; statusClass = meta.colorClass; dotClass = 'bg-blue-400'; dotPulse = true;
      } else {
        statusLabel = 'Published'; statusClass = 'text-[#14B8A6]'; dotClass = 'bg-[#14B8A6]'; dotPulse = true;
      }
    } else {
      statusLabel = 'Failed'; statusClass = 'text-red-400'; dotClass = 'bg-red-500';
    }
  } else if (isApproved) {
    statusLabel = 'Not Published'; statusClass = 'text-yellow-500'; dotClass = 'bg-yellow-500';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      onClick={onClick}
      className="surface-card p-5 cursor-pointer hover:border-[#3f3f46] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}22` }}>
            <Icon size={18} style={{ color: meta.color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f4f4f5]">{meta.label}</p>
            {result?.account && (
              <p className="text-[11px] text-[#52525b] mt-0.5 flex items-center gap-1">
                {result.account.handle}
                {result.account.verified && <span style={{ color: meta.color }} className="text-[9px]">✓</span>}
              </p>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-[#3f3f46] group-hover:text-[#71717a] transition-colors" />
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result?.live && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20">
              LIVE
            </span>
          )}
          {result && !result.live && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              DEMO
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <motion.div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
              animate={dotPulse ? { opacity: [0.4, 1, 0.4] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className={`text-xs font-medium ${statusClass}`}>{statusLabel}</span>
          </div>
        </div>
        {result?.charCount && (
          <span className="text-[11px] text-[#52525b]">{result.charCount} chars</span>
        )}
      </div>

      {/* Preview text */}
      {result?.preview && (
        <p className="text-[11px] text-[#52525b] leading-relaxed mt-3 p-2.5 rounded-lg bg-[#09090b] border border-[#27272a] line-clamp-2">
          "{result.preview}"
        </p>
      )}

      {result?.note && (
        <p className="text-[11px] text-yellow-500/50 mt-2">⚡ {result.note}</p>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */
export default function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/v1/submissions/${id}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand-500" />
            <p className="text-xs text-[#52525b] tracking-widest uppercase">Loading</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="surface-card p-12 text-center max-w-lg mx-auto mt-20">
          <AlertCircle className="w-10 h-10 mx-auto mb-4 text-red-400/60" />
          <h3 className="text-base font-semibold text-[#f4f4f5] mb-2">{error || 'Not found'}</h3>
          <button onClick={() => navigate(-1)} className="btn-secondary mt-4 inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </AppLayout>
    );
  }

  const { submission, drafts } = data;
  const latestDraft = drafts?.[0];
  const approval = latestDraft?.approvals?.[0];
  const publishResults = latestDraft?.publish_results;
  const isApproved = latestDraft?.status === 'approved';
  const isRejected = latestDraft?.status === 'rejected';

  const timeline = [
    { label: 'Submitted', time: submission.created_at, completed: true },
    { label: 'AI Content Generated', time: latestDraft?.generated_at, completed: !!latestDraft, active: submission.status === 'processing' },
    { label: isRejected ? 'Rejected by Reviewer' : 'Approved by Reviewer', time: approval?.created_at, completed: !!approval, active: latestDraft?.status === 'ready_for_review' },
    { label: 'Published to Social Media', time: publishResults?.publishedAt, completed: !!publishResults, active: isApproved && !publishResults },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto animate-fade-in">

        {/* Back */}
        <button onClick={() => navigate('/my-submissions')} className="btn-secondary mb-6 inline-flex items-center gap-2">
          <ArrowLeft size={14} /> My Submissions
        </button>

        {/* ── TOP ROW: Info + Timeline ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 mb-5">

          {/* Left — Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="surface-card p-6"
          >
            <h1 className="text-xl font-semibold text-[#fafafa] mb-2 leading-tight">
              {submission.content_title || 'Untitled'}
            </h1>
            <p className="text-sm text-[#71717a] leading-relaxed mb-5 max-w-xl">
              {submission.content_description?.substring(0, 200)}{submission.content_description?.length > 200 ? '…' : ''}
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {[
                { icon: User,         label: 'By',       value: submission.name },
                { icon: Tag,          label: 'Type',     value: submission.content_type },
                { icon: Sparkles,     label: 'Priority', value: submission.priority },
                { icon: MessageSquare,label: 'Tone',     value: submission.tone_preference },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon size={12} className="text-[#52525b] flex-shrink-0" />
                  <span className="text-[11px] text-[#52525b] min-w-[36px]">{item.label}</span>
                  <span className="text-xs text-[#a1a1aa] capitalize font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="surface-card p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#52525b]" />
              <span className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase">Status Timeline</span>
            </div>
            {timeline.map((step, i) => (
              <TimelineStep
                key={i}
                label={step.label}
                time={step.time}
                completed={step.completed}
                active={step.active}
                last={i === timeline.length - 1}
              />
            ))}
          </motion.div>
        </div>

        {/* ── SOCIAL MEDIA STATUS ────────────────────────── */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${publishResults ? 'bg-[#14B8A6]' : isApproved ? 'bg-yellow-500' : 'bg-[#3f3f46]'}`}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <h2 className="text-sm font-semibold text-[#a1a1aa] tracking-wider uppercase">Social Media Status</h2>
          </div>
          {publishResults && (
            <span className="ml-auto text-[11px] text-[#52525b] font-medium">
              {publishResults.successCount}/{publishResults.totalPlatforms} platforms
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {['twitter', 'linkedin', 'instagram'].map((platform, i) => (
            <PlatformStatusCard
              key={platform}
              platformKey={platform}
              result={publishResults?.results?.[platform] || null}
              isApproved={isApproved}
              index={i}
              onClick={() => navigate(`/submissions/${id}/platform/${platform}`)}
            />
          ))}
        </div>

        {/* Publish results panel */}
        {publishResults && (
          <PublishResultsPanel
            publishResults={publishResults}
            onPlatformClick={(platform) => navigate(`/submissions/${id}/platform/${platform}`)}
          />
        )}

        {/* ── Hashtags ─────────────────────────────────── */}
        {latestDraft?.hashtags?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="surface-card p-4 mb-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Hash size={13} className="text-[#52525b]" />
              <span className="text-xs font-semibold text-[#71717a] tracking-wider uppercase">Hashtags Used</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {latestDraft.hashtags.map((tag, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-[#0F62FE]/8 border border-[#0F62FE]/20 text-[#60a5fa] font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Reviewer ─────────────────────────────────── */}
        {approval && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className={`surface-card p-4 border-l-2 ${approval.decision === 'approved' ? 'border-l-[#14B8A6]' : 'border-l-red-500'}`}
          >
            <div className="flex items-center gap-3">
              {approval.decision === 'approved'
                ? <CheckCircle2 size={15} className="text-[#14B8A6] flex-shrink-0" />
                : <XCircle size={15} className="text-red-400 flex-shrink-0" />
              }
              <span className="text-sm font-semibold text-[#f4f4f5]">
                {approval.decision === 'approved' ? 'Approved' : 'Rejected'} by {approval.reviewer_name}
              </span>
              <span className="text-[11px] text-[#52525b] ml-auto">
                {new Date(approval.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {approval.feedback && (
              <p className="text-sm text-[#71717a] mt-3 ml-6 leading-relaxed border-l border-[#27272a] pl-3">
                "{approval.feedback}"
              </p>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
