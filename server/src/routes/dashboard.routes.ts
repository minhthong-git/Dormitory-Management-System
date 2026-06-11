import { Router } from 'express';
import { verifyJWT } from '@/middleware/auth';
import { getDashboardStats } from '@/controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard/stats — mọi user đã đăng nhập
router.get('/stats', verifyJWT, getDashboardStats);

export default router;
