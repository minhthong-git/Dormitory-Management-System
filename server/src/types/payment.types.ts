// ── Payment Transaction Status ─────────────────────────────────
export type PaymentTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

// ── Create Payment DTO ─────────────────────────────────────────
export interface CreatePaymentDto {
  invoiceId: string;
}

// ── PayOS Create Link Params ───────────────────────────────────
export interface PayOSCreateLinkParams {
  orderCode: number;
  amount: number;
  description: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  returnUrl: string;
  cancelUrl: string;
}

// ── PayOS Create Link Result ───────────────────────────────────
export interface PayOSCreateLinkResult {
  checkoutUrl: string;
  paymentLinkId: string;
  qrCode: string;
}

// ── PayOS Webhook Data ─────────────────────────────────────────
export interface PayOSWebhookData {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber: string;
  reference: string;
  transactionDateTime: string;
  currency: string;
  paymentLinkId: string;
  code: string;
  desc: string;
  counterAccountBankId: string;
  counterAccountBankName: string;
  counterAccountName: string;
  counterAccountNumber: string;
  virtualAccountName: string;
  virtualAccountNumber: string;
}
