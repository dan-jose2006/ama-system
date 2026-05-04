import { useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function useApprovals() {
  const [loading, setLoading] = useState(false);

  const submitApproval = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/approvals', data);
      const action = data.decision === 'approved' ? 'approved' : 'rejected';
      toast.success(`Draft ${action} successfully!`);
      // Return full response including publishResults
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to submit decision';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, submitApproval };
}
