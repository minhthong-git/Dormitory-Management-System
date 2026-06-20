import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import './Sidebar.css';

/* ── SVG Icon helpers ──────────────────────────────────────────── */
const Icon = ({ d }: { d: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

/* ── Nav item definitions ──────────────────────────────────────── */
interface NavItem {
  label: string;
  to: string;
  icon: string;
  badge?: number;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Tổng quan',              to: '/dashboard',           icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  // THÊM DÒNG NÀY (sử dụng icon tòa nhà phù hợp)
  { label: 'Quản lý Tòa nhà',        to: '/buildings',           icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { label: 'Quản lý Phòng',          to: '/admin/rooms',         icon: 'M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18' },
  { label: 'Quản lý Giường',         to: '/admin/beds',          icon: 'M2 20h20M5 20V14h14v6M5 14V4h14v10M5 9h14' },
  { label: 'Quản lý Hợp đồng',       to: '/admin/contracts',     icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6' },
  { label: 'Quản lý Sinh viên',      to: '/admin/students',      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: 'Hóa đơn',                to: '/admin/invoices',      icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { label: 'Thanh toán',             to: '/admin/payments',      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.86 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z' },
  { label: 'Thông báo',              to: '/admin/notifications', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0', badge: 3 },
  { label: 'Yêu cầu Sửa chữa',      to: '/admin/maintenance',   icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { label: 'Báo cáo & Thống kê',    to: '/admin/reports',       icon: 'M18 20V10M12 20V4M6 20v-6' },
  { label: 'Cài đặt',                to: '/admin/settings',      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
];

const STUDENT_NAV: NavItem[] = [
  { label: 'Tổng quan',        to: '/dashboard',     icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { label: 'Phòng của tôi',   to: '/rooms',         icon: 'M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18' },
  { label: 'Hóa đơn',         to: '/invoices',      icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { label: 'Thông báo',       to: '/notifications', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0', badge: 2 },
  { label: 'Báo cáo sự cố',  to: '/report',        icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
  { label: 'Hồ sơ cá nhân',  to: '/profile',       icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
];

/* ── Component ─────────────────────────────────────────────────── */
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';
  
  const navItems = React.useMemo(() => {
    const items = isAdmin ? ADMIN_NAV : STUDENT_NAV;
    return items.map((item) => {
      if (item.label === 'Thông báo') {
        return { ...item, badge: unreadCount };
      }
      return item;
    });
  }, [isAdmin, unreadCount]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="main-sidebar"
        className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${isOpen ? 'sidebar--open' : ''}`}
        aria-label="Main navigation"
      >
        {/* ── Logo ─────────────────────────────────────────────── */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
              <rect width="32" height="32" rx="8" fill="#5B5FEF" />
              <path d="M7 25V13l9-6 9 6v12H7z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" fill="none" />
              <rect x="13" y="17" width="6" height="8" rx="1" fill="#fff" opacity=".85" />
            </svg>
          </div>
          {!collapsed && (
            <div className="sidebar__logo-text">
              <span className="sidebar__logo-title">DormMS</span>
              <span className="sidebar__logo-sub">Hệ thống Quản lý KTX</span>
            </div>
          )}
          <button
            className="sidebar__collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu nhỏ thanh bên'}
            title={collapsed ? 'Mở rộng thanh bên' : 'Thu nhỏ thanh bên'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {collapsed
                ? <path d="M9 18l6-6-6-6" />
                : <path d="M15 18l-6-6 6-6" />
              }
            </svg>
          </button>
        </div>

        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="sidebar__nav" aria-label="Dashboard navigation">
          <span className="sidebar__section-label">
            {collapsed ? '—' : (isAdmin ? 'QUẢN LÝ' : 'MENU')}
          </span>
          <ul className="sidebar__menu" role="list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
                  }
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar__item-icon">
                    <Icon d={item.icon} />
                  </span>
                  {!collapsed && (
                    <span className="sidebar__item-label">{item.label}</span>
                  )}
                  {!collapsed && item.badge && item.badge > 0 ? (
                    <span className="sidebar__badge">{item.badge}</span>
                  ) : null}
                  {collapsed && item.badge && item.badge > 0 ? (
                    <span className="sidebar__badge sidebar__badge--dot" />
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── User Profile ─────────────────────────────────────── */}
        <div className="sidebar__profile">
          <div className="sidebar__avatar" aria-hidden="true">
            {user?.fullName?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.fullName ?? 'User'}</span>
              <span className="sidebar__role-badge">{user?.role ?? 'STUDENT'}</span>
            </div>
          )}
          {!collapsed && (
            <button
              className="sidebar__logout-btn"
              onClick={handleLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
