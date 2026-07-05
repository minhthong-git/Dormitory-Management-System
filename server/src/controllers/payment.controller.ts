import { Response, NextFunction } from 'express';
import { PaymentService } from '@/services/payment.service';
import { sendSuccess, sendError } from '@/utils/response';
import type { AuthRequest } from '@/types';

const paymentService = new PaymentService();

// ── POST /api/payments/create ──────────────────────────────────
// Student tạo payment link cho invoice
export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      sendError(res, 'Vui lòng cung cấp invoiceId', 400);
      return;
    }

    const result = await paymentService.createPayment(invoiceId, req.user!.sub);

    const message = result.isExisting
      ? 'Đã có link thanh toán chưa hết hạn'
      : 'Tạo link thanh toán PayOS thành công';

    sendSuccess(res, result, message, result.isExisting ? 200 : 201);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/payments/:id ──────────────────────────────────────
// Xem chi tiết giao dịch
export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const transaction = await paymentService.getPaymentById(id);
    sendSuccess(res, transaction, 'Lấy thông tin giao dịch thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/payments/invoice/:invoiceId ───────────────────────
// Lấy tất cả transactions theo invoice
export const getPaymentsByInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const transactions = await paymentService.getPaymentsByInvoice(invoiceId);
    sendSuccess(res, transactions, 'Lấy lịch sử giao dịch thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/payments/webhook ─────────────────────────────────
// PayOS webhook — PUBLIC, không auth
export const payosWebhook = async (req: AuthRequest, res: Response, _next: NextFunction): Promise<void> => {
  try {
    console.log('[PayOS Webhook] Received:', JSON.stringify(req.body));
    const result = await paymentService.handleWebhook(req.body);
    sendSuccess(res, result, 'Webhook processed');
  } catch (err: any) {
    console.error('[PayOS Webhook] Error:', err.message);
    // Luôn trả 200 để PayOS không retry liên tục
    sendSuccess(res, { error: err.message }, 'Webhook received with error');
  }
};

// ── GET /api/payments/status/:orderCode ────────────────────────
// Check trạng thái payment (poll PayOS nếu cần)
export const getPaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderCode = parseInt(req.params.orderCode, 10);
    if (isNaN(orderCode)) {
      sendError(res, 'orderCode không hợp lệ', 400);
      return;
    }

    const transaction = await paymentService.checkAndUpdateStatus(orderCode);
    sendSuccess(res, transaction, 'Lấy trạng thái thanh toán thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/payments/cancel/:id ──────────────────────────────
// Hủy giao dịch đang chờ
export const cancelPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await paymentService.cancelPayment(id, req.user!.sub);
    sendSuccess(res, result, 'Hủy giao dịch thành công');
  } catch (err) {
    next(err);
  }
};
