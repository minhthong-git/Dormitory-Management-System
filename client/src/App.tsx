import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Pages — lazy-loaded cho performance
import { lazy, Suspense } from 'react';

const LoginPage          = lazy(() => import('@/pages/LoginPage'));
const RegisterPage       = lazy(() => import('@/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const DashboardPage      = lazy(() => import('@/pages/DashboardPage'));
const RoomsPage          = lazy(() => import('@/pages/RoomsPage'));
const ProfilePage        = lazy(() => import('@/pages/ProfilePage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminUsersPage     = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminRoomsPage     = lazy(() => import('@/pages/admin/AdminRoomsPage'));
const UnauthorizedPage   = lazy(() => import('@/pages/UnauthorizedPage'));
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage'));

const PageLoader = () => (
  <div className="loading-screen">
    <div className="spinner" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public Routes ─────────────────────────────── */}
              <Route path="/login"        element={<LoginPage />} />
              <Route path="/register"     element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* ── Protected — wrapped in DashboardLayout ─────── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/rooms"     element={<RoomsPage />} />
                  <Route path="/profile"   element={<ProfilePage />} />
                </Route>
              </Route>

              {/* ── Admin Only — also in DashboardLayout ──────── */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin"        element={<AdminDashboardPage />} />
                  <Route path="/admin/users"  element={<AdminUsersPage />} />
                  <Route path="/admin/rooms"  element={<AdminRoomsPage />} />
                </Route>
              </Route>

              {/* ── Staff + Admin ──────────────────────────────── */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
                <Route element={<DashboardLayout />}>
                  {/* thêm route cho staff ở đây */}
                </Route>
              </Route>

              {/* ── 404 ───────────────────────────────────────── */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
