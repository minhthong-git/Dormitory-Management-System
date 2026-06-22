import React, { useState, useEffect, useCallback } from 'react';
import { maintenanceApi, type MaintenanceFilters } from '@/api/maintenance.api';
import { userApi } from '@/api/user.api';
import { roomApi } from '@/api/room.api';
import type { MaintenanceRequest, User, Room } from '@/types';
import './AdminMaintenancePage.css';

const AdminMaintenancePage: React.FC = () => {
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
      <section className="assets-page__control-card" style={{ marginBottom: '1.5rem' }}>
        <div className="assets-page__filters">
          <div className="filter-input-group">
            <label htmlFor="filter-priority">Độ ưu tiên</label>
            <select
              id="filter-priority"
              className="filter-control"
              value={filterPriority}
              onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả độ ưu tiên</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>

          <div className="filter-input-group">
            <label htmlFor="filter-roomId">Phòng</label>
            <select
              id="filter-roomId"
              className="filter-control"
              value={filterRoomId}
              onChange={e => { setFilterRoomId(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả phòng</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  Phòng {room.roomNumber} ({room.building?.name || 'Khu A'})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-input-group">
            <label htmlFor="filter-staffId">Kỹ thuật viên</label>
            <select
              id="filter-staffId"
              className="filter-control"
              value={filterStaffId}
              onChange={e => { setFilterStaffId(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả nhân viên</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.fullName}
                </option>
              ))}
            </select>
          </div>

          {(filterPriority || filterRoomId || filterStaffId) && (
            <div className="filter-input-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={handleResetFilters}>
                Xóa lọc
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Requests Grid */}
      {isLoading ? (
        <div className="loading-screen" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state" style={{ padding: '6rem 2rem', textAlign: 'center', background: 'var(--color-surface, #1F2937)', border: '1px solid var(--color-border, rgba(255, 255, 255, 0.07))', borderRadius: 16 }}>
          <span style={{ fontSize: '3rem' }}>🔧</span>
          <h3 style={{ marginTop: '1rem', color: 'var(--color-text, #f1f5f9)' }}>Không có yêu cầu sửa chữa nào</h3>
          <p style={{ color: 'var(--color-text-muted, #64748b)' }}>Hệ thống không ghi nhận báo cáo sự cố nào khớp với bộ lọc.</p>
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
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', marginTop: '6px', fontSize: '0.75rem', borderLeft: '3px solid #cbd5e1' }}>
                      <strong>Nhân viên ghi chú:</strong> "{ticket.notes}"
                    </div>
                  )}

                  {/* Actions inside Card */}
                  <div className="ticket-card__actions">
                    {ticket.status === 'PENDING' && (
                      <button
                        className="btn-card btn-card--primary"
                        onClick={() => openAssignModal(ticket)}
                      >
                        Giao việc
                      </button>
                    )}

                    {ticket.status === 'ASSIGNED' && (
                      <>
                        <button
                          className="btn-card btn-card--secondary"
                          onClick={() => handleStartRepairing(ticket.id)}
                        >
                          Bắt đầu sửa
                        </button>
                        <button
                          className="btn-card btn-card--outline"
                          onClick={() => openAssignModal(ticket)}
                        >
                          Đổi người
                        </button>
                      </>
                    )}

                    {ticket.status === 'IN_PROGRESS' && (
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
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Phân công Sửa chữa</h2>
              <button className="modal-close-btn" onClick={() => setIsAssignModalOpen(false)}>
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
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsAssignModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
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
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {newStatus === 'RESOLVED' ? 'Hoàn thành Sửa chữa' : 'Hủy bỏ Yêu cầu'}
              </h2>
              <button className="modal-close-btn" onClick={() => setIsStatusModalOpen(false)}>
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
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsStatusModalOpen(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  style={{
                    background:
                      newStatus === 'RESOLVED'
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                    boxShadow: 'none',
                  }}
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
