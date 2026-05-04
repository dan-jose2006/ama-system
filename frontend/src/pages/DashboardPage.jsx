import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrafts } from '../hooks/useDrafts';
import AppLayout from '../components/layout/AppLayout';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Clock, Eye, Loader2, CheckCircle2,
  XCircle, RefreshCw, Linkedin, Twitter, Instagram,
  FileText, AlertCircle, Users, Sparkles, User,
  ChevronRight, Filter, ArrowUpRight, Zap
} from 'lucide-react';

/* ── Status config ──────────────────────────────────────────── */
const STATUS_META = {
  ready_for_review: {
    label: 'Ready for Review',
    short: 'Review',
    icon: Eye,
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/25',
    dot: 'bg-purple-400',
    pulse: true,
  },
  approved: {
    label: 'Approved',
    short: 'Approved',
    icon: CheckCircle2,
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/25',
    dot: 'bg-teal-400',
    pulse: true,
  },
  rejected: {
    label: 'Rejected',
    short: 'Rejected',
    icon: XCircle,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/25',
    dot: 'bg-red-500',
    pulse: false,
  },
  regenerating: {
    label: 'Regenerating',
    short: 'Generating',
    icon: Loader2,
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/25',
    dot: 'bg-yellow-400',
    pulse: true,
  },
  pending: {
    label: 'Pending',
    short: 'Pending',
    icon: Clock,
    bg: 'bg-surface-700/40',
    text: 'text-surface-400',
    border: 'border-surface-600/30',
    dot: 'bg-surface-500',
    pulse: false,
  },
};

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'ready_for_review', label: 'Ready for Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'regenerating', label: 'Regenerating' },
];

/* ── Status Badge ───────────────────────────────────────────── */
function StatusBadge({ status, size = 'md' }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  const isSpinning = status === 'regenerating';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold tracking-wide uppercase ${meta.bg} ${meta.text} ${meta.border} ${
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
    }`}>
      <motion.div
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`}
        animate={meta.pulse ? { opacity: [0.4, 1, 0.4] } : {}}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
      <Icon size={size === 'sm' ? 10 : 11} className={isSpinning ? 'animate-spin' : ''} />
      {meta.label}
    </span>
  );
}

/* ── Priority pill ──────────────────────────────────────────── */
function PriorityPill({ priority }) {
  if (priority !== 'high') return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
      <Zap size={9} /> High
    </span>
  );
}

