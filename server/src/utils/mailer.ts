import nodemailer from 'nodemailer';
import { env } from '@/config/env';

// Khởi tạo transporter bằng tài khoản Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (toEmail: string, otp: string) => {
  const mailOptions = {
    from: `"KTX Dormitory Admin" <${env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Mã xác nhận kích hoạt tài khoản Ký túc xá',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a; text-align: center;">Xác nhận tài khoản</h2>
        <p>Chào bạn,</p>
        <p>Bạn vừa đăng ký tài khoản trên Hệ thống Quản lý Ký túc xá. Vui lòng sử dụng mã xác nhận dưới đây để kích hoạt tài khoản của bạn:</p>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 6px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #ef4444; font-size: 14px;">Mã này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        <br />
        <p>Trân trọng,<br />Ban quản lý KTX</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Không thể gửi email xác nhận. Vui lòng kiểm tra lại cấu hình.');
  }
};
