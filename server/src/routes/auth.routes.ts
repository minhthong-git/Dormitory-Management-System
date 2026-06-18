import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  verifyEmail,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
} from '@/controllers/auth.controller';
import { verifyJWT } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validator';

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

const updateProfileValidation = [
  body('fullName').trim().notEmpty().withMessage('Họ tên không được để trống'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Số điện thoại không hợp lệ'),
];

const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Mật khẩu cũ không được để trống'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
    .matches(/[A-Z]/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ hoa')
    .matches(/[0-9]/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 số'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
];

const resetPasswordValidation = [
  body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Mã OTP phải có đúng 6 chữ số'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
    .matches(/[A-Z]/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ hoa')
    .matches(/[0-9]/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 số'),
];

// ── Routes ─────────────────────────────────────────────────────

// POST   /api/auth/register
router.post('/register', registerValidation, validateRequest, register);

// POST   /api/auth/verify-email
router.post('/verify-email', verifyEmail);

// POST   /api/auth/login
router.post('/login', loginValidation, validateRequest, login);

// POST   /api/auth/refresh
router.post('/refresh', refresh);

// POST   /api/auth/logout
router.post('/logout', verifyJWT, logout);

// GET    /api/auth/me
router.get('/me', verifyJWT, getMe);

// PUT    /api/auth/me
router.put('/me', verifyJWT, updateProfileValidation, validateRequest, updateProfile);

// PATCH  /api/auth/me/password
router.patch('/me/password', verifyJWT, changePasswordValidation, validateRequest, changePassword);

// POST   /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordValidation, validateRequest, forgotPassword);

// POST   /api/auth/reset-password
router.post('/reset-password', resetPasswordValidation, validateRequest, resetPassword);

export default router;
