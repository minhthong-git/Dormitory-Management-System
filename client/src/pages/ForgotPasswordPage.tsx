import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/api/auth.api';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Luồng 2 bước:
  // 1: Nhập email gửi OTP
  // 2: Nhập OTP và mật khẩu mới
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Rate limit cooldown state
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer logic
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email) {
      setMessage({ text: 'Vui lòng nhập email', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setMessage({
        text: 'Mã OTP đã được gửi. Vui lòng kiểm tra email của bạn.',
        type: 'success',
      });
      setCooldown(60); // Đặt cooldown 60 giây
      setStep(2);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setMessage(null);

    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setMessage({
        text: 'Mã OTP mới đã được gửi lại vào email của bạn.',
        type: 'success',
      });
      setCooldown(60);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!otp || !newPassword || !confirmPassword) {
      setMessage({ text: 'Vui lòng nhập đầy đủ thông tin', type: 'error' });
      return;
    }

    if (otp.length !== 6 || isNaN(Number(otp))) {
      setMessage({ text: 'Mã OTP phải có đúng 6 chữ số', type: 'error' });
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

    setIsLoading(true);
    try {
      await authApi.resetPassword({ email, otp, newPassword });
      setMessage({
        text: 'Đặt lại mật khẩu thành công! Bạn sẽ được chuyển hướng về trang đăng nhập sau 2 giây...',
        type: 'success',
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.';
      setMessage({ text: errMsg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-title">Quên mật khẩu</h1>
          <p className="auth-subtitle">
            {step === 1
              ? 'Nhập email của bạn để nhận mã OTP khôi phục mật khẩu'
              : 'Nhập mã OTP và mật khẩu mới của bạn'}
          </p>
        </header>

        {message && (
          <div
            className={`profile-status-message profile-status-message--${message.type}`}
            style={{ marginBottom: '16px' }}
          >
            {message.text}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              {isLoading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            {/* Hidden email input to assist browser password manager */}
            <input
              type="hidden"
              name="username"
              value={email}
              autoComplete="username"
              readOnly
            />

            <div className="form-group">
              <label htmlFor="otp">Mã xác nhận (OTP)</label>
              <input
                id="otp"
                type="text"
                maxLength={6}
                placeholder="Nhập mã 6 chữ số"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="one-time-code"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <input
                id="newPassword"
                type="password"
                placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 chữ số"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={handleResendOtp}
                style={{
                  background: 'none',
                  border: 'none',
                  color: cooldown > 0 ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
                disabled={cooldown > 0 || isLoading}
              >
                {cooldown > 0 ? `Gửi lại mã sau (${cooldown}s)` : 'Gửi lại mã OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                disabled={isLoading}
              >
                Thay đổi email
              </button>
            </div>
          </form>
        )}

        <footer className="auth-footer">
          <Link to="/login" className="auth-link">
            Quay lại trang Đăng nhập
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
