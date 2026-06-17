import React, { useState, useEffect, useCallback } from 'react';
import { roomApi } from '@/api/room.api';
import { bedApi } from '@/api/bed.api';
import type { Room, Bed } from '@/types';
import './AdminRoomsPage.css';

const AdminRoomsPage: React.FC = () => {
  // State for data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchRoomNumber, setSearchRoomNumber] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Fetch rooms & beds concurrently
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [roomsRes, bedsRes] = await Promise.all([
        roomApi.getAll({ limit: 100 }), // Load up to 100 rooms
        bedApi.getAll({ limit: 100 }),   // Load up to 100 beds (with active contracts + students)
      ]);
      setRooms(roomsRes.data.data || []);
      setBeds(bedsRes.data.data || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu phòng & giường:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group beds by roomId
  const bedsByRoom: Record<string, Bed[]> = {};
  beds.forEach((bed) => {
    if (!bedsByRoom[bed.roomId]) {
      bedsByRoom[bed.roomId] = [];
    }
    bedsByRoom[bed.roomId].push(bed);
  });

  // Filtered rooms list
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchRoomNumber.toLowerCase().trim());
    const matchesFloor = filterFloor === '' || room.floor.toString() === filterFloor;
    const matchesType = filterType === '' || room.type === filterType;
    const matchesStatus = filterStatus === '' || room.status === filterStatus;
    return matchesSearch && matchesFloor && matchesType && matchesStatus;
  });

  // Calculate summary stats
  const totalBeds = beds.length;
  const occupiedBedsCount = beds.filter((b) => b.status === 'OCCUPIED').length;
  const availableBedsCount = beds.filter((b) => b.status === 'AVAILABLE').length;
  const maintenanceBedsCount = beds.filter((b) => b.status === 'MAINTENANCE').length;

  const roomTypeLabel: Record<string, string> = {
    SINGLE: 'Phòng đơn',
    DOUBLE: 'Phòng đôi',
    QUAD: 'Phòng 4 người',
  };

  return (
    <div className="page">
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="page-header">
        <div>
          <h1>Sơ đồ phòng & Tỉ lệ lấp đầy</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Theo dõi chi tiết số phòng, số giường trống, giường bận, giường bảo trì và thông tin sinh viên tương ứng.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchData} disabled={isLoading}>
            Tải lại
          </button>
        </div>
      </header>

      <main className="page-main">
        {/* ── Summary Stats Pills ────────────────────────────────── */}
        <div className="occupancy-summary">
          <div className="summary-pill">
            Tổng số phòng: <strong>{rooms.length}</strong>
          </div>
          <div className="summary-pill">
            Tổng số giường: <strong>{totalBeds}</strong>
          </div>
          <div className="summary-pill summary-pill--green">
            Giường trống: <strong>{availableBedsCount}</strong>
          </div>
          <div className="summary-pill summary-pill--red">
            Giường có khách: <strong>{occupiedBedsCount}</strong>
          </div>
          <div className="summary-pill summary-pill--yellow">
            Giường bảo trì: <strong>{maintenanceBedsCount}</strong>
          </div>
          <div className="summary-pill">
            Tỷ lệ lấp đầy:{' '}
            <strong>
              {totalBeds ? Math.round((occupiedBedsCount / totalBeds) * 100) : 0}%
            </strong>
          </div>
        </div>

        {/* ── Filter Panel ───────────────────────────────────────── */}
        <div className="student-controls">
          <div className="student-filters">
            <div className="form-group student-select-filter" style={{ minWidth: 200 }}>
              <input
                type="text"
                placeholder="Tìm số phòng..."
                value={searchRoomNumber}
                onChange={(e) => setSearchRoomNumber(e.target.value)}
              />
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
                <option value="">Loại phòng (Tất cả)</option>
                <option value="SINGLE">Phòng đơn</option>
                <option value="DOUBLE">Phòng đôi</option>
                <option value="QUAD">Phòng Quad (4 người)</option>
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
          {(searchRoomNumber || filterFloor || filterType || filterStatus) && (
            <button
              className="btn btn-outline"
              onClick={() => {
                setSearchRoomNumber('');
                setFilterFloor('');
                setFilterType('');
                setFilterStatus('');
              }}
            >
              Đặt lại lọc
            </button>
          )}
        </div>

        {/* ── Grid Occupancy Layout ─────────────────────────────── */}
        {isLoading ? (
          <div className="loading-screen" style={{ minHeight: '35vh' }}>
            <div className="spinner" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🚪</div>
            <h3>Không tìm thấy phòng nào khớp với bộ lọc</h3>
          </div>
        ) : (
          <div className="occupancy-grid">
            {filteredRooms.map((room) => {
              const roomBeds = bedsByRoom[room.id] || [];
              const occupiedBeds = roomBeds.filter((b) => b.status === 'OCCUPIED');
              const availableBeds = roomBeds.filter((b) => b.status === 'AVAILABLE');

              return (
                <div key={room.id} className="room-card">
                  <div className="room-card__header">
                    <div>
                      <span className="room-card__number">Phòng {room.roomNumber}</span>
                      <span className="room-card__meta" style={{ marginLeft: 8 }}>
                        Tầng {room.floor} · {roomTypeLabel[room.type] || room.type}
                      </span>
                    </div>
                    <span
                      className={`badge ${
                        room.status === 'AVAILABLE'
                          ? 'badge--active'
                          : room.status === 'FULL'
                          ? 'badge--female'
                          : 'badge--other'
                      }`}
                    >
                      {room.status === 'AVAILABLE'
                        ? 'Còn giường'
                        : room.status === 'FULL'
                        ? 'Đầy'
                        : 'Bảo trì'}
                    </span>
                  </div>

                  <div className="room-card__occupancy">
                    👥 Tỉ lệ lấp đầy: <strong>{occupiedBeds.length}</strong> / {room.capacity} giường
                    {availableBeds.length > 0 && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-success)', marginLeft: 8 }}>
                        (Trống {availableBeds.length})
                      </span>
                    )}
                  </div>

                  <div className="room-card__beds-container">
                    {roomBeds.length === 0 ? (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '10px 0' }}>
                        Chưa thiết lập giường cho phòng này.
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
                              <span style={{ fontSize: '0.75rem', opacity: 0.75, marginLeft: 6 }}>
                                ({bed.bedType})
                              </span>
                            </div>
                            <div>
                              {bed.status === 'OCCUPIED' && studentName ? (
                                <div className="bed-student-info">
                                  <span className="bed-student-name">{studentName}</span>
                                  <span className="bed-student-code">{studentCode}</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                  {statusText}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminRoomsPage;
