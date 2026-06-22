import React, { useState, useEffect, useCallback } from 'react';
import { contractApi } from '@/api/contract.api';
import { bedApi } from '@/api/bed.api';
import { roomApi } from '@/api/room.api';
import { useNavigate } from 'react-router-dom';
import type { Contract, Bed, Room } from '@/types';
import './RoomsPage.css';

const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [roomBeds, setRoomBeds] = useState<Bed[]>([]);
  
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isProfileMissing, setIsProfileMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyRoom = useCallback(async () => {
    setIsLoading(true);
    setIsProfileMissing(false);
    try {
      // 1. Fetch contracts
      const contractRes = await contractApi.getAll({ limit: 10 });
      const contracts = contractRes.data?.data || [];
      const currentContract = contracts.find(c => c.status === 'ACTIVE' || c.status === 'PENDING');

      if (currentContract) {
        setContract(currentContract);
        // Fetch beds in the room for layout
        if (currentContract.bed) {
          const bedRes = await bedApi.getAll({ roomId: currentContract.bed.roomId, limit: 50 });
          setRoomBeds(bedRes.data?.data || []);
        }
      } else {
        setContract(null);
        // User has no room, fetch available rooms
        await fetchAvailableRooms();
      }
    } catch (err: any) {
      console.error('Lỗi tải thông tin phòng:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableRooms = async () => {
    try {
      const res = await roomApi.getAvailable({ limit: 50 });
      setAvailableRooms(res.data?.data || []);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('hồ sơ')) {
        setIsProfileMissing(true);
      }
    }
  };

  useEffect(() => {
    fetchMyRoom();
  }, [fetchMyRoom]);

  const handleBookBed = async (bedId: string) => {
    if (isProfileMissing) {
      alert("Bạn cần hoàn thiện hồ sơ cá nhân trước khi thực hiện thuê phòng.");
      navigate('/profile');
      return;
    }
    
    if (window.confirm('Bạn có chắc chắn muốn đăng ký giường này?')) {
      try {
        await contractApi.book({ bedId });
        alert('Gửi yêu cầu đặt phòng thành công!');
        fetchMyRoom();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Có lỗi xảy ra');
      }
    }
  };

  const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—');
  const fmtCurrency = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  if (isLoading) {
    return (
      <div className="page">
        <header className="page-header"><h1>Phòng của tôi</h1></header>
        <main className="page-main loading-container"><div className="spinner" /></main>
      </div>
    );
  }

  // STATE 1 & 2: ACTIVE or PENDING
  if (contract) {
    const { bed, status } = contract;
    const room = bed?.room;

    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1>Phòng của tôi</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
              {status === 'PENDING' ? 'Yêu cầu của bạn đang được Ban Quản Lý xem xét.' : 'Thông tin chi tiết về phòng ở, hợp đồng hiện tại và bạn cùng phòng.'}
            </p>
          </div>
          <button className="btn btn-outline" onClick={fetchMyRoom}>Tải lại</button>
        </header>

        <main className="page-main">
          {status === 'PENDING' && (
            <div style={{ padding: '16px', backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#ffc107', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
              <strong style={{ color: '#ffc107' }}>⏳ Đang chờ duyệt:</strong> Yêu cầu thuê phòng của bạn đã được gửi. Vui lòng chờ Admin xác nhận. Bạn không thể đặt thêm phòng khác lúc này.
            </div>
          )}

          <div className="my-room-grid">
            {/* Room Info */}
            <div className="card room-info-card">
              <h2 className="card-title">🏠 Thông tin Phòng</h2>
              {room ? (
                <div className="info-list">
                  <div className="info-item">
                    <span className="info-label">Số phòng:</span>
                    <span className="info-value room-number">Phòng {room.roomNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Tầng / Loại:</span>
                    <span className="info-value">Tầng {room.floor} - {room.type === 'SMALL' ? 'Phòng nhỏ' : room.type === 'STANDARD' ? 'Phòng tiêu chuẩn' : 'Phòng đông'} (Tối đa {room.capacity} người)</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Giới tính:</span>
                    <span className="info-value">{room.genderType === 'FEMALE' ? 'Nữ' : 'Nam'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Giường của bạn:</span>
                    <span className="info-value my-bed-highlight">Giường #{bed.bedNumber} ({bed.bedType})</span>
                  </div>
                </div>
              ) : <p>Không có thông tin.</p>}
            </div>

            {/* Contract Info */}
            <div className="card contract-info-card">
              <h2 className="card-title">📄 Hợp đồng hiện tại</h2>
              <div className="info-list">
                <div className="info-item">
                  <span className="info-label">Thời hạn (Dự kiến):</span>
                  <span className="info-value">{fmtDate(contract.startDate)} — {fmtDate(contract.endDate)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Giá thuê / tháng:</span>
                  <span className="info-value font-weight-bold">{fmtCurrency(contract.monthlyFee)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Trạng thái:</span>
                  <span className="info-value">
                    <span className={`badge ${status === 'ACTIVE' ? 'badge--active' : 'badge--pending'}`} style={status === 'PENDING' ? { backgroundColor: '#ffc107', color: '#000' } : {}}>
                      {status === 'ACTIVE' ? 'Đang hiệu lực' : 'Chờ duyệt'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Roommates */}
          <div className="card roommates-card">
            <h2 className="card-title">👥 Sơ đồ giường</h2>
            <div className="room-layout">
              {roomBeds.map((b) => {
                const isMyBed = b.id === contract.bedId;
                const activeC = b.contracts?.find(c => c.status === 'ACTIVE' || c.status === 'PENDING');
                const studentName = activeC?.student?.fullName;

                let statusClass = 'bed-box--available';
                let statusText = 'Trống';

                if (isMyBed) {
                  statusClass = 'bed-box--mine';
                  statusText = 'Giường của bạn';
                } else if (b.status === 'OCCUPIED') {
                  statusClass = 'bed-box--occupied';
                  statusText = 'Có người ở';
                } else if (b.status === 'RESERVED') {
                  statusClass = 'bed-box--pending';
                  statusText = 'Đã được đặt';
                } else if (b.status === 'MAINTENANCE') {
                  statusClass = 'bed-box--maintenance';
                  statusText = 'Bảo trì';
                }

                return (
                  <div key={b.id} className={`bed-box ${statusClass}`}>
                    <div className="bed-box__header">
                      <span className="bed-box__number">Giường #{b.bedNumber}</span>
                      <span className="bed-box__status">{statusText}</span>
                    </div>
                    <div className="bed-box__content">
                      {(b.status === 'OCCUPIED' || b.status === 'RESERVED') && studentName ? (
                        <div className="bed-box__student">
                          <div className="bed-box__student-name">{studentName}</div>
                        </div>
                      ) : (
                        <div className="bed-box__empty-text">{b.status === 'AVAILABLE' ? 'Chưa có ai ở' : ''}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // STATE 3: No Contract -> Show available rooms
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Đăng ký phòng KTX</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Danh sách các phòng đang còn giường trống phù hợp với bạn.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchMyRoom}>Tải lại</button>
      </header>

      <main className="page-main">
        {isProfileMissing && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#ffc107', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ Bạn cần hoàn thiện hồ sơ cá nhân (Cập nhật Giới tính, MSSV) trước khi hệ thống có thể gợi ý phòng phù hợp.</span>
            <button className="btn btn-primary" onClick={() => navigate('/profile')}>Hoàn thiện hồ sơ ngay</button>
          </div>
        )}

        {availableRooms.length === 0 && !isProfileMissing ? (
          <div className="empty-state">
            <div className="empty-state__icon">🛌</div>
            <h3>Không có phòng trống</h3>
            <p>Hiện tại không có phòng nào phù hợp với yêu cầu của bạn.</p>
          </div>
        ) : (
          <div className="available-rooms-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {availableRooms.map(room => (
              <div key={room.id} className="card room-booking-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-primary)' }}>Phòng {room.roomNumber} - Tầng {room.floor}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      Tòa: {room.building?.name || 'N/A'} • Loại: {room.type === 'SMALL' ? 'Phòng nhỏ' : room.type === 'STANDARD' ? 'Phòng tiêu chuẩn' : 'Phòng đông'} ({room.capacity} người) • Giới tính: {room.genderType === 'FEMALE' ? 'Nữ' : 'Nam'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-text)' }}>{fmtCurrency(room.pricePerMonth)}/tháng</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Đang ở: {room.currentOccupancy}/{room.capacity}</div>
                  </div>
                </div>
                
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--color-text)' }}>Chọn giường trống:</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {room.beds?.map(bed => (
                      <button 
                        key={bed.id} 
                        className="btn btn-outline" 
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer' }}
                        onClick={() => handleBookBed(bed.id)}
                      >
                        <span style={{ fontWeight: 'bold' }}>Giường #{bed.bedNumber}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{bed.bedType}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '4px' }}>👉 Đặt ngay</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RoomsPage;
