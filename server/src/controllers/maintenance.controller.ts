import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { notificationService } from '@/services/notification.service';

// ── POST /api/maintenance ──────────────────────────────────────
// Sinh viên gửi yêu cầu sửa chữa tài sản phòng mình
export const createRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const { title, description, priority, assetId } = req.body;

    if (!title || !description) {
      throw new AppError('Vui lòng cung cấp tiêu đề và mô tả chi tiết lỗi', 400);
    }

    // 1. Tìm Student qua userId
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) throw new AppError('Tài khoản sinh viên không tồn tại', 404);

    // 2. Tìm phòng hiện tại của Student
    const contract = await prisma.contract.findFirst({
      where: { studentId: student.id, status: 'ACTIVE' },
      include: { bed: true },
    });
    if (!contract || !contract.bed) {
      throw new AppError('Bạn không thuộc phòng ở hợp lệ hoặc hợp đồng đã hết hiệu lực', 403);
    }

    const roomId = contract.bed.roomId;

    // 3. Nếu có assetId, kiểm tra xem tài sản đó có thuộc phòng của sinh viên không
    if (assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: assetId, roomId },
      });
      if (!asset) {
        throw new AppError('Tài sản được chọn không thuộc phòng của bạn', 400);
      }

      // Tự động chuyển trạng thái tài sản thành DAMAGED khi báo hỏng
      await prisma.asset.update({
        where: { id: assetId },
        data: { status: 'DAMAGED' },
      });
    }

    // 4. Tạo yêu cầu sửa chữa
    const request = await prisma.maintenanceRequest.create({
      data: {
        roomId,
        assetId: assetId || null,
        studentId: student.id,
        title,
        description,
        status: 'PENDING',
        priority: priority || 'MEDIUM',
      },
      include: {
        room: { select: { roomNumber: true } },
        asset: { select: { name: true, code: true } },
      },
    });

    // 5. Gửi thông báo thời gian thực đến Staff/Admin
    await notificationService.sendToStaff({
      type: 'SYSTEM', // Gửi dưới dạng SYSTEM thông báo bảo trì mới
      priority: (priority as any) || 'MEDIUM',
      title: `Yêu cầu sửa chữa mới — Phòng ${request.room.roomNumber}`,
      message: `Sinh viên ${student.fullName} báo sự cố: "${title}". Thiết bị: ${request.asset ? `${request.asset.name} (${request.asset.code})` : 'Khác'}.`,
      referenceId: request.id,
      referenceType: 'SYSTEM',
    });

    sendSuccess(res, request, 'Gửi yêu cầu sửa chữa thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/maintenance/my-requests ───────────────────────────
// Sinh viên lấy danh sách lịch sử sửa chữa của phòng mình
export const getMyRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) throw new AppError('Tài khoản sinh viên không tồn tại', 404);

    const where = { studentId: student.id };

    const [requests, total] = await prisma.$transaction([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { name: true, code: true } },
          staff: { select: { fullName: true, phone: true } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    sendPaginated(res, requests, total, page, limit, 'Lấy lịch sử sửa chữa thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/maintenance ───────────────────────────────────────
// Admin/Staff lấy danh sách tất cả các yêu cầu sửa chữa
export const getAllRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const roomId = req.query.roomId as string | undefined;
    const staffId = req.query.staffId as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (roomId) where.roomId = roomId;
    if (staffId) where.staffId = staffId;

    const [requests, total] = await prisma.$transaction([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          room: { select: { roomNumber: true } },
          asset: { select: { name: true, code: true } },
          student: { select: { fullName: true, phone: true } },
          staff: { select: { fullName: true, phone: true } },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    sendPaginated(res, requests, total, page, limit, 'Lấy danh sách yêu cầu bảo trì thành công');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/maintenance/:id/assign ──────────────────────────
// Phân công Staff chịu trách nhiệm sửa chữa
export const assignStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!staffId) throw new AppError('Vui lòng chọn nhân viên kỹ thuật (Staff)', 400);

    // 1. Kiểm tra yêu cầu sửa chữa có tồn tại không
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true } },
        student: { select: { userId: true, fullName: true } },
      },
    });
    if (!request) throw new AppError('Yêu cầu sửa chữa không tồn tại', 404);

    // 2. Kiểm tra Staff được phân công có tồn tại & có role STAFF/ADMIN không
    const staffUser = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staffUser || (staffUser.role !== 'STAFF' && staffUser.role !== 'ADMIN')) {
      throw new AppError('Nhân viên kỹ thuật không hợp lệ', 400);
    }

    // 3. Cập nhật yêu cầu
    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        staffId,
        status: 'ASSIGNED',
      },
      include: {
        staff: { select: { fullName: true } },
      },
    });

    // 4. Gửi thông báo cho sinh viên báo cáo lỗi
    if (request.student.userId) {
      await notificationService.send({
        userId: request.student.userId,
        type: 'SYSTEM',
        priority: 'MEDIUM',
        title: `Phân công sửa chữa — Phòng ${request.room.roomNumber}`,
        message: `Yêu cầu "${request.title}" của bạn đã được giao cho kỹ thuật viên ${updated.staff?.fullName}.`,
        referenceId: request.id,
        referenceType: 'SYSTEM',
      });
    }

    // 5. Gửi thông báo cho Staff nhận việc
    await notificationService.send({
      userId: staffId,
      type: 'SYSTEM',
      priority: 'MEDIUM',
      title: `Nhiệm vụ sửa chữa mới — Phòng ${request.room.roomNumber}`,
      message: `Bạn được phân công sửa chữa lỗi "${request.title}" tại phòng ${request.room.roomNumber}.`,
      referenceId: request.id,
      referenceType: 'SYSTEM',
    });

    sendSuccess(res, updated, 'Phân công nhân viên sửa chữa thành công');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/maintenance/:id/status ──────────────────────────