/* ── Draft Card ─────────────────────────────────────────────── */
function DraftCard({ draft, idx, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: idx * 0.03 }}
      onClick={onClick}
      className="surface-card p-5 cursor-pointer hover:border-surface-600 hover:shadow-lg transition-all duration-200 group relative overflow-hidden"
    >
      {/* Subtle left accent by status */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${
        draft.status === 'ready_for_review' ? 'bg-purple-500/60' :
        draft.status === 'approved'         ? 'bg-teal-500/60' :
        draft.status === 'rejected'         ? 'bg-red-500/60' :
        draft.status === 'regenerating'     ? 'bg-yellow-500/60' :
        'bg-surface-700'
      }`} />

      <div className="pl-2">
        {/* Row 1: Title + Status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[14px] font-semibold text-surface-100 leading-snug flex-1 min-w-0 truncate">
            {draft.content_title || 'Untitled Draft'}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <PriorityPill priority={draft.priority} />
            <StatusBadge status={draft.status} />
            <ChevronRight size={16} className="text-surface-600 group-hover:text-surface-400 transition-colors" />
          </div>
        </div>

        {/* Row 2: Submitter + Team + Time */}
        <div className="flex items-center gap-4 text-xs text-surface-500 mb-4">
          <span className="flex items-center gap-1.5">
            <User size={11} />
            {draft.submitter_name}
          </span>
          {draft.team && (
            <span className="px-1.5 py-0.5 rounded bg-surface-800 text-surface-400 text-[10px] font-medium">
              {draft.team}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Clock size={11} />
            {new Date(draft.generated_at || draft.submitted_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        {/* Row 3: Platform icons + content type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-800 text-surface-400 capitalize">
              {draft.content_type || 'post'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-surface-600">
            <Twitter size={13} className="group-hover:text-blue-400/70 transition-colors" />
            <Linkedin size={13} className="group-hover:text-blue-500/70 transition-colors" />
            <Instagram size={13} className="group-hover:text-pink-500/70 transition-colors" />
            <ArrowUpRight size={13} className="text-surface-700 group-hover:text-brand-400 transition-colors ml-1" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, bg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-surface-100">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Empty State ─────────────────────────────────────────────── */
function EmptyDrafts({ filtered, tab }) {
  return (
    <div className="surface-card p-14 text-center">
      <LayoutDashboard className="w-10 h-10 mx-auto text-surface-700 mb-4" />
      <h3 className="text-base font-semibold text-surface-300 mb-1">No drafts found</h3>
      <p className="text-sm text-surface-500">
        {filtered ? 'Try adjusting your filters.' :
         tab === 'team' ? 'Team submissions will appear here once AI processes them.' :
         'Your generated content will appear here.'}
      </p>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { myDrafts, teamDrafts, statusCounts, loading, fetchTeamDrafts, fetchMyDrafts } = useDrafts();
  const [activeTab, setActiveTab] = useState('team');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTeam, setFilterTeam]     = useState('');
  const navigate = useNavigate();

  const filters = { status: filterStatus || undefined, team: filterTeam || undefined };

  /* ── Fetch based on active tab ─────────────────────── */
  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamDrafts(filters);
      const iv = setInterval(() => fetchTeamDrafts(filters), 30000);
      return () => clearInterval(iv);
    } else {
      fetchMyDrafts(filters);
      const iv = setInterval(() => fetchMyDrafts(filters), 30000);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterStatus, filterTeam]);

  const currentList = activeTab === 'team' ? teamDrafts : myDrafts;
  const totalDrafts  = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const pendingCount = statusCounts.ready_for_review || 0;
  const approvedCount = statusCounts.approved || 0;
  const hasFilters   = filterStatus || filterTeam;

  const handleRefresh = () => activeTab === 'team' ? fetchTeamDrafts(filters) : fetchMyDrafts(filters);

  return (
    <AppLayout>
      <div className="animate-fade-in">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-surface-100 mb-1">Content Dashboard</h1>
            <p className="text-surface-400 text-sm">Review, approve and manage AI-generated content drafts</p>
          </div>
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Drafts"    value={totalDrafts}   icon={FileText}    color="text-brand-400"   bg="bg-brand-500/10"   delay={0}    />
          <StatCard label="Pending Review"  value={pendingCount}  icon={AlertCircle} color="text-purple-400"  bg="bg-purple-500/10"  delay={0.05} />
          <StatCard label="Approved"        value={approvedCount} icon={CheckCircle2}color="text-teal-400"    bg="bg-teal-500/10"    delay={0.1}  />
          <StatCard label="Rejected"        value={statusCounts.rejected || 0} icon={XCircle} color="text-red-400" bg="bg-red-500/10" delay={0.15} />
        </div>

        {/* ── Tabs ────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div
            className="flex items-center gap-1 p-1 rounded-xl w-fit"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              id="tab-team-drafts"
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'team'
                  ? 'bg-[#0F62FE]/15 text-[#60a5fa] shadow-sm'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Users size={14} />
              Team Drafts
              {pendingCount > 0 && activeTab !== 'team' && (
                <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
            <button
              id="tab-my-drafts"
              onClick={() => setActiveTab('mine')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'mine'
                  ? 'bg-[#0F62FE]/15 text-[#60a5fa] shadow-sm'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              <Sparkles size={14} />
              My Drafts
            </button>
          </div>

          {/* ── Filters ───────────────────────────────── */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-surface-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select-field text-xs py-1.5 max-w-[180px]"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Filter by team..."
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="input-field text-xs py-1.5 max-w-[150px]"
            />
            {hasFilters && (
              <button
                onClick={() => { setFilterStatus(''); setFilterTeam(''); }}
                className="text-xs text-surface-500 hover:text-surface-200 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Draft List ──────────────────────────────── */}
        {loading && currentList.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : currentList.length === 0 ? (
          <EmptyDrafts filtered={!!hasFilters} tab={activeTab} />
        ) : (
          <div className="space-y-2.5">
            {currentList.map((draft, idx) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                idx={idx}
                onClick={() => navigate(`/drafts/${draft.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
