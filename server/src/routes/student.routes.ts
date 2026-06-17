import { Router } from 'express';
import { body, param } from 'express-validator';
import { verifyJWT, requireRoles } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validator';
import { getStudents, getStudentById, createStudent, updateStudent, deleteStudent } from '@/controllers/student.controller';

const router = Router();

// ── Validation rules ───────────────────────────────────────────
const idParamValidation = [param('id').isUUID().withMessage('id không hợp lệ')];

const createValidation = [
  body('studentCode').trim().notEmpty().withMessage('studentCode không được để trống'),
  body('fullName').trim().notEmpty().withMessage('fullName không được để trống'),
  body('gender').isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('gender không hợp lệ'),
  body('email').isEmail().withMessage('email không hợp lệ').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('phone không hợp lệ'),
  body('faculty').optional({ checkFalsy: true }).isString().withMessage('faculty không hợp lệ'),
  body('major').optional({ checkFalsy: true }).isString().withMessage('major không hợp lệ'),
  body('status').optional({ checkFalsy: true }).isIn(['ACTIVE', 'INACTIVE']).withMessage('status không hợp lệ'),
  body('userId').optional({ checkFalsy: true }).isUUID().withMessage('userId không hợp lệ'),
];

const updateValidation = [
  body('studentCode').optional({ checkFalsy: true }).trim().notEmpty().withMessage('studentCode không hợp lệ'),
  body('fullName').optional({ checkFalsy: true }).trim().notEmpty().withMessage('fullName không hợp lệ'),
  body('gender').optional({ checkFalsy: true }).isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('gender không hợp lệ'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('email không hợp lệ').normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('phone không hợp lệ'),
  body('faculty').optional({ checkFalsy: true }).isString().withMessage('faculty không hợp lệ'),
  body('major').optional({ checkFalsy: true }).isString().withMessage('major không hợp lệ'),
  body('status').optional({ checkFalsy: true }).isIn(['ACTIVE', 'INACTIVE']).withMessage('status không hợp lệ'),
  body('userId').optional({ checkFalsy: true }).isUUID().withMessage('userId không hợp lệ'),
];

// ── Routes ─────────────────────────────────────────────────────
router.get('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), getStudents);
router.get('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), idParamValidation, validateRequest, getStudentById);
router.post('/', verifyJWT, requireRoles('ADMIN', 'STAFF'), createValidation, validateRequest, createStudent);
router.put('/:id', verifyJWT, requireRoles('ADMIN', 'STAFF'), idParamValidation, updateValidation, validateRequest, updateStudent);
router.delete('/:id', verifyJWT, requireRoles('ADMIN'), idParamValidation, validateRequest, deleteStudent);

export default router;

