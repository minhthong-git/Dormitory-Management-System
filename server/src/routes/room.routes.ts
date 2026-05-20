import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import { getRooms, getRoomById, createRoom, updateRoom, deleteRoom } from '@/controllers/room.controller';

const router = Router();

// GET  /api/rooms         — tất cả user đã login
router.get('/', verifyJWT, getRooms);

// GET  /api/rooms/:id     — tất cả user đã login
router.get('/:id', verifyJWT, getRoomById);

// POST /api/rooms         — ADMIN/STAFF only
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), createRoom);

// PUT  /api/rooms/:id     — ADMIN/STAFF only
router.put('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), updateRoom);

// DELETE /api/rooms/:id   — ADMIN only
router.delete('/:id', verifyJWT, requireRoles('ADMIN'), deleteRoom);

export default router;
