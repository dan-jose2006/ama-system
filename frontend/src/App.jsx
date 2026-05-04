import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import IntroScreen from './components/intro/IntroScreen';
import LoginPage from './pages/LoginPage';
import SubmissionPage from './pages/SubmissionPage';
import MySubmissionsPage from './pages/MySubmissionsPage';
import SubmissionDetailPage from './pages/SubmissionDetailPage';
import PlatformAnalyticsPage from './pages/PlatformAnalyticsPage';
import DashboardPage from './pages/DashboardPage';
import DraftDetailPage from './pages/DraftDetailPage';
import { Loader2 } from 'lucide-react';

function App() {
  const { loading, isAuthenticated, user } = useAuth();
  const [showIntro, setShowIntro] = useState(true);

  // Spinner while auth state loads
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F13]">
        <div className="text-center flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
          <p className="text-[11px] text-[#3f3f46] tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Intro overlay — shown once on first load, only when not authenticated */}
      <AnimatePresence>
        {showIntro && !isAuthenticated && (
          <IntroScreen key="intro" onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>

      {/* Main app routes */}
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={user?.role === 'trainer' ? '/submit' : '/dashboard'} replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Authenticated Routes */}
        <Route
          path="/submit"
          element={
            <ProtectedRoute allowedRoles={['trainer', 'marketing_head', 'admin']}>
              <SubmissionPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-submissions"
          element={
            <ProtectedRoute allowedRoles={['trainer', 'marketing_head', 'admin']}>
              <MySubmissionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submissions/:id"
          element={
            <ProtectedRoute allowedRoles={['trainer', 'marketing_head', 'admin']}>
              <SubmissionDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/submissions/:id/platform/:platform"
          element={
            <ProtectedRoute allowedRoles={['trainer', 'marketing_head', 'admin']}>
              <PlatformAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['marketing_head', 'admin']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/drafts/:id"
          element={
            <ProtectedRoute allowedRoles={['marketing_head', 'admin']}>
              <DraftDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? user?.role === 'trainer'
                    ? '/submit'
                    : '/dashboard'
                  : '/login'
              }
              replace
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;
