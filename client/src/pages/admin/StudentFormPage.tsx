import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentApi } from '@/api/student.api';
import { userApi } from '@/api/user.api';
import type { User, Student } from '@/types';
import './AdminUsersPage.css'; // Reuse high-quality styles from AdminUsersPage

const StudentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

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

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch student details if in edit mode
  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const response = await studentApi.getById(id);
        const s = response.data.data;
        setFormData({
          studentCode: s.studentCode || '',
          fullName: s.fullName || '',
          gender: s.gender || 'MALE',
          dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : '',
          email: s.email || '',
          phone: s.phone || '',
          faculty: s.faculty || '',
          major: s.major || '',
          course: s.course || '',
          emergencyContact: s.emergencyContact || '',
          emergencyPhone: s.emergencyPhone || '',
          status: s.status || 'ACTIVE',
          userId: s.userId || '',
        });
      } catch (err: any) {
        setErrorMsg('Không thể tải chi tiết sinh viên này.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Fetch eligible user accounts
  useEffect(() => {
    const fetchUsers = async () => {
      setIsUsersLoading(true);
      try {
        const response = await userApi.getAll({ role: 'STUDENT', limit: 100 });
        setAvailableUsers(response.data.data || []);
      } catch (err) {
        console.error('Không thể tải danh sách tài khoản người dùng:', err);
      } finally {
        setIsUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Frontend basic validations
    if (!formData.studentCode?.trim()) {
      setErrorMsg('Mã số sinh viên không được để trống.');
      return;
    }
    if (!formData.fullName?.trim()) {
      setErrorMsg('Họ và tên không được để trống.');
      return;
    }
    if (!formData.email?.trim()) {
      setErrorMsg('Email không được để trống.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.userId) {
        payload.userId = undefined;
      }
      if (!payload.dateOfBirth) {
        payload.dateOfBirth = undefined;
      }

      if (isEdit && id) {
        await studentApi.update(id, payload);
      } else {
        await studentApi.create(payload);
      }
      navigate('/admin/students');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin sinh viên.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen" style={{ minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>{isEdit ? 'Chỉnh sửa sinh viên' : 'Thêm sinh viên mới'}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {isEdit
              ? `Cập nhật thông tin chi tiết cho sinh viên ${formData.fullName}`
              : 'Nhập thông tin chi tiết để tạo mới một hồ sơ sinh viên mới.'}
          </p>
        </div>
      </header>

      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: '24px', color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="student-form-card" style={{ background: 'var(--color-surface)', padding: '32px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          
          {/* MSSV */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Mã sinh viên (MSSV) <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              name="studentCode"
              className="form-control"
              value={formData.studentCode}
              onChange={handleChange}
              placeholder="Ví dụ: SV202601"
              required
              disabled={isEdit} // Disable editing the unique studentCode for safety if needed, or allow edit if DB supports it. The prompt says studentCode unique.
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Họ và tên <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              name="fullName"
              className="form-control"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Ví dụ: Nguyễn Văn An"
              required
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Gender */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Giới tính <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              name="gender"
              className="form-control"
              value={formData.gender}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

          {/* Date of Birth */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Ngày sinh
            </label>
            <input
              type="date"
              name="dateOfBirth"
              className="form-control"
              value={formData.dateOfBirth}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Email <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              placeholder="student@example.com"
              required
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Số điện thoại
            </label>
            <input
              type="tel"
              name="phone"
              className="form-control"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Ví dụ: 0901234567"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Faculty */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Khoa
            </label>
            <input
              type="text"
              name="faculty"
              className="form-control"
              value={formData.faculty}
              onChange={handleChange}
              placeholder="Ví dụ: CNTT"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Major */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Ngành
            </label>
            <input
              type="text"
              name="major"
              className="form-control"
              value={formData.major}
              onChange={handleChange}
              placeholder="Ví dụ: Kỹ thuật phần mềm"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Course */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Khóa học
            </label>
            <input
              type="text"
              name="course"
              className="form-control"
              value={formData.course}
              onChange={handleChange}
              placeholder="Ví dụ: K18"
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Associated User Account */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Liên kết tài khoản người dùng
            </label>
            <select
              name="userId"
              className="form-control"
              value={formData.userId}
              onChange={handleChange}
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              <option value="">-- Không liên kết --</option>
              {isUsersLoading ? (
                <option disabled>Đang tải...</option>
              ) : (
                availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Emergency Contact */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Liên hệ khẩn cấp (Họ tên)
            </label>
            <input
              type="text"
              name="emergencyContact"
              className="form-control"
              value={formData.emergencyContact}
              onChange={handleChange}
              placeholder="Tên người thân..."
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Emergency Phone */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              SĐT liên hệ khẩn cấp
            </label>
            <input
              type="text"
              name="emergencyPhone"
              className="form-control"
              value={formData.emergencyPhone}
              onChange={handleChange}
              placeholder="SĐT người thân..."
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* Status */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Trạng thái hoạt động <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              name="status"
              className="form-control"
              value={formData.status}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            >
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="INACTIVE">Không hoạt động (INACTIVE)</option>
            </select>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/admin/students')}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentFormPage;
