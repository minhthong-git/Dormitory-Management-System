import React, { useState, useEffect, useCallback } from 'react';
import { assetApi, type AssetFilters } from '@/api/asset.api';
import { roomApi } from '@/api/room.api';
import type { Asset, Room } from '@/types';
import './AdminAssetsPage.css';

const AdminAssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters State
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterRoomId, setFilterRoomId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'AIR_CONDITIONER',
    status: 'GOOD',
    description: '',
    roomId: '',
  });

  // Fetch Assets
  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: AssetFilters = {
        page,
        limit,
        roomId: filterRoomId || undefined,
        buildingId: filterBuilding || undefined,
        status: filterStatus || undefined,
        type: filterType || undefined,
        search: searchQuery.trim() || undefined,
      };
      const response = await assetApi.getAll(filters);
      if (response.data.success) {
        setAssets(response.data.data);
        setTotal(response.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách tài sản:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, filterRoomId, filterBuilding, filterStatus, filterType, searchQuery]);

  // Fetch Rooms for dropdown
  const fetchRooms = async () => {
    try {
      const response = await roomApi.getAll({ limit: 100 });
      if (response.data.success) {
        setRooms(response.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách phòng:', err);
    }
  };

  const fetchBuildings = useCallback(async () => {
    try {
      const response = await fetch('/api/buildings');
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setBuildings(result.data);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách tòa nhà:', error);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchRooms();
    fetchBuildings();
  }, [fetchBuildings]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleFilterRoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterRoomId(e.target.value);
    setPage(1);
  };

  const handleFilterStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setPage(1);
  };

  const handleFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterBuilding('');
    setFilterRoomId('');
    setFilterStatus('');
    setFilterType('');
    setPage(1);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      type: 'AIR_CONDITIONER',
      status: 'GOOD',
      description: '',
      roomId: rooms[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setFormData({
      name: asset.name,
      code: asset.code,
      type: asset.type,
      status: asset.status,
      description: asset.description || '',
      roomId: asset.roomId,
    });
    setIsModalOpen(true);
  };

  // Handle Save (Create/Update)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId) {
      alert('Vui lòng chọn phòng gắn liền với tài sản!');
      return;
    }

    try {
      if (editingId) {
        const response = await assetApi.update(editingId, formData);
        if (response.data.success) {
          alert('Cập nhật tài sản thành công!');
          setIsModalOpen(false);
          fetchAssets();
        }
      } else {
        const response = await assetApi.create(formData);
        if (response.data.success) {
          alert('Tạo tài sản mới thành công!');
          setIsModalOpen(false);
          fetchAssets();
        }
      }
    } catch (err: any) {
      console.error('Lỗi lưu thông tin tài sản:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  // Handle Delete
  const handleDeleteAsset = async (id: string, code: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài sản mã ${code}?`)) return;

    try {
      const response = await assetApi.delete(id);
      if (response.data.success) {
        alert('Xóa tài sản thành công!');
        fetchAssets();
      }
    } catch (err: any) {
      console.error('Lỗi khi xóa tài sản:', err);
      alert(err.response?.data?.message || 'Không thể xóa tài sản này (có thể đã có lịch sử sửa chữa).');
    }
  };

  // Quick update status
  const handleQuickUpdateStatus = async (id: string, currentStatus: string) => {
    let nextStatus = 'GOOD';
    if (currentStatus === 'GOOD') nextStatus = 'DAMAGED';
    else if (currentStatus === 'DAMAGED') nextStatus = 'REPAIRING';
    else if (currentStatus === 'REPAIRING') nextStatus = 'GOOD';

    try {
      const response = await assetApi.update(id, { status: nextStatus });
      if (response.data.success) {
        fetchAssets();
      }
    } catch (err) {
      console.error('Lỗi cập nhật nhanh trạng thái:', err);
    }
  };

  // Label Helpers
  const statusLabel: Record<string, string> = {
    GOOD: 'Tốt',
    DAMAGED: 'Hỏng hóc',
    REPAIRING: 'Đang sửa',
    REPLACED: 'Đã thay thế',
  };

  const typeLabel: Record<string, string> = {
    AIR_CONDITIONER: 'Máy lạnh ❄️',
    DESK: 'Bàn học 📝',
    CHAIR: 'Ghế ngồi 🪑',
    FAN: 'Quạt máy 🌬️',
    LIGHT: 'Bóng đèn 💡',
    LIGHTBULB: 'Bóng đèn 💡',
    LOCKER: 'Tủ locker 🔒',
    POWER_SOCKET: 'Ổ điện 🔌',
    FAUCET: 'Vòi nước 🚰',
    WATER_TAP: 'Vòi nước 🚰',
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'GOOD': return 'asset-status-badge--good';
      case 'DAMAGED': return 'asset-status-badge--damaged';
      case 'REPAIRING': return 'asset-status-badge--repairing';
      case 'REPLACED': return 'asset-status-badge--replaced';
      default: return '';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="assets-page">
      <header className="assets-page__header">
        <div>
          <h1 className="assets-page__title">Quản lý Tài sản Phòng</h1>
          <p className="assets-page__subtitle">
            Quản lý trang thiết bị phòng ở ký túc xá: máy lạnh, quạt, bàn ghế, tủ giường.
          </p>
        </div>
        <button className="assets-page__btn-create" onClick={handleOpenAdd}>
          <span>+ Thêm Tài sản</span>
        </button>
      </header>

      {/* Stats Cards */}
      <section className="assets-page__stats">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--total">📦</div>
          <div>
            <div className="stat-card__value">{total}</div>
            <div className="stat-card__label">Tổng thiết bị</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--good">✓</div>
          <div>
            <div className="stat-card__value">
              {assets.filter(a => a.status === 'GOOD').length || '-'}
            </div>
            <div className="stat-card__label">Trạng thái Tốt</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--damaged">⚠️</div>
          <div>
            <div className="stat-card__value">
              {assets.filter(a => a.status === 'DAMAGED').length || '-'}
            </div>
            <div className="stat-card__label">Đang Hỏng hóc</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--repairing">🔧</div>
          <div>
            <div className="stat-card__value">
              {assets.filter(a => a.status === 'REPAIRING').length || '-'}
            </div>
            <div className="stat-card__label">Đang bảo trì</div>
          </div>
        </div>
      </section>

      {/* Filters Card */}
      <section className="assets-page__control-card">
        <div className="assets-page__filters">
          <div className="filter-input-group">
            <label htmlFor="search-input">Tìm kiếm</label>
            <input
              id="search-input"
              type="text"
              className="filter-control"
              placeholder="Tìm theo tên, mã..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-input-group">
            <label htmlFor="building-filter">Tòa nhà</label>
            <select
              id="building-filter"
              className="filter-control"
              value={filterBuilding}
              onChange={(e) => { setFilterBuilding(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả tòa nhà</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-input-group">
            <label htmlFor="room-filter">Phòng</label>
            <select
              id="room-filter"
              className="filter-control"
              value={filterRoomId}
              onChange={handleFilterRoomChange}
            >
              <option value="">Tất cả phòng</option>
              {rooms
                .filter(r => filterBuilding ? r.buildingId === filterBuilding : true)
                .map(room => (
                  <option key={room.id} value={room.id}>
                    Phòng {room.roomNumber} ({room.building?.name || 'Khu A'})
                  </option>
                ))}
            </select>
          </div>

          <div className="filter-input-group">
            <label htmlFor="status-filter">Trạng thái</label>
            <select
              id="status-filter"
              className="filter-control"
              value={filterStatus}
              onChange={handleFilterStatusChange}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="GOOD">Tốt</option>
              <option value="DAMAGED">Hỏng hóc</option>
              <option value="REPAIRING">Đang sửa</option>
              <option value="REPLACED">Đã thay thế</option>
            </select>
          </div>

          <div className="filter-input-group">
            <label htmlFor="type-filter">Loại thiết bị</label>
            <select
              id="type-filter"
              className="filter-control"
              value={filterType}
              onChange={handleFilterTypeChange}
            >
              <option value="">Tất cả loại</option>
              <option value="AIR_CONDITIONER">Máy lạnh</option>
              <option value="DESK">Bàn học</option>
              <option value="CHAIR">Ghế</option>
              <option value="FAN">Quạt treo tường</option>
              <option value="LIGHTBULB">Bóng đèn</option>
              <option value="LOCKER">Tủ locker</option>
              <option value="WATER_TAP">Vòi nước</option>
              <option value="POWER_SOCKET">Ổ điện</option>
            </select>
          </div>

          {(searchQuery || filterBuilding || filterRoomId || filterStatus || filterType) && (
            <div className="filter-input-group" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={handleResetFilters}>
                Đặt lại lọc
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Assets Table */}
      <section className="assets-page__table-card">
        {isLoading ? (
          <div className="loading-screen" style={{ minHeight: '35vh' }}>
            <div className="spinner" />
          </div>
        ) : assets.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h3>Không tìm thấy tài sản nào</h3>
            <p style={{ color: '#64748b' }}>Thử thay đổi bộ lọc hoặc thêm tài sản mới.</p>
          </div>
        ) : (
          <>
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Mã thiết bị</th>
                  <th>Tên thiết bị</th>
                  <th>Phòng</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Mô tả</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id}>
                    <td>
                      <strong>{asset.code}</strong>
                    </td>
                    <td>{asset.name}</td>
                    <td>
                      Phòng {asset.room?.roomNumber || 'Chưa rõ'} ({asset.room?.building?.name || 'Khu A'})
                    </td>
                    <td>
                      <span className="asset-type-badge">{typeLabel[asset.type] || asset.type}</span>
                    </td>
                    <td>
                      <button
                        className={`asset-status-badge ${statusBadgeClass(asset.status)}`}
                        onClick={() => handleQuickUpdateStatus(asset.id, asset.status)}
                        title="Click để thay đổi nhanh trạng thái"
                        style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                      >
                        {statusLabel[asset.status] || asset.status}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {asset.description || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleOpenEdit(asset)}
                          title="Sửa thông tin"
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteAsset(asset.id, asset.code)}
                          title="Xóa tài sản"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <span className="pagination-text">
                  Hiển thị trang {page}/{totalPages} (Tổng số {total} thiết bị)
                </span>
                <div className="pagination-btns">
                  <button
                    className="btn-pagination"
                    disabled={page === 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  >
                    Trước
                  </button>
                  <button
                    className="btn-pagination"
                    disabled={page === totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Modal Form Thêm/Sửa */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Cập nhật tài sản' : 'Thêm tài sản mới'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveAsset}>
              <div className="modal-body">
                <div className="asset-form">
                  <div className="form-group">
                    <label htmlFor="form-roomId">Chọn phòng gắn liền</label>
                    <select
                      id="form-roomId"
                      className="form-control"
                      value={formData.roomId}
                      onChange={e => setFormData({ ...formData, roomId: e.target.value })}
                      required
                    >
                      <option value="" disabled>-- Chọn phòng --</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          Phòng {room.roomNumber} ({room.building?.name || 'Khu A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="form-code">Mã tài sản</label>
                      <input
                        id="form-code"
                        type="text"
                        className="form-control"
                        value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        placeholder="Ví dụ: AC-P101-01"
                        required
                        disabled={editingId !== null}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="form-name">Tên tài sản</label>
                      <input
                        id="form-name"
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ví dụ: Máy lạnh, Bàn học..."
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="form-type">Loại thiết bị</label>
                      <select
                        id="form-type"
                        className="form-control"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="AIR_CONDITIONER">Máy lạnh</option>
                        <option value="DESK">Bàn học</option>
                        <option value="CHAIR">Ghế</option>
                        <option value="FAN">Quạt treo tường</option>
                        <option value="LIGHTBULB">Bóng đèn</option>
                        <option value="LOCKER">Tủ locker</option>
                        <option value="WATER_TAP">Vòi nước</option>
                        <option value="POWER_SOCKET">Ổ điện</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="form-status">Trạng thái ban đầu</label>
                      <select
                        id="form-status"
                        className="form-control"
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="GOOD">Tốt (Hoạt động tốt)</option>
                        <option value="DAMAGED">Hỏng hóc</option>
                        <option value="REPAIRING">Đang sửa chữa</option>
                        <option value="REPLACED">Đã thay thế</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="form-description">Mô tả/Chi tiết</label>
                    <textarea
                      id="form-description"
                      className="form-control"
                      style={{ resize: 'vertical', minHeight: '80px' }}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả đặc điểm, nhãn hiệu hoặc vị trí cụ thể..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAssetsPage;
