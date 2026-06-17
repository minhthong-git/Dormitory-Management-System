import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { hashPassword, comparePassword } from '@/utils/bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { sendSuccess } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { sendVerificationEmail, sendResetPasswordEmail } from '@/utils/mailer';
import type { UserRole } from '@/types';

// ── Cấu hình Brute Force ────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// ── POST /api/auth/register ────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, fullName, studentId, phone } = req.body;

    // Kiểm tra email đã tồn tại
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email đã được sử dụng', 409);
    }

    const hashedPassword = await hashPassword(password);
    
    // Tạo OTP 6 số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Hạn sử dụng OTP: 10 phút
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        studentId,
        phone,
        role: 'STUDENT',
        status: 'PENDING',
        verificationToken: otp,
        verificationExpires: otpExpires,
      },
      select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
    });

    // Gửi email
    await sendVerificationEmail(email, otp);

    sendSuccess(res, { email: user.email }, 'Đăng ký thành công, vui lòng kiểm tra email để nhận mã xác nhận', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/verify-email ────────────────────────────────
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError('Email và mã xác nhận là bắt buộc', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 404);
    }

    if (user.status === 'ACTIVE') {
      throw new AppError('Tài khoản này đã được kích hoạt', 400);
    }

    if (user.verificationToken !== otp) {
      throw new AppError('Mã xác nhận không đúng', 400);
    }

    if (!user.verificationExpires || user.verificationExpires < new Date()) {
      throw new AppError('Mã xác nhận đã hết hạn', 400);
    }

    // Cập nhật trạng thái thành ACTIVE và xóa mã OTP
    await prisma.user.update({
      where: { email },
      data: {
        status: 'ACTIVE',
        verificationToken: null,
        verificationExpires: null,
      },
    });

    sendSuccess(res, null, 'Xác nhận email thành công, bạn có thể đăng nhập ngay bây giờ', 200);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ───────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // ── 1. Validation cơ bản ────────────────────────────────────
    if (!email || !password) {
      throw new AppError('Email và mật khẩu là bắt buộc', 400);
    }

    // ── 2. Tìm user theo email ──────────────────────────────────
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Không tiết lộ email có tồn tại hay không
      throw new AppError('Email hoặc mật khẩu không đúng', 401);
    }

    // ── 3. Kiểm tra tài khoản đang bị khóa tạm thời ────────────
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
      );
      throw new AppError(
        `Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${minutesLeft} phút.`,
        423
      );
    }

    // ── 4. Kiểm tra trạng thái tài khoản ───────────────────────
    const statusMessages: Record<string, string> = {
      PENDING: 'Tài khoản của bạn đang chờ được quản trị viên duyệt.',
      REJECTED: 'Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên.',
      BANNED: 'Tài khoản của bạn đã bị cấm. Vui lòng liên hệ quản trị viên.',
    };

    if (user.status !== 'ACTIVE') {
      const message = statusMessages[user.status] ?? 'Tài khoản không hợp lệ.';
      throw new AppError(message, 403);
    }

    // ── 5. Kiểm tra mật khẩu ───────────────────────────────────
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      const newFailedCount = user.failedLoginCount + 1;

      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        // Khóa tài khoản 15 phút
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil },
        });
        throw new AppError(
          `Sai mật khẩu quá ${MAX_FAILED_ATTEMPTS} lần. Tài khoản bị khóa ${LOCK_DURATION_MINUTES} phút.`,
          423
        );
      }

      // Chưa đủ số lần → cập nhật đếm và thông báo số lần còn lại
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: newFailedCount },
      });

      const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedCount;
      throw new AppError(
        `Thông tin đăng nhập không đúng. Còn ${attemptsLeft} lần thử trước khi bị khóa.`,
        401
      );
    }

    // ── 6. Đăng nhập thành công: reset bộ đếm ──────────────────
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    // ── 7. Tạo JWT ──────────────────────────────────────────────
    const payload = { sub: user.id, email: user.email, role: user.role as UserRole };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // ── 8. Trả về response (ẩn password, failedLoginCount, lockedUntil) ──
    const safeUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      studentId: user.studentId,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };

    sendSuccess(
      res,
      { accessToken, refreshToken, user: safeUser },
      'Đăng nhập thành công'
    );
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/refresh ─────────────────────────────────────
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token không được cung cấp', 400);

    const decoded = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    });

    sendSuccess(res, { accessToken }, 'Token đã được làm mới');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/logout ──────────────────────────────────────
