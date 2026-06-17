import React, { useState, useEffect, useCallback } from 'react';
import { bedApi } from '@/api/bed.api';
import { roomApi } from '@/api/room.api';
import type { Bed, Room } from '@/types';
import './AdminBedsPage.css';

type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

interface BedFormData {
  roomId: string;
  bedNumber: number;
  bedType: string;
  status: BedStatus;
}

const EMPTY_FORM: BedFormData = {
  roomId: '',
  bedNumber: 1,
  bedType: 'STANDARD',
  status: 'AVAILABLE',
};

const STATUS_LABEL: Record<BedStatus, string> = {
  AVAILABLE: 'Trống',
  OCCUPIED: 'Có khách',
  MAINTENANCE: 'Bảo trì',
};

const STATUS_CLASS: Record<BedStatus, string> = {
  AVAILABLE: 'badge--active',
  OCCUPIED: 'badge--female',
  MAINTENANCE: 'badge--other',
};

const AdminBedsPage: React.FC = () => {
  // ── Data ──────────────────────────────────────────────────────
  const [beds, setBeds] = useState<Bed[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ── Filters ───────────────────────────────────────────────────
  const [filterRoomId, setFilterRoomId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // ── Modal ─────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [form, setForm] = useState<BedFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Delete confirm ────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchBeds = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (filterRoomId) params.roomId = filterRoomId;
      if (filterStatus) params.status = filterStatus;
      const res = await bedApi.getAll(params as Parameters<typeof bedApi.getAll>[0]);
      setBeds(res.data.data || []);
      setTotal((res.data as { pagination?: { total?: number } }).pagination?.total ?? res.data.data?.length ?? 0);
    } catch (err) {
      console.error('Lỗi tải giường:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterRoomId, filterStatus]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await roomApi.getAll({ limit: 200 });
      setRooms(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải phòng:', err);
    }
  }, []);

  useEffect(() => { fetchBeds(); }, [fetchBeds]);
  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ── Helpers ───────────────────────────────────────────────────
  const getRoomLabel = (roomId: string) => {
    const r = rooms.find((r) => r.id === roomId);
    return r ? `Phòng ${r.roomNumber} (Tầng ${r.floor})` : roomId;
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ── Modal handlers ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingBed(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (bed: Bed) => {
    setEditingBed(bed);
    setForm({
      roomId: bed.roomId,
      bedNumber: bed.bedNumber,
      bedType: bed.bedType,
      status: bed.status as BedStatus,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBed(null);
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId) { setFormError('Vui lòng chọn phòng.'); return; }
    if (!form.bedNumber || form.bedNumber < 1) { setFormError('Số giường không hợp lệ.'); return; }
    setIsSaving(true);
    setFormError('');
    try {
      if (editingBed) {
        await bedApi.update(editingBed.id, form);
      } else {
        await bedApi.create(form);
      }
      closeModal();
      fetchBeds();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete handlers ────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await bedApi.delete(id);
      setDeletingId(null);
      fetchBeds();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Không thể xóa giường này.');
      setDeletingId(null);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────
  const available = beds.filter((b) => b.status === 'AVAILABLE').length;
  const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
  const maintenance = beds.filter((b) => b.status === 'MAINTENANCE').length;

  return (
    <div className="page">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1>Quản lý Giường</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Thêm, chỉnh sửa và theo dõi trạng thái tất cả giường trong ký túc xá.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchBeds} disabled={isLoading}>
            Tải lại
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            + Thêm giường
          </button>
        </div>
      </header>

      <main className="page-main">
        {/* ── Summary Pills ────────────────────────────────────── */}
        <div className="occupancy-summary">
          <div className="summary-pill">Tổng: <strong>{total}</strong></div>
          <div className="summary-pill summary-pill--green">Trống: <strong>{available}</strong></div>
          <div className="summary-pill summary-pill--red">Có khách: <strong>{occupied}</strong></div>
          <div className="summary-pill summary-pill--yellow">Bảo trì: <strong>{maintenance}</strong></div>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────── */}
        <div className="student-controls">
          <div className="student-filters">
            <div className="form-group student-select-filter" style={{ minWidth: 220 }}>
              <select value={filterRoomId} onChange={(e) => { setFilterRoomId(e.target.value); setPage(1); }}>
                <option value="">Tất cả phòng</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>Phòng {r.roomNumber} (Tầng {r.floor})</option>
                ))}
              </select>
            </div>
            <div className="form-group student-select-filter">
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">Tất cả trạng thái</option>
                <option value="AVAILABLE">Trống</option>
                <option value="OCCUPIED">Có khách</option>
                <option value="MAINTENANCE">Bảo trì</option>
              </select>
            </div>
          </div>
          {(filterRoomId || filterStatus) && (
            <button className="btn btn-outline" onClick={() => { setFilterRoomId(''); setFilterStatus(''); setPage(1); }}>
              Đặt lại
            </button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="loading-screen" style={{ minHeight: '35vh' }}>
            <div className="spinner" />
          </div>
        ) : beds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🛏️</div>
            <h3>Không tìm thấy giường nào</h3>
            <p>Thử thay đổi bộ lọc hoặc thêm giường mới.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Số giường</th>
                    <th>Phòng</th>
                    <th>Loại giường</th>
                    <th>Trạng thái</th>
                    <th>Sinh viên</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map((bed, idx) => {
                    const activeContract = bed.contracts?.[0];
                    const student = activeContract?.student;
                    return (
                      <tr key={bed.id}>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {(page - 1) * LIMIT + idx + 1}
                        </td>
                        <td><strong>Giường #{bed.bedNumber}</strong></td>
                        <td>{bed.room ? `Phòng ${bed.room.roomNumber}` : getRoomLabel(bed.roomId)}</td>
                        <td>
                          <span className="beds-type-badge">{bed.bedType}</span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_CLASS[bed.status as BedStatus] ?? 'badge--other'}`}>
                            {STATUS_LABEL[bed.status as BedStatus] ?? bed.status}
                          </span>
                        </td>
                        <td>
                          {student ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{student.studentCode}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-outline" onClick={() => openEdit(bed)}>
                              Sửa
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setDeletingId(bed.id)}
                              disabled={bed.status === 'OCCUPIED'}
                              title={bed.status === 'OCCUPIED' ? 'Không thể xóa giường đang có người ở' : ''}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ─────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← Trước
                </button>
                <span className="pagination-info">
                  Trang {page} / {totalPages} &nbsp;·&nbsp; {total} giường
                </span>
                <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Tiếp →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Create / Edit Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingBed ? 'Chỉnh sửa giường' : 'Thêm giường mới'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}

              <div className="form-group">
                <label className="form-label">Phòng <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <select
                  className="form-control"
                  value={form.roomId}
                  onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                  required
                >
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>Phòng {r.roomNumber} (Tầng {r.floor})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Số giường <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    value={form.bedNumber}
                    onChange={(e) => setForm((f) => ({ ...f, bedNumber: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Loại giường</label>
                  <select
                    className="form-control"
                    value={form.bedType}
                    onChange={(e) => setForm((f) => ({ ...f, bedType: e.target.value }))}
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="BUNK_TOP">Bunk Top</option>
                    <option value="BUNK_BOTTOM">Bunk Bottom</option>
                    <option value="SINGLE">Single</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-control"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BedStatus }))}
                >
                  <option value="AVAILABLE">Trống</option>
                  <option value="OCCUPIED">Có khách</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSaving}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : editingBed ? 'Cập nhật' : 'Thêm giường'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────── */}
      {deletingId && (
        <div className="modal-overlay" onClick={() => setDeletingId(null)}>
          <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Xác nhận xóa</h2>
              <button className="modal-close" onClick={() => setDeletingId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1.5rem' }}>
                Bạn có chắc muốn xóa giường này không? Hành động này không thể hoàn tác.
              </p>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setDeletingId(null)}>Hủy</button>
                <button className="btn btn-danger" onClick={() => handleDelete(deletingId)}>Xóa</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBedsPage;
