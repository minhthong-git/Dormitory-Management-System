import React, { useState, useEffect, useCallback } from 'react';
import { roomApi } from '@/api/room.api';
import { bedApi } from '@/api/bed.api';
import { assetApi } from '@/api/asset.api';
import type { Room, Bed, Asset } from '@/types';
import './AdminRoomsPage.css';
import '../BuildingList.css';

const AdminRoomsPage: React.FC = () => {
  // State for data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchRoomNumber, setSearchRoomNumber] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal & Edit State (from HEAD)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [formData, setFormData] = useState({
    roomNumber: '',
    buildingId: '',
    type: 'STANDARD',
    genderType: 'MALE',
    capacity: 4,
    pricePerMonth: 0,
    floor: 1,
    description: '',
    status: 'AVAILABLE'
  });
  const token = localStorage.getItem('accessToken');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [roomsRes, bedsRes, assetsRes] = await Promise.all([
        roomApi.getAll({ limit: 1000 }),
        bedApi.getAll({ limit: 1000 }),
        assetApi.getAll({ limit: 1000 }),
      ]);
      setRooms(roomsRes.data.data || []);
      setBeds(bedsRes.data.data || []);
      setAssets(assetsRes.data.data || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phòng & giường:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setBuildings(result.data);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách tòa nhà:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBuildings();
  }, [fetchData]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      roomNumber: '',
      buildingId: buildings[0]?.id || '',
      type: 'STANDARD',
      genderType: 'MALE',
      capacity: 4,
      pricePerMonth: 0,
      floor: 1,
      description: '',
      status: 'AVAILABLE'
    });
    setIsPriceFocused(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: any) => {
    setEditingId(room.id);
    setFormData({
      roomNumber: room.roomNumber,
      buildingId: room.buildingId || '',
      type: room.type,
      genderType: room.genderType || 'MALE',
      capacity: room.capacity,
      pricePerMonth: room.pricePerMonth,
      floor: room.floor,
      description: room.description || '',
      status: room.status
    });
    setIsPriceFocused(false);
    setIsModalOpen(true);
  };

  const handleDeleteRoom = async (id: string, roomNumber: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phòng ${roomNumber}?`)) return;

    try {
      const response = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (response.ok || result.success) {
        alert('Xóa phòng thành công!');
        fetchData();
      } else {
        alert(result.message || 'Không thể xóa phòng này!');
      }
    } catch (error) {
      console.error('Lỗi khi xóa phòng:', error);
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.buildingId) {
      alert('Vui lòng chọn tòa nhà!');
      return;
    }

    const url = editingId ? `/api/rooms/${editingId}` : '/api/rooms';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          capacity: Number(formData.capacity),
          pricePerMonth: Number(formData.pricePerMonth),
          floor: Number(formData.floor)
        })
      });
      
      const result = await response.json();
      if (response.ok || result.success) {
        alert(editingId ? 'Cập nhật thành công!' : 'Thêm phòng thành công!');
        setIsModalOpen(false);
        fetchData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Lỗi khi lưu thông tin:', error);
    }
  };

  const bedsByRoom: Record<string, Bed[]> = {};
  beds.forEach((bed) => {
    if (!bedsByRoom[bed.roomId]) {
      bedsByRoom[bed.roomId] = [];
    }
    bedsByRoom[bed.roomId].push(bed);
  });

  const assetsByRoom: Record<string, Asset[]> = {};
  assets.forEach((asset) => {
    if (!assetsByRoom[asset.roomId]) {
      assetsByRoom[asset.roomId] = [];
    }
    assetsByRoom[asset.roomId].push(asset);
  });

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchRoomNumber.toLowerCase().trim());
    const matchesBuilding = filterBuilding === '' || room.buildingId === filterBuilding;
    const matchesFloor = filterFloor === '' || room.floor.toString() === filterFloor;
    const matchesType = filterType === '' || room.type === filterType;
    const matchesStatus = filterStatus === '' || room.status === filterStatus;
    return matchesSearch && matchesBuilding && matchesFloor && matchesType && matchesStatus;
  });

  const totalBeds = beds.length;
  const occupiedBedsCount = beds.filter((b) => b.status === 'OCCUPIED').length;
  const availableBedsCount = beds.filter((b) => b.status === 'AVAILABLE').length;
  const maintenanceBedsCount = beds.filter((b) => b.status === 'MAINTENANCE').length;

  const roomTypeLabel: Record<string, string> = {
    SMALL: 'Phòng nhỏ',
    STANDARD: 'Phòng tiêu chuẩn',
    LARGE: 'Phòng đông',
  };

  return (
    <div className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Quản lý Sơ đồ phòng & Lấp đầy</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Theo dõi chi tiết số phòng, giường và thêm mới phòng.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-add" onClick={handleOpenAdd} style={{ marginRight: '10px' }}>
            + Thêm Phòng
          </button>
          <button className="btn btn-outline" onClick={fetchData} disabled={isLoading}>
            Tải lại
          </button>
        </div>
      </header>

      <main className="page-main">
        <div className="occupancy-summary">
          <div className="summary-pill">Phòng: <strong>{rooms.length}</strong></div>
          <div className="summary-pill">Giường: <strong>{totalBeds}</strong></div>
          <div className="summary-pill summary-pill--green">Trống: <strong>{availableBedsCount}</strong></div>
          <div className="summary-pill summary-pill--red">Có khách: <strong>{occupiedBedsCount}</strong></div>
          <div className="summary-pill summary-pill--yellow">Bảo trì: <strong>{maintenanceBedsCount}</strong></div>
          <div className="summary-pill">Lấp đầy: <strong>{totalBeds ? Math.round((occupiedBedsCount / totalBeds) * 100) : 0}%</strong></div>
        </div>

        <div className="student-controls">
          <div className="student-filters">
            <div className="form-group student-select-filter" style={{ minWidth: 200 }}>
              <input type="text" placeholder="Tìm số phòng..." value={searchRoomNumber} onChange={(e) => setSearchRoomNumber(e.target.value)} />
            </div>
            <div className="form-group student-select-filter">
              <select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)}>
                <option value="">Tòa nhà (Tất cả)</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group student-select-filter">
              <select value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)}>
                <option value="">Tầng (Tất cả)</option>
                <option value="1">Tầng 1</option>
                <option value="2">Tầng 2</option>
                <option value="3">Tầng 3</option>
              </select>
            </div>
            <div className="form-group student-select-filter">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Loại (Tất cả)</option>
                <option value="SMALL">Phòng nhỏ</option>
                <option value="STANDARD">Phòng tiêu chuẩn</option>
                <option value="LARGE">Phòng đông</option>
              </select>
            </div>
            <div className="form-group student-select-filter">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Trạng thái (Tất cả)</option>
                <option value="AVAILABLE">Còn giường trống</option>
                <option value="FULL">Đầy phòng</option>
                <option value="MAINTENANCE">Bảo trì</option>
              </select>
            </div>
          </div>
          {(searchRoomNumber || filterBuilding || filterFloor || filterType || filterStatus) && (
            <button className="btn btn-outline" onClick={() => { setSearchRoomNumber(''); setFilterBuilding(''); setFilterFloor(''); setFilterType(''); setFilterStatus(''); }}>
              Đặt lại lọc
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="loading-screen" style={{ minHeight: '35vh' }}><div className="spinner" /></div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🚪</div>
            <h3>Không tìm thấy phòng nào</h3>
          </div>
        ) : (
          <div className="occupancy-grid">
            {filteredRooms.map((room) => {
              const roomBeds = bedsByRoom[room.id] || [];
              const occupiedBeds = roomBeds.filter((b) => b.status === 'OCCUPIED');
              const availableBeds = roomBeds.filter((b) => b.status === 'AVAILABLE');
              const roomAssets = assetsByRoom[room.id] || [];
              const damagedAssets = roomAssets.filter((a) => a.status !== 'GOOD');

              return (
                <div key={room.id} className="room-card">
                  <div className="room-card__header">
                    <div>
                      <span className="room-card__number">Phòng {room.roomNumber}</span>
                      <span className="room-card__meta" style={{ marginLeft: 8 }}>
                        Tầng {room.floor} · {roomTypeLabel[room.type] || room.type}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-action btn-edit" onClick={() => handleOpenEdit(room)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Sửa</button>
                      <button className="btn-action btn-delete" onClick={() => handleDeleteRoom(room.id, room.roomNumber)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Xóa</button>
                    </div>
                  </div>

                  <div className="room-card__occupancy">
                    👥 Tỉ lệ: <strong>{occupiedBeds.length}</strong> / {room.capacity} giường
                    {availableBeds.length > 0 && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-success)', marginLeft: 8 }}>
                        (Trống {availableBeds.length})
                      </span>
                    )}
                  </div>

                  <div className="room-card__beds-container">
                    {roomBeds.length === 0 ? (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '10px 0' }}>
                        Chưa thiết lập giường.
                      </div>
                    ) : (
                      roomBeds.map((bed) => {
                        const activeContract = bed.contracts?.[0];
                        const studentName = activeContract?.student?.fullName;
                        const studentCode = activeContract?.student?.studentCode;

                        let statusClass = 'bed-status-item--available';
                        let indicatorClass = 'bed-status-indicator--available';
                        let statusText = 'Trống';

                        if (bed.status === 'OCCUPIED') {
                          statusClass = 'bed-status-item--occupied';
                          indicatorClass = 'bed-status-indicator--occupied';
                          statusText = 'Có khách';
                        } else if (bed.status === 'MAINTENANCE') {
                          statusClass = 'bed-status-item--maintenance';
                          indicatorClass = 'bed-status-indicator--maintenance';
                          statusText = 'Bảo trì';
                        }

                        return (
                          <div key={bed.id} className={`bed-status-item ${statusClass}`}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className={`bed-status-indicator ${indicatorClass}`} />
                              <strong>Giường #{bed.bedNumber}</strong>
                              <span style={{ fontSize: '0.75rem', opacity: 0.75, marginLeft: 6 }}>({bed.bedType})</span>
                            </div>
                            <div>
                              {bed.status === 'OCCUPIED' && studentName ? (
                                <div className="bed-student-info">
                                  <span className="bed-student-name">{studentName}</span>
                                  <span className="bed-student-code">{studentCode}</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{statusText}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="room-card__assets-container" style={{ marginTop: '1rem', borderTop: '1px dashed var(--color-border)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>📺 Tài sản phòng</strong>
                      <span style={{ fontSize: '0.75rem', color: damagedAssets.length > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                        {roomAssets.length} thiết bị {damagedAssets.length > 0 && `(Lỗi ${damagedAssets.length})`}
                      </span>
                    </div>
                    {roomAssets.length === 0 ? (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Chưa có tài sản.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {roomAssets.map(asset => (
                          <div 
                            key={asset.id} 
                            style={{ 
                              fontSize: '0.75rem', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: asset.status === 'GOOD' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: asset.status === 'GOOD' ? 'var(--color-success)' : 'var(--color-danger)',
                              border: `1px solid ${asset.status === 'GOOD' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                            }}
                            title={`${asset.name} (${asset.code}) - ${asset.status}`}
                          >
                            {asset.name} {asset.status !== 'GOOD' && '⚠️'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL THÊM / SỬA PHÒNG */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Cập nhật phòng' : 'Thêm Phòng Mới'}</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveRoom}>
              <div className="form-group">
                <label>Chọn Tòa Nhà</label>
                <select 
                  className="form-select"
                  value={formData.buildingId}
                  onChange={(e) => setFormData({...formData, buildingId: e.target.value})}
                  required
                  disabled={editingId !== null}
                >
                  <option value="" disabled>-- Chọn tòa nhà --</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Số phòng</label>
                  <input type="text" className="form-input" value={formData.roomNumber} onChange={(e) => setFormData({...formData, roomNumber: e.target.value})} required disabled={editingId !== null} />
                </div>
                <div className="form-group">
                  <label>Tầng</label>
                  <input type="number" className="form-input" min="1" value={formData.floor} onChange={(e) => setFormData({...formData, floor: Number(e.target.value)})} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Loại phòng</label>
                  <select className="form-select" value={formData.type} onChange={(e) => {
                    const type = e.target.value;
                    let capacity = 4;
                    if (type === 'SMALL') capacity = 2;
                    else if (type === 'STANDARD') capacity = 4;
                    else if (type === 'LARGE') capacity = 6;
                    setFormData({...formData, type, capacity});
                  }}>
                    <option value="SMALL">Phòng nhỏ</option>
                    <option value="STANDARD">Phòng tiêu chuẩn</option>
                    <option value="LARGE">Phòng đông</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sức chứa</label>
                  <input type="number" className="form-input" value={formData.capacity} disabled />
                </div>
                <div className="form-group">
                  <label>Giới tính</label>
                  <select className="form-select" value={formData.genderType} onChange={(e) => setFormData({...formData, genderType: e.target.value})}>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Giá phòng/Tháng (VNĐ)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={isPriceFocused ? (formData.pricePerMonth === 0 ? '' : formData.pricePerMonth) : (formData.pricePerMonth === 0 ? '' : formData.pricePerMonth.toLocaleString('vi-VN'))} 
                      onFocus={() => setIsPriceFocused(true)}
                      onBlur={() => setIsPriceFocused(false)}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setFormData({...formData, pricePerMonth: rawValue ? Number(rawValue) : 0});
                      }} 
                      placeholder="0" 
                      required 
                      style={{ paddingRight: '40px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', color: 'var(--color-text-muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>
                      VNĐ
                    </span>
                  </div>
                </div>
                {editingId && (
                  <div className="form-group">
                    <label>Trạng thái</label>
                    <select className="form-select" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="AVAILABLE">Còn trống</option>
                      <option value="FULL">Đã đầy</option>
                      <option value="MAINTENANCE">Đang bảo trì</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn-add">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRoomsPage;