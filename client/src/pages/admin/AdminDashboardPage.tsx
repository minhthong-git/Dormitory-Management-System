import React from 'react';

const AdminDashboardPage: React.FC = () => {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Admin Dashboard</h1>
      </header>
      <main className="page-main">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Tổng sinh viên</h3>
            <p className="stat-value">—</p>
          </div>
          <div className="stat-card">
            <h3>Tỷ lệ lấp đầy</h3>
            <p className="stat-value">—</p>
          </div>
          <div className="stat-card">
            <h3>Hợp đồng đang hoạt động</h3>
            <p className="stat-value">—</p>
          </div>
          <div className="stat-card">
            <h3>Hóa đơn quá hạn</h3>
            <p className="stat-value">—</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
