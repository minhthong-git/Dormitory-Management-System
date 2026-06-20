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

// ── GET /api/rooms/available ──────────────────────────────────
export const getAvailableRooms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const { sub: userId } = req.user!;

    // Tìm hồ sơ sinh viên để lấy giới tính
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student || student.gender === 'OTHER') {
      throw new AppError('Bạn cần cập nhật giới tính (Nam/Nữ) trong hồ sơ cá nhân để xem phòng trống', 400);
    }

    const where: any = {
      status: 'AVAILABLE',
      genderType: student.gender
    };

    const [rooms, total] = await prisma.$transaction([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { roomNumber: 'asc' },
        include: {
          building: { select: { name: true } },
          beds: {
            where: { status: 'AVAILABLE' },
            select: { id: true, bedNumber: true, bedType: true, status: true }
          }
        }
      }),
      prisma.room.count({ where }),
    ]);

    // Lọc ra các phòng thực sự còn giường trống
    const availableRooms = rooms.filter(r => r.beds.length > 0 && r.currentOccupancy < r.capacity);

    sendPaginated(res, availableRooms, total, page, limit, 'Lấy danh sách phòng trống thành công');
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
    const { roomNumber, floor, type, pricePerMonth, description, buildingId, genderType } = req.body;
    let { capacity } = req.body;
    
    if (!buildingId) throw new AppError('Vui lòng chọn tòa nhà cho phòng này', 400);

    const typeCapacityMap: Record<string, number> = { SMALL: 2, STANDARD: 4, LARGE: 6 };
    const finalCapacity = typeCapacityMap[type];
    if (!finalCapacity) throw new AppError('Loại phòng không hợp lệ (Phải là SMALL, STANDARD hoặc LARGE)', 400);
    
    // Ép sức chứa theo loại phòng
    capacity = finalCapacity;

    const existing = await prisma.room.findUnique({ where: { roomNumber } });
    if (existing) throw new AppError(`Phòng ${roomNumber} đã tồn tại`, 409);

    // Auto-create beds based on capacity
    const bedsData = [];
    for (let i = 1; i <= finalCapacity; i++) {
      bedsData.push({ bedNumber: i, bedType: 'STANDARD', status: 'AVAILABLE' });
    }

    const room = await prisma.room.create({
      data: { 
        roomNumber, 
        floor, 
        capacity, 
        type, 
        genderType: genderType || 'MIXED',
        pricePerMonth, 
        description, 
        status: 'AVAILABLE', 
        currentOccupancy: 0,
        buildingId, // Lưu id của tòa nhà vào Database
        beds: {
          create: bedsData
        }
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
    const { floor, type, pricePerMonth, description, status, buildingId, genderType } = req.body;
    let { capacity } = req.body;

    const typeCapacityMap: Record<string, number> = { SMALL: 2, STANDARD: 4, LARGE: 6 };
    if (type) {
      const finalCapacity = typeCapacityMap[type];
      if (!finalCapacity) throw new AppError('Loại phòng không hợp lệ (Phải là SMALL, STANDARD hoặc LARGE)', 400);
      capacity = finalCapacity;
    }

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) throw new AppError('Phòng không tồn tại', 404);

    if (genderType && genderType !== room.genderType && room.currentOccupancy > 0) {
      throw new AppError('Không thể đổi giới tính phòng khi đang có sinh viên ở', 400);
    }

    const updated = await prisma.room.update({
      where: { id },
      data: { floor, capacity, type, genderType, pricePerMonth, description, status, buildingId },
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