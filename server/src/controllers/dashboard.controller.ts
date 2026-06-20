import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';

// ── GET /api/dashboard/stats ──────────────────────────────────
// Admin/Staff: trả về thống kê toàn hệ thống
// Student:     trả về thống kê cá nhân của user đó
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { role, sub: userId } = req.user!;
    const isAdmin = role === 'ADMIN' || role === 'STAFF';

    if (isAdmin) {
      // ── Admin / Staff stats ────────────────────────────────
      const [
        totalRooms,
        occupiedRooms,
        totalStudents,
        pendingInvoices,
        overdueInvoices,
        activeContracts,
        revenueResult,
      ] = await Promise.all([
        prisma.room.count(),
        prisma.room.count({ where: { status: 'FULL' } }),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.invoice.count({ where: { paymentStatus: 'UNPAID' } }),
        prisma.invoice.count({ where: { paymentStatus: 'OVERDUE' } }),
        prisma.contract.count({ where: { status: 'ACTIVE' } }),
        // Doanh thu tháng hiện tại (hóa đơn đã thanh toán)
        prisma.invoice.aggregate({
          _sum: { totalAmount: true },
          where: {
            paymentStatus: 'PAID',
            paidDate: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      sendSuccess(res, {
        role: 'ADMIN',
        totalRooms,
        occupiedRooms,
        availableRooms: totalRooms - occupiedRooms,
        totalStudents,
        activeContracts,
        pendingInvoices,
        overdueInvoices,
        monthlyRevenue: revenueResult._sum.totalAmount ?? 0,
      }, 'Lấy thống kê tổng quan thành công');
    } else {
      // ── Student stats ──────────────────────────────────────
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student) {
        // Nếu sinh viên mới đăng ký chưa có profile, trả về thống kê rỗng
        sendSuccess(res, {
          role: 'STUDENT',
          activeContract: null,
          myRoom: null,
          contractStatus: null,
          pendingInvoices: 0,
          overdueInvoices: 0,
        }, 'Lấy thống kê cá nhân thành công');
        return;
      }

      const [activeContract, pendingInvoices, overdueInvoices] = await Promise.all([
        prisma.contract.findFirst({
          where: { studentId: student.id, status: 'ACTIVE' },
          include: {
            bed: {
              include: {
                room: {
                  select: {
                    roomNumber: true,
                    type: true,
                    floor: true,
                    pricePerMonth: true,
                  },
                },
              },
            },
          },
        }),
        prisma.invoice.count({
          where: { paymentStatus: 'UNPAID', contract: { studentId: student.id } },
        }),
        prisma.invoice.count({
          where: { paymentStatus: 'OVERDUE', contract: { studentId: student.id } },
        }),
      ]);

      sendSuccess(res, {
        role: 'STUDENT',
        activeContract,
        myRoom: activeContract?.bed?.room ?? null,
        contractStatus: activeContract?.status ?? null,
        pendingInvoices,
        overdueInvoices,
      }, 'Lấy thống kê cá nhân thành công');
    }
  } catch (err) {
    next(err);
  }
};
