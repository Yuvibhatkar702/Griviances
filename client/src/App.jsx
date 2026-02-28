import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore, useOfficialStore } from './store';
import Toast from './components/Toast';

// Pages - Enhanced versions
import HomePage from './pages/HomePage';
import EnhancedSubmitComplaintPage from './pages/EnhancedSubmitComplaintPage';
import EnhancedTrackComplaintPage from './pages/EnhancedTrackComplaintPage';
import AdminLoginPage from './pages/AdminLoginPage';
import EnhancedAdminDashboardPage from './pages/EnhancedAdminDashboardPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';

// New Feature Pages
import CommunityFeedPage from './pages/CommunityFeedPage';
import CitizenPortalPage from './pages/CitizenPortalPage';

// Official / Role-based Pages
import OfficialLoginPage from './pages/OfficialLoginPage';
import DepartmentDashboardPage from './pages/DepartmentDashboardPage';
import OfficerDashboardPage from './pages/OfficerDashboardPage';

// ─── Hydration helpers ──────────────────────────────────────────────
// Uses zustand persist's built-in API: persist.hasHydrated() + persist.onFinishHydration()
function useStoreHydrated(store) {
  const [hydrated, setHydrated] = useState(store.persist.hasHydrated());
  useEffect(() => {
    const unsub = store.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [store]);
  return hydrated;
}

function HydrationSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  );
}

// Protected Route Component (admin) — waits for hydration before deciding
function ProtectedRoute({ children }) {
  const hydrated = useStoreHydrated(useAuthStore);
  const { isAuthenticated } = useAuthStore();

  if (!hydrated) return <HydrationSpinner />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  return children;
}

// Protected Route for officials (department_head or officer) — waits for hydration
function OfficialProtectedRoute({ children, allowedRoles }) {
  const hydrated = useStoreHydrated(useOfficialStore);
  const { isAuthenticated, official } = useOfficialStore();

  if (!hydrated) return <HydrationSpinner />;
  if (!isAuthenticated || (allowedRoles && !allowedRoles.includes(official?.role))) {
    return <Navigate to="/official-login" replace />;
  }

  return children;
}

// Register Service Worker for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration.scope);
      } catch (error) {
        console.log('ServiceWorker registration failed:', error);
      }
    });
  }
}

function App() {
  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker();
  }, []);

  return (
    <BrowserRouter>
      {/* Global Components */}
      <Toast />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/submit" element={<EnhancedSubmitComplaintPage />} />
        <Route path="/submit/:sessionId" element={<EnhancedSubmitComplaintPage />} />
        <Route path="/track" element={<EnhancedTrackComplaintPage />} />
        <Route path="/track/:complaintId" element={<EnhancedTrackComplaintPage />} />
        
        {/* New Feature Routes */}
        <Route path="/community" element={<CommunityFeedPage />} />
        <Route path="/citizen" element={<CitizenPortalPage />} />
        
        {/* Official Login (unified for admin, dept head, officer) */}
        <Route path="/official-login" element={<OfficialLoginPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <EnhancedAdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/complaints/:id"
          element={
            <ProtectedRoute>
              <ComplaintDetailPage />
            </ProtectedRoute>
          }
        />
        
        {/* Department Head Dashboard */}
        <Route
          path="/department"
          element={
            <OfficialProtectedRoute allowedRoles={['department_head']}>
              <DepartmentDashboardPage />
            </OfficialProtectedRoute>
          }
        />
        
        {/* Officer Dashboard */}
        <Route
          path="/officer"
          element={
            <OfficialProtectedRoute allowedRoles={['officer']}>
              <OfficerDashboardPage />
            </OfficialProtectedRoute>
          }
        />
        
        {/* Redirect admin root to dashboard */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
