import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth.api';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { user, fetchMe, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('OTHER');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [course, setCourse] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Status message state
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load user data into state
  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone || '');
      if (user.student?.gender) {
        setGender(user.student.gender);
      }
      if (user.student?.dateOfBirth) {
        // user.student.dateOfBirth could be full ISO string, we just need YYYY-MM-DD
        setDateOfBirth(user.student.dateOfBirth.substring(0, 10));
      }
      setFaculty(user.student?.faculty || '');
      setMajor(user.student?.major || '');
      setCourse(user.student?.course || '');
    }
  }, [user]);

  // Clear messages when tab changes
  useEffect(() => {
    setMessage(null);
  }, [activeTab]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!fullName.trim()) {
      setMessage({ text: 'Họ tên không được để trống', type: 'error' });
      return;
    }

    setIsUpdating(true);
    try {
      await authApi.updateProfile({ fullName, phone, gender, dateOfBirth, faculty, major, course });
      await fetchMe();
      setMessage({ text: 'Cập nhật thông tin cá nhân thành công', type: 'success' });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ text: 'Vui lòng nhập đầy đủ tất cả các trường', type: 'error' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ text: 'Mật khẩu mới phải có ít nhất 8 ký tự', type: 'error' });
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setMessage({ text: 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa', type: 'error' });
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setMessage({ text: 'Mật khẩu mới phải chứa ít nhất 1 số', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Xác nhận mật khẩu mới không khớp', type: 'error' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      setMessage({
        text: 'Đổi mật khẩu thành công! Hệ thống sẽ tự động đăng xuất sau 2 giây...',
        type: 'success',
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Đăng xuất sau 2 giây
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Hồ sơ cá nhân</h1>
      </header>
      <main className="page-main">
        <div className="profile-container">
          <div className="profile-card">
            {/* Tabs */}
            <div className="profile-tabs">
              <button
                className={`profile-tab-btn ${activeTab === 'info' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Thông tin cá nhân
              </button>
              <button
                className={`profile-tab-btn ${activeTab === 'password' ? 'profile-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                Đổi mật khẩu
              </button>
            </div>

            {/* Status Messages */}
            {message && (
              <div className={`profile-status-message profile-status-message--${message.type}`}>
                {message.text}
              </div>
            )}

            {/* Tab 1: Info */}
            {activeTab === 'info' && (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="profile-info-grid">
                  <div className="profile-info-item">
                    <span className="profile-info-label">Email</span>
                    <span className="profile-info-value">{user?.email}</span>
                  </div>

                  <div className="profile-info-item">
                    <span className="profile-info-label">Vai trò</span>
                    <span className="profile-info-value">{user?.role}</span>
                  </div>

                  {user?.studentId && (
                    <div className="profile-info-item">
                      <span className="profile-info-label">Mã số sinh viên (MSSV)</span>
                      <span className="profile-info-value">{user.studentId}</span>
                    </div>
                  )}
                </div>

                <hr style={{ border: '0', borderTop: '1px solid var(--color-border)', margin: '10px 0' }} />

                <div className="form-group">
                  <label htmlFor="fullName">Họ và tên</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Số điện thoại</label>
                  <input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dateOfBirth">Ngày sinh</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Giới tính</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="form-control"
                  >
                    <option value="OTHER">Chưa xác định</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="faculty">Khoa</label>
                  <input
                    id="faculty"
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="VD: Công nghệ thông tin"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="major">Chuyên ngành</label>
                  <input
                    id="major"
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="VD: Kỹ thuật phần mềm"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="course">Khóa / Lớp học</label>
                  <input
                    id="course"
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="VD: K17"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Đang cập nhật...' : 'Lưu thông tin'}
                </button>
              </form>
            )}

            {/* Tab 2: Password */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} className="profile-form">
                <div className="form-group">
                  <label htmlFor="oldPassword">Mật khẩu cũ</label>
                  <input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">Mật khẩu mới</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 chữ số"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', marginTop: '10px' }}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
