import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validator';
import { getBeds, getBedById, createBed, updateBed, deleteBed } from '@/controllers/bed.controller';

const router = Router();

// ── Validation rules ───────────────────────────────────────────
const idParamValidation = [param('id').isUUID().withMessage('id không hợp lệ')];

const listValidation = [
  query('roomId').optional({ checkFalsy: true }).isUUID().withMessage('roomId không hợp lệ'),
  query('status').optional({ checkFalsy: true }).isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).withMessage('status không hợp lệ'),
];

const createValidation = [
  body('roomId').isUUID().withMessage('roomId không hợp lệ'),
  body('bedNumber').isInt({ min: 1 }).withMessage('bedNumber phải là số nguyên >= 1'),
  body('bedType').optional({ checkFalsy: true }).isString().withMessage('bedType không hợp lệ'),
  body('status').optional({ checkFalsy: true }).isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).withMessage('status không hợp lệ'),
];

const updateValidation = [
  body('roomId').optional({ checkFalsy: true }).isUUID().withMessage('roomId không hợp lệ'),
  body('bedNumber').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('bedNumber phải là số nguyên >= 1'),
  body('bedType').optional({ checkFalsy: true }).isString().withMessage('bedType không hợp lệ'),
  body('status').optional({ checkFalsy: true }).isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).withMessage('status không hợp lệ'),
];

// ── Routes ─────────────────────────────────────────────────────
router.get('/', verifyJWT, listValidation, validateRequest, getBeds);
router.get('/:id', verifyJWT, idParamValidation, validateRequest, getBedById);
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), createValidation, validateRequest, createBed);
router.put('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), idParamValidation, updateValidation, validateRequest, updateBed);
router.delete('/:id', verifyJWT, requireRoles('ADMIN'), idParamValidation, validateRequest, deleteBed);

export default router;

