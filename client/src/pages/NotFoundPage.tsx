import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div className="error-page">
    <h1>404</h1>
    <p>Trang bạn tìm kiếm không tồn tại.</p>
    <Link to="/" className="btn btn-primary">
      Về trang chủ
    </Link>
  </div>
);

export default NotFoundPage;
