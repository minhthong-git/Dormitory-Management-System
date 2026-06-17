import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '@/services/notification.service';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';

const notificationService = new NotificationService();

// ── GET /api/notifications ─────────────────────────────────────
// Lấy danh sách thông báo của user đang đăng nhập
export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác thực được người dùng', 401);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isRead = req.query.isRead !== undefined
      ? req.query.isRead === 'true'
      : undefined;

    const { notifications, total } = await notificationService.getByUserId(userId, {
      page,
      limit,
      isRead,
    });

    sendPaginated(res, notifications, total, page, limit, 'Lấy danh sách thông báo thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/notifications/unread-count ────────────────────────
// Đếm số thông báo chưa đọc
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác thực được người dùng', 401);

    const count = await notificationService.getUnreadCount(userId);
    sendSuccess(res, { count }, 'Lấy số thông báo chưa đọc thành công');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/:id/read ──────────────────────────
// Đánh dấu 1 thông báo đã đọc
export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác thực được người dùng', 401);

    const { id } = req.params;
    await notificationService.markAsRead(id, userId);
    sendSuccess(res, null, 'Đánh dấu đã đọc thành công');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/read-all ──────────────────────────
// Đánh dấu tất cả thông báo đã đọc
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác thực được người dùng', 401);

    await notificationService.markAllAsRead(userId);
    sendSuccess(res, null, 'Đánh dấu tất cả đã đọc thành công');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/notifications/:id ──────────────────────────────
// Xóa 1 thông báo
export const deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không xác thực được người dùng', 401);

    const { id } = req.params;
    await notificationService.delete(id, userId);
    sendSuccess(res, null, 'Xóa thông báo thành công');
  } catch (err) {
    next(err);
  }
};
