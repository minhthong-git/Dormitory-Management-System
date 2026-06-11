import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => (
  <div className="error-page">
    <h1>403</h1>
    <p>Bạn không có quyền truy cập trang này.</p>
    <Link to="/dashboard" className="btn btn-primary">
      Về Dashboard
    </Link>
  </div>
);

export default UnauthorizedPage;
