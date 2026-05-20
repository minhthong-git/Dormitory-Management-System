import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { hashPassword } from '@/utils/bcrypt';

// ── GET /api/users ────────────────────────────────────────────
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { studentId: { contains: search } },
      ];
    }

    const select = {
      id: true, email: true, fullName: true, role: true,
      studentId: true, phone: true, avatarUrl: true,
      createdAt: true, updatedAt: true,
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({ where, skip, take: limit, select, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    sendPaginated(res, users, total, page, limit, 'Lấy danh sách người dùng thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id ────────────────────────────────────────
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, fullName: true, role: true,
        studentId: true, phone: true, avatarUrl: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new AppError('Người dùng không tồn tại', 404);
    sendSuccess(res, user, 'Lấy thông tin người dùng thành công');
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/:id ────────────────────────────────────────
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, phone } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Người dùng không tồn tại', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { fullName, phone },
      select: {
        id: true, email: true, fullName: true, role: true,
        studentId: true, phone: true, avatarUrl: true,
        createdAt: true, updatedAt: true,
      },
    });
    sendSuccess(res, updated, 'Cập nhật thông tin thành công');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/:id (Admin only) ────────────────────────
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Người dùng không tồn tại', 404);
    await prisma.user.delete({ where: { id } });
    sendSuccess(res, null, 'Xóa người dùng thành công');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/password (Admin reset password) ──────
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) throw new AppError('Mật khẩu phải có ít nhất 8 ký tự', 400);

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    sendSuccess(res, null, 'Đặt lại mật khẩu thành công');
  } catch (err) {
    next(err);
  }
};
