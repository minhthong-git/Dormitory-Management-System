import { NotificationRepository } from '@/repositories/notification.repository';
import { getIO } from '@/socket';
import { prisma } from '@/config/db';

// ── Notification Types ─────────────────────────────────────────
export type NotificationType =
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'INVOICE_OVERDUE'
  | 'CONTRACT_CREATED'
  | 'CONTRACT_TERMINATED'
  | 'CONTRACT_EXPIRING'
  | 'UTILITY_RECORDED'
  | 'PAYMENT_REMINDER'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ReferenceType = 'INVOICE' | 'CONTRACT' | 'UTILITY' | 'ROOM' | 'SYSTEM';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: ReferenceType;
}

// ── Notification Service ───────────────────────────────────────
// Business logic layer — sends notifications + real-time Socket.IO push
export class NotificationService {
  private repository: NotificationRepository;

  constructor() {
    this.repository = new NotificationRepository();
  }

  // ── Core: Tạo notification và push real-time ─────────────────
  async send(input: CreateNotificationInput) {
    const notification = await this.repository.create(input);

    // Push real-time qua Socket.IO
    this.emitToUser(input.userId, 'notification:new', notification);

    // Cập nhật unread count
    const unreadCount = await this.repository.countUnread(input.userId);
    this.emitToUser(input.userId, 'notification:unread-count', { count: unreadCount });

    return notification;
  }

  // ── Broadcast: Gửi cho nhiều users ───────────────────────────
  async sendToMany(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
    const results = [];
    for (const userId of userIds) {
      const notification = await this.send({ ...input, userId });
      results.push(notification);
    }
    return results;
  }

