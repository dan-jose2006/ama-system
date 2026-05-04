import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubmissions } from '../hooks/useSubmissions';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  FileText, Clock, Loader2, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, Linkedin, Twitter, Instagram, Send, Eye, Globe,
  Users, Sparkles, User
} from 'lucide-react';

const statusConfig = {
  pending:    { label: 'Pending',    bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  processing: { label: 'Generating', bg: 'bg-brand-500/10',  text: 'text-brand-500',  border: 'border-brand-500/20' },
  completed:  { label: 'Completed',  bg: 'bg-teal-500/10',   text: 'text-teal-500',   border: 'border-teal-500/20' },
  failed:     { label: 'Failed',     bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/20' },
};

const draftStatusConfig = {
  ready_for_review: { label: 'Awaiting Review', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', icon: Eye },
  approved:         { label: 'Approved',         bg: 'bg-teal-500/10',   text: 'text-teal-500',   border: 'border-teal-500/20',   icon: CheckCircle2 },
  rejected:         { label: 'Rejected',          bg: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/20',    icon: XCircle },
  regenerating:     { label: 'Regenerating',      bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20', icon: Loader2 },
};

/* Platform publish status dot */
function PlatformDot({ icon: Icon, colorClass, result }) {
  if (!result) return null;
  const success = result.success;
  const isConnected = result.connected;
  const isFailed = !success;
  let dotColor = 'bg-teal-500';
  let statusText = 'Published';
  if (isFailed) { dotColor = 'bg-red-500'; statusText = 'Failed'; }
  else if (isConnected && result.rateLimited) { dotColor = colorClass.replace('text-', 'bg-'); statusText = 'Connected'; }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-800 border border-surface-700"
      title={`${statusText}${result.live ? ' (Live)' : ' (Demo)'}`}
    >
      <Icon size={12} className={colorClass} strokeWidth={2} />
      <motion.div
        className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`}
        animate={success ? { opacity: [0.4, 1, 0.4] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {result.live && (
        <span className="text-[9px] font-semibold tracking-wider text-teal-500 uppercase">LIVE</span>
      )}
    </div>
  );
}

/* Single submission card — shared between both tabs */
function SubmissionCard({ sub, idx, onClick }) {
  const config = statusConfig[sub.status] || statusConfig.pending;
  const draftConfig = sub.draft_status ? draftStatusConfig[sub.draft_status] : null;
  const DraftIcon = draftConfig?.icon;
  const pr = sub.publish_results;
  const hasPublishResults = pr?.results;

  return (
    <motion.div
      key={sub.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.03 }}
      className="surface-card hover:border-surface-700 hover:shadow-md cursor-pointer transition-all duration-200 p-5 relative overflow-hidden group"
      onClick={onClick}
    >
      {/* Row 1: Title + Status */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-surface-100 truncate">
            {sub.content_title || 'Untitled Submission'}
          </h3>
          {/* Show submitter name only in Team tab */}
          {sub.name && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <User size={11} className="text-surface-500" />
              <span className="text-[11px] text-surface-500">{sub.name}</span>
              {sub.team && <span className="text-[11px] text-surface-600">· {sub.team}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {draftConfig ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase rounded-md border ${draftConfig.bg} ${draftConfig.text} ${draftConfig.border}`}>
              <DraftIcon size={12} className={sub.draft_status === 'regenerating' ? 'animate-spin' : ''} />
              {draftConfig.label}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase rounded-md border ${config.bg} ${config.text} ${config.border}`}>
              {sub.status === 'processing' && <Loader2 size={12} className="animate-spin" />}
              {config.label}
            </span>
          )}
          <ChevronRight size={18} className="text-surface-500 group-hover:text-surface-300 transition-colors" />
        </div>
      </div>

      {/* Row 2: Description */}
      <p className="text-sm text-surface-400 leading-relaxed mb-4 max-w-[85%] truncate">
        {sub.content_description}
      </p>

      {/* Row 3: Meta + Platform dots */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap text-xs text-surface-500 font-medium">
          <span className="capitalize px-2 py-0.5 rounded bg-surface-800">{sub.content_type}</span>
          <span className="capitalize px-2 py-0.5 rounded bg-surface-800">{sub.priority}</span>
          <span className="flex items-center gap-1.5">
            <Clock size={12} />
            <span className="hidden sm:inline">
              {new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="sm:hidden">
              {new Date(sub.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </span>
        </div>
        {hasPublishResults ? (
          <div className="flex items-center gap-2">
            <PlatformDot icon={Twitter}   colorClass="text-blue-400" result={pr.results.twitter} />
            <PlatformDot icon={Linkedin}  colorClass="text-blue-600" result={pr.results.linkedin} />
            <PlatformDot icon={Instagram} colorClass="text-pink-500" result={pr.results.instagram} />
          </div>
        ) : sub.draft_status === 'approved' ? (
          <div className="flex items-center gap-1.5 text-xs text-teal-500/70 font-medium">
            <Send size={12} /> Approved · Awaiting Publishing
          </div>
        ) : sub.draft_status === 'ready_for_review' ? (
          <div className="flex items-center gap-1.5 text-xs text-purple-400/70 font-medium">
            <Eye size={12} /> Waiting for Review
          </div>
        ) : null}
      </div>

      {sub.error_message && (
        <div className="mt-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-xs text-red-400 font-medium">{sub.error_message}</p>
        </div>
      )}
    </motion.div>
  );
}

/* Empty state */
function EmptyState({ message, sub }) {
  return (
    <div className="surface-card p-12 text-center">
      <FileText className="w-10 h-10 mx-auto text-surface-600 mb-4" />
      <h3 className="text-base font-semibold text-surface-300 mb-1">{message}</h3>
      {sub && <p className="text-sm text-surface-500">{sub}</p>}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function SubmissionsPage() {
  const { submissions, teamSubmissions, loading, fetchMySubmissions, fetchTeamSubmissions } = useSubmissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMarketing = user?.role === 'marketing_head' || user?.role === 'admin';

  // Active tab — only relevant for marketing head
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'mine'

  /* ── Fetch data based on role + tab ─────────────────────────── */
  useEffect(() => {
    if (isMarketing) {
      if (activeTab === 'team') {
        fetchTeamSubmissions();
        const iv = setInterval(fetchTeamSubmissions, 15000);
        return () => clearInterval(iv);
      } else {
        fetchMySubmissions();
        const iv = setInterval(fetchMySubmissions, 15000);
        return () => clearInterval(iv);
      }
    } else {
      fetchMySubmissions();
      const iv = setInterval(fetchMySubmissions, 15000);
      return () => clearInterval(iv);
    }
  }, [activeTab, isMarketing, fetchMySubmissions, fetchTeamSubmissions]);

  const currentList = isMarketing
    ? activeTab === 'team' ? teamSubmissions : submissions
    : submissions;

  /* Navigation: always go to submission detail (analytics) for both tabs.
     Draft review (approve/reject) lives in the Dashboard. */
  const handleClick = (sub) => {
    navigate(`/submissions/${sub.id}`);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-surface-100 mb-1">Submissions</h1>
          <p className="text-surface-400 text-sm">
            {isMarketing
              ? 'Review team submissions and track your generated content'
              : 'Track your content submissions and social publishing status'}
          </p>
        </div>

        {/* Tabs — marketing head only */}
        {isMarketing && (
          <div className="flex items-center gap-1 p-1 rounded-xl mb-6 w-fit"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              id="tab-team-submissions"
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'team'
                  ? 'bg-[#0F62FE]/15 text-[#60a5fa] shadow-sm'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Users size={14} />
              Team Submissions
            </button>
            <button
              id="tab-my-content"
              onClick={() => setActiveTab('mine')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'mine'
                  ? 'bg-[#0F62FE]/15 text-[#60a5fa] shadow-sm'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Sparkles size={14} />
              My Generated Content
            </button>
          </div>
        )}

        {/* List */}
        {loading && currentList.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : currentList.length === 0 ? (
          isMarketing && activeTab === 'team' ? (
            <EmptyState
              message="No team submissions yet"
              sub="Submissions from trainers will appear here for review."
            />
          ) : isMarketing && activeTab === 'mine' ? (
            <EmptyState
              message="No generated content yet"
              sub="Use Content Generation to create AI-drafted posts."
            />
          ) : (
            <EmptyState
              message="No submissions yet"
              sub="Submit your first content to get started."
            />
          )
        ) : (
          <div className="space-y-3">
            {currentList.map((sub, idx) => (
              <SubmissionCard
                key={sub.id}
                sub={sub}
                idx={idx}
                onClick={() => handleClick(sub)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
