import React, { useState, useEffect, useCallback } from 'react';
import { maintenanceApi, type MaintenanceFilters } from '@/api/maintenance.api';
import { userApi } from '@/api/user.api';
import { roomApi } from '@/api/room.api';
import type { MaintenanceRequest, User, Room } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import './AdminMaintenancePage.css';
import './AdminRoomsPage.css';

const AdminMaintenancePage: React.FC = () => {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications();

  // Lọc các thông báo đánh giá bảo trì chưa đọc
  const feedbackNotifications = notifications.filter(
    notif => !notif.isRead && 
    (notif.title.includes('Đánh giá sửa chữa') || notif.message.includes('đã đánh giá'))
  );
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);

  // Filters State
  const [activeTab, setActiveTab] = useState<string>('ALL'); // ALL, PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, CANCELLED
  const [filterPriority, setFilterPriority] = useState('');
  const [filterRoomId, setFilterRoomId] = useState('');
  const [filterStaffId, setFilterStaffId] = useState('');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceRequest | null>(null);
  
  // Modal Fields
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [techNotes, setTechNotes] = useState('');
  const [newStatus, setNewStatus] = useState('RESOLVED'); // RESOLVED, CANCELLED

  // Fetch Maintenance Tickets
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: MaintenanceFilters = {
        page,
        limit,
        status: activeTab === 'ALL' ? undefined : activeTab,
        priority: filterPriority || undefined,
        roomId: filterRoomId || undefined,
        staffId: filterStaffId || undefined,
      };
      const response = await maintenanceApi.getAll(filters);
      if (response.data.success) {
        setRequests(response.data.data);
        setTotal(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách yêu cầu sửa chữa:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, activeTab, filterPriority, filterRoomId, filterStaffId]);

  // Fetch staff list for assignment dropdown
  const fetchStaff = async () => {
    try {
      const response = await userApi.getAll({ role: 'STAFF', limit: 100 });
      if (response.data.success) {
        setStaffList(response.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhân viên:', err);
    }
  };

  // Fetch rooms for dropdown filter
  const fetchRooms = async () => {
    try {
      const response = await roomApi.getAll({ limit: 100 });
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách phòng:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchStaff();
    fetchRooms();
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterPriority('');
    setFilterRoomId('');
    setFilterStaffId('');
    setPage(1);
  };

  // Open Assign Modal
  const openAssignModal = (ticket: MaintenanceRequest) => {
    setSelectedTicket(ticket);
    setSelectedStaffId(ticket.staffId || staffList[0]?.id || '');
    setIsAssignModalOpen(true);
  };

  // Open Status/Notes Modal (Complete/Cancel)
  const openStatusModal = (ticket: MaintenanceRequest, statusToSet: string) => {
    setSelectedTicket(ticket);
    setNewStatus(statusToSet);
    setTechNotes(ticket.notes || '');
    setIsStatusModalOpen(true);
  };

  // Handle Assign Staff Action
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!selectedStaffId) {
      alert('Vui lòng chọn nhân viên kỹ thuật!');
      return;
    }

    try {
      const response = await maintenanceApi.assign(selectedTicket.id, selectedStaffId);
      if (response.data.success) {
        alert('Phân công công việc thành công!');
        setIsAssignModalOpen(false);
        fetchTickets();
      }
    } catch (err: any) {
      console.error('Lỗi giao việc:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  // Handle Quick State Change (Start Repairing)
  const handleStartRepairing = async (id: string) => {
    try {
      const response = await maintenanceApi.updateStatus(id, { status: 'IN_PROGRESS' });
      if (response.data.success) {
        fetchTickets();
      }
    } catch (err) {
      console.error('Lỗi bắt đầu sửa chữa:', err);
    }
  };

  // Handle Update Status & Notes (Complete/Cancel)
  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      const response = await maintenanceApi.updateStatus(selectedTicket.id, {
        status: newStatus,
        notes: techNotes.trim() || undefined,
      });
      if (response.data.success) {
        alert(newStatus === 'RESOLVED' ? 'Đã hoàn thành bảo trì!' : 'Đã hủy yêu cầu!');
        setIsStatusModalOpen(false);
        fetchTickets();
      }
    } catch (err: any) {
      console.error('Lỗi cập nhật tiến trình:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  // Label Helpers
  const statusLabel: Record<string, string> = {
    PENDING: 'Chờ xử lý 🔴',
    ASSIGNED: 'Đã phân công 🔵',
    IN_PROGRESS: 'Đang sửa 🟡',
    RESOLVED: 'Đã hoàn thành 🟢',
    CANCELLED: 'Đã hủy ⚪',
  };

  const priorityLabel: Record<string, string> = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    URGENT: 'Khẩn cấp 🚨',
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / limit);

  if (user?.role === 'STAFF') {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <div>
            <h1 className="maint-page__title">Yêu cầu Sửa chữa</h1>
            <p className="admin-header__subtitle">
              Theo dõi và cập nhật trạng thái các yêu cầu bảo trì được phân công.
            </p>
          </div>
        </header>

        <div className="admin-content">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PENDING', label: 'Chờ xử lý' },
              { id: 'ASSIGNED', label: 'Đã phân công' },
              { id: 'IN_PROGRESS', label: 'Đang sửa chữa' },
              { id: 'RESOLVED', label: 'Đã hoàn thành' },
              { id: 'CANCELLED', label: 'Đã hủy' }
            ].map(tab => (
              <button
                key={tab.id}
                style={{
                  background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  fontWeight: activeTab === tab.id ? 600 : 400
                }}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters Control Panel */}
          <div className="student-controls" style={{ marginBottom: '1.5rem', background: 'transparent', padding: 0 }}>
            <div className="student-filters">
              <div className="form-group student-select-filter">
                <select
                  value={filterPriority}
                  onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
                >
                  <option value="">Độ ưu tiên (Tất cả)</option>
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>

              <div className="form-group student-select-filter">
                <select
                  value={filterRoomId}
                  onChange={e => { setFilterRoomId(e.target.value); setPage(1); }}
                >
                  <option value="">Phòng (Tất cả)</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      Phòng {room.roomNumber} ({room.building?.name || 'Khu A'})
                    </option>
                  ))}
                </select>
              </div>

              {(filterPriority || filterRoomId || filterStaffId || activeTab !== 'ALL') && (
                <button className="btn btn-outline" onClick={() => { handleResetFilters(); setActiveTab('ALL'); }}>
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Requests Table */}
          <section className="data-table-container">
            {isLoading ? (
              <div className="loading-screen" style={{ minHeight: '40vh' }}>
                <div className="spinner" />
              </div>
            ) : requests.length === 0 ? (
              <div className="empty-state" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>🔧</span>
                <h3 style={{ marginTop: '1rem', color: 'var(--color-text)' }}>Không có yêu cầu sửa chữa nào</h3>
                <p style={{ color: 'var(--color-text-muted)' }}>Hệ thống không ghi nhận báo cáo sự cố nào khớp với bộ lọc.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Phòng</th>
                      <th>Sinh viên báo</th>
                      <th>Thiết bị</th>
                      <th>Sự cố</th>
                      <th>Ưu tiên</th>
                      <th>Trạng thái</th>
                      <th style={{ width: '120px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(ticket => (
                      <tr key={ticket.id}>
                        <td><strong>Phòng {ticket.room?.roomNumber || 'Chưa rõ'}</strong></td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{ticket.student?.fullName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{ticket.student?.phone || 'Không có số'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatDateTime(ticket.createdAt)}</div>
                        </td>
                        <td>
                          {ticket.asset ? (
                            <>
                              <div style={{ fontWeight: 500 }}>{ticket.asset.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{ticket.asset.code}</div>
                            </>
                          ) : 'Cơ sở vật chất phòng'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{ticket.title}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ticket.description}>
                            {ticket.description}
                          </div>
                          {ticket.notes && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '4px' }}>
                              ✍️ {ticket.notes}
                            </div>
                          )}
                          {(ticket as any).rating && (
                            <div style={{ fontSize: '0.8rem', color: '#fbbf24', marginTop: '2px' }}>
                              Đánh giá: {'★'.repeat((ticket as any).rating)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge--${ticket.priority.toLowerCase()}`}>
                            {priorityLabel[ticket.priority] || ticket.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge--${ticket.status.toLowerCase()}`}>
                            {statusLabel[ticket.status]}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {ticket.status === 'ASSIGNED' && (
                              <button className="btn btn-success btn-sm" onClick={() => handleStartRepairing(ticket.id)}>Bắt đầu</button>
                            )}
                            {ticket.status === 'IN_PROGRESS' && (
                              <button className="btn btn-success btn-sm" onClick={() => openStatusModal(ticket, 'RESOLVED')}>Hoàn tất</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Trước
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Trang {page} / {totalPages} (Tổng số {total})</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Sau
              </button>
            </div>
          )}
        </div>

        {/* Modal: Cập nhật trạng thái (Hoàn thành / Hủy) */}
        {isStatusModalOpen && selectedTicket && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {newStatus === 'RESOLVED' ? 'Xác nhận Hoàn thành' : 'Hủy Yêu cầu'}
                </h2>
                <button className="modal-close" onClick={() => setIsStatusModalOpen(false)}>×</button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const response = await maintenanceApi.updateStatus(selectedTicket.id, { status: newStatus, notes: techNotes });
                  if (response.data.success) {
                    alert('Cập nhật trạng thái thành công!');
                    setIsStatusModalOpen(false);
                    fetchTickets();
                  }
                } catch (err: any) {
                  alert(err.response?.data?.message || 'Có lỗi xảy ra.');
                }
              }}>
                <div className="modal-body">
                  <div className="modal-info-box">
                    <p><strong>Yêu cầu:</strong> {selectedTicket.title}</p>
                    <p><strong>Phòng:</strong> {selectedTicket.room?.roomNumber || 'Chưa rõ'}</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="staff-notes-input">Ghi chú kỹ thuật (Tùy chọn)</label>
                    <textarea
                      id="staff-notes-input"
                      className="form-input"
                      rows={3}
                      value={techNotes}
                      onChange={e => setTechNotes(e.target.value)}
                      placeholder="Ghi chú về việc sửa chữa (đã thay thế linh kiện gì, lý do hủy...)"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-cancel" onClick={() => setIsStatusModalOpen(false)}>Đóng</button>
                  <button type="submit" className={newStatus === 'RESOLVED' ? 'btn btn-submit btn-submit--success' : 'btn btn-cancel'}>Xác nhận</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="maint-page">
      <header className="maint-page__header">
        <div>
          <h1 className="maint-page__title">Theo dõi Yêu cầu Bảo trì</h1>
          <p className="maint-page__subtitle">
            Tiếp nhận báo hỏng từ sinh viên, phân công kỹ thuật viên, theo dõi lịch sử bảo trì.
          </p>
        </div>
      </header>

      {/* Hiển thị các thông báo phản hồi và đánh giá từ sinh viên */}
      {feedbackNotifications.length > 0 && (
        <section className="maint-alerts-section">
          {feedbackNotifications.map(notif => (
            <div key={notif.id} className="maint-alert-card">
              <div className="maint-alert-card__icon">⭐</div>
              <div className="maint-alert-card__body">
                <h4 className="maint-alert-card__title">{notif.title}</h4>
                <p className="maint-alert-card__message">{notif.message}</p>
              </div>
              <button 
                type="button"
                className="maint-alert-card__btn" 
                onClick={() => markAsRead(notif.id)}
              >
                Đã xem
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Tabs */}
      <section className="maint-tabs">
        <button
          className={`maint-tab ${activeTab === 'ALL' ? 'maint-tab--active' : ''}`}
          onClick={() => handleTabChange('ALL')}
        >
          Tất cả
        </button>
        <button
          className={`maint-tab ${activeTab === 'PENDING' ? 'maint-tab--active' : ''}`}
          onClick={() => handleTabChange('PENDING')}
        >
          Chờ xử lý
        </button>
        <button
          className={`maint-tab ${activeTab === 'ASSIGNED' ? 'maint-tab--active' : ''}`}
          onClick={() => handleTabChange('ASSIGNED')}
        >
          Đã phân công
        </button>
        <button
          className={`maint-tab ${activeTab === 'IN_PROGRESS' ? 'maint-tab--active' : ''}`}
          onClick={() => handleTabChange('IN_PROGRESS')}
        >
          Đang sửa chữa
        </button>
        <button
          className={`maint-tab ${activeTab === 'RESOLVED' ? 'maint-tab--active' : ''}`}
          onClick={() => handleTabChange('RESOLVED')}
        >
          Đã hoàn thành
        </button>
        <button
          className={`maint-tab ${activeTab === 'CANCELLED' ? 'maint-tab--active' : ''}`}
          onClick={() => handleTabChange('CANCELLED')}
        >
          Đã hủy
        </button>
      </section>

      {/* Filters Control Panel */}
      <div className="student-controls" style={{ marginBottom: '1.5rem', background: 'transparent', padding: 0 }}>
        <div className="student-filters">
          <div className="form-group student-select-filter">
            <select
              value={filterPriority}
              onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
            >
              <option value="">Độ ưu tiên (Tất cả)</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>

          <div className="form-group student-select-filter">
            <select
              value={filterRoomId}
              onChange={e => { setFilterRoomId(e.target.value); setPage(1); }}
            >
              <option value="">Phòng (Tất cả)</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  Phòng {room.roomNumber} ({room.building?.name || 'Khu A'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group student-select-filter">
            <select
              value={filterStaffId}
              onChange={e => { setFilterStaffId(e.target.value); setPage(1); }}
            >
              <option value="">Kỹ thuật viên (Tất cả)</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.fullName}
                </option>
              ))}
            </select>
          </div>
          {(filterPriority || filterRoomId || filterStaffId || activeTab !== 'ALL') && (
            <button className="btn btn-outline" onClick={() => { handleResetFilters(); setActiveTab('ALL'); }}>
              Xóa lọc
            </button>
          )}
        </div>
      </div>
      {/* Requests Grid */}
      {isLoading ? (
        <div className="loading-screen" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state" style={{ padding: '6rem 2rem', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <span style={{ fontSize: '3rem' }}>🔧</span>
          <h3 style={{ marginTop: '1rem', color: 'var(--color-text)' }}>Không có yêu cầu sửa chữa nào</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Hệ thống không ghi nhận báo cáo sự cố nào khớp với bộ lọc.</p>
        </div>
      ) : (
        <>
          <div className="maint-grid">
            {requests.map(ticket => (
              <article key={ticket.id} className="ticket-card">
                <div className={`ticket-card__indicator indicator--${ticket.status.toLowerCase()}`} />
                
                <div>
                  <div className="ticket-card__header">
                    <span className="ticket-card__room">
                      Phòng {ticket.room?.roomNumber || 'Chưa rõ'}
                    </span>
                    <span className={`ticket-card__priority priority--${ticket.priority.toLowerCase()}`}>
                      {priorityLabel[ticket.priority] || ticket.priority}
                    </span>
                  </div>

                  <h3 className="ticket-card__title">{ticket.title}</h3>
                  <p className="ticket-card__desc">{ticket.description}</p>
                </div>

                <div className="ticket-card__meta">
                  <div className="meta-row">
                    <span>Thiết bị:</span>
                    <strong>
                      {ticket.asset ? `${ticket.asset.name} (${ticket.asset.code})` : 'Cơ sở vật chất phòng'}
                    </strong>
                  </div>
                  <div className="meta-row">
                    <span>Sinh viên báo:</span>
                    <strong>
                      {ticket.student?.fullName} ({ticket.student?.phone || 'Không có số'})
                    </strong>
                  </div>
                  <div className="meta-row">
                    <span>Kỹ thuật viên:</span>
                    <strong>{ticket.staff?.fullName || 'Chưa phân công'}</strong>
                  </div>
                  <div className="meta-row">
                    <span>Ngày tạo:</span>
                    <span>{formatDateTime(ticket.createdAt)}</span>
                  </div>
                  
                  {ticket.notes && (
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', marginTop: '6px', fontSize: '0.75rem', borderLeft: '3px solid #cbd5e1', color: '#1e293b' }}>
                      <strong>Nhân viên ghi chú:</strong> "{ticket.notes}"
                    </div>
                  )}

                  {ticket.rating && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '8px', borderRadius: '8px', marginTop: '6px', fontSize: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#b45309' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontWeight: '800', color: '#b45309' }}>Đánh giá của sinh viên:</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg
                              key={star}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill={star <= (ticket.rating || 0) ? "#f59e0b" : "none"}
                              stroke={star <= (ticket.rating || 0) ? "#f59e0b" : "rgba(245, 158, 11, 0.4)"}
                              strokeWidth="2.5"
                              style={{ width: '12px', height: '12px' }}
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      {ticket.feedback && (
                        <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#78350f', fontWeight: '700', wordBreak: 'break-word' }}>
                          "{ticket.feedback}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions inside Card */}
                  <div className="ticket-card__actions">
                    {ticket.status === 'PENDING' && (
                      user?.role === 'ADMIN' ? (
                        <button
                          className="btn-card btn-card--primary"
                          onClick={() => openAssignModal(ticket)}
                        >
                          Giao việc
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textAlign: 'center', width: '100%', display: 'block', padding: '4px 0' }}>
                          Chờ Admin phân công
                        </span>
                      )
                    )}

                    {ticket.status === 'ASSIGNED' && (
                      <>
                        {/* Staff được phân công mới thấy nút Bắt đầu sửa */}
                        {user?.role === 'STAFF' && ticket.staffId === user.id && (
                          <button
                            className="btn-card btn-card--secondary"
                            onClick={() => handleStartRepairing(ticket.id)}
                            style={{ width: '100%' }}
                          >
                            Bắt đầu sửa
                          </button>
                        )}
                        {/* Chỉ Admin mới được đổi người phân công */}
                        {user?.role === 'ADMIN' && (
                          <button
                            className="btn-card btn-card--outline"
                            onClick={() => openAssignModal(ticket)}
                            style={{ width: '100%' }}
                          >
                            Đổi người
                          </button>
                        )}
                      </>
                    )}

                    {ticket.status === 'IN_PROGRESS' && (
                      user?.role === 'STAFF' && ticket.staffId === user.id ? (
                        <>
                          <button
                            className="btn-card btn-card--success"
                            onClick={() => openStatusModal(ticket, 'RESOLVED')}
                          >
                            Hoàn thành
                          </button>
                          <button
                            className="btn-card btn-card--outline"
                            onClick={() => openStatusModal(ticket, 'CANCELLED')}
                          >
                            Hủy yêu cầu
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textAlign: 'center', width: '100%', display: 'block', padding: '6px 0' }}>
                          Trạng thái: {statusLabel[ticket.status]}
                        </span>
                      )
                    )}

                    {(ticket.status === 'RESOLVED' || ticket.status === 'CANCELLED') && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textAlign: 'center', width: '100%', display: 'block', padding: '4px 0' }}>
                        Trạng thái: {statusLabel[ticket.status]}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container" style={{ marginTop: '2rem', borderRadius: 16 }}>
              <span className="pagination-text">
                Hiển thị trang {page}/{totalPages} (Tổng số {total} yêu cầu)
              </span>
              <div className="pagination-btns">
                <button
                  className="btn-pagination"
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                >
                  Trước
                </button>
                <button
                  className="btn-pagination"
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal 1: Phân công nhân viên sửa chữa */}
      {isAssignModalOpen && selectedTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Phân công Sửa chữa</h2>
              <button className="modal-close" onClick={() => setIsAssignModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div className="modal-info-box">
                  <p><strong>Sự cố:</strong> {selectedTicket.title}</p>
                  <p><strong>Phòng:</strong> {selectedTicket.room?.roomNumber}</p>
                  <p><strong>Yêu cầu bởi:</strong> {selectedTicket.student?.fullName}</p>
                </div>

                <div className="form-group">
                  <label htmlFor="staff-select">Chọn Nhân viên Kỹ thuật (Staff)</label>
                  <select
                    id="staff-select"
                    className="form-input"
                    value={selectedStaffId}
                    onChange={e => setSelectedStaffId(e.target.value)}
                    required
                  >
                    <option value="" disabled>-- Chọn nhân viên --</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} ({staff.phone || 'Không số'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setIsAssignModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-submit">
                  Xác nhận giao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Cập nhật Trạng thái kèm Ghi chú kỹ thuật (Complete/Cancel) */}
      {isStatusModalOpen && selectedTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {newStatus === 'RESOLVED' ? 'Hoàn thành Sửa chữa' : 'Hủy bỏ Yêu cầu'}
              </h2>
              <button className="modal-close" onClick={() => setIsStatusModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleStatusUpdate}>
              <div className="modal-body">
                <div className="modal-info-box">
                  <p><strong>Sự cố:</strong> {selectedTicket.title}</p>
                  <p><strong>Phòng:</strong> {selectedTicket.room?.roomNumber}</p>
                </div>

                <div className="form-group">
                  <label htmlFor="tech-notes">Nhập báo cáo/Ghi chú sửa chữa (Notes)</label>
                  <textarea
                    id="tech-notes"
                    className="form-input"
                    style={{ resize: 'vertical', minHeight: '100px' }}
                    value={techNotes}
                    onChange={e => setTechNotes(e.target.value)}
                    placeholder={
                      newStatus === 'RESOLVED'
                        ? 'Ví dụ: Đã kiểm tra và bơm thêm gas cho máy lạnh. Máy hoạt động bình thường.'
                        : 'Ví dụ: Hủy yêu cầu do sinh viên báo nhầm phòng hoặc đã tự sửa.'
                    }
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-cancel" onClick={() => setIsStatusModalOpen(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className={newStatus === 'RESOLVED' ? 'btn btn-submit btn-submit--success' : 'btn btn-cancel'}
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaintenancePage;
