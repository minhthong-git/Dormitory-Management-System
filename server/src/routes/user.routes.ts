import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import { getUsers, getUserById, updateUser, deleteUser, resetPassword } from '@/controllers/user.controller';

const router = Router();

// GET    /api/users           — ADMIN/STAFF only
router.get('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), getUsers);

// GET    /api/users/:id       — ADMIN/STAFF only
router.get('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), getUserById);

// PUT    /api/users/:id       — ADMIN/STAFF only
router.put('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), updateUser);

// DELETE /api/users/:id       — ADMIN only
router.delete('/:id', verifyJWT, requireRoles('ADMIN'), deleteUser);

// PATCH  /api/users/:id/password — ADMIN only
router.patch('/:id/password', verifyJWT, requireRoles('ADMIN'), resetPassword);

export default router;
