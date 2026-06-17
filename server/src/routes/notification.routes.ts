import { Router } from 'express';
import { verifyJWT } from '@/middleware/auth';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '@/controllers/notification.controller';

const router = Router();

// Tất cả routes đều yêu cầu xác thực
router.use(verifyJWT);

// GET    /api/notifications            — Danh sách thông báo (phân trang)
router.get('/', getNotifications);

// GET    /api/notifications/unread-count — Đếm chưa đọc
router.get('/unread-count', getUnreadCount);

// PATCH  /api/notifications/read-all    — Đánh dấu tất cả đã đọc
router.patch('/read-all', markAllAsRead);

// PATCH  /api/notifications/:id/read    — Đánh dấu 1 đã đọc
router.patch('/:id/read', markAsRead);

// DELETE /api/notifications/:id         — Xóa 1 thông báo
router.delete('/:id', deleteNotification);

export default router;
