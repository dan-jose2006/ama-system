import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDrafts } from '../hooks/useDrafts';
import { useApprovals } from '../hooks/useApprovals';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import PublishResultsPanel from '../components/social/PublishResultsPanel';
import MediaManager from '../components/social/MediaManager';
import RegeneratingOverlay from '../components/social/RegeneratingOverlay';
import LinkedInRedirectModal from '../components/social/LinkedInRedirectModal';
import api from '../services/api';
import {
  ArrowLeft, Linkedin, Twitter, Instagram, Hash,
  Check, X, RefreshCw, Loader2, Send, Clock,
  User, FileText, AlertCircle, MessageSquare, Sparkles
} from 'lucide-react';

export default function DraftDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft, loading, fetchDraft, regenerateDraft } = useDrafts();
  const { submitApproval, loading: approving } = useApprovals();

  const [editedLinkedin, setEditedLinkedin] = useState('');
  const [editedTwitter, setEditedTwitter] = useState('');
  const [editedInstagram, setEditedInstagram] = useState('');
  const [editedHashtags, setEditedHashtags] = useState([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [publishResults, setPublishResults] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // LinkedIn redirect modal
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedInContent, setLinkedInContent] = useState('');

  // per-platform media
  const [linkedinMedia, setLinkedinMedia] = useState([]);
  const [twitterMedia, setTwitterMedia] = useState([]);
  const [instagramMedia, setInstagramMedia] = useState([]);
  const [savingMedia, setSavingMedia] = useState(null);
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [genAllResult, setGenAllResult] = useState(null); // { provider, prompt }

  // streaming regeneration
  const [showRegenStream, setShowRegenStream] = useState(false);

  // ── Generate one consistent AI image set for all 3 platforms ─────────────
  const handleGenerateForAll = async () => {
    if (!draft) return;
    setGeneratingAllImages(true);
    setGenAllResult(null);
    try {
      const res = await api.post('/api/v1/media/generate-for-draft', {
        draftId:     draft.id,
        title:       draft.content_title       || '',
        description: draft.content_description || '',
        contentType: draft.content_type        || 'post',
        tone:        draft.tone_preference     || 'professional',
        postText:    editedLinkedin             || editedTwitter || editedInstagram || '',
      });
      const { wide, square, provider, prompt } = res.data;

      const makeItem = (url, tag) => ({
        id:     `ai-all-${tag}-${Date.now()}`,
        url,
        name:   `ai-${tag}-${draft.id.substring(0,8)}.jpg`,
        type:   'image',
        source: 'ai',
      });

      setLinkedinMedia(prev  => [...prev,  makeItem(wide.url,   'linkedin')]);
      setTwitterMedia(prev   => [...prev,  makeItem(wide.url,   'twitter')]);
      setInstagramMedia(prev => [...prev,  makeItem(square.url, 'instagram')]);
      setGenAllResult({ provider, prompt });
    } catch (err) {
      console.error('Generate for all failed:', err);
    } finally {
      setGeneratingAllImages(false);
    }
  };

  useEffect(() => {
    fetchDraft(id);
  }, [id, fetchDraft]);

  useEffect(() => {
    if (draft) {
      setEditedLinkedin(draft.linkedin_text || '');
      setEditedTwitter(draft.twitter_text || '');
      setEditedInstagram(draft.instagram_text || '');
      setEditedHashtags(draft.hashtags || []);
      setLinkedinMedia(Array.isArray(draft.linkedin_media) ? draft.linkedin_media : []);
      setTwitterMedia(Array.isArray(draft.twitter_media) ? draft.twitter_media : []);
      setInstagramMedia(Array.isArray(draft.instagram_media) ? draft.instagram_media : []);
    }
  }, [draft]);

  const saveMedia = useCallback(async (platform, items) => {
    setSavingMedia(platform);
    try {
      await api.patch(`/api/v1/drafts/${id}/media`, { platform, media: items });
    } catch (err) {
      console.error('Failed to save media:', err);
    } finally {
      setSavingMedia(null);
    }
  }, [id]);

  const handleLinkedinMediaChange = useCallback((items) => {
    setLinkedinMedia(items);
    saveMedia('linkedin', items);
  }, [saveMedia]);

  const handleTwitterMediaChange = useCallback((items) => {
    setTwitterMedia(items);
    saveMedia('twitter', items);
  }, [saveMedia]);

  const handleInstagramMediaChange = useCallback((items) => {
    setInstagramMedia(items);
    saveMedia('instagram', items);
  }, [saveMedia]);

  const handleApprove = async () => {
    setIsPublishing(true);
    try {
      const response = await submitApproval({
        draft_id: id,
        reviewer_name: user.name,
        reviewer_email: user.email,
        decision: 'approved',
        edited_linkedin: editedLinkedin !== draft.linkedin_text ? editedLinkedin : undefined,
        edited_twitter: editedTwitter !== draft.twitter_text ? editedTwitter : undefined,
        edited_instagram: editedInstagram !== draft.instagram_text ? editedInstagram : undefined,
      });

      if (response?.publishResults) {
        setPublishResults(response.publishResults);

        // Show LinkedIn redirect modal first if LinkedIn is in redirect mode
        if (response.linkedinRedirect && response.linkedinContent) {
          setLinkedInContent(response.linkedinContent);
          setShowLinkedInModal(true);
        }

        // Navigate to dashboard after user has had time to see results
        setTimeout(() => navigate('/dashboard'), 12000);
      } else {
        navigate('/dashboard');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReject = async () => {
    if (feedback.trim().length < 5) return;
    await submitApproval({
      draft_id: id,
      reviewer_name: user.name,
      reviewer_email: user.email,
      decision: 'rejected',
      feedback,
    });
    setShowRejectModal(false);
    navigate('/dashboard');
  };

  // Open the live-streaming regeneration overlay instead of navigating away
  const handleRegenerate = () => {
    setShowRegenStream(true);
  };

  // Called by RegeneratingOverlay when streaming finishes successfully.
  // NOTE: do NOT call fetchDraft here — that sets loading=true which unmounts
  // this component, causing the overlay's useEffect to re-run → infinite loop.
  // Content is updated in-place; fetchDraft is deferred to onClose.
  const handleStreamDone = (result) => {
    setEditedLinkedin(result.linkedin || '');
    setEditedTwitter(result.twitter || '');
    setEditedInstagram(result.instagram || '');
    setEditedHashtags(result.hashtags || []);
  };

  const addHashtag = () => {
    const tag = newHashtag.trim().replace(/^#/, '');
    if (tag && !editedHashtags.includes(tag) && editedHashtags.length < 10) {
      setEditedHashtags([...editedHashtags, tag]);
      setNewHashtag('');
    }
  };

  const removeHashtag = (tag) => {
    if (editedHashtags.length > 3) {
      setEditedHashtags(editedHashtags.filter((t) => t !== tag));
    }
  };

  // While the streaming overlay is active we MUST keep the full component
  // mounted — never return early here, otherwise the overlay unmounts,
  // its useEffect re-runs on remount, and a new regeneration starts.
  if ((loading || !draft) && !showRegenStream) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </AppLayout>
    );
  }

  const isEditable = draft.status === 'ready_for_review';

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-6xl mx-auto">
        {/* Back + Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-surface-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-surface-100">
              {draft.content_title || 'Untitled Draft'}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-surface-400">
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {draft.submitter_name}</span>
              {draft.team && <span>🏢 {draft.team}</span>}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(draft.generated_at).toLocaleString('en-IN')}
              </span>
              <span className={`badge-${draft.status}`}>{draft.status.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        {/* Submission Context */}
        <div className="surface-card p-5 mb-6">
          <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-500" /> Original Submission
          </h3>
          <p className="text-surface-300 text-sm leading-relaxed">{draft.content_description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-surface-500">
            <span className="capitalize">Type: {draft.content_type}</span>
            <span className="capitalize">Tone: {draft.tone_preference}</span>
            <span className="capitalize">Priority: {draft.priority}</span>
            {draft.llm_model && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-500" /> Model: {draft.llm_model}
              </span>
            )}
          </div>
        </div>

        {/* ── Generate AI Images for All Platforms ────────────────────── */}
        {isEditable && (
          <div className="surface-card p-4 mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-brand-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-100 mb-0.5">
                  {generatingAllImages ? 'Generating images…' : 'AI Image Generator'}
                </p>
                <p className="text-xs text-surface-400">
                  {genAllResult
                    ? `✓ Images applied via ${genAllResult.provider} · Same image across all 3 platforms`
                    : generatingAllImages
                    ? 'Creating contextual images for LinkedIn, Twitter & Instagram…'
                    : 'Generate one consistent AI image and apply it to all 3 platforms at once'}
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateForAll}
              disabled={generatingAllImages}
              className="btn-primary"
            >
              {generatingAllImages
                ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                : <><Sparkles size={14} /> Generate for All Platforms</>}
            </button>
          </div>
        )}

        {/* Platform Editors */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* LinkedIn */}
          <div className="surface-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                </div>
                <h3 className="font-semibold text-surface-200">LinkedIn</h3>
              </div>
              <span className={`text-xs font-medium ${editedLinkedin.length > 3000 ? 'text-red-400' : 'text-surface-500'}`}>
                {editedLinkedin.length}/3000
              </span>
            </div>
            <textarea
              value={editedLinkedin}
              onChange={(e) => isEditable && setEditedLinkedin(e.target.value)}
              readOnly={!isEditable}
              className="textarea-field text-sm min-h-[220px]"
              maxLength={3000}
            />
            {/* Media section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <MediaManager
                platform="linkedin"
                color="#0A66C2"
                media={linkedinMedia}
                onChange={handleLinkedinMediaChange}
                isEditable={isEditable}
                saving={savingMedia === 'linkedin'}
                draftContext={{
                  title:       draft?.submission?.content_title || '',
                  description: draft?.submission?.content_description || '',
                  contentType: draft?.submission?.content_type || 'post',
                  tone:        draft?.submission?.tone_preference || 'professional',
                  postText:    editedLinkedin,
                }}
              />
            </div>
          </div>

          {/* Twitter */}
          <div className="surface-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-surface-700/50 flex items-center justify-center">
                  <Twitter className="w-4 h-4 text-surface-300" />
                </div>
                <h3 className="font-semibold text-surface-200">Twitter / X</h3>
              </div>
              <span className={`text-xs font-medium ${editedTwitter.length > 280 ? 'text-red-400' : editedTwitter.length > 260 ? 'text-yellow-400' : 'text-surface-500'}`}>
                {editedTwitter.length}/280
              </span>
            </div>
            <textarea
              value={editedTwitter}
              onChange={(e) => isEditable && setEditedTwitter(e.target.value)}
              readOnly={!isEditable}
              className="textarea-field text-sm min-h-[220px]"
              maxLength={280}
            />
            {editedTwitter.length > 280 && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Exceeds 280 character limit
              </p>
            )}
            {/* Media section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <MediaManager
                platform="twitter"
                color="#1DA1F2"
                media={twitterMedia}
                onChange={handleTwitterMediaChange}
                isEditable={isEditable}
                saving={savingMedia === 'twitter'}
                draftContext={{
                  title:       draft?.submission?.content_title || '',
                  description: draft?.submission?.content_description || '',
                  contentType: draft?.submission?.content_type || 'post',
                  tone:        draft?.submission?.tone_preference || 'professional',
                  postText:    editedTwitter,
                }}
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="surface-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#833AB4]/20 via-[#FD1D1D]/20 to-[#F77737]/20 flex items-center justify-center">
                  <Instagram className="w-4 h-4 text-pink-400" />
                </div>
                <h3 className="font-semibold text-surface-200">Instagram</h3>
              </div>
              <span className={`text-xs font-medium ${editedInstagram.length > 2200 ? 'text-red-400' : 'text-surface-500'}`}>
                {editedInstagram.length}/2200
              </span>
            </div>
            <textarea
              value={editedInstagram}
              onChange={(e) => isEditable && setEditedInstagram(e.target.value)}
              readOnly={!isEditable}
              className="textarea-field text-sm min-h-[220px]"
              maxLength={2200}
            />
            {/* Media section */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <MediaManager
                platform="instagram"
                color="#E1306C"
                media={instagramMedia}
                onChange={handleInstagramMediaChange}
                isEditable={isEditable}
                saving={savingMedia === 'instagram'}
                draftContext={{
                  title:       draft?.submission?.content_title || '',
                  description: draft?.submission?.content_description || '',
                  contentType: draft?.submission?.content_type || 'post',
                  tone:        draft?.submission?.tone_preference || 'professional',
                  postText:    editedInstagram,
                }}
              />
            </div>
          </div>

        </div>

        {/* Hashtags */}
        <div className="surface-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-200 flex items-center gap-2">
              <Hash className="w-5 h-5 text-brand-400" /> Hashtags
            </h3>
            <span className="text-xs text-surface-500">{editedHashtags.length} / 3-10</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {editedHashtags.map((tag) => (
              <span key={tag} className="chip group">
                #{tag}
                {isEditable && editedHashtags.length > 3 && (
                  <button
                    onClick={() => removeHashtag(tag)}
                    className="w-4 h-4 rounded-full bg-brand-500/20 hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          {isEditable && editedHashtags.length < 10 && (
            <div className="flex gap-2">
              <input
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                placeholder="Add hashtag..."
                className="input-field max-w-[200px] text-sm"
              />
              <button onClick={addHashtag} className="btn-secondary text-sm px-4">
                Add
              </button>
            </div>
          )}
        </div>

        {/* Publish Results Panel — shown after approval */}
        <PublishResultsPanel publishResults={publishResults} />

        {/* Action Buttons */}
        {isEditable && !publishResults && (
          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <button
                onClick={handleRegenerate}
                className="btn-secondary flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Regenerate
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="btn-danger flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approving || isPublishing || editedTwitter.length > 280}
                  className="btn-success flex items-center gap-2"
                >
                  {(approving || isPublishing) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isPublishing ? 'Publishing...' : 'Approve & Publish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="surface-card p-6 w-full max-w-md animate-scale-in">
              <h3 className="text-lg font-semibold text-surface-100 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-red-400" />
                Reject with Feedback
              </h3>
              <p className="text-sm text-surface-400 mb-4">
                Please provide feedback explaining why this draft needs changes.
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What needs to be changed? (min 5 characters)"
                className="textarea-field mb-4"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setFeedback(''); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={feedback.trim().length < 5 || approving}
                  className="btn-danger flex items-center gap-2"
                >
                  {approving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LinkedIn redirect countdown modal */}
      <LinkedInRedirectModal
        visible={showLinkedInModal}
        content={linkedInContent}
        onClose={() => setShowLinkedInModal(false)}
      />

      {/* Live streaming regeneration overlay */}
      <RegeneratingOverlay
        visible={showRegenStream}
        draftId={id}
        token={localStorage.getItem('ama_token')}
        onDone={handleStreamDone}
        onError={(msg) => {
          console.error('Regen error:', msg);
          setShowRegenStream(false);
        }}
        onClose={() => {
          // Close overlay first, THEN fetch — so loading never unmounts the overlay
          setShowRegenStream(false);
          fetchDraft(id);
        }}
      />
    </AppLayout>
  );
}
