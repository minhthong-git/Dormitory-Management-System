import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { sendError } from '@/utils/response';
import type { UserRole, JwtPayload } from '@/types';

// ── verifyJWT ──────────────────────────────────────────────────
/**
 * Middleware xác thực JWT.
 * Nếu token hợp lệ, gắn payload vào req.user và chuyển tiếp.
 */
export const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Không tìm thấy token xác thực', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded as JwtPayload;
    next();
  } catch {
    sendError(res, 'Token không hợp lệ hoặc đã hết hạn', 401);
  }
};

// ── checkRole ──────────────────────────────────────────────────
/**
 * Middleware kiểm tra role. Phải dùng sau verifyJWT.
 * @example router.get('/admin', verifyJWT, checkRole('ADMIN'), handler)
 */
export const checkRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      sendError(res, 'Bạn không có quyền thực hiện hành động này', 403);
      return;
    }
    next();
  };
};

// Alias — cùng chức năng với checkRole
export const requireRoles = checkRole;
