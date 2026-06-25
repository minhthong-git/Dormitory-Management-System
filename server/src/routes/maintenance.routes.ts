import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import {
  createRequest,
  getMyRequests,
  getAllRequests,
  assignStaff,
  updateRequestStatus,
  submitRequestFeedback,
} from '@/controllers/maintenance.controller';

const router = Router();

// Tất cả các tuyến đường liên quan đến bảo trì đều yêu cầu đăng nhập
router.use(verifyJWT);

// Sinh viên báo sự cố & xem danh sách của mình
router.post('/', requireRoles('STUDENT'), createRequest);
router.get('/my-requests', requireRoles('STUDENT'), getMyRequests);

// Quản lý xem toàn bộ sự cố trong ký túc xá
router.get('/', requireRoles('ADMIN', 'STAFF'), getAllRequests);

// Phân công nhân viên sửa chữa
router.patch('/:id/assign', requireRoles('ADMIN', 'STAFF'), assignStaff);

// Cập nhật trạng thái sự cố (Staff đổi trạng thái bất kỳ, Student chỉ được phép Hủy của chính mình)
router.patch('/:id/status', updateRequestStatus);

// Sinh viên đánh giá chất lượng sửa chữa cho các yêu cầu đã hoàn thành (RESOLVED)
router.post('/:id/feedback', requireRoles('STUDENT'), submitRequestFeedback);

export default router;
