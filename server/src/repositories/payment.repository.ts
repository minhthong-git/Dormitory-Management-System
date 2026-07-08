import { prisma } from '@/config/db';
import type { PaymentTransactionStatus } from '@/types/payment.types';

// ── Payment Repository ─────────────────────────────────────────
// Data access layer cho PaymentTransaction
export class PaymentRepository {

  // Tạo mới payment transaction
  async create(data: {
    invoiceId: string;
    userId: string;
    orderCode: number;
    amount: number;
    checkoutUrl?: string;
    qrCode?: string;
    paymentUrl?: string;
    expiredAt?: Date;
    rawResponse?: string;
  }) {
    return prisma.paymentTransaction.create({ data });
  }

  // Tìm theo ID
  async findById(id: string) {
    return prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            room: { select: { roomNumber: true } },
            contract: {
              include: {
                student: { select: { fullName: true, studentCode: true } },
              },
            },
          },
        },
      },
    });
  }

  // Tìm theo orderCode (PayOS dùng orderCode làm key)
  async findByOrderCode(orderCode: number) {
    return prisma.paymentTransaction.findUnique({
      where: { orderCode },
      include: {
        invoice: {
          include: {
            room: { select: { roomNumber: true } },
            contract: {
              include: {
                student: { select: { fullName: true, studentCode: true, userId: true } },
              },
            },
          },
        },
      },
    });
  }

  // Tìm payment PENDING đang active của 1 invoice
  async findActiveByInvoice(invoiceId: string) {
    return prisma.paymentTransaction.findFirst({
      where: {
        invoiceId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Lấy tất cả transactions theo invoice
  async findByInvoiceId(invoiceId: string) {
    return prisma.paymentTransaction.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cập nhật status
  async updateStatus(id: string, data: {
    status: PaymentTransactionStatus;
    paidAt?: Date | null;
    providerTransactionId?: string;
    rawResponse?: string;
  }) {
    return prisma.paymentTransaction.update({
      where: { id },
      data,
    });
  }
}
