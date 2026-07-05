import { prisma } from '@/config/db';
import { PaymentRepository } from '@/repositories/payment.repository';
import { PayOSService } from '@/services/payos.service';
import { BillingService } from '@/services/billing.service';
import { AppError } from '@/middleware/errorHandler';
import { PaymentStatus } from '@/types';

// ── Payment Service ────────────────────────────────────────────
// Business logic cho PayOS payment — orchestrate giữa PayOS, Invoice, Notification
export class PaymentService {
  private paymentRepo: PaymentRepository;
  private billingService: BillingService;

  constructor() {
    this.paymentRepo = new PaymentRepository();
    this.billingService = new BillingService();
  }

  // ── Tạo payment cho invoice ──────────────────────────────────
  async createPayment(invoiceId: string, userId: string) {
    // 1. Validate invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        room: { select: { roomNumber: true } },
        contract: {
          include: {
            student: { select: { userId: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Hóa đơn không tồn tại.', 404);
    }

    // Rule 1: Chỉ UNPAID hoặc OVERDUE mới tạo payment
    if (invoice.paymentStatus === 'PAID') {
      throw new AppError('Hóa đơn này đã được thanh toán.', 400);
    }

    // Rule 3: Kiểm tra duplicate — nếu đã có PENDING transaction, trả lại link cũ
    const existingPending = await this.paymentRepo.findActiveByInvoice(invoiceId);
    if (existingPending && existingPending.checkoutUrl) {
      return {
        transactionId: existingPending.id,
        orderCode: existingPending.orderCode,
        checkoutUrl: existingPending.checkoutUrl,
        qrCode: existingPending.qrCode,
        amount: existingPending.amount,
        isExisting: true,
      };
    }

    // 2. Generate orderCode và tạo PayOS link
    const orderCode = PayOSService.generateOrderCode();
    const roomNum = invoice.room?.roomNumber ?? 'N/A';
    const description = `HD T${invoice.billingMonth} P${roomNum}`;

    const payosResult = await PayOSService.createPaymentLink({
      orderCode,
      amount: invoice.totalAmount,
      description,
      items: [
        {
          name: `Tiền phòng ${roomNum} T${invoice.billingMonth}/${invoice.billingYear}`,
          quantity: 1,
          price: invoice.totalAmount,
        },
      ],
    });

    // 3. Lưu transaction vào DB
    const expiredAt = new Date();
    expiredAt.setMinutes(expiredAt.getMinutes() + 15); // PayOS link hết hạn sau 15 phút

    const transaction = await this.paymentRepo.create({
      invoiceId,
      userId,
      orderCode,
      amount: invoice.totalAmount,
      checkoutUrl: payosResult.checkoutUrl,
      qrCode: payosResult.qrCode,
      expiredAt,
      rawResponse: JSON.stringify(payosResult),
    });

    return {
      transactionId: transaction.id,
      orderCode: transaction.orderCode,
      checkoutUrl: payosResult.checkoutUrl,
      qrCode: payosResult.qrCode,
      amount: invoice.totalAmount,
      isExisting: false,
    };
  }

  // ── Xử lý webhook từ PayOS ───────────────────────────────────
  async handleWebhook(webhookBody: any) {
    // 1. Verify checksum (Rule 4)
    let webhookData: any;
    try {
      webhookData = await PayOSService.verifyWebhookData(webhookBody);
    } catch (err: any) {
      console.error('[PayOS Webhook] Verify failed:', err.message);
      throw new AppError('Webhook verification failed', 400);
    }

    // PayOS confirm webhook test (orderCode = 123)
    if (webhookData && webhookData.orderCode === 123) {
      console.log('[PayOS Webhook] Confirm test webhook received');
      return { test: true };
    }

    const orderCode = webhookData?.orderCode;
    if (!orderCode) {
      console.log('[PayOS Webhook] Missing orderCode — skipping');
      return { skipped: true };
    }

    // 2. Tìm transaction
    const transaction = await this.paymentRepo.findByOrderCode(orderCode);
    if (!transaction) {
      console.error(`[PayOS Webhook] Transaction not found for orderCode: ${orderCode}`);
      return { notFound: true };
    }

    // Rule 5: Idempotent — nếu đã SUCCESS thì skip
    if (transaction.status === 'SUCCESS') {
      console.log(`[PayOS Webhook] Transaction ${transaction.id} already SUCCESS, skipping`);
      return { alreadyProcessed: true };
    }

    // 3. Check if payment is successful
    const isSuccess = webhookData.code === '00' || webhookData.desc === 'success' || webhookData.desc === 'Thành công';

    if (isSuccess) {
      // Rule 6: Cập nhật transaction → Invoice PAID → Notification
      await this.paymentRepo.updateStatus(transaction.id, {
        status: 'SUCCESS',
        paidAt: new Date(),
        providerTransactionId: webhookData.reference || webhookData.paymentLinkId || String(orderCode),
        rawResponse: JSON.stringify(webhookBody),
      });

      // Cập nhật invoice status sang PAID
      await this.billingService.updatePaymentStatus(
        transaction.invoiceId,
        PaymentStatus.PAID,
        new Date()
      );

      console.log(`[PayOS Webhook] Transaction ${transaction.id} → SUCCESS, Invoice ${transaction.invoiceId} → PAID`);
      return { success: true };
    } else {
      // Rule 7/8: Failed/Cancelled — invoice giữ nguyên
      await this.paymentRepo.updateStatus(transaction.id, {
        status: 'FAILED',
        rawResponse: JSON.stringify(webhookBody),
      });

      console.log(`[PayOS Webhook] Transaction ${transaction.id} → FAILED`);
      return { failed: true };
    }
  }

  // ── Lấy payment theo ID ──────────────────────────────────────
  async getPaymentById(id: string) {
    const transaction = await this.paymentRepo.findById(id);
    if (!transaction) {
      throw new AppError('Giao dịch thanh toán không tồn tại.', 404);
    }
    return transaction;
  }

  // ── Lấy payments theo invoice ────────────────────────────────
  async getPaymentsByInvoice(invoiceId: string) {
    return this.paymentRepo.findByInvoiceId(invoiceId);
  }

  // ── Check status từ PayOS (poll) ─────────────────────────────
  async checkAndUpdateStatus(orderCode: number) {
    const transaction = await this.paymentRepo.findByOrderCode(orderCode);
    if (!transaction) {
      throw new AppError('Giao dịch không tồn tại.', 404);
    }

    // Nếu đã có trạng thái cuối, trả luôn
    if (transaction.status !== 'PENDING') {
      return transaction;
    }

    // Poll PayOS
    try {
      const payosInfo = await PayOSService.getPaymentInfo(orderCode);
      const payosStatus = (payosInfo as any)?.status;

      if (payosStatus === 'PAID') {
        await this.paymentRepo.updateStatus(transaction.id, {
          status: 'SUCCESS',
          paidAt: new Date(),
          providerTransactionId: (payosInfo as any)?.id || String(orderCode),
        });

        await this.billingService.updatePaymentStatus(
          transaction.invoiceId,
          PaymentStatus.PAID,
          new Date()
        );

        return { ...transaction, status: 'SUCCESS' };
      } else if (payosStatus === 'CANCELLED') {
        await this.paymentRepo.updateStatus(transaction.id, {
          status: 'CANCELLED',
        });
        return { ...transaction, status: 'CANCELLED' };
      } else if (payosStatus === 'EXPIRED') {
        await this.paymentRepo.updateStatus(transaction.id, {
          status: 'EXPIRED',
        });
        return { ...transaction, status: 'EXPIRED' };
      }
    } catch (err: any) {
      console.log('[PayOS Status] Error checking PayOS:', err.message);
    }

    return transaction;
  }

  // ── Hủy payment ──────────────────────────────────────────────
  async cancelPayment(transactionId: string, userId: string) {
    const transaction = await this.paymentRepo.findById(transactionId);
    if (!transaction) {
      throw new AppError('Giao dịch không tồn tại.', 404);
    }

    // Chỉ owner hoặc ADMIN mới có thể hủy
    if (transaction.userId !== userId) {
      throw new AppError('Bạn không có quyền hủy giao dịch này.', 403);
    }

    if (transaction.status !== 'PENDING') {
      throw new AppError('Chỉ có thể hủy giao dịch đang chờ thanh toán.', 400);
    }

    // Hủy trên PayOS
    try {
      await PayOSService.cancelPaymentLink(transaction.orderCode, 'User cancelled');
    } catch (err: any) {
      console.log('[PayOS Cancel] Error cancelling:', err.message);
    }

    // Cập nhật DB
    await this.paymentRepo.updateStatus(transactionId, {
      status: 'CANCELLED',
    });

    return { message: 'Đã hủy giao dịch thanh toán.' };
  }
}
