import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './DashboardLayout.css';

const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`dms-layout ${collapsed ? 'dms-layout--collapsed' : ''}`}>
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
      />

      <div className="dms-layout__body">
        <Header
          onMenuToggle={() => setMobileOpen(v => !v)}
          sidebarCollapsed={collapsed}
        />
        <main id="main-content" className="dms-layout__main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
