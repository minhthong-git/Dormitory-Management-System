import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { notificationService } from '@/services/notification.service';

// ── GET /api/contracts ────────────────────────────────────────
export const getContracts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Student chỉ xem hợp đồng của mình
    if (req.user?.role === 'STUDENT') {
      where.userId = req.user.sub;
    }

    const [contracts, total] = await prisma.$transaction([
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, studentId: true } },
          room: { select: { id: true, roomNumber: true, type: true, floor: true, pricePerMonth: true } },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    sendPaginated(res, contracts, total, page, limit, 'Lấy danh sách hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/contracts/:id ────────────────────────────────────
export const getContractById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, studentId: true } },
        room: { select: { id: true, roomNumber: true, type: true, floor: true, pricePerMonth: true } },
        invoices: true,
      },
    });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    sendSuccess(res, contract, 'Lấy thông tin hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contracts ───────────────────────────────────────
export const createContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, roomId, startDate, endDate } = req.body;

    // Kiểm tra phòng có tồn tại và còn chỗ
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError('Phòng không tồn tại', 404);
    if (room.status !== 'AVAILABLE') throw new AppError('Phòng không có sẵn để đăng ký', 400);

    // Kiểm tra sinh viên đã có hợp đồng ACTIVE chưa
    const activeContract = await prisma.contract.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (activeContract) throw new AppError('Sinh viên đã có hợp đồng đang hoạt động', 409);

    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: { userId, roomId, startDate: new Date(startDate), endDate: new Date(endDate), status: 'ACTIVE' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, roomNumber: true, type: true } },
        },
      }),
      // Tăng currentOccupancy
      prisma.room.update({
        where: { id: roomId },
        data: {
          currentOccupancy: { increment: 1 },
          status: room.currentOccupancy + 1 >= room.capacity ? 'FULL' : 'AVAILABLE',
        },
      }),
    ]);

    // Trigger notification (fire-and-forget)
    notificationService.onContractCreated({
      id: contract.id,
      userId,
      roomId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    }).catch(() => {});

    sendSuccess(res, contract, 'Tạo hợp đồng thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/contracts/:id/terminate ───────────────────────
export const terminateContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({ where: { id }, include: { room: true } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (contract.status !== 'ACTIVE') throw new AppError('Hợp đồng không còn hiệu lực', 400);

    const [updated] = await prisma.$transaction([
      prisma.contract.update({ where: { id }, data: { status: 'TERMINATED' } }),
      // Giảm currentOccupancy
      prisma.room.update({
        where: { id: contract.roomId },
        data: {
          currentOccupancy: { decrement: 1 },
          status: 'AVAILABLE',
        },
      }),
    ]);

    // Trigger notification (fire-and-forget)
    notificationService.onContractTerminated(id).catch(() => {});

    sendSuccess(res, updated, 'Chấm dứt hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};
