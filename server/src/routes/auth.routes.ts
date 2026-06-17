import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, refresh, logout, getMe } from '@/controllers/auth.controller';
import { verifyJWT } from '@/middleware/auth';

const router = Router();

// ── Validation rules ───────────────────────────────────────────
const registerValidation = [
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Mật khẩu phải có ít nhất 8 ký tự')
    .matches(/[A-Z]/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ hoa')
    .matches(/[0-9]/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 số'),
  body('fullName').trim().notEmpty().withMessage('Họ tên không được để trống'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
];

// ── Routes ─────────────────────────────────────────────────────

// POST   /api/auth/register
router.post('/register', registerValidation, register);

// POST   /api/auth/login
router.post('/login', loginValidation, login);

// POST   /api/auth/refresh
router.post('/refresh', refresh);

// POST   /api/auth/logout
router.post('/logout', verifyJWT, logout);

// GET    /api/auth/me
router.get('/me', verifyJWT, getMe);

export default router;