// Cập nhật tiến độ sửa chữa & ghi chú của Staff
export const updateRequestStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) throw new AppError('Vui lòng cung cấp trạng thái mới', 400);

    const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Trạng thái không hợp lệ', 400);
    }

    // 1. Tìm yêu cầu sửa chữa
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true } },
        student: { select: { userId: true } },
      },
    });
    if (!request) throw new AppError('Yêu cầu sửa chữa không tồn tại', 404);

    // Kiểm tra quyền: Sinh viên chỉ được phép HỦY (CANCELLED) yêu cầu do chính mình tạo
    const userRole = req.user?.role;
    const userId = req.user?.sub;
    if (userRole === 'STUDENT') {
      if (status !== 'CANCELLED') {
        throw new AppError('Bạn không có quyền chuyển sang trạng thái này. Chỉ nhân viên kỹ thuật mới có quyền xử lý.', 403);
      }
      if (request.student.userId !== userId) {
        throw new AppError('Bạn không có quyền chỉnh sửa yêu cầu của người khác', 403);
      }
      if (request.status === 'RESOLVED' || request.status === 'CANCELLED') {
        throw new AppError('Yêu cầu này đã hoàn thành hoặc đã bị hủy trước đó', 400);
      }
    }

    const updateData: any = { status };
    if (notes !== undefined) updateData.notes = notes;

    // Nếu hoàn thành, cập nhật thời gian hoàn thành
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();

      // Nếu yêu cầu gắn với tài sản cụ thể, tự động chuyển trạng thái tài sản thành GOOD
      if (request.assetId) {
        await prisma.asset.update({
          where: { id: request.assetId },
          data: { status: 'GOOD' },
        });
      }
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData,
    });

    // 2. Gửi thông báo cho Sinh viên cập nhật tình hình sửa chữa
    if (request.student.userId) {
      let statusLabel = 'Đang xử lý';
      if (status === 'RESOLVED') statusLabel = 'Đã hoàn thành';
      if (status === 'CANCELLED') statusLabel = 'Đã bị hủy';

      await notificationService.send({
        userId: request.student.userId,
        type: 'SYSTEM',
        priority: 'MEDIUM',
        title: `Cập nhật trạng thái sửa chữa — Phòng ${request.room.roomNumber}`,
        message: `Yêu cầu "${request.title}" của bạn hiện ở trạng thái: [${statusLabel}]. ${notes ? `Ghi chú kỹ thuật: "${notes}"` : ''}`,
        referenceId: request.id,
        referenceType: 'SYSTEM',
      });
    }

    sendSuccess(res, updated, 'Cập nhật trạng thái sửa chữa thành công');
  } catch (err) {
    next(err);
  }
};
