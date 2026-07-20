import React, { useState, useEffect, useCallback } from 'react';
import { contractApi } from '@/api/contract.api';
import { studentApi } from '@/api/student.api';
import { bedApi } from '@/api/bed.api';
import type { Contract, Student, Bed } from '@/types';
import './AdminContractsPage.css';

type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';

const STATUS_LABEL: Record<ContractStatus, string> = {
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Hết hạn',
  TERMINATED: 'Đã kết thúc',
  PENDING: 'Chờ duyệt',
};
const STATUS_CLASS: Record<ContractStatus, string> = {
  ACTIVE: 'badge--active',
  EXPIRED: 'badge--other',
  TERMINATED: 'badge--female',
  PENDING: 'badge--male',
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// ─── Create contract form ─────────────────────────────────────
interface CreateFormData {
  studentId: string;
  bedId: string;
  startDate: string;
  endDate: string;
  price: string;
  deposit: string;
  monthlyFee: string;
}

const EMPTY_CREATE: CreateFormData = {
  studentId: '',
  bedId: '',
  startDate: '',
  endDate: '',
  price: '',
  deposit: '',
  monthlyFee: '',
};

// ─── Transfer form ────────────────────────────────────────────
interface TransferFormData {
  studentId: string;
  newBedId: string;
  reason: string;
}

const AdminContractsPage: React.FC = () => {
  // ── Data ───────────────────────────────────────────────────────
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // ── Filters ────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // ── Modal modes ────────────────────────────────────────────────
  type ModalMode = 'create' | 'terminate' | 'transfer' | 'checkin' | 'checkout' | 'edit' | 'extend' | 'delete' | 'student_info' | 'view' | null;
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // ── Forms ──────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState<CreateFormData>(EMPTY_CREATE);
  const [transferForm, setTransferForm] = useState<TransferFormData>({ studentId: '', newBedId: '', reason: '' });
  const [editForm, setEditForm] = useState({ price: '', deposit: '', monthlyFee: '' });
  const [extendForm, setExtendForm] = useState({ endDate: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: LIMIT };
      if (filterStatus) params.status = filterStatus;
      const res = await contractApi.getAll(params as Parameters<typeof contractApi.getAll>[0]);
      setContracts(res.data.data || []);
      setTotal((res.data as { pagination?: { total?: number } }).pagination?.total ?? res.data.data?.length ?? 0);
    } catch (err) {
      console.error('Lỗi tải hợp đồng:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [stuRes, bedRes] = await Promise.all([
        studentApi.getAll({ limit: 500 }),
        bedApi.getAll({ status: 'AVAILABLE', limit: 200 }),
      ]);
      setStudents(stuRes.data.data || []);
      setAvailableBeds(bedRes.data.data || []);
    } catch (err) {
      console.error('Lỗi tải dropdown:', err);
    }
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);
  useEffect(() => { fetchDropdowns(); }, [fetchDropdowns]);

  // ── Stats ──────────────────────────────────────────────────────
  const activeCount = contracts.filter((c) => c.status === 'ACTIVE').length;
  const pendingCount = contracts.filter((c) => c.status === 'PENDING').length;
  const expiredCount = contracts.filter((c) => c.status === 'EXPIRED').length;
  const terminatedCount = contracts.filter((c) => c.status === 'TERMINATED').length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ── Close modal ────────────────────────────────────────────────
  const closeModal = () => {
    setModal(null);
    setSelectedContract(null);
    setSelectedStudent(null);
    setCreateForm(EMPTY_CREATE);
    setTransferForm({ studentId: '', newBedId: '', reason: '' });
    setEditForm({ price: '', deposit: '', monthlyFee: '' });
    setExtendForm({ endDate: '' });
    setFormError('');
  };

  // ── Create Contract ────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.studentId || !createForm.bedId || !createForm.startDate || !createForm.endDate) {
      setFormError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await contractApi.create({
        studentId: createForm.studentId,
        bedId: createForm.bedId,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        price: createForm.price ? Number(createForm.price) : undefined,
        deposit: createForm.deposit ? Number(createForm.deposit) : undefined,
        monthlyFee: createForm.monthlyFee ? Number(createForm.monthlyFee) : undefined,
      });
      closeModal();
      fetchContracts();
      fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi xảy ra khi tạo hợp đồng.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Check-In ───────────────────────────────────────────────────
  const [checkInForm, setCheckInForm] = useState({ studentId: '', bedId: '' });
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInForm.studentId || !checkInForm.bedId) {
      setFormError('Vui lòng chọn sinh viên và giường.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await contractApi.checkIn({ studentId: checkInForm.studentId, bedId: checkInForm.bedId });
      closeModal();
      fetchContracts();
      fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi xảy ra khi check-in.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Check-Out ──────────────────────────────────────────────────
  const handleCheckOut = async () => {
    if (!selectedContract) return;
    setIsSaving(true);
    setFormError('');
    try {
      await contractApi.checkOut({ contractId: selectedContract.id });
      closeModal();
      fetchContracts();
      fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi xảy ra khi check-out.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Terminate ──────────────────────────────────────────────────
  const handleTerminate = async () => {
    if (!selectedContract) return;
    setIsSaving(true);
    setFormError('');
    try {
      await contractApi.terminate(selectedContract.id);
      closeModal();
      fetchContracts();
      fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi kết thúc hợp đồng.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Transfer ───────────────────────────────────────────────────
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.studentId || !transferForm.newBedId) {
      setFormError('Vui lòng chọn sinh viên và giường mới.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await contractApi.transfer({
        studentId: transferForm.studentId,
        newBedId: transferForm.newBedId,
        reason: transferForm.reason,
      });
      closeModal();
      fetchContracts();
      fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi xảy ra khi chuyển giường.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setIsSaving(true); setFormError('');
    try {
      await contractApi.update(selectedContract.id, {
        price: editForm.price ? Number(editForm.price) : undefined,
        deposit: editForm.deposit ? Number(editForm.deposit) : undefined,
        monthlyFee: editForm.monthlyFee ? Number(editForm.monthlyFee) : undefined,
      });
      closeModal(); fetchContracts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi khi cập nhật hợp đồng');
    } finally { setIsSaving(false); }
  };

  // ── Extend ─────────────────────────────────────────────────────
  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    if (!extendForm.endDate) { setFormError('Vui lòng chọn ngày kết thúc mới'); return; }
    setIsSaving(true); setFormError('');
    try {
      await contractApi.extend(selectedContract.id, extendForm.endDate);
      closeModal(); fetchContracts();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi khi gia hạn hợp đồng');
    } finally { setIsSaving(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedContract) return;
    setIsSaving(true); setFormError('');
    try {
      await contractApi.delete(selectedContract.id);
      closeModal(); fetchContracts(); fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Có lỗi khi xóa hợp đồng');
    } finally { setIsSaving(false); }
  };

  // ── Approve/Reject ─────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    if (!window.confirm('Xác nhận duyệt hợp đồng này?')) return;
    setIsSaving(true);
    try {
      await contractApi.approve(id);
      fetchContracts();
      fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Lỗi khi duyệt hợp đồng');
    } finally { setIsSaving(false); }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Xác nhận từ chối hợp đồng này?')) return;
    setIsSaving(true);
    try {
      await contractApi.reject(id);
      fetchContracts();
      fetchDropdowns();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Lỗi khi từ chối hợp đồng');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="page">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1>Quản lý Hợp đồng</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Tạo, theo dõi và quản lý hợp đồng thuê giường cho sinh viên.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchContracts} disabled={isLoading}>
            Tải lại
          </button>
          <button className="btn btn-secondary" onClick={() => { setCheckInForm({ studentId: '', bedId: '' }); setFormError(''); setModal('checkin'); }}>
            ⬆ Check-in
          </button>
          <button className="btn btn-secondary" onClick={() => { setTransferForm({ studentId: '', newBedId: '', reason: '' }); setFormError(''); setModal('transfer'); }}>
            ↔ Chuyển giường
          </button>
          <button className="btn btn-primary" onClick={() => { setCreateForm(EMPTY_CREATE); setFormError(''); setModal('create'); }}>
            + Tạo hợp đồng
          </button>
        </div>
      </header>

      <main className="page-main">
        {/* ── Summary Pills ────────────────────────────────────── */}
        <div className="occupancy-summary">
          <div className="summary-pill">Tổng: <strong>{total}</strong></div>
          <div className="summary-pill summary-pill--green">Đang hiệu lực: <strong>{activeCount}</strong></div>
          <div className="summary-pill summary-pill--yellow">Chờ duyệt: <strong>{pendingCount}</strong></div>
          <div className="summary-pill">Hết hạn: <strong>{expiredCount}</strong></div>
          <div className="summary-pill summary-pill--red">Đã kết thúc: <strong>{terminatedCount}</strong></div>
        </div>

        {/* ── Filter Bar ───────────────────────────────────────── */}
        <div className="student-controls">
          <div className="student-filters">
            <div className="form-group student-select-filter" style={{ minWidth: 200 }}>
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hiệu lực</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="EXPIRED">Hết hạn</option>
                <option value="TERMINATED">Đã kết thúc</option>
              </select>
            </div>
          </div>
          {filterStatus && (
            <button className="btn btn-outline" onClick={() => { setFilterStatus(''); setPage(1); }}>
              Đặt lại
            </button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="loading-screen" style={{ minHeight: '35vh' }}>
            <div className="spinner" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📋</div>
            <h3>Không có hợp đồng nào</h3>
            <p>Hãy tạo hợp đồng mới hoặc thay đổi bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sinh viên</th>
                    <th>Giường / Phòng</th>
                    <th>Ngày bắt đầu</th>
                    <th>Ngày kết thúc</th>
                    <th>Tiền thuê</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract, idx) => {
                    const student = contract.student;
                    const bed = contract.bed;
                    const room = bed?.room;
                    const status = contract.status as ContractStatus;
                    return (
                      <tr key={contract.id}>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {(page - 1) * LIMIT + idx + 1}
                        </td>
                        <td>
                          {student ? (
                            <div 
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                const fullStudent = students.find(s => s.id === contract.studentId) || student;
                                setSelectedStudent(fullStudent);
                                setModal('student_info');
                              }}
                            >
                              <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{student.fullName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{student.studentCode}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>#{contract.studentId.slice(0, 8)}</span>
                          )}
                        </td>
                        <td>
                          {bed ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>Giường #{bed.bedNumber}</div>
                              {room && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Phòng {room.roomNumber}</div>}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>{fmtDate(contract.startDate)}</td>
                        <td>{fmtDate(contract.endDate)}</td>
                        <td style={{ fontWeight: 500 }}>{contract.monthlyFee ? fmtCurrency(contract.monthlyFee) : '—'}</td>
                        <td>
                          <span className={`badge ${STATUS_CLASS[status] ?? 'badge--other'}`}>
                            {STATUS_LABEL[status] ?? status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setSelectedContract(contract);
                                setModal('view');
                              }}
                            >
                              Xem
                            </button>
                            {status === 'ACTIVE' && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setEditForm({
                                      price: contract.price?.toString() || '',
                                      deposit: contract.deposit?.toString() || '',
                                      monthlyFee: contract.monthlyFee?.toString() || '',
                                    });
                                    setFormError(''); setModal('edit');
                                  }}
                                >Sửa</button>
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setExtendForm({ endDate: contract.endDate ? contract.endDate.substring(0,10) : '' });
                                    setFormError(''); setModal('extend');
                                  }}
                                >Gia hạn</button>
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setTransferForm({
                                      studentId: contract.studentId,
                                      newBedId: '',
                                      reason: '',
                                    });
                                    setFormError('');
                                    setModal('transfer');
                                  }}
                                >
                                  Chuyển
                                </button>
                                <button
                                  className="btn btn-sm btn-danger-outline"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setFormError('');
                                    setModal('checkout');
                                  }}
                                >
                                  Check-out
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => {
                                    setSelectedContract(contract);
                                    setFormError('');
                                    setModal('terminate');
                                  }}
                                >
                                  Kết thúc
                                </button>
                              </>
                            )}
                            {status === 'PENDING' && (
                              <>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleApprove(contract.id)}
                                  disabled={isSaving}
                                >
                                  Duyệt
                                </button>
                                <button
                                  className="btn btn-sm btn-danger-outline"
                                  onClick={() => handleReject(contract.id)}
                                  disabled={isSaving}
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ──────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← Trước
                </button>
                <span className="pagination-info">Trang {page} / {totalPages} · {total} hợp đồng</span>
                <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Tiếp →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── Student Info Modal ────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {modal === 'student_info' && selectedStudent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Thông tin Sinh viên</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Họ và tên:</span>
                  <strong style={{ color: 'var(--color-text)' }}>{selectedStudent.fullName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>MSSV:</span>
                  <strong style={{ color: 'var(--color-text)' }}>{selectedStudent.studentCode || selectedStudent.studentId}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Giới tính:</span>
                  <strong style={{ color: 'var(--color-text)' }}>
                    {selectedStudent.gender === 'MALE' ? 'Nam' : selectedStudent.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Ngày sinh:</span>
                  <strong style={{ color: 'var(--color-text)' }}>
                    {selectedStudent.dateOfBirth ? fmtDate(selectedStudent.dateOfBirth) : 'Chưa cập nhật'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Số điện thoại:</span>
                  <strong style={{ color: 'var(--color-text)' }}>{selectedStudent.phone || 'Chưa cập nhật'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Email:</span>
                  <strong style={{ color: 'var(--color-text)' }}>{selectedStudent.email}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Khoa/Chuyên ngành:</span>
                  <strong style={{ color: 'var(--color-text)' }}>
                    {selectedStudent.faculty || selectedStudent.major ? `${selectedStudent.faculty || ''} ${selectedStudent.major ? `- ${selectedStudent.major}` : ''}` : 'Chưa cập nhật'}
                  </strong>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={closeModal}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── View Contract Modal ─────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {modal === 'view' && selectedContract && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Chi tiết Hợp đồng</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative" id="printable-contract" style={{ backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
                <div className="h-2 bg-gradient-to-r from-primary via-secondary to-purple-500" style={{ backgroundImage: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)', height: '8px' }} />
                
                <div className="p-8 sm:p-12 space-y-8" style={{ padding: '2rem 3rem' }}>
                  {/* Header Brand */}
                  <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-800" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-xl font-black" style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem', fontWeight: 900 }}>
                        D
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white leading-tight" style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'white' }}>DormMS</h2>
                        <p className="text-xs text-slate-500 font-medium" style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Hệ thống Quản lý Ký túc xá</p>
                      </div>
                    </div>
                    <div className="sm:text-right space-y-1" style={{ textAlign: 'right' }}>
                      <span className={`badge ${STATUS_CLASS[selectedContract.status as ContractStatus] ?? 'badge--other'}`}>
                        {STATUS_LABEL[selectedContract.status as ContractStatus] ?? selectedContract.status}
                      </span>
                      <p className="text-xxs text-slate-500 font-mono tracking-wider pt-1" style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.5rem' }}>
                        MÃ HĐ: {selectedContract.id.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Service provider & dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.875rem', marginBottom: '2rem' }}>
                    <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đơn vị cung cấp</span>
                      <p className="font-bold text-white" style={{ margin: 0, fontWeight: 'bold' }}>Ban Quản lý Ký túc xá DormMS</p>
                      <p className="text-slate-400 text-xs" style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>123 Đường 3/2, Quận Ninh Kiều, Cần Thơ</p>
                      <p className="text-slate-400 text-xs" style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Hotline: 0292.123.456 · Email: support@dormitory.com</p>
                    </div>
                    
                    <div className="space-y-1 bg-slate-850/40 p-4 rounded-2xl border border-slate-800 text-xs" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '1rem', border: '1px solid #1e293b', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-slate-400" style={{ color: '#94a3b8' }}>Ngày tạo HĐ:</span>
                        <span className="font-semibold text-slate-300" style={{ color: '#cbd5e1' }}>{fmtDate(selectedContract.createdAt)}</span>
                      </div>
                      <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-slate-400" style={{ color: '#94a3b8' }}>Ngày bắt đầu:</span>
                        <span className="font-semibold text-slate-300" style={{ color: '#cbd5e1' }}>{fmtDate(selectedContract.startDate)}</span>
                      </div>
                      <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-slate-400" style={{ color: '#94a3b8' }}>Ngày kết thúc:</span>
                        <span className="font-semibold text-rose-400" style={{ color: '#fb7185' }}>{fmtDate(selectedContract.endDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Information Details */}
                  <div className="bg-slate-850/20 border border-slate-800 rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.2)', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', margin: 0 }}>Thông tin khách thuê</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Sinh viên</p>
                        <p className="font-bold text-white text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>{selectedContract.student?.fullName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Mã sinh viên</p>
                        <p className="font-bold text-white text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>{selectedContract.student?.studentCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Khoa / Chuyên ngành</p>
                        <p className="font-bold text-white text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>
                          {selectedContract.student?.faculty || selectedContract.student?.major ? `${selectedContract.student?.faculty || ''} ${selectedContract.student?.major ? `- ${selectedContract.student?.major}` : ''}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Khóa / Lớp học</p>
                        <p className="font-bold text-white text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>{selectedContract.student?.course || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-700/50 pt-4 grid grid-cols-2 md:grid-cols-4 gap-6" style={{ borderTop: '1px solid rgba(51, 65, 85, 0.5)', paddingTop: '1rem', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Phòng</p>
                        <p className="font-bold text-indigo-400 text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#818cf8', margin: 0 }}>Phòng {selectedContract.bed?.room?.roomNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Giường thuê</p>
                        <p className="font-bold text-indigo-400 text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#818cf8', margin: 0 }}>Giường #{selectedContract.bed?.bedNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Loại phòng</p>
                        <p className="font-bold text-white text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>{selectedContract.bed?.room?.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1" style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Thời hạn hợp đồng</p>
                        <p className="font-bold text-white text-sm" style={{ fontSize: '0.875rem', fontWeight: 'bold', margin: 0 }}>3 Tháng</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="overflow-hidden border border-slate-800 rounded-2xl" style={{ border: '1px solid #1e293b', borderRadius: '1rem', overflow: 'hidden', marginBottom: '2rem' }}>
                    <table className="w-full text-left text-sm" style={{ width: '100%', textAlign: 'left', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                      <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase" style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <tr>
                          <th className="px-6 py-4 font-semibold" style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Khoản phí</th>
                          <th className="px-6 py-4 font-semibold text-right" style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
                        <tr>
                          <td className="px-6 py-4 text-slate-200" style={{ padding: '1rem 1.5rem', color: '#e2e8f0', borderTop: '1px solid rgba(30, 41, 59, 0.6)' }}>Tiền thuê (3 tháng)</td>
                          <td className="px-6 py-4 text-slate-200 text-right font-medium" style={{ padding: '1rem 1.5rem', color: '#e2e8f0', textAlign: 'right', fontWeight: 500, borderTop: '1px solid rgba(30, 41, 59, 0.6)' }}>{fmtCurrency(selectedContract.monthlyFee)}</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-slate-200" style={{ padding: '1rem 1.5rem', color: '#e2e8f0', borderTop: '1px solid rgba(30, 41, 59, 0.6)' }}>Phí dịch vụ</td>
                          <td className="px-6 py-4 text-slate-200 text-right font-medium" style={{ padding: '1rem 1.5rem', color: '#e2e8f0', textAlign: 'right', fontWeight: 500, borderTop: '1px solid rgba(30, 41, 59, 0.6)' }}>{fmtCurrency(selectedContract.deposit)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="bg-slate-800/80 px-6 py-5 border-t border-slate-700" style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', padding: '1.25rem 1.5rem', borderTop: '1px solid #334155' }}>
                      <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TỔNG THANH TOÁN KHI NHẬN PHÒNG:</span>
                        <span className="text-xl font-black text-emerald-400" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>{fmtCurrency((selectedContract.monthlyFee || 0) + (selectedContract.deposit || 0))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 pt-8 mt-8 border-t border-slate-800" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: '2rem', marginTop: '2rem', borderTop: '1px solid #1e293b' }}>
                    <div className="text-center" style={{ textAlign: 'center' }}>
                      <p className="font-bold text-slate-300 mb-1" style={{ fontWeight: 'bold', color: '#cbd5e1', margin: '0 0 0.25rem 0' }}>Khách thuê phòng</p>
                      <p className="text-xs text-slate-500 mb-16" style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4rem' }}>(Ký và ghi rõ họ tên)</p>
                    </div>
                    <div className="text-center" style={{ textAlign: 'center' }}>
                      <p className="font-bold text-slate-300 mb-1" style={{ fontWeight: 'bold', color: '#cbd5e1', margin: '0 0 0.25rem 0' }}>Đại diện Ban Quản lý</p>
                      <p className="text-xs text-slate-500 mb-16" style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4rem' }}>(Ký, đóng dấu)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => window.print()}>🖨️ In Hợp đồng</button>
              <button className="btn btn-primary" onClick={closeModal}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* ── Create Contract Modal ────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════ */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Tạo hợp đồng mới</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sinh viên <span className="required">*</span></label>
                  <select className="form-control" value={createForm.studentId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, studentId: e.target.value }))} required>
                    <option value="">-- Chọn sinh viên --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.studentCode})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Giường (còn trống) <span className="required">*</span></label>
                  <select className="form-control" value={createForm.bedId}
                    onChange={(e) => setCreateForm((f) => ({ ...f, bedId: e.target.value }))} required>
                    <option value="">-- Chọn giường --</option>
                    {availableBeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        Giường #{b.bedNumber} — {b.room ? `Phòng ${b.room.roomNumber}` : b.roomId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ngày bắt đầu <span className="required">*</span></label>
                  <input type="date" className="form-control" value={createForm.startDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày kết thúc <span className="required">*</span></label>
                  <input type="date" className="form-control" value={createForm.endDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Giá hợp đồng (VNĐ)</label>
                  <input type="number" className="form-control" placeholder="0" min={0}
                    value={createForm.price}
                    onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tiền cọc (VNĐ)</label>
                  <input type="number" className="form-control" placeholder="0" min={0}
                    value={createForm.deposit}
                    onChange={(e) => setCreateForm((f) => ({ ...f, deposit: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tiền thuê / tháng (VNĐ)</label>
                  <input type="number" className="form-control" placeholder="0" min={0}
                    value={createForm.monthlyFee}
                    onChange={(e) => setCreateForm((f) => ({ ...f, monthlyFee: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Đang tạo...' : 'Tạo hợp đồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Check-In Modal ────────────────────────────────────── */}
      {modal === 'checkin' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⬆ Check-in sinh viên</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleCheckIn} className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <div className="form-group">
                <label className="form-label">Sinh viên <span className="required">*</span></label>
                <select className="form-control" value={checkInForm.studentId}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, studentId: e.target.value }))} required>
                  <option value="">-- Chọn sinh viên --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.studentCode})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Giường (còn trống) <span className="required">*</span></label>
                <select className="form-control" value={checkInForm.bedId}
                  onChange={(e) => setCheckInForm((f) => ({ ...f, bedId: e.target.value }))} required>
                  <option value="">-- Chọn giường --</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Giường #{b.bedNumber} — {b.room ? `Phòng ${b.room.roomNumber}` : b.roomId}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Đang check-in...' : 'Xác nhận check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Check-Out Confirm Modal ───────────────────────────── */}
      {modal === 'checkout' && selectedContract && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⬇ Check-out</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <p style={{ marginBottom: '1rem' }}>
                Xác nhận check-out cho sinh viên{' '}
                <strong>{selectedContract.student?.fullName ?? selectedContract.studentId}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Hành động này sẽ kết thúc hợp đồng và giải phóng giường.
              </p>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button className="btn btn-danger" onClick={handleCheckOut} disabled={isSaving}>
                  {isSaving ? 'Đang xử lý...' : 'Xác nhận check-out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Terminate Confirm Modal ───────────────────────────── */}
      {modal === 'terminate' && selectedContract && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Kết thúc hợp đồng</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <p style={{ marginBottom: '1rem' }}>
                Bạn có chắc muốn kết thúc hợp đồng của{' '}
                <strong>{selectedContract.student?.fullName ?? selectedContract.studentId}</strong> không?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Hành động này không thể hoàn tác.
              </p>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button className="btn btn-danger" onClick={handleTerminate} disabled={isSaving}>
                  {isSaving ? 'Đang xử lý...' : 'Xác nhận kết thúc'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Bed Modal ────────────────────────────────── */}
      {modal === 'transfer' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">↔ Chuyển giường</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleTransfer} className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <div className="form-group">
                <label className="form-label">Sinh viên <span className="required">*</span></label>
                <select className="form-control" value={transferForm.studentId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, studentId: e.target.value }))} required
                  disabled={!!selectedContract}>
                  <option value="">-- Chọn sinh viên đang ở --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.studentCode})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Giường mới (còn trống) <span className="required">*</span></label>
                <select className="form-control" value={transferForm.newBedId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, newBedId: e.target.value }))} required>
                  <option value="">-- Chọn giường mới --</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Giường #{b.bedNumber} — {b.room ? `Phòng ${b.room.roomNumber}` : b.roomId}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lý do chuyển</label>
                <input type="text" className="form-control" placeholder="Nhập lý do (tùy chọn)"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Đang chuyển...' : 'Xác nhận chuyển'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Contract Modal ─────────────────────────────────── */}
      {modal === 'edit' && selectedContract && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cập nhật hợp đồng</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleEdit} className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <div className="form-group">
                <label className="form-label">Giá hợp đồng (VNĐ)</label>
                <input type="number" className="form-control" placeholder="0" min={0}
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Tiền cọc (VNĐ)</label>
                <input type="number" className="form-control" placeholder="0" min={0}
                  value={editForm.deposit}
                  onChange={(e) => setEditForm((f) => ({ ...f, deposit: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Tiền thuê / tháng (VNĐ)</label>
                <input type="number" className="form-control" placeholder="0" min={0}
                  value={editForm.monthlyFee}
                  onChange={(e) => setEditForm((f) => ({ ...f, monthlyFee: e.target.value }))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Extend Contract Modal ───────────────────────────────── */}
      {modal === 'extend' && selectedContract && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Gia hạn hợp đồng</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleExtend} className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <div className="form-group">
                <label className="form-label">Ngày kết thúc mới <span className="required">*</span></label>
                <input type="date" className="form-control" value={extendForm.endDate}
                  onChange={(e) => setExtendForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : 'Gia hạn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────── */}
      {modal === 'delete' && selectedContract && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Xóa hợp đồng</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="alert alert-danger">{formError}</div>}
              <p style={{ marginBottom: '1rem' }}>
                Bạn có chắc muốn <strong>XÓA HOÀN TOÀN</strong> hợp đồng này khỏi hệ thống?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Hành động này không thể hoàn tác.
              </p>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={closeModal} disabled={isSaving}>Hủy</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={isSaving}>
                  {isSaving ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContractsPage;
