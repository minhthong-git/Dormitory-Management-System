import { prisma } from '@/config/db';
import { notificationService } from '@/services/notification.service';
import { sendDormitoryEmail } from '@/utils/mailer';

export class CronService {
  async checkContractAndPaymentStatus() {
    const now = new Date();
    const resultDetails: string[] = [];
    let expiringContractsWarned = 0;
    let expiredContractsTerminated = 0;
    let overduePaymentsWarned = 0;
    let overduePaymentsTerminated = 0;

    // 1. Fetch all ACTIVE contracts
    const activeContracts = await prisma.contract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        student: { include: { user: true } },
        bed: { include: { room: true } },
        invoices: { where: { paymentStatus: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } } }
      }
    });

    for (const contract of activeContracts) {
      const student = contract.student;
      const user = student.user;
      const bed = contract.bed;
      const room = bed?.room;
      const studentName = student.fullName;
      const roomNum = room?.roomNumber ?? 'N/A';
      const bedNum = bed?.bedNumber ?? 0;
      const email = student.email || user?.email;

      // --- CASE 1: Contract Expiration Check ---
      const endDate = new Date(contract.endDate);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        // Expiration deadline missed -> Automatically terminate and remove tenant (Eviction)
        await prisma.$transaction([
          prisma.contract.update({ where: { id: contract.id }, data: { status: 'EXPIRED' } }),
          prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }),
          prisma.room.update({
            where: { id: bed.roomId },
            data: { currentOccupancy: { decrement: 1 }, status: 'AVAILABLE' }
          })
        ]);

        expiredContractsTerminated++;
        const msg = `Hợp đồng phòng ${roomNum} giường #${bedNum} của bạn đã hết hạn ngày ${endDate.toLocaleDateString('vi-VN')} mà không có gia hạn. Hệ thống đã tự động kết thúc hợp đồng và thu hồi giường.`;
        resultDetails.push(`Terminated expired contract ${contract.id} for SV ${studentName} (expired ${endDate.toLocaleDateString('vi-VN')})`);

        // Send notifications
        if (user?.id) {
          await notificationService.send({
            userId: user.id,
            type: 'CONTRACT_TERMINATED',
            priority: 'HIGH',
            title: `Hợp đồng hết hạn tự động kết thúc — Phòng ${roomNum}`,
            message: msg,
            referenceId: contract.id,
            referenceType: 'CONTRACT'
          });
        }

        // Email
        if (email) {
          await sendDormitoryEmail(
            email,
            `[KTX] Hợp đồng phòng ${roomNum} tự động kết thúc do hết hạn`,
            `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Thông báo kết thúc hợp đồng</h2>
              <p>Chào <strong>${studentName}</strong>,</p>
              <p>${msg}</p>
              <p>Nếu có thắc mắc vui lòng liên hệ Ban quản lý KTX.</p>
            </div>`
          ).catch(console.error);
        }

        // Send staff notification
        await notificationService.sendToStaff({
          type: 'SYSTEM',
          priority: 'MEDIUM',
          title: `Tự động chấm dứt HĐ — Phòng ${roomNum}`,
          message: `Hệ thống tự động chấm dứt hợp đồng của sinh viên ${studentName} do hết hạn ngày ${endDate.toLocaleDateString('vi-VN')}.`
        });

        continue; // Since contract is terminated, skip invoice checking
      } else if (daysUntilExpiry <= 7) {
        // Expiring soon warning
        expiringContractsWarned++;
        const msg = `Hợp đồng phòng ${roomNum} giường #${bedNum} của bạn sắp hết hạn ngày ${endDate.toLocaleDateString('vi-VN')} (${daysUntilExpiry} ngày nữa). Vui lòng liên hệ BQL để làm thủ tục gia hạn hoặc thanh toán gia hạn trước khi hết hiệu lực.`;
        resultDetails.push(`Sent warning to SV ${studentName} for contract expiring in ${daysUntilExpiry} days`);

        if (user?.id) {
          await notificationService.send({
            userId: user.id,
            type: 'CONTRACT_EXPIRING',
            priority: 'HIGH',
            title: `Hợp đồng sắp hết hạn — Phòng ${roomNum}`,
            message: msg,
            referenceId: contract.id,
            referenceType: 'CONTRACT'
          });
        }

        if (email) {
          await sendDormitoryEmail(
            email,
            `[KTX] Cảnh báo hợp đồng sắp hết hạn — Phòng ${roomNum}`,
            `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Cảnh báo sắp hết hạn hợp đồng</h2>
              <p>Chào <strong>${studentName}</strong>,</p>
              <p>${msg}</p>
            </div>`
          ).catch(console.error);
        }
      }

      // --- CASE 2: Overdue Invoice Check ---
      for (const invoice of contract.invoices) {
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue > 5) {
          // Unpaid invoice overdue by > 5 days -> Automatically terminate (evict)
          await prisma.$transaction([
            prisma.contract.update({ where: { id: contract.id }, data: { status: 'TERMINATED' } }),
            prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }),
            prisma.room.update({
              where: { id: bed.roomId },
              data: { currentOccupancy: { decrement: 1 }, status: 'AVAILABLE' }
            })
          ]);

          overduePaymentsTerminated++;
          const msg = `Hợp đồng phòng ${roomNum} giường #${bedNum} của bạn bị chấm dứt tự động do hóa đơn tháng ${invoice.billingMonth}/${invoice.billingYear} trễ hạn thanh toán quá 5 ngày (Hạn thanh toán: ${dueDate.toLocaleDateString('vi-VN')}). Ban quản lý sẽ tiến hành thu hồi giường.`;
          resultDetails.push(`Terminated contract ${contract.id} for SV ${studentName} due to invoice overdue by ${daysOverdue} days`);

          if (user?.id) {
            await notificationService.send({
              userId: user.id,
              type: 'CONTRACT_TERMINATED',
              priority: 'URGENT',
              title: `Tự động thu hồi giường do nợ hóa đơn — Phòng ${roomNum}`,
              message: msg,
              referenceId: contract.id,
              referenceType: 'CONTRACT'
            });
          }

          if (email) {
            await sendDormitoryEmail(
              email,
              `[KTX] Tự động chấm dứt hợp đồng do nợ hóa đơn — Phòng ${roomNum}`,
              `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Thông báo chấm dứt hợp đồng do quá hạn thanh toán</h2>
                <p>Chào <strong>${studentName}</strong>,</p>
                <p>${msg}</p>
              </div>`
            ).catch(console.error);
          }

          await notificationService.sendToStaff({
            type: 'SYSTEM',
            priority: 'HIGH',
            title: `Thu hồi giường tự động — Phòng ${roomNum}`,
            message: `Hệ thống tự động chấm dứt hợp đồng của sinh viên ${studentName} tại phòng ${roomNum} do nợ hóa đơn tháng ${invoice.billingMonth}/${invoice.billingYear} quá 5 ngày.`
          });

          break; // Exit invoice loop for this contract as it is terminated
        } else if (daysOverdue > 0) {
          // Just overdue, mark as OVERDUE status if not already
          if (invoice.paymentStatus !== 'OVERDUE') {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { paymentStatus: 'OVERDUE' }
            });
          }

          overduePaymentsWarned++;
          const msg = `Hóa đơn tháng ${invoice.billingMonth}/${invoice.billingYear} phòng ${roomNum} của bạn đã QUÁ HẠN thanh toán từ ngày ${dueDate.toLocaleDateString('vi-VN')}. Vui lòng hoàn thành thanh toán ngay để tránh bị thu hồi phòng tự động sau 5 ngày trễ hạn.`;
          resultDetails.push(`Sent overdue warning to SV ${studentName} for invoice overdue by ${daysOverdue} days`);

          if (user?.id) {
            await notificationService.send({
              userId: user.id,
              type: 'INVOICE_OVERDUE',
              priority: 'HIGH',
              title: `Hóa đơn quá hạn thanh toán — Phòng ${roomNum}`,
              message: msg,
              referenceId: invoice.id,
              referenceType: 'INVOICE'
            });
          }

          if (email) {
            await sendDormitoryEmail(
              email,
              `[KTX] Cảnh báo hóa đơn quá hạn thanh toán — Phòng ${roomNum}`,
              `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Cảnh báo hóa đơn quá hạn thanh toán</h2>
                <p>Chào <strong>${studentName}</strong>,</p>
                <p>${msg}</p>
              </div>`
            ).catch(console.error);
          }
        } else {
          // Not overdue, check if due in <= 3 days
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 3 && daysUntilDue >= 0) {
            overduePaymentsWarned++;
            const msg = `Hóa đơn tháng ${invoice.billingMonth}/${invoice.billingYear} phòng ${roomNum} của bạn sắp đến hạn thanh toán vào ngày ${dueDate.toLocaleDateString('vi-VN')} (${daysUntilDue} ngày nữa). Vui lòng thanh toán đúng hạn.`;
            resultDetails.push(`Sent payment reminder to SV ${studentName} for invoice due in ${daysUntilDue} days`);

            if (user?.id) {
              await notificationService.send({
                userId: user.id,
                type: 'PAYMENT_REMINDER',
                priority: 'MEDIUM',
                title: `Hóa đơn sắp đến hạn thanh toán — Phòng ${roomNum}`,
                message: msg,
                referenceId: invoice.id,
                referenceType: 'INVOICE'
              });
            }

            if (email) {
              await sendDormitoryEmail(
                email,
                `[KTX] Nhắc nhở thanh toán hóa đơn sắp đến hạn — Phòng ${roomNum}`,
                `<div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2>Nhắc nhở thanh toán hóa đơn</h2>
                  <p>Chào <strong>${studentName}</strong>,</p>
                  <p>${msg}</p>
                </div>`
              ).catch(console.error);
            }
          }
        }
      }
    }

    return {
      expiringContractsWarned,
      expiredContractsTerminated,
      overduePaymentsWarned,
      overduePaymentsTerminated,
      details: resultDetails
    };
  }
}

export const cronService = new CronService();
