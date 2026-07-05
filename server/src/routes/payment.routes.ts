import { Router } from 'express';
import { verifyJWT } from '@/middleware/auth';
import {
  createPayment,
  getPaymentById,
  getPaymentsByInvoice,
  payosWebhook,
  getPaymentStatus,
  cancelPayment,
} from '@/controllers/payment.controller';

const router = Router();

// ── PayOS Webhook — PUBLIC (không auth) ────────────────────────
router.post('/webhook', payosWebhook);

// ── Protected routes (cần auth) ────────────────────────────────
// POST /api/payments/create — Student tạo payment link
router.post('/create', verifyJWT, createPayment);

// GET /api/payments/status/:orderCode — Check trạng thái (poll PayOS)
router.get('/status/:orderCode', verifyJWT, getPaymentStatus);

// GET /api/payments/invoice/:invoiceId — Lấy transactions theo invoice
router.get('/invoice/:invoiceId', verifyJWT, getPaymentsByInvoice);

// POST /api/payments/cancel/:id — Hủy giao dịch đang chờ
router.post('/cancel/:id', verifyJWT, cancelPayment);

// GET /api/payments/:id — Chi tiết giao dịch
router.get('/:id', verifyJWT, getPaymentById);

export default router;
