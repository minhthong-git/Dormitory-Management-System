import React, { useState, useEffect, useCallback } from 'react';
import { contractApi } from '@/api/contract.api';
import { bedApi } from '@/api/bed.api';
import { roomApi } from '@/api/room.api';
import { assetApi } from '@/api/asset.api';
import { useNavigate } from 'react-router-dom';
import type { Contract, Bed, Room, Asset } from '@/types';
import './RoomsPage.css';

const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [roomBeds, setRoomBeds] = useState<Bed[]>([]);
  const [roomAssets, setRoomAssets] = useState<Asset[]>([]);
  
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
      const currentContract = contracts.find(c => c.status === 'ACTIVE' || c.status === 'PENDING' || c.status === 'AWAITING_PAYMENT');

      if (currentContract) {
        setContract(currentContract);
        // Fetch beds and assets in the room for layout
        if (currentContract.bed) {
          const roomId = currentContract.bed.roomId;
          const [bedRes, assetRes] = await Promise.all([
            bedApi.getAll({ roomId, limit: 50 }),
            assetApi.getAll({ roomId, limit: 100 })
          ]);
          setRoomBeds(bedRes.data?.data || []);
          setRoomAssets(assetRes.data?.data || []);
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
    
    if (window.confirm('Bạn có chắc chắn muốn đăng ký giường này cho 1 học kỳ (3 tháng) không?')) {
      try {
        await contractApi.book({ bedId });
        alert('Gửi yêu cầu đặt phòng thành công!');
        fetchMyRoom();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Có lỗi xảy ra');
      }
    }
  };

  const handleRenew = async () => {
    if (!contract) return;
    if (window.confirm('Hợp đồng của bạn sắp hết hạn. Bạn có chắc chắn muốn ưu tiên gia hạn thêm 1 học kỳ (3 tháng) không? Quá trình này sẽ tạo hóa đơn gia hạn.')) {
      try {
        await contractApi.renew(contract.id);
        alert('Đã gửi yêu cầu gia hạn! Vui lòng thanh toán hóa đơn trong vòng 3 ngày.');
        fetchMyRoom();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Có lỗi xảy ra');
      }
    }
  };

  const handleCancelContract = async () => {
    if (!contract) return;
    if (window.confirm('Bạn có chắc chắn muốn hủy yêu cầu đặt phòng này? Mọi thông tin hợp đồng và hóa đơn chờ thanh toán sẽ bị hủy.')) {
      try {
        await contractApi.cancel(contract.id);
        alert('Hủy yêu cầu thành công!');
        fetchMyRoom();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Có lỗi xảy ra khi hủy yêu cầu');
      }
    }
  };

  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };
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
          {status === 'AWAITING_PAYMENT' && (
            <div style={{ padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <strong style={{ color: '#3b82f6' }}>⏳ Chờ thanh toán:</strong> Yêu cầu thuê phòng của bạn đã được duyệt. Vui lòng thanh toán hóa đơn trong thời gian 10 phút để hoàn tất đặt phòng.
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
                    <span className={`badge ${status === 'ACTIVE' ? 'badge--active' : 'badge--pending'}`} style={status === 'PENDING' ? { backgroundColor: '#ffc107', color: '#000' } : status === 'AWAITING_PAYMENT' ? { backgroundColor: '#3b82f6', color: '#fff' } : {}}>
                      {status === 'ACTIVE' ? 'Đang hiệu lực' : status === 'AWAITING_PAYMENT' ? 'Chờ thanh toán' : 'Chờ duyệt'}
                    </span>
                  </span>
                </div>
                {(status === 'PENDING' || status === 'AWAITING_PAYMENT') && (
                  <div className="info-item" style={{ marginTop: '16px' }}>
                    <button className="btn btn-outline" onClick={handleCancelContract} style={{ width: '100%', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                      Hủy đăng ký phòng
                    </button>
                  </div>
                )}
                {contract.renewalStatus === 'PRIORITY' && (
                  <div className="info-item" style={{ marginTop: '16px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', width: '100%' }}>
                      <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>
                        ⏳ Hợp đồng sắp hết hạn! Bạn đang trong thời gian ưu tiên giữ chỗ cho học kỳ tới.
                      </p>
                      <button className="btn btn-primary" onClick={handleRenew} style={{ width: '100%' }}>
                        Gia hạn ngay (3 tháng)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Room Assets Info */}
            <div className="card room-assets-card">
              <h2 className="card-title">📺 Tài sản trong phòng</h2>
              <div className="asset-list">
                {roomAssets.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    Chưa có thiết bị nào được ghi nhận cho phòng này.
                  </p>
                ) : (
                  roomAssets.map(asset => {
                    const statusColors: any = {
                      GOOD: 'var(--color-success)',
                      DAMAGED: 'var(--color-danger)',
                      REPAIRING: 'var(--color-warning)',
                      REPLACED: 'var(--color-text-muted)'
                    };
                    const statusLabels: any = {
                      GOOD: 'Tốt',
                      DAMAGED: 'Hỏng hóc',
                      REPAIRING: 'Đang sửa',
                      REPLACED: 'Đã thay thế'
                    };
                    return (
                      <div key={asset.id} className="asset-item">
                        <div className="asset-item__info">
                          <span className="asset-item__name">{asset.name}</span>
                          <span className="asset-item__code">({asset.code})</span>
                          <span 
                            className="asset-item__status" 
                            style={{ color: statusColors[asset.status] || 'white' }}
                          >
                            • {statusLabels[asset.status] || asset.status}
                          </span>
                        </div>
                        <button 
                          className="btn-report-issue"
                          onClick={() => navigate(`/maintenance?assetId=${asset.id}`)}
                          title="Báo cáo sự cố thiết bị này"
                        >
                          ⚠️ Báo hỏng
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', fontSize: '0.85rem' }}
                  onClick={() => navigate('/maintenance')}
                >
                  Báo cáo sự cố khác
                </button>
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
