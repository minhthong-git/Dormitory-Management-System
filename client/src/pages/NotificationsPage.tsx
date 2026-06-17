import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/context/NotificationContext';
import './NotificationsPage.css';

// Type helper for relative timestamps
const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'LOW': return 'notif-priority--low';
    case 'HIGH': return 'notif-priority--high';
    case 'URGENT': return 'notif-priority--urgent';
    default: return 'notif-priority--medium';
  }
};

const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'LOW': return 'Thấp';
    case 'HIGH': return 'Cao';
    case 'URGENT': return 'Khẩn cấp';
    default: return 'Trung bình';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'CONTRACT_CREATED':
    case 'CONTRACT_TERMINATED':
    case 'CONTRACT_EXPIRING':
      return '📝';
    case 'INVOICE_CREATED':
    case 'INVOICE_OVERDUE':
      return '⚠️';
    case 'INVOICE_PAID':
      return '🧾';
    case 'UTILITY_RECORDED':
      return '💡';
    default:
      return '🔔';
  }
};

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    hasMore,
    currentPage
  } = useNotifications();

  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleItemClick = async (notif: any) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    
    // Router navigation based on referenceType/referenceId
    if (notif.referenceId && notif.referenceType === 'INVOICE') {
      navigate(`/invoices/${notif.referenceId}`);
    } else if (notif.referenceType === 'CONTRACT') {
      navigate('/rooms');
    }
  };

  const handleLoadMore = () => {
    fetchNotifications(currentPage + 1);
  };

  // Filter items in memory based on selection
  const filteredNotifications = notifications.filter(notif => {
    const matchesReadStatus = 
      filter === 'ALL' ? true :
      filter === 'UNREAD' ? !notif.isRead : 
      notif.isRead;

    const matchesPriority =
      priorityFilter === 'ALL' ? true :
      notif.priority === priorityFilter;

    return matchesReadStatus && matchesPriority;
  });

  return (
    <div className="notif-page">
      {/* Header section */}
      <div className="notif-page__header">
        <div>
          <h1 className="notif-page__title">Thông báo của tôi</h1>
          <p className="notif-page__subtitle">
            Bạn có {unreadCount} thông báo chưa đọc trong hệ thống
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button 
            className="notif-page__action-btn"
            onClick={handleMarkAllRead}
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Filter and Content section */}
      <div className="notif-page__card">
        {/* Filters */}
        <div className="notif-page__filters">
          <div className="filter-group">
            <button
              className={`filter-tab ${filter === 'ALL' ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              Tất cả
            </button>
            <button
              className={`filter-tab ${filter === 'UNREAD' ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter('UNREAD')}
            >
              Chưa đọc {unreadCount > 0 && <span className="filter-tab-count">{unreadCount}</span>}
            </button>
            <button
              className={`filter-tab ${filter === 'READ' ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter('READ')}
            >
              Đã đọc
            </button>
          </div>

          <div className="priority-select-container">
            <label htmlFor="priority-filter" className="filter-label">Mức độ ưu tiên:</label>
            <select
              id="priority-filter"
              className="priority-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="notif-list-container">
          {filteredNotifications.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-icon" role="img" aria-label="No notifications">🔔</span>
              <h3>Không tìm thấy thông báo nào</h3>
              <p>Mọi thông báo của bạn trên hệ thống sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <ul className="notif-list-items">
              {filteredNotifications.map((notif) => (
                <li 
                  key={notif.id}
                  className={`notif-item ${!notif.isRead ? 'notif-item--unread' : ''}`}
                >
                  {/* Status dot */}
                  {!notif.isRead && <div className="notif-unread-dot" />}

                  {/* Icon */}
                  <div className="notif-item-icon-box">
                    <span className="notif-item-emoji">
                      {getNotificationIcon(notif.type)}
                    </span>
                  </div>

                  {/* Main content */}
                  <div 
                    className="notif-item-content"
                    onClick={() => handleItemClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleItemClick(notif);
                      }
                    }}
                  >
                    <div className="notif-item-header">
                      <h4 className="notif-item-title-text">{notif.title}</h4>
                      <span className={`notif-priority-badge ${getPriorityClass(notif.priority)}`}>
                        {getPriorityLabel(notif.priority)}
                      </span>
                    </div>
                    <p className="notif-item-desc">{notif.message}</p>
                    <span className="notif-item-time">{formatRelativeTime(notif.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="notif-item-actions">
                    {!notif.isRead && (
                      <button 
                        className="notif-action-btn read-btn"
                        onClick={() => markAsRead(notif.id)}
                        title="Đánh dấu đã đọc"
                      >
                        ✓
                      </button>
                    )}
                    <button 
                      className="notif-action-btn delete-btn"
                      onClick={() => deleteNotification(notif.id)}
                      title="Xóa thông báo"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="notif-load-more">
              <button 
                className="notif-load-more-btn"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? 'Đang tải...' : 'Tải thêm thông báo'}
              </button>
            </div>
          )}
          
          {isLoading && filteredNotifications.length > 0 && (
            <div className="notif-loading-spinner">
              <div className="spinner" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
