import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './BuildingList.css'; 

export default function RoomList() {
  const { buildingId } = useParams(); 
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);

  // State quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    roomNumber: '',
    type: 'STANDARD',
    capacity: 1,
    pricePerMonth: 0,
    floor: 1,
    description: '',
    status: 'AVAILABLE'
  });

  const token = localStorage.getItem('accessToken');

  const fetchRooms = async () => {
    try {
      const response = await fetch(`/api/rooms?buildingId=${buildingId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      let roomData = [];
      if (result.data && Array.isArray(result.data.data)) roomData = result.data.data;
      else if (Array.isArray(result.data)) roomData = result.data;
      else if (result.data?.items) roomData = result.data.items;
      else if (Array.isArray(result)) roomData = result;

      setRooms(roomData);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu phòng:', error);
    }
  };

  useEffect(() => {
    if (buildingId) fetchRooms();
  }, [buildingId]);

  // Mở modal thêm mới
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      roomNumber: '', type: 'STANDARD', capacity: 4, pricePerMonth: 0, floor: 1, description: '', status: 'AVAILABLE'
    });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (room: any) => {
    setEditingId(room.id);
    setFormData({
      roomNumber: room.roomNumber,
      type: room.type,
      capacity: room.capacity,
      pricePerMonth: room.pricePerMonth,
      floor: room.floor,
      description: room.description || '',
      status: room.status
    });
    setIsModalOpen(true);
  };

  // Xử lý Xóa phòng
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
        fetchRooms();
      } else {
        alert(result.message || 'Không thể xóa phòng này!');
      }
    } catch (error) {
      console.error('Lỗi khi xóa phòng:', error);
    }
  };

  // Xử lý Lưu dữ liệu
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
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
          buildingId: buildingId, // Luôn gắn với tòa nhà hiện tại từ URL
          capacity: Number(formData.capacity),
          pricePerMonth: Number(formData.pricePerMonth),
          floor: Number(formData.floor)
        })
      });
      
      const result = await response.json();
      if (response.ok || result.success) {
        alert(editingId ? 'Cập nhật phòng thành công!' : 'Thêm phòng thành công!');
        setIsModalOpen(false);
        fetchRooms();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Lỗi lưu thông tin:', error);
    }
  };

  return (
    <div className="building-page">
      <div className="building-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <button 
            onClick={() => navigate('/buildings')} 
            style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', marginBottom: '8px', padding: 0 }}
          >
            &larr; Quay lại danh sách Tòa nhà
          </button>
          <h1 className="building-title">Quản lý Phòng (Theo Tòa)</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Danh sách các phòng thuộc tòa nhà này.</p>
        </div>
        <button className="btn-add" onClick={handleOpenAdd}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ marginRight: '8px' }}>
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Thêm Phòng mới
        </button>
      </div>

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
          Chưa có phòng nào trong tòa này. Hãy bấm "Thêm Phòng mới"!
        </div>
      ) : (
        <div className="building-grid">
          {rooms.map((room) => (
            <div key={room.id} className="building-card">
              <div className="card-header">
                <h2 className="card-title">Phòng {room.roomNumber}</h2>
                <span className={`badge ${room.status === 'AVAILABLE' ? 'badge-mixed' : 'badge-female'}`}>
                  {room.status === 'AVAILABLE' ? 'Còn trống' : room.status === 'FULL' ? 'Đã đầy' : 'Bảo trì'}
                </span>
              </div>
              <div className="card-info">
                <div className="info-row">
                  <span>Loại phòng:</span>
                  <span className="info-value">{room.type || 'Chưa phân loại'}</span>
                </div>
                <div className="info-row">
                  <span>Tầng:</span>
                  <span className="info-value">{room.floor}</span>
                </div>
                <div className="info-row">
                  <span>Sức chứa:</span>
                  <span className="info-value">{room.currentOccupancy || 0} / {room.capacity} người</span>
                </div>
                <div className="info-row">
                  <span>Giá/tháng:</span>
                  <span className="info-value text-green">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.pricePerMonth || 0)}
                  </span>
                </div>
              </div>
              <div className="card-actions">
                <button className="btn-action btn-edit" onClick={() => handleOpenEdit(room)}>Sửa</button>
                <button className="btn-action btn-delete" onClick={() => handleDeleteRoom(room.id, room.roomNumber)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL THÊM / SỬA PHÒNG THEO TÒA */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Cập nhật thông tin Phòng' : 'Thêm Phòng Mới'}</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveRoom}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Loại phòng</label>
                  <select className="form-select" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                    <option value="SMALL">Phòng nhỏ</option>
                    <option value="STANDARD">Phòng tiêu chuẩn</option>
                    <option value="LARGE">Phòng đông</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sức chứa tối đa</label>
                  <input type="number" className="form-input" min="1" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: Number(e.target.value)})} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Giá phòng/Tháng (VNĐ)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.pricePerMonth === 0 ? '' : formData.pricePerMonth.toLocaleString('vi-VN')} 
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
                <button type="submit" className="btn-add">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}