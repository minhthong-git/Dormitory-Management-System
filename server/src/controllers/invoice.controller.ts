import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';

// ── GET /api/invoices ─────────────────────────────────────────
export const getInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Student chỉ xem invoice của hợp đồng mình
    if (req.user?.role === 'STUDENT') {
      let student = await prisma.student.findUnique({ where: { userId: req.user.sub }, select: { id: true } });
      if (!student) {
        // Auto-provision if missing
        const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
        if (user) {
          student = await prisma.student.create({
            data: {
              userId: user.id,
              studentCode: user.studentId || `SV_${user.id.substring(0, 8)}`,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              gender: 'OTHER',
              status: 'ACTIVE',
            },
            select: { id: true },
          });
        } else {
          throw new AppError('Không tìm thấy hồ sơ sinh viên', 404);
        }
      }
      const studentContracts = await prisma.contract.findMany({ where: { studentId: student.id }, select: { id: true } });
      where.contractId = { in: studentContracts.map((c) => c.id) };
    }

    const [invoices, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'desc' },
        include: {
          contract: {
            include: {
              student: { select: { id: true, studentCode: true, fullName: true } },
              bed: { select: { bedNumber: true, room: { select: { roomNumber: true } } } },
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    sendPaginated(res, invoices, total, page, limit, 'Lấy danh sách hóa đơn thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/invoices ────────────────────────────────────────
export const createInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contractId, amount, dueDate } = req.body;
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (contract.status !== 'ACTIVE') throw new AppError('Hợp đồng không còn hiệu lực', 400);

    const invoice = await prisma.invoice.create({
      data: { contractId, amount, dueDate: new Date(dueDate), status: 'PENDING' },
    });
    sendSuccess(res, invoice, 'Tạo hóa đơn thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/invoices/:id/pay ───────────────────────────────
export const markAsPaid = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new AppError('Hóa đơn không tồn tại', 404);
    if (invoice.status === 'PAID') throw new AppError('Hóa đơn đã được thanh toán', 400);

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    sendSuccess(res, updated, 'Thanh toán hóa đơn thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/invoices/batch ──────────────────────────────────
// Tạo hóa đơn hàng loạt cho tất cả hợp đồng ACTIVE
export const batchCreateInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { amount, dueDate } = req.body;
    const activeContracts = await prisma.contract.findMany({ where: { status: 'ACTIVE' } });

    const invoices = await prisma.invoice.createMany({
      data: activeContracts.map((c) => ({
        contractId: c.id,
        amount,
        dueDate: new Date(dueDate),
        status: 'PENDING',
      })),
    });

    sendSuccess(res, { count: invoices.count }, `Đã tạo ${invoices.count} hóa đơn`, 201);
  } catch (err) {
    next(err);
  }
};
