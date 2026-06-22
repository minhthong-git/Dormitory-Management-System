import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import {
  getAssets,
  getMyRoomAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
} from '@/controllers/asset.controller';

const router = Router();

// Tất cả các tuyến đường liên quan đến tài sản đều yêu cầu đăng nhập
router.use(verifyJWT);

// GET    /api/assets/my-room - Lấy tài sản của phòng sinh viên hiện tại
router.get('/my-room', getMyRoomAssets);

// Chỉ ADMIN và STAFF mới được quyền quản lý tài sản chung
router.get('/', requireRoles('ADMIN', 'STAFF'), getAssets);
router.get('/:id', requireRoles('ADMIN', 'STAFF'), getAssetById);
router.post('/', requireRoles('ADMIN', 'STAFF'), createAsset);
router.put('/:id', requireRoles('ADMIN', 'STAFF'), updateAsset);
router.delete('/:id', requireRoles('ADMIN', 'STAFF'), deleteAsset);

export default router;
