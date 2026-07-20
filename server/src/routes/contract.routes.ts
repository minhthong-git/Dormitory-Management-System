import { Router } from 'express';
import { body } from 'express-validator';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validator';
import {
  getContracts,
  getContractById,
  createContract,
  terminateContract,
  checkIn,
  checkOut,
  transferBed,
  updateContract,
  extendContract,
  deleteContract,
  bookBed,
  approveContract,
  rejectContract,
  renewContract,
  cancelContract
} from '@/controllers/contract.controller';

const router = Router();

// ── Validation rules ───────────────────────────────────────────
const createContractValidation = [
  body('studentId').isUUID().withMessage('studentId không hợp lệ'),
  body('bedId').isUUID().withMessage('bedId không hợp lệ'),
  body('startDate').isISO8601().withMessage('startDate phải là ISO date'),
  body('endDate').isISO8601().withMessage('endDate phải là ISO date'),
  body('price').isFloat({ gt: 0 }).withMessage('price phải > 0'),
];

const checkInValidation = [
  body('studentId').isUUID().withMessage('studentId không hợp lệ'),
  body('bedId').isUUID().withMessage('bedId không hợp lệ'),
];

const checkOutValidation = [body('contractId').isUUID().withMessage('contractId không hợp lệ')];

const transferValidation = [
  body('studentId').isUUID().withMessage('studentId không hợp lệ'),
  body('newBedId').isUUID().withMessage('newBedId không hợp lệ'),
  body('reason').optional({ checkFalsy: true }).isString().withMessage('reason không hợp lệ'),
];

// GET    /api/contracts        — STUDENT xem của mình, ADMIN/STAFF xem tất cả
router.get('/', verifyJWT, getContracts);

// GET    /api/contracts/:id    — authenticated
router.get('/:id', verifyJWT, getContractById);

// POST   /api/contracts        — ADMIN/STAFF only (tạo hợp đồng cho SV)
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), createContractValidation, validateRequest, createContract);

// POST   /api/contracts/book   — STUDENT tự đặt phòng
router.post('/book', verifyJWT, bookBed);

// POST   /api/contracts/:id/renew — STUDENT gia hạn phòng
router.post('/:id/renew', verifyJWT, renewContract);

// PATCH  /api/contracts/:id/approve — ADMIN/STAFF duyệt phòng
router.patch('/:id/approve', verifyJWT, requireRoles('ADMIN', 'STAFF'), approveContract);

// PATCH  /api/contracts/:id/cancel  — STUDENT tự hủy đăng ký
router.patch('/:id/cancel', verifyJWT, cancelContract);

// PATCH  /api/contracts/:id/reject  — ADMIN/STAFF từ chối phòng
router.patch('/:id/reject', verifyJWT, requireRoles('ADMIN', 'STAFF'), rejectContract);

// POST   /api/contracts/check-in — ADMIN/STAFF only
router.post('/check-in', verifyJWT, requireRoles('ADMIN', 'STAFF'), checkInValidation, validateRequest, checkIn);

// POST   /api/contracts/check-out — ADMIN/STAFF only
router.post('/check-out', verifyJWT, requireRoles('ADMIN', 'STAFF'), checkOutValidation, validateRequest, checkOut);

// POST   /api/contracts/transfer — ADMIN/STAFF only
router.post('/transfer', verifyJWT, requireRoles('ADMIN', 'STAFF'), transferValidation, validateRequest, transferBed);

// PATCH  /api/contracts/:id/terminate — ADMIN/STAFF only
router.patch('/:id/terminate', verifyJWT, requireRoles('ADMIN', 'STAFF'), terminateContract);

// PUT    /api/contracts/:id — ADMIN/STAFF only
router.put('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), updateContract);

// PATCH  /api/contracts/:id/extend — ADMIN/STAFF only
router.patch('/:id/extend', verifyJWT, requireRoles('ADMIN', 'STAFF'), extendContract);

// DELETE /api/contracts/:id — ADMIN/STAFF only
router.delete('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), deleteContract);

export default router;
