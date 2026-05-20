import { Router } from 'express';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import { getContracts, getContractById, createContract, terminateContract } from '@/controllers/contract.controller';

const router = Router();

// GET    /api/contracts        — STUDENT xem của mình, ADMIN/STAFF xem tất cả
router.get('/', verifyJWT, getContracts);

// GET    /api/contracts/:id    — authenticated
router.get('/:id', verifyJWT, getContractById);

// POST   /api/contracts        — ADMIN/STAFF only (tạo hợp đồng cho SV)
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), createContract);

// PATCH  /api/contracts/:id/terminate — ADMIN/STAFF only
router.patch('/:id/terminate', verifyJWT, requireRoles('ADMIN', 'STAFF'), terminateContract);

export default router;
