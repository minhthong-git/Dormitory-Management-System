import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth.api';
import type { RegisterPayload } from '@/types';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1); // 1: form, 2: otp
  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    password: '',
    fullName: '',
    studentId: '',
    phone: '',
  });
  const [otp, setOtp] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await register(form);
      setSuccessMsg('Mã xác nhận đã được gửi đến email của bạn.');
      setStep(2);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await authApi.verifyEmail({ email: form.email, otp });
      setSuccessMsg('Xác nhận thành công! Tài khoản đã được kích hoạt.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Mã xác nhận không đúng hoặc đã hết hạn.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">{step === 1 ? 'Đăng ký tài khoản' : 'Xác thực Email'}</h1>
          <p className="auth-subtitle">Hệ thống Quản lý Ký túc xá</p>
        </div>

        {error && <div className="form-error-banner">{error}</div>}
        {successMsg && <div className="form-success-banner" style={{ padding: '0.75rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{successMsg}</div>}

        {step === 1 ? (
          <form onSubmit={handleRegisterSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="fullName">Họ và tên <span style={{color: 'red'}}>*</span></label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email <span style={{color: 'red'}}>*</span></label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="sv@university.edu.vn"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mật khẩu <span style={{color: 'red'}}>*</span></label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="studentId">Mã số sinh viên</label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                value={form.studentId}
                onChange={handleChange}
                placeholder="SV123456"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="0912345678"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="auth-form" noValidate>
            <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
              Vui lòng nhập mã xác nhận 6 số vừa được gửi đến email <strong>{form.email}</strong>
            </p>
            <div className="form-group">
              <label htmlFor="otp">Mã xác nhận (OTP)</label>
              <input
                id="otp"
                name="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                required
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
              {isSubmitting ? 'Đang xác thực...' : 'Xác thực tài khoản'}
            </button>
          </form>
        )}

        {step === 1 && (
          <p className="auth-footer">
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập ngay
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
