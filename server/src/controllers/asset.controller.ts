import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';

// ── GET /api/assets ────────────────────────────────────────────
// Dành cho ADMIN và STAFF để xem toàn bộ tài sản
export const getAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const roomId = req.query.roomId as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const buildingId = req.query.buildingId as string | undefined;

    const where: any = {};
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (buildingId) {
      where.room = { buildingId };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          room: {
            select: {
              roomNumber: true,
              building: { select: { name: true } },
            },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    sendPaginated(res, assets, total, page, limit, 'Lấy danh sách tài sản thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/assets/my-room ────────────────────────────────────
// Dành cho STUDENT lấy tài sản trong phòng mình đang ở
export const getMyRoomAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) throw new AppError('Không tìm thấy thông tin đăng nhập', 401);

    // 1. Tìm hồ sơ Student của user hiện tại
    const student = await prisma.student.findUnique({
      where: { userId },
    });
    if (!student) throw new AppError('Tài khoản này chưa có hồ sơ sinh viên', 404);

    // 2. Tìm hợp đồng ACTIVE của sinh viên để biết phòng hiện tại
    const contract = await prisma.contract.findFirst({
      where: {
        studentId: student.id,
        status: 'ACTIVE',
      },
      include: {
        bed: true,
      },
    });

    if (!contract || !contract.bed) {
      throw new AppError('Bạn hiện không ở trong phòng nào hoặc hợp đồng đã hết hiệu lực', 403);
    }

    const roomId = contract.bed.roomId;

    // 3. Lấy toàn bộ tài sản của phòng đó
    const assets = await prisma.asset.findMany({
      where: { roomId },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, assets, 'Lấy danh sách tài sản phòng thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/assets/:id ────────────────────────────────────────
export const getAssetById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            roomNumber: true,
            building: { select: { name: true } },
          },
        },
      },
    });

    if (!asset) throw new AppError('Tài sản không tồn tại', 404);
    sendSuccess(res, asset, 'Lấy thông tin tài sản thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/assets ───────────────────────────────────────────
export const createAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, code, type, status, description, roomId } = req.body;

    if (!name || !code || !type || !roomId) {
      throw new AppError('Vui lòng cung cấp đầy đủ thông tin: Tên, mã, loại tài sản và phòng', 400);
    }

    // Kiểm tra phòng có tồn tại không
    const roomExists = await prisma.room.findUnique({ where: { id: roomId } });
    if (!roomExists) throw new AppError('Phòng chỉ định không tồn tại', 404);

    // Kiểm tra trùng mã tài sản
    const existingAsset = await prisma.asset.findUnique({ where: { code } });
    if (existingAsset) throw new AppError(`Mã tài sản ${code} đã tồn tại trong hệ thống`, 409);

    const asset = await prisma.asset.create({
      data: {
        name,
        code,
        type,
        status: status || 'GOOD',
        description,
        roomId,
      },
    });

    sendSuccess(res, asset, 'Tạo tài sản mới thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/assets/:id ────────────────────────────────────────
export const updateAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, type, status, description, roomId } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('Tài sản không tồn tại', 404);

    const updateData: any = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    if (description !== undefined) updateData.description = description;

    if (roomId) {
      const roomExists = await prisma.room.findUnique({ where: { id: roomId } });
      if (!roomExists) throw new AppError('Phòng chỉ định không tồn tại', 404);
      updateData.roomId = roomId;
    }

    if (code && code !== asset.code) {
      const existingAsset = await prisma.asset.findUnique({ where: { code } });
      if (existingAsset) throw new AppError(`Mã tài sản ${code} đã tồn tại trong hệ thống`, 409);
      updateData.code = code;
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: updateData,
    });

    sendSuccess(res, updated, 'Cập nhật tài sản thành công');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/assets/:id ─────────────────────────────────────
export const deleteAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        _count: {
          select: { maintenanceRequests: true },
        },
      },
    });

    if (!asset) throw new AppError('Tài sản không tồn tại', 404);

    // Không cho phép xóa tài sản đang có lịch sử yêu cầu sửa chữa
    if (asset._count.maintenanceRequests > 0) {
      throw new AppError('Không thể xóa tài sản đã có lịch sử báo cáo sửa chữa', 400);
    }

    await prisma.asset.delete({ where: { id } });
    sendSuccess(res, null, 'Xóa tài sản thành công');
  } catch (err) {
    next(err);
  }
};
