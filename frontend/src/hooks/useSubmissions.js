import { useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function useSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [teamSubmissions, setTeamSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Current user's own submissions
  const fetchMySubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/submissions/my');
      setSubmissions(res.data.submissions);
    } catch (err) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  // All submissions — marketing_head / admin only
  const fetchTeamSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/submissions/team');
      setTeamSubmissions(res.data.submissions);
    } catch (err) {
      toast.error('Failed to load team submissions');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubmission = useCallback(async (formData) => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      toast.success('Submission received! AI is generating drafts...');
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Submission failed';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submissions, teamSubmissions, loading, fetchMySubmissions, fetchTeamSubmissions, createSubmission };
}

