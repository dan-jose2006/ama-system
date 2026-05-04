import { useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function useDrafts() {
  const [drafts, setDrafts]           = useState([]);
  const [myDrafts, setMyDrafts]       = useState([]);
  const [teamDrafts, setTeamDrafts]   = useState([]);
  const [draft, setDraft]             = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading]         = useState(false);

  // All drafts with optional filters (original — used by team tab)
  const fetchDrafts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/drafts', { params });
      setDrafts(res.data.drafts);
      setStatusCounts(res.data.statusCounts || {});
    } catch (err) {
      toast.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Only drafts from other users (team tab)
  const fetchTeamDrafts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/drafts', { params: { ...params, teamOnly: 'true' } });
      setTeamDrafts(res.data.drafts);
      setStatusCounts(res.data.statusCounts || {});
    } catch (err) {
      toast.error('Failed to load team drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Only the current user's own drafts (my drafts tab)
  const fetchMyDrafts = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/drafts', { params: { ...params, mine: 'true' } });
      setMyDrafts(res.data.drafts);
    } catch (err) {
      toast.error('Failed to load my drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDraft = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/drafts/${id}`);
      setDraft(res.data.draft);
      return res.data.draft;
    } catch (err) {
      toast.error('Failed to load draft');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const regenerateDraft = useCallback(async (id) => {
    try {
      await api.post(`/api/v1/drafts/${id}/regenerate`);
      toast.success('Regeneration queued! New draft incoming...');
    } catch (err) {
      toast.error('Failed to regenerate draft');
      throw err;
    }
  }, []);

  return {
    drafts, myDrafts, teamDrafts, draft, statusCounts, loading,
    fetchDrafts, fetchTeamDrafts, fetchMyDrafts, fetchDraft, regenerateDraft,
  };
}

