import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { NotificationProvider } from '@/context/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BuildingList from './pages/BuildingList';
import RoomList from './pages/RoomList';

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
const AdminInvoicesPage  = lazy(() => import('@/pages/admin/AdminInvoicesPage'));
const StudentInvoicesPage = lazy(() => import('@/pages/StudentInvoicesPage'));
const InvoiceDetailPage   = lazy(() => import('@/pages/InvoiceDetailPage'));
const RevenueStatisticsPage = lazy(() => import('@/pages/admin/RevenueStatisticsPage'));
const NotificationsPage   = lazy(() => import('@/pages/NotificationsPage'));
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
          <NotificationProvider>
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
                  <Route path="/invoices"     element={<StudentInvoicesPage />} />
                  <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                </Route>
              </Route>

              {/* ── Admin Only — also in DashboardLayout ──────── */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin"        element={<AdminDashboardPage />} />
                  <Route path="/admin/users"  element={<AdminUsersPage />} />
                  <Route path="/admin/rooms"  element={<AdminRoomsPage />} />
                  <Route path="/admin/reports" element={<RevenueStatisticsPage />} />
                  <Route path="/admin/notifications" element={<NotificationsPage />} />
                </Route>
              </Route>

              {/* ── Staff + Admin ──────────────────────────────── */}
<Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
  <Route element={<DashboardLayout />}>
    {/* Route quản lý tòa nhà của Member 2 */}
    <Route path="/buildings" element={<BuildingList />} />
    <Route path="/buildings/:buildingId/rooms" element={<RoomList />} />
  </Route>
</Route>
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
                </Route>
              </Route>

              {/* ── 404 ───────────────────────────────────────── */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
