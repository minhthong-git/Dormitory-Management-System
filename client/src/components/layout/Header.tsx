import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

// ── Icon map theo notification type ────────────────────────────
const notifIconMap: Record<string, string> = {
  INVOICE_CREATED: '🧾',
  INVOICE_PAID: '✅',
  INVOICE_OVERDUE: '⚠️',
  CONTRACT_CREATED: '📝',
  CONTRACT_TERMINATED: '🚪',
  CONTRACT_EXPIRING: '⏰',
  UTILITY_RECORDED: '💡',
  PAYMENT_REMINDER: '💳',
  SYSTEM: '🔔',
};

const priorityClassMap: Record<string, string> = {
  LOW: 'info',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'warning',
};

const Header: React.FC<HeaderProps> = ({ onMenuToggle, sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    hasMore,
    currentPage,
    isLoading,
  } = useNotifications();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Close dropdowns on outside click ─────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotifClick = async (notifId: string, referenceId?: string, referenceType?: string) => {
    await markAsRead(notifId);
    // Navigate to the relevant page based on reference type
    if (referenceType === 'INVOICE' && referenceId) {
      navigate(`/invoices/${referenceId}`);
      setNotifOpen(false);
    } else if (referenceType === 'CONTRACT') {
      navigate('/dashboard');
      setNotifOpen(false);
    } else if (referenceType === 'SYSTEM') {
      const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
      navigate(isAdminOrStaff ? '/admin/maintenance' : '/report');
      setNotifOpen(false);
    }
  };

  const displayName = user?.fullName ?? 'User';
  const avatarChar = displayName.charAt(0).toUpperCase();

  // Format thời gian tương đối
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <header
      id="dashboard-header"
      className={`dms-header ${sidebarCollapsed ? 'dms-header--sidebar-collapsed' : ''}`}
    >
      {/* Mobile hamburger */}
      <button
        id="mobile-menu-toggle"
        className="dms-header__hamburger"
        onClick={onMenuToggle}
        aria-label="Mở/Đóng menu"
      >
        <span /><span /><span />
      </button>

      {/* Page title on desktop */}
      <div className="dms-header__title-area">
        <h2 className="dms-header__page-title">Trang chủ</h2>
        <div className="dms-header__breadcrumb" aria-label="Điều hướng">
          <span>DormMS</span>
          <span aria-hidden="true">›</span>
          <span>Trang chủ</span>
        </div>
      </div>

      {/* Search */}
      <div className="dms-header__search" role="search">
        <svg className="dms-header__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          id="header-search"
          type="search"
          className="dms-header__search-input"
          placeholder="Tìm phòng, sinh viên, hóa đơn…"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          aria-label="Tìm kiếm"
        />
      </div>

      {/* Right actions */}
      <div className="dms-header__actions">

        {/* ══════ NOTIFICATIONS ══════ */}
        <div className="dms-header__dropdown-wrap" ref={notifRef}>
          <button
            id="notifications-btn"
            className={`dms-header__icon-btn ${notifOpen ? 'dms-header__icon-btn--active' : ''}`}
            onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
            aria-label="Thông báo"
            aria-expanded={notifOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                className="dms-header__notif-badge"
                aria-label={`${unreadCount} thông báo chưa đọc`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="dms-header__dropdown" id="notifications-dropdown" role="menu" aria-label="Thông báo">
              <div className="dms-header__dropdown-header">
                <span>Thông báo</span>
                {unreadCount > 0 && (
                  <button
                    className="dms-header__mark-all-btn"
                    onClick={() => markAllAsRead()}
                  >
                    Đọc tất cả
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="dms-header__notif-empty">
                  <span>🔔</span>
                  <p>Không có thông báo nào</p>
                </div>
              ) : (
                <ul className="dms-header__notif-list" role="list">
                  {notifications.map(notif => {
                    const icon = notifIconMap[notif.type] ?? '🔔';
                    const variant = priorityClassMap[notif.priority] ?? 'info';
                    return (
                      <li
                        key={notif.id}
                        className={`dms-header__notif-item dms-header__notif-item--${variant} ${!notif.isRead ? 'dms-header__notif-item--unread' : ''}`}
                        role="menuitem"
                        onClick={() => handleNotifClick(notif.id, notif.referenceId, notif.referenceType)}
                      >
                        <div className="dms-header__notif-icon" aria-hidden="true">
                          {icon}
                        </div>
                        <div className="dms-header__notif-body">
                          <span className="dms-header__notif-title">
                            {notif.title}
                          </span>
                          <span className="dms-header__notif-msg">
                            {notif.message}
                          </span>
                          <span className="dms-header__notif-time">
                            {timeAgo(notif.createdAt)}
                          </span>
                        </div>
                        {!notif.isRead && (
                          <div className="dms-header__notif-dot" aria-hidden="true" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Load more */}
              {hasMore && (
                <div className="dms-header__dropdown-footer">
                  <button
                    className="dms-header__dropdown-link"
                    onClick={() => fetchNotifications(currentPage + 1)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Đang tải...' : 'Xem thêm'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════ PROFILE DROPDOWN ══════ */}
        <div className="dms-header__dropdown-wrap" ref={profileRef}>
          <button
            id="profile-menu-btn"
            className={`dms-header__profile-btn ${profileOpen ? 'dms-header__profile-btn--active' : ''}`}
            onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
            aria-label="Menu người dùng"
            aria-expanded={profileOpen}
          >
            <div className="dms-header__avatar" aria-hidden="true">
              {avatarChar}
            </div>
            <div className="dms-header__user-info">
              <span className="dms-header__user-name">{displayName}</span>
              <span className="dms-header__role-badge dms-header__role-badge--header">
                {user?.role ?? 'STUDENT'}
              </span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`dms-header__chevron ${profileOpen ? 'dms-header__chevron--open' : ''}`} aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {profileOpen && (
            <div className="dms-header__dropdown dms-header__dropdown--right" id="profile-dropdown" role="menu" aria-label="Menu người dùng">
              <div className="dms-header__dropdown-header">
                <div className="dms-header__avatar dms-header__avatar--lg" aria-hidden="true">
                  {avatarChar}
                </div>
                <div>
                  <p className="dms-header__dropdown-name">{displayName}</p>
                  <p className="dms-header__dropdown-email">{user?.email ?? ''}</p>
                </div>
              </div>
              <ul className="dms-header__profile-menu" role="list">
                <li role="menuitem">
                  <button className="dms-header__profile-menu-item" onClick={() => { navigate('/profile'); setProfileOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Hồ sơ cá nhân
                  </button>
                </li>
                <li role="menuitem">
                  <button className="dms-header__profile-menu-item" onClick={() => { navigate('/settings'); setProfileOpen(false); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                    Cài đặt
                  </button>
                </li>
                <li className="dms-header__divider" role="separator" />
                <li role="menuitem">
                  <button id="logout-btn" className="dms-header__profile-menu-item dms-header__profile-menu-item--danger" onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Đăng xuất
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