  // ── Broadcast đến tất cả ADMIN & STAFF ──────────────────────
  async sendToStaff(input: Omit<CreateNotificationInput, 'userId'>) {
    const staffUsers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'STAFF'] } },
      select: { id: true },
    });
    const userIds = staffUsers.map((u) => u.id);
    return this.sendToMany(userIds, input);
  }

  // ── Lấy danh sách notification của user ──────────────────────
  async getByUserId(userId: string, options: { page?: number; limit?: number; isRead?: boolean }) {
    return this.repository.findByUserId(userId, options);
  }

  // ── Đếm chưa đọc ────────────────────────────────────────────
  async getUnreadCount(userId: string) {
    return this.repository.countUnread(userId);
  }

  // ── Đánh dấu đã đọc ─────────────────────────────────────────
  async markAsRead(id: string, userId: string) {
    await this.repository.markAsRead(id, userId);
    const unreadCount = await this.repository.countUnread(userId);
    this.emitToUser(userId, 'notification:unread-count', { count: unreadCount });
  }

  // ── Đánh dấu tất cả đã đọc ──────────────────────────────────
  async markAllAsRead(userId: string) {
    await this.repository.markAllAsRead(userId);
    this.emitToUser(userId, 'notification:unread-count', { count: 0 });
  }

  // ── Xóa notification ────────────────────────────────────────
  async delete(id: string, userId: string) {
    return this.repository.delete(id, userId);
  }

  // ══════════════════════════════════════════════════════════════
  // BUSINESS EVENT TRIGGERS
  // Các method dưới đây được gọi từ service khác khi event xảy ra
  // ══════════════════════════════════════════════════════════════

  // ── Invoice created → thông báo cho student ──────────────────
  async onInvoiceCreated(invoice: {
    id: string;
    roomId: string;
    totalAmount: number;
    billingMonth: number;
    billingYear: number;
    dueDate: Date;
    contractId?: string | null;
  }) {
    // Tìm student qua contract
    if (!invoice.contractId) return;
    const contract = await prisma.contract.findUnique({
      where: { id: invoice.contractId },
      include: {
        student: { select: { userId: true } },
        bed: { include: { room: { select: { roomNumber: true } } } },
      },
    });
    if (!contract || !contract.student?.userId) return;

    const roomNum = contract.bed?.room?.roomNumber ?? 'N/A';
    const amount = invoice.totalAmount.toLocaleString('vi-VN');
    const due = new Date(invoice.dueDate).toLocaleDateString('vi-VN');

    // Gửi cho student
    await this.send({
      userId: contract.student.userId,
      type: 'INVOICE_CREATED',
      priority: 'HIGH',
      title: `Hóa đơn mới — Phòng ${roomNum}`,
      message: `Hóa đơn tháng ${invoice.billingMonth}/${invoice.billingYear} đã được tạo. Tổng: ${amount}₫. Hạn thanh toán: ${due}.`,
      referenceId: invoice.id,
      referenceType: 'INVOICE',
    });

    // Thông báo cho staff/admin
    await this.sendToStaff({
      type: 'INVOICE_CREATED',
      priority: 'LOW',
      title: `Hóa đơn mới — Phòng ${roomNum}`,
      message: `Hóa đơn tháng ${invoice.billingMonth}/${invoice.billingYear} cho phòng ${roomNum} đã được lập. Tổng: ${amount}₫.`,
      referenceId: invoice.id,
      referenceType: 'INVOICE',
    });
  }

  // ── Invoice paid → thông báo xác nhận ────────────────────────
  async onInvoicePaid(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        contract: {
          include: {
            student: { select: { userId: true } }
          }
        },
        room: { select: { roomNumber: true } },
      },
    });
    if (!invoice || !invoice.contract || !invoice.contract.student?.userId) return;

    const roomNum = invoice.room?.roomNumber ?? 'N/A';
    const amount = invoice.totalAmount.toLocaleString('vi-VN');

    await this.send({
      userId: invoice.contract.student.userId,
      type: 'INVOICE_PAID',
      priority: 'LOW',
      title: `Thanh toán thành công — Phòng ${roomNum}`,
      message: `Hóa đơn tháng ${invoice.billingMonth}/${invoice.billingYear} (${amount}₫) đã được thanh toán.`,
      referenceId: invoiceId,
      referenceType: 'INVOICE',
    });
  }

  // ── Contract created → thông báo cho student ─────────────────
  async onContractCreated(contract: {
    id: string;
    userId: string;
    roomId: string;
    startDate: Date;
    endDate: Date;
  }) {
    const room = await prisma.room.findUnique({
      where: { id: contract.roomId },
      select: { roomNumber: true },
    });
    const roomNum = room?.roomNumber ?? 'N/A';
    const start = new Date(contract.startDate).toLocaleDateString('vi-VN');
    const end = new Date(contract.endDate).toLocaleDateString('vi-VN');

    await this.send({
      userId: contract.userId,
      type: 'CONTRACT_CREATED',
      priority: 'HIGH',
      title: `Hợp đồng mới — Phòng ${roomNum}`,
      message: `Hợp đồng phòng ${roomNum} có hiệu lực từ ${start} đến ${end}.`,
      referenceId: contract.id,
      referenceType: 'CONTRACT',
    });
  }

  // ── Contract terminated → thông báo cho student ──────────────
  async onContractTerminated(contractId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        student: { select: { userId: true } },
        bed: { include: { room: { select: { roomNumber: true } } } },
      },
    });
    if (!contract || !contract.student?.userId) return;

    const roomNum = contract.bed?.room?.roomNumber ?? 'N/A';

    await this.send({
      userId: contract.student.userId,
      type: 'CONTRACT_TERMINATED',
      priority: 'HIGH',
      title: `Hợp đồng kết thúc — Phòng ${roomNum}`,
      message: `Hợp đồng phòng ${roomNum} đã bị chấm dứt. Vui lòng liên hệ quản lý nếu cần hỗ trợ.`,
      referenceId: contractId,
      referenceType: 'CONTRACT',
    });
  }

  // ── Utility recorded → thông báo cho staff ───────────────────
  async onUtilityRecorded(data: {
    roomId: string;
    billingMonth: number;
    billingYear: number;
  }) {
    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
      select: { roomNumber: true },
    });
    const roomNum = room?.roomNumber ?? 'N/A';

    await this.sendToStaff({
      type: 'UTILITY_RECORDED',
      priority: 'LOW',
      title: `Ghi điện nước — Phòng ${roomNum}`,
      message: `Chỉ số điện nước phòng ${roomNum} tháng ${data.billingMonth}/${data.billingYear} đã được ghi nhận.`,
      referenceType: 'UTILITY',
    });
  }

  // ── Helper: Emit Socket.IO event to specific user ────────────
  private emitToUser(userId: string, event: string, data: unknown) {
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit(event, data);
    } catch {
      // Socket.IO chưa khởi tạo — skip silently
    }
  }
}

// Singleton instance để sử dụng across services
export const notificationService = new NotificationService();