export const logout = async (_req: Request, res: Response): Promise<void> => {
  // Stateless JWT: client xóa token. Nếu cần blacklist, implement ở đây.
  sendSuccess(res, null, 'Đăng xuất thành công');
};

// ── GET /api/auth/me ───────────────────────────────────────────
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác định được người dùng', 401);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, user, 'Lấy thông tin người dùng thành công');
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/auth/me (Cập nhật hồ sơ cá nhân) ─────────────────────
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác định được người dùng', 401);

    const { fullName, phone, avatarUrl } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { fullName, phone, avatarUrl },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    sendSuccess(res, updated, 'Cập nhật hồ sơ cá nhân thành công');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/auth/me/password (Người dùng tự đổi mật khẩu) ───────
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác định được người dùng', 401);

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new AppError('Mật khẩu cũ và mật khẩu mới là bắt buộc', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    const isMatch = await comparePassword(oldPassword, user.password);
    if (!isMatch) {
      throw new AppError('Mật khẩu cũ không chính xác', 400);
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    sendSuccess(res, null, 'Đổi mật khẩu thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/forgot-password (Quên mật khẩu - gửi OTP) ────────
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email là bắt buộc', 400);

    const user = await prisma.user.findUnique({ where: { email } });

    // Để tránh timing attack phân biệt email tồn tại hay không,
    // ta chạy các bước hash và delay giả lập cho email không tồn tại.
    if (!user) {
      // Giả lập thời gian bằng cách hash một chuỗi rác
      await hashPassword('dummy_password');
      // Trả về 200 thành công giả
      sendSuccess(res, null, 'Nếu email tồn tại trên hệ thống, mã OTP đã được gửi về email của bạn');
      return;
    }

    // Rate Limit: Kiểm tra khoảng cách gửi OTP gần nhất (60 giây)
    const now = new Date();
    if (user.resetPasswordLastSent) {
      const diffMs = now.getTime() - new Date(user.resetPasswordLastSent).getTime();
      if (diffMs < 60 * 1000) {
        const secondsLeft = Math.ceil((60 * 1000 - diffMs) / 1000);
        throw new AppError(`Vui lòng đợi ${secondsLeft} giây trước khi yêu cầu mã OTP mới`, 429);
      }
    }

    // Sinh OTP ngẫu nhiên 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Mã hoá OTP bằng bcrypt trước khi lưu vào DB
    const hashedOtp = await hashPassword(otp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedOtp,
        resetPasswordExpires: otpExpires,
        resetPasswordLastSent: now,
      },
    });

    // Gửi email chứa mã OTP
    await sendResetPasswordEmail(email, otp);

    sendSuccess(res, null, 'Nếu email tồn tại trên hệ thống, mã OTP đã được gửi về email của bạn');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/reset-password (Quên mật khẩu - xác nhận OTP & mật khẩu mới) ──
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      throw new AppError('Email, mã OTP và mật khẩu mới là bắt buộc', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      throw new AppError('Yêu cầu khôi phục mật khẩu không hợp lệ', 400);
    }

    // Kiểm tra hết hạn
    if (new Date(user.resetPasswordExpires) < new Date()) {
      throw new AppError('Mã OTP đã hết hạn', 400);
    }

    // So sánh OTP
    const isOtpMatch = await comparePassword(otp, user.resetPasswordToken);
    if (!isOtpMatch) {
      throw new AppError('Mã OTP không chính xác', 400);
    }

    // Mã hoá mật khẩu mới và reset token
    const hashedPass = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPass,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    sendSuccess(res, null, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
  } catch (err) {
    next(err);
  }
};

