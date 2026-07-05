import payos from '@/config/payos.config';
import { env } from '@/config/env';
import type { PayOSCreateLinkResult } from '@/types/payment.types';

// ── PayOS Service ──────────────────────────────────────────────
// Wrapper around PayOS SDK — xử lý tất cả tương tác với PayOS API
export class PayOSService {

  /**
   * Tạo payment link từ PayOS
   */
  static async createPaymentLink(params: {
    orderCode: number;
    amount: number;
    description: string;
    items: Array<{ name: string; quantity: number; price: number }>;
  }): Promise<PayOSCreateLinkResult> {
    const result = await payos.paymentRequests.create({
      orderCode: params.orderCode,
      amount: params.amount,
      description: params.description.slice(0, 25), // PayOS giới hạn 25 ký tự
      items: params.items,
      returnUrl: env.PAYOS_RETURN_URL,
      cancelUrl: env.PAYOS_CANCEL_URL,
    });

    return {
      checkoutUrl: result.checkoutUrl,
      paymentLinkId: result.paymentLinkId,
      qrCode: result.qrCode || '',
    };
  }

  /**
   * Verify webhook data từ PayOS (kiểm tra checksum)
   */
  static async verifyWebhookData(webhookBody: any): Promise<any> {
    return payos.webhooks.verify(webhookBody);
  }

  /**
   * Lấy thông tin payment từ PayOS theo orderCode
   */
  static async getPaymentInfo(orderCode: number) {
    return payos.paymentRequests.get(orderCode);
  }

  /**
   * Hủy payment link
   */
  static async cancelPaymentLink(orderCode: number, reason?: string) {
    return payos.paymentRequests.cancel(orderCode, reason);
  }

  /**
   * Tạo orderCode unique (number, max 9007199254740991)
   * Dùng timestamp 8 chữ số cuối + 4 chữ số random
   */
  static generateOrderCode(): number {
    const timestamp = Date.now() % 100000000; // 8 digits
    const random = Math.floor(Math.random() * 10000); // 4 digits
    return timestamp * 10000 + random;
  }
}
