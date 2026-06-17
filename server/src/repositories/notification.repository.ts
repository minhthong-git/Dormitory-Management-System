import { prisma } from '@/config/db';

// ── Notification Repository ────────────────────────────────────
// Data-access layer — tất cả truy vấn Prisma liên quan Notification

export class NotificationRepository {
  // Tạo notification mới
  async create(data: {
    userId: string;
    type: string;
    priority?: string;
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: string;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        priority: data.priority ?? 'MEDIUM',
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
      },
    });
  }

  // Tạo nhiều notifications cùng lúc (broadcast)
  async createMany(
    notifications: {
      userId: string;
      type: string;
      priority?: string;
      title: string;
      message: string;
      referenceId?: string;
      referenceType?: string;
    }[]
  ) {
    // SQL Server không hỗ trợ createMany với skipDuplicates,
    // nên dùng transaction với nhiều create
    return prisma.$transaction(
      notifications.map((n) =>
        prisma.notification.create({
          data: {
            userId: n.userId,
            type: n.type,
            priority: n.priority ?? 'MEDIUM',
            title: n.title,
            message: n.message,
            referenceId: n.referenceId,
            referenceType: n.referenceType,
          },
        })
      )
    );
  }

  // Lấy danh sách notification theo user (có phân trang)
  async findByUserId(
    userId: string,
    options: { page?: number; limit?: number; isRead?: boolean } = {}
  ) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, options.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (options.isRead !== undefined) {
      where.isRead = options.isRead;
    }

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total, page, limit };
  }

  // Đếm notification chưa đọc
  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // Đánh dấu 1 notification đã đọc
  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // Đánh dấu tất cả đã đọc cho user
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  // Xóa 1 notification
  async delete(id: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  // Xóa notification cũ hơn N ngày (cleanup job)
  async deleteOlderThan(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
  }
}
