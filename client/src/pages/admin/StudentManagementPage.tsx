import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi, type StudentFilters } from '@/api/student.api';
import type { Student } from '@/types';
import './AdminUsersPage.css'; // Reuse high-quality styles from AdminUsersPage

const StudentManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // State for data
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchName, setSearchName] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Delete modal state
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch student data
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: StudentFilters = {
        page,
        limit,
        fullName: searchName.trim() || undefined,
        studentCode: searchCode.trim() || undefined,
        status: filterStatus || undefined,
      };
      const response = await studentApi.getAll(filters);
      setStudents(response.data.data || []);
      setTotal(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Lỗi tải danh sách sinh viên:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchName, searchCode, filterStatus]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle filter submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  // Reset filter values
  const handleResetFilters = () => {
    setSearchName('');
    setSearchCode('');
    setFilterStatus('');
    setPage(1);
  };

  // Trigger delete operation
  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await studentApi.delete(deletingStudent.id);
      setDeletingStudent(null);
      fetchStudents();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Không thể xóa sinh viên này. Vui lòng kiểm tra xem sinh viên có đang ở trong phòng hoặc có hợp đồng nào hoạt động hay không.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1>Quản lý Sinh viên</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Tra cứu, cập nhật hồ sơ, theo dõi trạng thái và phân phòng cho sinh viên ký túc xá.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/admin/students/new')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Thêm sinh viên
          </button>
        </div>
      </header>

      <main className="page-main">
        {/* ── Search & Filter Panel ──────────────────────────────── */}
        <form onSubmit={handleSearchSubmit} className="student-controls">
          <div className="student-filters">
            <div className="form-group student-search-input">
              <input
                type="text"
                placeholder="Tìm theo họ tên sinh viên..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="form-group student-search-input">
              <input
                type="text"
                placeholder="Tìm theo Mã số sinh viên (MSSV)..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
            </div>
            <div className="form-group student-select-filter">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Trạng thái (Tất cả)</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>
          </div>
          <div className="actions-cell" style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary">Lọc</button>
            {(searchName || searchCode || filterStatus) && (
              <button type="button" className="btn btn-outline" onClick={handleResetFilters}>
                Đặt lại
              </button>
            )}
          </div>
        </form>

        {/* ── Data Table ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="loading-screen" style={{ minHeight: '30vh' }}>
            <div className="spinner" />
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">👥</div>
            <h3>Không tìm thấy sinh viên nào</h3>
            <p style={{ marginTop: 8 }}>Vui lòng thử đổi bộ lọc hoặc thêm mới sinh viên.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SV</th>
                    <th>Họ và tên</th>
                    <th>Giới tính</th>
                    <th>Email</th>
                    <th>Điện thoại</th>
                    <th>Khoa / Ngành</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => navigate(`/admin/students/${student.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600 }}>{student.studentCode}</td>
                      <td>{student.fullName}</td>
                      <td>
                        <span className={`badge ${student.gender === 'MALE' ? 'badge--male' : (student.gender === 'FEMALE' ? 'badge--female' : 'badge--other')}`}>
                          {student.gender === 'MALE' ? 'Nam' : (student.gender === 'FEMALE' ? 'Nữ' : 'Khác')}
                        </span>
                      </td>
                      <td>{student.email}</td>
                      <td>{student.phone || '—'}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{student.faculty || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{student.major || '—'}</div>
                      </td>
                      <td>
                        <span className={`badge ${student.status === 'ACTIVE' ? 'badge--active' : 'badge--inactive'}`}>
                          {student.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end', display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => navigate(`/admin/students/${student.id}`)}
                          >
                            Chi tiết
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => navigate(`/admin/students/edit/${student.id}`)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setDeletingStudent(student)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </button>
                <span className="pagination-info" style={{ color: 'var(--color-text-muted)' }}>
                  Trang <strong>{page}</strong> / {totalPages} &nbsp;·&nbsp; Tổng cộng <strong>{total}</strong> sinh viên
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Tiếp →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Delete Confirmation Modal ─────────────────────────── */}
      {deletingStudent && (
        <div className="modal-backdrop" onClick={() => setDeletingStudent(null)}>
          <div className="modal-card modal-card--small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Xác nhận xóa sinh viên</h2>
              <button className="btn-icon" onClick={() => setDeletingStudent(null)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div className="modal-body">
              <p>Bạn có chắc chắn muốn xóa sinh viên <strong>{deletingStudent.fullName}</strong> ({deletingStudent.studentCode}) không?</p>
              <p style={{ marginTop: '8px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Hành động này không thể hoàn tác và chỉ có thể thực hiện nếu sinh viên không có hợp đồng hoạt động.</p>
              {deleteError && (
                <div className="alert alert-danger" style={{ marginTop: '16px', color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeletingStudent(null)} disabled={isDeleting}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={handleDeleteStudent} disabled={isDeleting}>
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagementPage;
