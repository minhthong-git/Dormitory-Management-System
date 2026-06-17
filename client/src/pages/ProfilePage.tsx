import React from 'react';
import { useAuth } from '@/context/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Hồ sơ cá nhân</h1>
      </header>
      <main className="page-main">
        <div className="stat-card" style={{ maxWidth: '480px' }}>
          <h3>Thông tin tài khoản</h3>
          <p style={{ marginTop: '12px' }}><strong>Họ tên:</strong> {user?.fullName}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Vai trò:</strong> {user?.role}</p>
          {user?.studentId && <p><strong>MSSV:</strong> {user.studentId}</p>}
          {user?.phone && <p><strong>SĐT:</strong> {user.phone}</p>}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
