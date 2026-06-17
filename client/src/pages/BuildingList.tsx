import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BuildingList.css';

interface Building {
  id: string;
  name: string;
  genderType: 'MALE' | 'FEMALE' | 'MIXED';
  // BƯỚC 2.1: Thêm mảng rooms để nhận dữ liệu từ Backend gửi lên
  rooms?: any[]; 
  totalRooms?: number;
  availableRooms?: number;
}

export default function BuildingList() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // State quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // Nếu có id là Đang sửa, null là Thêm mới
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'MALE' | 'FEMALE' | 'MIXED'>('MIXED');

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      const result = await response.json();
      if (result.success) setBuildings(result.data);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu:', error);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  // Mở modal Thêm mới
  const handleOpenAdd = () => {
    setEditingId(null);
    setNewName('');
    setNewGender('MIXED');
    setIsModalOpen(true);
  };

  // Mở modal Chỉnh sửa
  const handleOpenEdit = (building: Building) => {
    setEditingId(building.id);
    setNewName(building.name);
    setNewGender(building.genderType);
    setIsModalOpen(true);
  };

  // Xử lý Xóa
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${name} không?`)) {
      try {
        const response = await fetch(`/api/buildings/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          alert('Xóa thành công!');
          fetchBuildings();
        } else alert(result.message);
      } catch (error) {
        console.error('Lỗi xóa:', error);
      }
    }
  };

  // Xử lý Lưu (Thêm mới hoặc Cập nhật)
  const handleSaveBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/buildings/${editingId}` : '/api/buildings';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, genderType: newGender })
      });
      
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        fetchBuildings();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Lỗi lưu:', error);
    }
  };

  const getGenderBadge = (type: string) => {
    switch (type) {
      case 'MALE': return <span className="badge badge-male">Tòa Nam</span>;
      case 'FEMALE': return <span className="badge badge-female">Tòa Nữ</span>;
      default: return <span className="badge badge-mixed">Tòa Chung</span>;
    }
  };

  const filteredBuildings = buildings.filter(b => 
    b.name.includes(searchTerm)
  );

  return (
    <div className="building-page">
      <div className="building-header">
        <div>
          <h1 className="building-title">Quản lý Tòa nhà</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Quản lý danh sách các tòa nhà và sức chứa hiện tại.</p>
        </div>
        <button className="btn-add" onClick={handleOpenAdd}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Thêm Tòa nhà
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Tìm kiếm tên tòa nhà..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="building-grid">
        {filteredBuildings.map((building) => (
          <div key={building.id} className="building-card">
            <div className="card-header">
              <h2 className="card-title">{building.name}</h2>
              {getGenderBadge(building.genderType)}
            </div>
            <div className="card-info">
              
              {/* BƯỚC 2.2: Sửa lại công thức đếm số phòng ở đây */}
              <div className="info-row">
                <span>Tổng số phòng:</span>
                <span className="info-value">{building.rooms?.length || 0}</span>
              </div>
              <div className="info-row">
                <span>Phòng còn trống:</span>
                <span className="info-value text-green">
                  {building.rooms?.filter((r: any) => r.status === 'AVAILABLE').length || 0}
                </span>
              </div>

            </div>
            <div className="card-actions">
              <button className="btn-action btn-edit" onClick={() => handleOpenEdit(building)}>Sửa</button>
              <button className="btn-action btn-delete" onClick={() => handleDelete(building.id, building.name)}>Xóa</button>
              <button className="btn-action btn-view" onClick={() => navigate(`/buildings/${building.id}/rooms`)}>Phòng</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Cập nhật Tòa nhà' : 'Thêm Tòa Nhà Mới'}</h2>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveBuilding}>
              <div className="form-group">
                <label>Tên tòa nhà</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Loại tòa nhà</label>
                <select 
                  className="form-select"
                  value={newGender}
                  onChange={(e) => setNewGender(e.target.value as any)}
                >
                  <option value="MALE">Tòa Nam</option>
                  <option value="FEMALE">Tòa Nữ</option>
                  <option value="MIXED">Tòa Chung</option>
                </select>
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