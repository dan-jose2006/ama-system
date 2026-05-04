import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F13]">
        <div className="surface-card p-8 text-center max-w-md animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-lg font-semibold text-[#fafafa] mb-2">Access Denied</h2>
          <p className="text-sm text-[#71717a]">You don't have permission to access this page.</p>
          <p className="text-[11px] text-[#52525b] mt-2">Required role: {allowedRoles.join(' or ')}</p>
        </div>
      </div>
    );
  }

  return children;
}
