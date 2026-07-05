import axiosClient from '@/api/axiosClient';
import type { ApiResponse, PaymentTransaction } from '@/types';

// ── Payment Service ──────────────────────────────────────────────
export const paymentService = {
  // Tạo link thanh toán PayOS
  create: (invoiceId: string) =>
    axiosClient.post<ApiResponse<{
      transactionId: string;
      orderCode: number;
      checkoutUrl: string;
      qrCode: string;
      amount: number;
      isExisting: boolean;
    }>>('/payments/create', { invoiceId }),

  // Kiểm tra trạng thái thanh toán từ PayOS
  getStatus: (orderCode: number) =>
    axiosClient.get<ApiResponse<PaymentTransaction>>(`/payments/status/${orderCode}`),

  // Lấy các giao dịch thanh toán của hóa đơn
  getByInvoiceId: (invoiceId: string) =>
    axiosClient.get<ApiResponse<PaymentTransaction[]>>(`/payments/invoice/${invoiceId}`),

  // Hủy giao dịch thanh toán
  cancel: (transactionId: string) =>
    axiosClient.post<ApiResponse<{ message: string }>>(`/payments/cancel/${transactionId}`),
};
