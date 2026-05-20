import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { hashPassword, comparePassword } from '@/utils/bcrypt';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { sendSuccess } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import type { UserRole } from '@/types';

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

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, fullName, studentId, phone, role: 'STUDENT' },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    const payload = { sub: user.id, email: user.email, role: user.role as UserRole };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    sendSuccess(res, { accessToken, refreshToken, user }, 'Đăng ký thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ───────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Email hoặc mật khẩu không đúng', 401);

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) throw new AppError('Email hoặc mật khẩu không đúng', 401);

    const payload = { sub: user.id, email: user.email, role: user.role as UserRole };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      studentId: user.studentId,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    };

    sendSuccess(res, { accessToken, refreshToken, user: safeUser }, 'Đăng nhập thành công');
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
