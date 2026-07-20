import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';

// ── GET /api/beds ──────────────────────────────────────────────
export const getBeds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10); // allow larger limit for occupancy view
    const skip = (page - 1) * limit;
    const roomId = (req.query.roomId as string | undefined)?.trim();
    const status = (req.query.status as string | undefined)?.trim();
    const buildingId = (req.query.buildingId as string | undefined)?.trim();

    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (buildingId) {
      where.room = { buildingId };
    }

    const [beds, total] = await prisma.$transaction([
      prisma.bed.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ roomId: 'asc' }, { bedNumber: 'asc' }],
        include: {
          room: { select: { id: true, roomNumber: true, floor: true, type: true, capacity: true } },
          contracts: {
            where: { status: 'ACTIVE' },
            include: { student: { select: { id: true, studentCode: true, fullName: true } } },
          },
        },
      }),
      prisma.bed.count({ where }),
    ]);

    sendPaginated(res, beds, total, page, limit, 'Lấy danh sách giường thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/beds/:id ─────────────────────────────────────────
export const getBedById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const bed = await prisma.bed.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, roomNumber: true, floor: true, type: true, capacity: true } },
        contracts: {
          where: { status: 'ACTIVE' },
          include: { student: { select: { id: true, studentCode: true, fullName: true } } },
        },
      },
    });
    if (!bed) throw new AppError('Giường không tồn tại', 404);
    sendSuccess(res, bed, 'Lấy thông tin giường thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/beds ─────────────────────────────────────────────
export const createBed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, bedNumber, bedType, status } = req.body as { roomId: string; bedNumber: number; bedType?: string; status?: string };

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new AppError('Phòng không tồn tại', 404);

    const existing = await prisma.bed.findFirst({ where: { roomId, bedNumber } });
    if (existing) throw new AppError('Giường đã tồn tại trong phòng (bedNumber trùng)', 409);

    const bed = await prisma.bed.create({
      data: { roomId, bedNumber, bedType: bedType ?? 'SINGLE', status: status ?? 'AVAILABLE' },
      include: { room: { select: { id: true, roomNumber: true } } },
    });
    sendSuccess(res, bed, 'Tạo giường thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/beds/:id ──────────────────────────────────────────
export const updateBed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { roomId, bedNumber, bedType, status } = req.body as { roomId?: string; bedNumber?: number; bedType?: string; status?: string };

    const bed = await prisma.bed.findUnique({ where: { id } });
    if (!bed) throw new AppError('Giường không tồn tại', 404);

    const nextRoomId = roomId ?? bed.roomId;
    const nextBedNumber = bedNumber ?? bed.bedNumber;

    if (roomId && roomId !== bed.roomId) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new AppError('Phòng không tồn tại', 404);
    }

    if (nextRoomId !== bed.roomId || nextBedNumber !== bed.bedNumber) {
      const dup = await prisma.bed.findFirst({ where: { roomId: nextRoomId, bedNumber: nextBedNumber } });
      if (dup) throw new AppError('Giường đã tồn tại trong phòng (roomId + bedNumber trùng)', 409);
    }

    const updated = await prisma.bed.update({
      where: { id },
      data: { roomId, bedNumber, bedType, status },
      include: { room: { select: { id: true, roomNumber: true } } },
    });
    sendSuccess(res, updated, 'Cập nhật giường thành công');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/beds/:id ───────────────────────────────────────
export const deleteBed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const bed = await prisma.bed.findUnique({ where: { id } });
    if (!bed) throw new AppError('Giường không tồn tại', 404);

    const activeContract = await prisma.contract.findFirst({ where: { bedId: id, status: 'ACTIVE' } });
    if (activeContract) throw new AppError('Không thể xóa giường đang được sử dụng (contract ACTIVE)', 400);

    await prisma.bed.delete({ where: { id } });
    sendSuccess(res, null, 'Xóa giường thành công');
  } catch (err) {
    next(err);
  }
};

