import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';

// ── GET /api/rooms ────────────────────────────────────────────
export const getRooms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    
    // THÊM MỚI: Nhận tham số buildingId để lọc phòng theo tòa nhà
    const buildingId = req.query.buildingId as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (buildingId) where.buildingId = buildingId; // Lọc phòng thuộc đúng tòa nhà

    const [rooms, total] = await prisma.$transaction([
      prisma.room.findMany({ where, skip, take: limit, orderBy: { roomNumber: 'asc' } }),
      prisma.room.count({ where }),
    ]);

    sendPaginated(res, rooms, total, page, limit, 'Lấy danh sách phòng thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/rooms/:id ────────────────────────────────────────
export const getRoomById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new AppError('Phòng không tồn tại', 404);
    sendSuccess(res, room, 'Lấy thông tin phòng thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/rooms ───────────────────────────────────────────
export const createRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // THÊM MỚI: Lấy buildingId từ body
    const { roomNumber, floor, capacity, type, pricePerMonth, description, buildingId } = req.body;
    
    if (!buildingId) throw new AppError('Vui lòng chọn tòa nhà cho phòng này', 400);

    const existing = await prisma.room.findUnique({ where: { roomNumber } });
    if (existing) throw new AppError(`Phòng ${roomNumber} đã tồn tại`, 409);

    const room = await prisma.room.create({
      data: { 
        roomNumber, 
        floor, 
        capacity, 
        type, 
        pricePerMonth, 
        description, 
        status: 'AVAILABLE', 
        currentOccupancy: 0,
        buildingId // Lưu id của tòa nhà vào Database
      },
    });
    sendSuccess(res, room, 'Tạo phòng thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/rooms/:id ────────────────────────────────────────
export const updateRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    // THÊM MỚI: Cho phép cập nhật cả buildingId nếu lỡ nhập sai tòa nhà
    const { floor, capacity, type, pricePerMonth, description, status, buildingId } = req.body;

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new AppError('Phòng không tồn tại', 404);

    const updated = await prisma.room.update({
      where: { id },
      data: { floor, capacity, type, pricePerMonth, description, status, buildingId },
    });
    sendSuccess(res, updated, 'Cập nhật phòng thành công');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/rooms/:id ─────────────────────────────────────
export const deleteRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new AppError('Phòng không tồn tại', 404);
    if (room.currentOccupancy > 0) throw new AppError('Không thể xóa phòng đang có sinh viên', 400);

    await prisma.room.delete({ where: { id } });
    sendSuccess(res, null, 'Xóa phòng thành công');
  } catch (err) {
    next(err);
  }
};