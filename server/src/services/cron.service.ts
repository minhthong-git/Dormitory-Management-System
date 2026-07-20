import cron from 'node-cron';
import { prisma } from '@/config/db';
import { notificationService } from '@/services/notification.service';

export class CronService {
  init() {
    // Chạy hàng ngày vào lúc 0h00
    cron.schedule('0 0 * * *', async () => {
      console.log('[CRON] Bắt đầu chạy quét hợp đồng ưu tiên...');
      try {
        await this.checkPriorityRenewals();
        await this.checkExpiredRenewals();
        await this.checkUnpaidRenewalInvoices();
      } catch (error) {
        console.error('[CRON] Lỗi khi chạy quét hợp đồng:', error);
      }
    });
  }

  // Quét các hợp đồng sắp hết hạn (14 ngày tới)
  private async checkPriorityRenewals() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 14);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const expiringContracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        renewalStatus: 'NONE',
        endDate: {
          gte: targetDate,
          lt: nextDay,
        }
      },
      include: {
        student: { select: { userId: true } }
      }
    });

    for (const contract of expiringContracts) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { renewalStatus: 'PRIORITY' }
      });
      
      if (contract.student.userId) {
        await notificationService.send({
          userId: contract.student.userId,
          title: 'Đăng ký giữ chỗ Học kỳ tiếp theo',
          message: `Hợp đồng của bạn sẽ hết hạn sau 14 ngày nữa. Bạn có 3 ngày để bấm Gia hạn ưu tiên trước khi hệ thống mở giường cho người khác.`,
          type: 'SYSTEM',
        });
      }
    }
    
    if (expiringContracts.length > 0) {
      console.log(`[CRON] Đã cập nhật ${expiringContracts.length} hợp đồng sang PRIORITY.`);
    }
  }

  // Sau 3 ngày, nếu chưa gia hạn -> Mất quyền ưu tiên
  private async checkExpiredRenewals() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 11); // 14 - 3 = 11 days left
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const expiredPriority = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        renewalStatus: 'PRIORITY',
        endDate: {
          lt: nextDay // Overdue 3 days
        }
      },
      include: {
        student: { select: { userId: true } }
      }
    });

    for (const contract of expiredPriority) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { renewalStatus: 'EXPIRED_PRIORITY' }
      });

      if (contract.student.userId) {
        await notificationService.send({
          userId: contract.student.userId,
          title: 'Hết hạn quyền ưu tiên giữ chỗ',
          message: `Bạn đã quá hạn 3 ngày ưu tiên đăng ký giữ chỗ. Giường của bạn sẽ được mở cho sinh viên khác đăng ký vào tháng tới.`,
          type: 'SYSTEM',
        });
      }
    }
    
    if (expiredPriority.length > 0) {
      console.log(`[CRON] Đã tước quyền ưu tiên của ${expiredPriority.length} hợp đồng.`);
    }
  }

  // Quét các hóa đơn gia hạn quá hạn
  private async checkUnpaidRenewalInvoices() {
    const today = new Date();
    
    const unpaidRenewals = await prisma.contract.findMany({
      where: {
        status: 'AWAITING_PAYMENT',
        renewalStatus: 'RENEWED',
      },
      include: {
        invoices: {
          where: { paymentStatus: 'UNPAID' }
        },
        student: { select: { userId: true } },
      }
    });

    for (const contract of unpaidRenewals) {
      const invoice = contract.invoices[0];
      if (invoice && invoice.dueDate < today) {
        // Hủy hóa đơn & Hợp đồng gia hạn (mới)
        await prisma.$transaction([
          prisma.invoice.deleteMany({ where: { contractId: contract.id, paymentStatus: 'UNPAID' } }),
          prisma.contract.delete({ where: { id: contract.id } })
        ]);

        // Cập nhật hợp đồng cũ (ACTIVE) thành EXPIRED_PRIORITY
        // Hợp đồng cũ là hợp đồng ACTIVE cùng giường và cùng sinh viên
        const oldContract = await prisma.contract.findFirst({
          where: {
            studentId: contract.studentId,
            bedId: contract.bedId,
            status: 'ACTIVE'
          }
        });

        if (oldContract) {
          await prisma.contract.update({
            where: { id: oldContract.id },
            data: { renewalStatus: 'EXPIRED_PRIORITY' }
          });
        }

        if (contract.student.userId) {
          await notificationService.send({
            userId: contract.student.userId,
            title: 'Hủy gia hạn phòng',
            message: `Hóa đơn gia hạn của bạn đã quá hạn thanh toán. Yêu cầu gia hạn của bạn đã bị hủy bỏ.`,
            type: 'SYSTEM',
            priority: 'HIGH',
          });
        }
      }
    }
  }
}

export const cronService = new CronService();
