import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import type { AdminDashboardStats, StudentDashboardStats } from '@/api/dashboard.api';
import './DashboardPage.css';

// ── Helpers ────────────────────────────────────────────────────
const formatVND = (amount: number): string => {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return amount.toString();
};

const contractStatusLabel: Record<string, string> = {
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Đã hết hạn',
  TERMINATED: 'Đã chấm dứt',
};

const roomTypeLabel: Record<string, string> = {
  SINGLE: 'Phòng đơn',
  DOUBLE: 'Phòng đôi',
  QUAD: 'Phòng 4 người',
};

// ── Skeleton card ──────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="dash-stat-card dash-stat-card--skeleton">
    <div className="skel skel--label" />
    <div className="skel skel--value" />
    <div className="skel skel--trend" />
  </div>
);

// ── Admin section ──────────────────────────────────────────────
const AdminStats: React.FC<{ data: AdminDashboardStats; firstName: string }> = ({ data, firstName }) => {
  const stats = [
    { label: 'Tổng số phòng',     value: data.totalRooms,           icon: '🏠', accent: false },
    { label: 'Phòng đang thuê',   value: data.occupiedRooms,        icon: '🛏️', accent: false },
    { label: 'Phòng còn trống',   value: data.availableRooms,       icon: '🔓', accent: false },
    { label: 'Sinh viên đang ở',  value: data.totalStudents,        icon: '👥', accent: false },
    { label: 'Hợp đồng hiệu lực', value: data.activeContracts,      icon: '📋', accent: false },
    { label: 'Hóa đơn chờ TT',   value: data.pendingInvoices,      icon: '📄', accent: data.pendingInvoices > 0 },
    { label: 'Hóa đơn quá hạn',  value: data.overdueInvoices,      icon: '⚠️', accent: data.overdueInvoices > 0 },
    { label: 'Doanh thu tháng',   value: formatVND(data.monthlyRevenue) + ' ₫', icon: '💰', accent: false },
  ];

  return (
    <>
      <div className="dash-page__heading">
        <div>
          <h1 className="dash-page__title">Xin chào, {firstName} 👋</h1>
          <p className="dash-page__subtitle">Dưới đây là tổng quan tình hình ký túc xá hôm nay.</p>
        </div>
        <div className="dash-page__date" aria-label="Ngày hiện tại">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
      </div>

      <div className="dash-stats-grid">
        {stats.map((s) => (
          <article
            key={s.label}
            className={`dash-stat-card ${s.accent ? 'dash-stat-card--alert' : ''}`}
          >
            <div className="dash-stat-card__top">
              <span className="dash-stat-card__label">{s.label}</span>
              <span className="dash-stat-card__icon" aria-hidden="true">{s.icon}</span>
            </div>
            <p className="dash-stat-card__value">{s.value}</p>
          </article>
        ))}
      </div>

      <div className="dash-grid-2">
        <section className="dash-card">
          <h2 className="dash-card__title">Tổng quan phòng</h2>
          <div className="dash-room-bar">
            <div className="dash-room-bar__track">
              <div
                className="dash-room-bar__fill"
                style={{ width: `${data.totalRooms ? Math.round((data.occupiedRooms / data.totalRooms) * 100) : 0}%` }}
                aria-valuenow={data.occupiedRooms}
                aria-valuemax={data.totalRooms}
                role="progressbar"
              />
            </div>
            <div className="dash-room-bar__labels">
              <span>Đang thuê: <strong>{data.occupiedRooms}</strong></span>
              <span>Còn trống: <strong>{data.availableRooms}</strong></span>
              <span>Tổng: <strong>{data.totalRooms}</strong></span>
            </div>
            <p className="dash-room-bar__pct">
              Tỷ lệ lấp đầy:{' '}
              <strong>
                {data.totalRooms
                  ? Math.round((data.occupiedRooms / data.totalRooms) * 100)
                  : 0}%
              </strong>
            </p>
          </div>
        </section>

        <section className="dash-card">
          <h2 className="dash-card__title">Thao tác nhanh</h2>
          <div className="dash-quick-actions">
            {[
              { label: 'Thêm Phòng',         icon: '➕', href: '/admin/rooms'       },
              { label: 'Thêm Sinh viên',     icon: '👤', href: '/admin/students/new' },
              { label: 'Tạo Hóa đơn',       icon: '🧾', href: '/admin/invoices'    },
              { label: 'Xem Báo cáo',       icon: '📊', href: '/admin/reports'     },
              { label: 'Quản lý Sửa chữa', icon: '🔧', href: '/admin/maintenance' },
              { label: 'Cài đặt',            icon: '⚙️', href: '/admin/settings'   },
            ].map((a) => (
              <a key={a.label} href={a.href} className="dash-quick-action-btn">
                <span aria-hidden="true">{a.icon}</span>
                <span>{a.label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

// ── Student section ────────────────────────────────────────────
const StudentStats: React.FC<{ data: StudentDashboardStats; firstName: string }> = ({ data, firstName }) => {
  const totalUnpaid = (data.pendingInvoices ?? 0) + (data.overdueInvoices ?? 0);
  const hasRoom = !!data.myRoom;

  return (
    <>
      <div className="dash-page__heading">
        <div>
          <h1 className="dash-page__title">Xin chào, {firstName} 👋</h1>
          <p className="dash-page__subtitle">Tổng quan tình trạng phòng và dịch vụ của bạn.</p>
        </div>
        <div className="dash-page__date" aria-label="Ngày hiện tại">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
      </div>

      <div className="dash-stats-grid">
        <article className="dash-stat-card">
          <div className="dash-stat-card__top">
            <span className="dash-stat-card__label">Phòng của tôi</span>
            <span className="dash-stat-card__icon" aria-hidden="true">🚪</span>
          </div>
          <p className="dash-stat-card__value">
            {hasRoom ? `Phòng ${data.myRoom!.roomNumber}` : '—'}
          </p>
          {hasRoom && (
            <span className="dash-stat-card__sub">
              Tầng {data.myRoom!.floor} · {roomTypeLabel[data.myRoom!.type] ?? data.myRoom!.type}
            </span>
          )}
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-card__top">
            <span className="dash-stat-card__label">Hợp đồng</span>
            <span className="dash-stat-card__icon" aria-hidden="true">📋</span>
          </div>
          <p className="dash-stat-card__value">
            {data.contractStatus
              ? contractStatusLabel[data.contractStatus] ?? data.contractStatus
              : 'Chưa có'}
          </p>
          {data.activeContract && (
            <span className="dash-stat-card__sub">
              Hết hạn: {new Date(data.activeContract.endDate).toLocaleDateString('vi-VN')}
            </span>
          )}
        </article>

        <article className={`dash-stat-card ${totalUnpaid > 0 ? 'dash-stat-card--alert' : ''}`}>
          <div className="dash-stat-card__top">
            <span className="dash-stat-card__label">Hóa đơn chưa TT</span>
            <span className="dash-stat-card__icon" aria-hidden="true">📄</span>
          </div>
          <p className="dash-stat-card__value">{totalUnpaid}</p>
          {data.overdueInvoices > 0 && (
            <span className="dash-stat-card__trend dash-stat-card__trend--down">
              ⚠️ {data.overdueInvoices} quá hạn
            </span>
          )}
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-card__top">
            <span className="dash-stat-card__label">Tiền phòng / tháng</span>
            <span className="dash-stat-card__icon" aria-hidden="true">💰</span>
          </div>
          <p className="dash-stat-card__value">
            {hasRoom
              ? formatVND(data.myRoom!.pricePerMonth) + ' ₫'
              : '—'}
          </p>
        </article>
      </div>

      <div className="dash-grid-2">
        <section className="dash-card">
          <h2 className="dash-card__title">Thông tin phòng</h2>
          {hasRoom ? (
            <dl className="dash-room-detail">
              <div className="dash-room-detail__row">
                <dt>Số phòng</dt>
                <dd>Phòng {data.myRoom!.roomNumber}</dd>
              </div>
              <div className="dash-room-detail__row">
                <dt>Loại phòng</dt>
                <dd>{roomTypeLabel[data.myRoom!.type] ?? data.myRoom!.type}</dd>
              </div>
              <div className="dash-room-detail__row">
                <dt>Tầng</dt>
                <dd>Tầng {data.myRoom!.floor}</dd>
              </div>
              <div className="dash-room-detail__row">
                <dt>Giá thuê</dt>
                <dd>{data.myRoom!.pricePerMonth.toLocaleString('vi-VN')} ₫/tháng</dd>
              </div>
              {data.activeContract && (
                <>
                  <div className="dash-room-detail__row">
                    <dt>Bắt đầu</dt>
                    <dd>{new Date(data.activeContract.startDate).toLocaleDateString('vi-VN')}</dd>
                  </div>
                  <div className="dash-room-detail__row">
                    <dt>Kết thúc</dt>
                    <dd>{new Date(data.activeContract.endDate).toLocaleDateString('vi-VN')}</dd>
                  </div>
                </>
              )}
            </dl>
          ) : (
            <div className="dash-empty">
              <span>🏠</span>
              <p>Bạn chưa được phân phòng</p>
              <a href="/rooms" className="btn btn-primary" style={{ marginTop: 12, fontSize: '0.8rem', padding: '8px 18px' }}>
                Xem danh sách phòng
              </a>
            </div>
          )}
        </section>

        <section className="dash-card">
          <h2 className="dash-card__title">Thao tác nhanh</h2>
          <div className="dash-quick-actions">
            {[
              { label: 'Xem Phòng',        icon: '🚪', href: '/rooms'        },
              { label: 'Xem Hóa đơn',      icon: '📄', href: '/invoices'     },
              { label: 'Báo cáo sự cố',    icon: '🔧', href: '/report'       },
              { label: 'Hồ sơ cá nhân',   icon: '👤', href: '/profile'      },
            ].map((a) => (
              <a key={a.label} href={a.href} className="dash-quick-action-btn">
                <span aria-hidden="true">{a.icon}</span>
                <span>{a.label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

// ── Main page ──────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { stats, isLoading, error, refetch } = useDashboardStats();
  const firstName = user?.fullName?.split(' ').pop() ?? user?.fullName ?? 'Bạn';

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="dash-page">
        <div className="dash-page__heading">
          <div>
            <div className="skel skel--title" />
            <div className="skel skel--subtitle" />
          </div>
        </div>
        <div className="dash-stats-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="dash-page">
        <div className="dash-empty dash-empty--error">
          <span>⚠️</span>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={refetch} style={{ marginTop: 12 }}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── No data yet (shouldn't happen) ──────────────────────────
  if (!stats) return null;

  return (
    <div className="dash-page">
      {stats.role === 'ADMIN'
        ? <AdminStats data={stats as AdminDashboardStats} firstName={firstName} />
        : <StudentStats data={stats as StudentDashboardStats} firstName={firstName} />
      }
    </div>
  );
};

export default DashboardPage;
