import React, { useState, useEffect, useCallback } from 'react';
import { studentApi, type StudentFilters } from '@/api/student.api';
import type { Student } from '@/types';
import './AdminUsersPage.css';

const AdminUsersPage: React.FC = () => {
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

  // Active student for detail / edit / delete
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modal Dialogs visibility
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<Student>>({
    studentCode: '',
    fullName: '',
    gender: 'MALE',
    dateOfBirth: '',
    email: '',
    phone: '',
    faculty: '',
    major: '',
    course: '',
    emergencyContact: '',
    emergencyPhone: '',
    status: 'ACTIVE',
    userId: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load students data
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: StudentFilters = {
        page,
        limit,
        fullName: searchName || undefined,
        studentCode: searchCode || undefined,
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

  // Handle filter changes (Reset page to 1 on filter change)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleResetFilters = () => {
    setSearchName('');
    setSearchCode('');
    setFilterStatus('');
    setPage(1);
  };

  // Form fields change handler
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Open add modal
  const openAddModal = () => {
    setFormData({
      studentCode: '',
      fullName: '',
      gender: 'MALE',
      dateOfBirth: '',
      email: '',
      phone: '',
      faculty: '',
      major: '',
      course: '',
      emergencyContact: '',
      emergencyPhone: '',
      status: 'ACTIVE',
      userId: '',
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  // Handle create student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      // Validate optional userId UUID
      const payload = { ...formData };
      if (!payload.userId) {
        delete payload.userId;
      }
      if (!payload.dateOfBirth) {
        delete payload.dateOfBirth;
      }
      await studentApi.create(payload);
      setIsAddOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Đã xảy ra lỗi khi tạo sinh viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit modal
  const openEditModal = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop row click
    setSelectedStudent(student);
    setFormData({
      studentCode: student.studentCode,
      fullName: student.fullName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
      email: student.email,
      phone: student.phone || '',
      faculty: student.faculty || '',
      major: student.major || '',
      course: student.course || '',
      emergencyContact: student.emergencyContact || '',
      emergencyPhone: student.emergencyPhone || '',
      status: student.status,
      userId: student.userId || '',
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  // Handle edit student
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload: any = { ...formData };
      if (!payload.userId) {
        payload.userId = null; // Send null to clear linkage in DB
      }
      if (!payload.dateOfBirth) {
        payload.dateOfBirth = null; // Send null to clear DOB in DB
      }
      await studentApi.update(selectedStudent.id, payload);
      setIsEditOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Đã xảy ra lỗi khi cập nhật sinh viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open delete confirmation
  const openDeleteModal = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setFormError(null);
    setIsDeleteOpen(true);
  };

  // Handle delete student
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await studentApi.delete(selectedStudent.id);
      setIsDeleteOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Không thể xóa sinh viên');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open details drawer
  const openDetailDrawer = (student: Student) => {
    setSelectedStudent(student);
    setIsDrawerOpen(true);
  };

  return (
    <div className="page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1>Quản lý Sinh viên</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Thêm mới, cập nhật hồ sơ, liên kết tài khoản và xem chi tiết sinh viên ký túc xá.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
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
        <form onSubmit={handleSearch} className="student-controls">
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
          <div className="actions-cell">
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
            <p style={{ marginTop: 8 }}>Vui lòng thay đổi bộ lọc hoặc thêm mới sinh viên.</p>
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
                      onClick={() => openDetailDrawer(student)}
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
                          {student.status === 'ACTIVE' ? 'Hoạt động' : 'Khóa'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn-icon"
                            onClick={(e) => openEditModal(student, e)}
                            title="Chỉnh sửa hồ sơ"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="btn-icon btn-icon--danger"
                            onClick={(e) => openDeleteModal(student, e)}
                            title="Xóa sinh viên"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ──────────────────────────────────────── */}
            <div className="pagination-container">
              <span>Hiển thị tối đa {limit} sinh viên / trang (Tổng cộng: <strong>{total}</strong>)</span>
              <div className="actions-cell">
                <button
                  className="btn btn-outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trở lại
                </button>
                <span>Trang {page} / {totalPages}</span>
                <button
                  className="btn btn-outline"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Tiếp theo
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── ADD MODAL ─────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Thêm Sinh viên Mới</h2>
              <button className="btn-icon" onClick={() => setIsAddOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">
                {formError && <div className="form-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="studentCode">Mã số sinh viên (MSSV) *</label>
                    <input
                      id="studentCode"
                      type="text"
                      name="studentCode"
                      value={formData.studentCode}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fullName">Họ và tên *</label>
                    <input
                      id="fullName"
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gender">Giới tính *</label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleFormChange} required>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="dateOfBirth">Ngày sinh</label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email liên hệ *</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Số điện thoại</label>
                    <input
                      id="phone"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="faculty">Khoa</label>
                    <input
                      id="faculty"
                      type="text"
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleFormChange}
                      placeholder="VD: CNTT"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="major">Ngành</label>
                    <input
                      id="major"
                      type="text"
                      name="major"
                      value={formData.major}
                      onChange={handleFormChange}
                      placeholder="VD: Kỹ thuật phần mềm"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="course">Khóa học</label>
                    <input
                      id="course"
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleFormChange}
                      placeholder="VD: K18"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="status">Trạng thái hồ sơ</label>
                    <select id="status" name="status" value={formData.status} onChange={handleFormChange}>
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Khóa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyContact">Người liên hệ khẩn cấp</label>
                    <input
                      id="emergencyContact"
                      type="text"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="emergencyPhone">SĐT khẩn cấp</label>
                    <input
                      id="emergencyPhone"
                      type="text"
                      name="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="userId">Liên kết User ID (Không bắt buộc)</label>
                    <input
                      id="userId"
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={handleFormChange}
                      placeholder="Nhập ID tài khoản User để đồng bộ đăng nhập nếu có"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Thêm sinh viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────── */}
      {isEditOpen && selectedStudent && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Chỉnh sửa hồ sơ: {selectedStudent.fullName}</h2>
              <button className="btn-icon" onClick={() => setIsEditOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleEditStudent}>
              <div className="modal-body">
                {formError && <div className="form-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="edit_studentCode">Mã số sinh viên (MSSV) *</label>
                    <input
                      id="edit_studentCode"
                      type="text"
                      name="studentCode"
                      value={formData.studentCode}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_fullName">Họ và tên *</label>
                    <input
                      id="edit_fullName"
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_gender">Giới tính *</label>
                    <select id="edit_gender" name="gender" value={formData.gender} onChange={handleFormChange} required>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_dateOfBirth">Ngày sinh</label>
                    <input
                      id="edit_dateOfBirth"
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_email">Email liên hệ *</label>
                    <input
                      id="edit_email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_phone">Số điện thoại</label>
                    <input
                      id="edit_phone"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_faculty">Khoa</label>
                    <input
                      id="edit_faculty"
                      type="text"
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_major">Ngành</label>
                    <input
                      id="edit_major"
                      type="text"
                      name="major"
                      value={formData.major}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_course">Khóa học</label>
                    <input
                      id="edit_course"
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_status">Trạng thái hồ sơ</label>
                    <select id="edit_status" name="status" value={formData.status} onChange={handleFormChange}>
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Khóa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_emergencyContact">Người liên hệ khẩn cấp</label>
                    <input
                      id="edit_emergencyContact"
                      type="text"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit_emergencyPhone">SĐT khẩn cấp</label>
                    <input
                      id="edit_emergencyPhone"
                      type="text"
                      name="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="edit_userId">Liên kết User ID (Không bắt buộc)</label>
                    <input
                      id="edit_userId"
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ────────────────────────────────────────── */}
      {isDeleteOpen && selectedStudent && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--small">
            <div className="modal-header">
              <h2>Xóa sinh viên</h2>
              <button className="btn-icon" onClick={() => setIsDeleteOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="form-error-banner" style={{ marginBottom: 16 }}>{formError}</div>}
              <p>Bạn có chắc chắn muốn xóa sinh viên <strong>{selectedStudent.fullName}</strong> ({selectedStudent.studentCode}) không?</p>
              <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: 12 }}>
                ⚠️ Lưu ý: Thao tác này không thể hoàn tác và chỉ có thể thực hiện nếu sinh viên không có hợp đồng thuê phòng đang hoạt động.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>Hủy</button>
              <button className="btn btn-danger" onClick={handleDeleteStudent} disabled={isSubmitting}>
                {isSubmitting ? 'Đang xóa...' : 'Xóa ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL DRAWER ───────────────────────────────────────── */}
      {isDrawerOpen && selectedStudent && (
        <>
          <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <h2>Chi Tiết Sinh Viên</h2>
              <button className="btn-icon" onClick={() => setIsDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
                <div className="drawer-avatar">
                  {selectedStudent.fullName.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedStudent.fullName}</h3>
                <span className="user-badge" style={{ marginTop: 6 }}>{selectedStudent.studentCode}</span>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Thông tin cơ bản</h4>
                <div className="drawer-grid">
                  <div className="drawer-item">
                    <span className="drawer-item-label">Giới tính</span>
                    <span className="drawer-item-value">{selectedStudent.gender === 'MALE' ? 'Nam' : (selectedStudent.gender === 'FEMALE' ? 'Nữ' : 'Khác')}</span>
                  </div>
                  <div className="drawer-item">
                    <span className="drawer-item-label">Ngày sinh</span>
                    <span className="drawer-item-value">
                      {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div className="drawer-item">
                    <span className="drawer-item-label">Email</span>
                    <span className="drawer-item-value">{selectedStudent.email}</span>
                  </div>
                  <div className="drawer-item">
                    <span className="drawer-item-label">Số điện thoại</span>
                    <span className="drawer-item-value">{selectedStudent.phone || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Học tập</h4>
                <div className="drawer-grid">
                  <div className="drawer-item">
                    <span className="drawer-item-label">Khoa</span>
                    <span className="drawer-item-value">{selectedStudent.faculty || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="drawer-item">
                    <span className="drawer-item-label">Ngành học</span>
                    <span className="drawer-item-value">{selectedStudent.major || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="drawer-item">
                    <span className="drawer-item-label">Khóa học</span>
                    <span className="drawer-item-value">{selectedStudent.course || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Liên hệ khẩn cấp</h4>
                <div className="drawer-grid">
                  <div className="drawer-item">
                    <span className="drawer-item-label">Tên người liên hệ</span>
                    <span className="drawer-item-value">{selectedStudent.emergencyContact || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="drawer-item">
                    <span className="drawer-item-label">Số điện thoại khẩn cấp</span>
                    <span className="drawer-item-value">{selectedStudent.emergencyPhone || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <h4 className="drawer-section-title">Hệ thống</h4>
                <div className="drawer-grid">
                  <div className="drawer-item">
                    <span className="drawer-item-label">Trạng thái hồ sơ</span>
                    <span className="drawer-item-value">
                      <span className={`badge ${selectedStudent.status === 'ACTIVE' ? 'badge--active' : 'badge--inactive'}`}>
                        {selectedStudent.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </span>
                  </div>
                  <div className="drawer-item">
                    <span className="drawer-item-label">Đồng bộ Tài khoản (User ID)</span>
                    <span className="drawer-item-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                      {selectedStudent.userId || 'Chưa liên kết'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUsersPage;
