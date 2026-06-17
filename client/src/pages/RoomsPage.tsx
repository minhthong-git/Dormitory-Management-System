import React, { useState, useEffect, useCallback } from 'react';
import { contractApi } from '@/api/contract.api';
import { bedApi } from '@/api/bed.api';
import type { Contract, Bed } from '@/types';
import './RoomsPage.css';

const RoomsPage: React.FC = () => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [roomBeds, setRoomBeds] = useState<Bed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyRoom = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active contract for the logged-in student
      const contractRes = await contractApi.getAll({ status: 'ACTIVE', limit: 1 });
      const activeContract = contractRes.data?.data?.[0];

      if (activeContract && activeContract.bed) {
        setContract(activeContract);
        // 2. Fetch all beds in the same room to show roommates/room layout
        const bedRes = await bedApi.getAll({ roomId: activeContract.bed.roomId, limit: 50 });
        setRoomBeds(bedRes.data?.data || []);
      } else {
        setContract(null);
      }
    } catch (err) {
      console.error('Lỗi tải thông tin phòng:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRoom();
  }, [fetchMyRoom]);

  const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—');
  const fmtCurrency = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  if (isLoading) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Phòng của tôi</h1>
        </header>
        <main className="page-main loading-container">
          <div className="spinner" />
        </main>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Phòng của tôi</h1>
        </header>
        <main className="page-main">
          <div className="empty-state">
            <div className="empty-state__icon">🛌</div>
            <h3>Bạn chưa có phòng</h3>
            <p>Hiện tại bạn không có hợp đồng thuê giường nào đang hoạt động.</p>
            <p>Vui lòng liên hệ Ban quản lý KTX để được sắp xếp.</p>
          </div>
        </main>
      </div>
    );
  }

  const { bed } = contract;
  const room = bed?.room;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Phòng của tôi</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Thông tin chi tiết về phòng ở, hợp đồng hiện tại và bạn cùng phòng.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchMyRoom}>Tải lại</button>
      </header>

      <main className="page-main">
        <div className="my-room-grid">
          {/* ── Room Information ────────────────────────────────────────── */}
          <div className="card room-info-card">
            <h2 className="card-title">🏠 Thông tin Phòng</h2>
            {room ? (
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Số phòng:</span>
                  <span className="info-value room-number">Phòng {room.roomNumber}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Tầng:</span>
                  <span className="info-value">Tầng {room.floor}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Loại phòng:</span>
                  <span className="info-value">
                    {room.type === 'SINGLE' ? 'Phòng đơn' : room.type === 'DOUBLE' ? 'Phòng đôi' : 'Phòng 4 người'} (Tối đa {room.capacity} người)
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Giường của bạn:</span>
                  <span className="info-value my-bed-highlight">Giường #{bed.bedNumber} ({bed.bedType})</span>
                </div>
              </div>
            ) : (
              <p>Không có thông tin phòng.</p>
            )}
          </div>

          {/* ── Contract Information ────────────────────────────────────── */}
          <div className="card contract-info-card">
            <h2 className="card-title">📄 Hợp đồng hiện tại</h2>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Thời hạn:</span>
                <span className="info-value">
                  {fmtDate(contract.startDate)} — {fmtDate(contract.endDate)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Giá thuê / tháng:</span>
                <span className="info-value font-weight-bold">{fmtCurrency(contract.monthlyFee)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tiền cọc:</span>
                <span className="info-value">{fmtCurrency(contract.deposit)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Trạng thái hợp đồng:</span>
                <span className="info-value">
                  <span className="badge badge--active">Đang hiệu lực</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Roommates / Room Layout ──────────────────────────────────── */}
        <div className="card roommates-card">
          <h2 className="card-title">👥 Sơ đồ giường & Bạn cùng phòng</h2>
          <div className="room-layout">
            {roomBeds.map((b) => {
              const isMyBed = b.id === contract.bedId;
              const activeC = b.contracts?.[0];
              const studentName = activeC?.student?.fullName;
              const studentCode = activeC?.student?.studentCode;

              let statusClass = 'bed-box--available';
              let statusText = 'Trống';

              if (b.status === 'OCCUPIED') {
                statusClass = isMyBed ? 'bed-box--mine' : 'bed-box--occupied';
                statusText = isMyBed ? 'Giường của bạn' : 'Có người ở';
              } else if (b.status === 'MAINTENANCE') {
                statusClass = 'bed-box--maintenance';
                statusText = 'Đang bảo trì';
              }

              return (
                <div key={b.id} className={`bed-box ${statusClass}`}>
                  <div className="bed-box__header">
                    <span className="bed-box__number">Giường #{b.bedNumber}</span>
                    <span className="bed-box__status">{statusText}</span>
                  </div>
                  <div className="bed-box__content">
                    {b.status === 'OCCUPIED' && studentName ? (
                      <div className="bed-box__student">
                        <div className="bed-box__student-name">{studentName}</div>
                        <div className="bed-box__student-code">{studentCode}</div>
                      </div>
                    ) : (
                      <div className="bed-box__empty-text">
                        {b.status === 'AVAILABLE' ? 'Chưa có ai ở' : 'Không thể sử dụng'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {roomBeds.length === 0 && <p className="text-muted">Đang tải sơ đồ giường...</p>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoomsPage;
