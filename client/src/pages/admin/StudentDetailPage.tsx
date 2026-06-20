import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentApi } from '@/api/student.api';
import type { Student } from '@/types';
import './AdminUsersPage.css'; // Reuse high-quality styles from AdminUsersPage

const StudentDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const response = await studentApi.getById(id);
        setStudent(response.data.data);
      } catch (err: any) {
        setErrorMsg('Không thể tải thông tin chi tiết sinh viên.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="loading-screen" style={{ minHeight: '50vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (errorMsg || !student) {
    return (
      <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="alert alert-danger" style={{ padding: '24px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <h3>⚠️ Lỗi</h3>
          <p style={{ marginTop: '8px' }}>{errorMsg || 'Không tìm thấy thông tin sinh viên.'}</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/admin/students')}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1>Hồ sơ sinh viên</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Chi tiết thông tin cá nhân và học tập của sinh viên <strong>{student.fullName}</strong>.
          </p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('/admin/students')}>
            Quay lại
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/admin/students/edit/${student.id}`)}>
            Sửa hồ sơ
          </button>
        </div>
      </header>

      {/* ── Detail Container ───────────────────────────────────── */}
      <div className="student-detail-card" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        
        {/* Card Top Banner / Summary */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 600 }}>
            {student.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>{student.fullName}</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>MSSV: <strong>{student.studentCode}</strong></span>
              <span style={{ width: '4px', height: '4px', background: 'var(--color-text-muted)', borderRadius: 'var(--radius-full)' }}></span>
              <span className={`badge ${student.status === 'ACTIVE' ? 'badge--active' : 'badge--inactive'}`}>
                {student.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Main Body */}
        <div style={{ padding: '32px' }}>
          
          {/* Section 1: Thông tin cá nhân */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
            Thông tin cá nhân
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', marginBottom: '32px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Giới tính</span>
              <span style={{ fontWeight: 500 }}>
                {student.gender === 'MALE' ? 'Nam' : (student.gender === 'FEMALE' ? 'Nữ' : 'Khác')}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Ngày sinh</span>
              <span style={{ fontWeight: 500 }}>
                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Email</span>
              <span style={{ fontWeight: 500 }}>{student.email}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Số điện thoại</span>
              <span style={{ fontWeight: 500 }}>{student.phone || '—'}</span>
            </div>
          </div>

          {/* Section 2: Thông tin học tập */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
            Thông tin học tập
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', marginBottom: '32px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Khoa</span>
              <span style={{ fontWeight: 500 }}>{student.faculty || '—'}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Chuyên ngành</span>
              <span style={{ fontWeight: 500 }}>{student.major || '—'}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Khóa học / Niên khóa</span>
              <span style={{ fontWeight: 500 }}>{student.course || '—'}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tài khoản liên kết</span>
              <span style={{ fontWeight: 500 }}>
                {student.userId ? 'Đã liên kết tài khoản hệ thống' : 'Chưa liên kết'}
              </span>
            </div>
          </div>

          {/* Section 3: Liên hệ khẩn cấp */}
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '16px' }}>
            Liên hệ khẩn cấp
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', marginBottom: '16px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Họ tên người liên hệ</span>
              <span style={{ fontWeight: 500 }}>{student.emergencyContact || '—'}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Số điện thoại khẩn cấp</span>
              <span style={{ fontWeight: 500 }}>{student.emergencyPhone || '—'}</span>
            </div>
          </div>

        </div>

        {/* Card Footer (Metadata) */}
        <div style={{ background: 'rgba(0, 0, 0, 0.05)', padding: '16px 32px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <span>Tạo ngày: {new Date(student.createdAt).toLocaleString('vi-VN')}</span>
          <span>Cập nhật cuối: {new Date(student.updatedAt).toLocaleString('vi-VN')}</span>
        </div>

      </div>
    </div>
  );
};

export default StudentDetailPage;
