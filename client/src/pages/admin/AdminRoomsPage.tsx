import React from 'react';

const AdminRoomsPage: React.FC = () => {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Quản lý Phòng</h1>
        <div className="header-actions">
          <button className="btn btn-primary">+ Thêm phòng</button>
        </div>
      </header>
      <main className="page-main">
        <p style={{ color: 'var(--color-text-muted)' }}>Chức năng đang được phát triển.</p>
      </main>
    </div>
  );
};

export default AdminRoomsPage;
