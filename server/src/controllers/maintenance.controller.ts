import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { notificationService } from '@/services/notification.service';

// â”€â”€ POST /api/maintenance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sinh viÃªn gá»­i yÃªu cáº§u sá»­a chá»¯a tÃ i sáº£n phÃ²ng mÃ¬nh
export const createRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const { title, description, priority, assetId } = req.body;

    if (!title || !description) {
      throw new AppError('Vui lÃ²ng cung cáº¥p tiÃªu Ä‘á» vÃ  mÃ´ táº£ chi tiáº¿t lá»—i', 400);
    }

    // 1. TÃ¬m Student qua userId
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) throw new AppError('TÃ i khoáº£n sinh viÃªn khÃ´ng tá»“n táº¡i', 404);

    // 2. TÃ¬m phÃ²ng hiá»‡n táº¡i cá»§a Student
    const contract = await prisma.contract.findFirst({
      where: { studentId: student.id, status: 'ACTIVE' },
      include: { bed: true },
    });
    if (!contract || !contract.bed) {
      throw new AppError('Báº¡n khÃ´ng thuá»™c phÃ²ng á»Ÿ há»£p lá»‡ hoáº·c há»£p Ä‘á»“ng Ä‘Ã£ háº¿t hiá»‡u lá»±c', 403);
    }

    const roomId = contract.bed.roomId;

    // 3. Náº¿u cÃ³ assetId, kiá»ƒm tra xem tÃ i sáº£n Ä‘Ã³ cÃ³ thuá»™c phÃ²ng cá»§a sinh viÃªn khÃ´ng
    if (assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: assetId, roomId },
      });
      if (!asset) {
        throw new AppError('TÃ i sáº£n Ä‘Æ°á»£c chá»n khÃ´ng thuá»™c phÃ²ng cá»§a báº¡n', 400);
      }

      // Tá»± Ä‘á»™ng chuyá»ƒn tráº¡ng thÃ¡i tÃ i sáº£n thÃ nh DAMAGED khi bÃ¡o há»ng
      await prisma.asset.update({
        where: { id: assetId },
        data: { status: 'DAMAGED' },
      });
    }

    // 4. Táº¡o yÃªu cáº§u sá»­a chá»¯a
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

    // 5. Gá»­i thÃ´ng bÃ¡o thá»i gian thá»±c Ä‘áº¿n Staff/Admin
    await notificationService.sendToStaff({
      type: 'SYSTEM', // Gá»­i dÆ°á»›i dáº¡ng SYSTEM thÃ´ng bÃ¡o báº£o trÃ¬ má»›i
      priority: (priority as any) || 'MEDIUM',
      title: `YÃªu cáº§u sá»­a chá»¯a má»›i â€” PhÃ²ng ${request.room.roomNumber}`,
      message: `Sinh viÃªn ${student.fullName} bÃ¡o sá»± cá»‘: "${title}". Thiáº¿t bá»‹: ${request.asset ? `${request.asset.name} (${request.asset.code})` : 'KhÃ¡c'}.`,
      referenceId: request.id,
      referenceType: 'SYSTEM',
    });

    sendSuccess(res, request, 'Gá»­i yÃªu cáº§u sá»­a chá»¯a thÃ nh cÃ´ng', 201);
  } catch (err) {
    next(err);
  }
};

// â”€â”€ GET /api/maintenance/my-requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sinh viÃªn láº¥y danh sÃ¡ch lá»‹ch sá»­ sá»­a chá»¯a cá»§a phÃ²ng mÃ¬nh
export const getMyRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) throw new AppError('TÃ i khoáº£n sinh viÃªn khÃ´ng tá»“n táº¡i', 404);

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

    sendPaginated(res, requests, total, page, limit, 'Láº¥y lá»‹ch sá»­ sá»­a chá»¯a thÃ nh cÃ´ng');
  } catch (err) {
    next(err);
  }
};

// â”€â”€ GET /api/maintenance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin/Staff láº¥y danh sÃ¡ch táº¥t cáº£ cÃ¡c yÃªu cáº§u sá»­a chá»¯a
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

    sendPaginated(res, requests, total, page, limit, 'Láº¥y danh sÃ¡ch yÃªu cáº§u báº£o trÃ¬ thÃ nh cÃ´ng');
  } catch (err) {
    next(err);
  }
};

// â”€â”€ PATCH /api/maintenance/:id/assign â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PhÃ¢n cÃ´ng Staff chá»‹u trÃ¡ch nhiá»‡m sá»­a chá»¯a
export const assignStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!staffId) throw new AppError('Vui lÃ²ng chá»n nhÃ¢n viÃªn ká»¹ thuáº­t (Staff)', 400);

    // 1. Kiá»ƒm tra yÃªu cáº§u sá»­a chá»¯a cÃ³ tá»“n táº¡i khÃ´ng
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true } },
        student: { select: { userId: true, fullName: true } },
      },
    });
    if (!request) throw new AppError('YÃªu cáº§u sá»­a chá»¯a khÃ´ng tá»“n táº¡i', 404);

    // 2. Kiá»ƒm tra Staff Ä‘Æ°á»£c phÃ¢n cÃ´ng cÃ³ tá»“n táº¡i & cÃ³ role STAFF/ADMIN khÃ´ng
    const staffUser = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staffUser || (staffUser.role !== 'STAFF' && staffUser.role !== 'ADMIN')) {
      throw new AppError('NhÃ¢n viÃªn ká»¹ thuáº­t khÃ´ng há»£p lá»‡', 400);
    }

    // 3. Cáº­p nháº­t yÃªu cáº§u
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

    // 4. Gá»­i thÃ´ng bÃ¡o cho sinh viÃªn bÃ¡o cÃ¡o lá»—i
    if (request.student.userId) {
      await notificationService.send({
        userId: request.student.userId,
        type: 'SYSTEM',
        priority: 'MEDIUM',
        title: `PhÃ¢n cÃ´ng sá»­a chá»¯a â€” PhÃ²ng ${request.room.roomNumber}`,
        message: `YÃªu cáº§u "${request.title}" cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c giao cho ká»¹ thuáº­t viÃªn ${updated.staff?.fullName}.`,
        referenceId: request.id,
        referenceType: 'SYSTEM',
      });
    }

    // 5. Gá»­i thÃ´ng bÃ¡o cho Staff nháº­n viá»‡c
    await notificationService.send({
      userId: staffId,
      type: 'SYSTEM',
      priority: 'MEDIUM',
      title: `Nhiá»‡m vá»¥ sá»­a chá»¯a má»›i â€” PhÃ²ng ${request.room.roomNumber}`,
      message: `Báº¡n Ä‘Æ°á»£c phÃ¢n cÃ´ng sá»­a chá»¯a lá»—i "${request.title}" táº¡i phÃ²ng ${request.room.roomNumber}.`,
      referenceId: request.id,
      referenceType: 'SYSTEM',
    });

    sendSuccess(res, updated, 'PhÃ¢n cÃ´ng nhÃ¢n viÃªn sá»­a chá»¯a thÃ nh cÃ´ng');
  } catch (err) {
    next(err);
  }
};

// â”€â”€ PATCH /api/maintenance/:id/status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Cáº­p nháº­t tiáº¿n Ä‘á»™ sá»­a chá»¯a & ghi chÃº cá»§a Staff
export const updateRequestStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) throw new AppError('Vui lÃ²ng cung cáº¥p tráº¡ng thÃ¡i má»›i', 400);

    const validStatuses = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡', 400);
    }

    // 1. TÃ¬m yÃªu cáº§u sá»­a chá»¯a
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true } },
        student: { select: { userId: true } },
      },
    });
    if (!request) throw new AppError('YÃªu cáº§u sá»­a chá»¯a khÃ´ng tá»“n táº¡i', 404);

    // Kiá»ƒm tra quyá»n: Sinh viÃªn chá»‰ Ä‘Æ°á»£c phÃ©p Há»¦Y (CANCELLED) yÃªu cáº§u do chÃ­nh mÃ¬nh táº¡o
    const userRole = req.user?.role;
    const userId = req.user?.sub;
    if (userRole === 'STUDENT') {
      if (status !== 'CANCELLED') {
        throw new AppError('Báº¡n khÃ´ng cÃ³ quyá»n chuyá»ƒn sang tráº¡ng thÃ¡i nÃ y. Chá»‰ nhÃ¢n viÃªn ká»¹ thuáº­t má»›i cÃ³ quyá»n xá»­ lÃ½.', 403);
      }
      if (request.student.userId !== userId) {
        throw new AppError('Báº¡n khÃ´ng cÃ³ quyá»n chá»‰nh sá»­a yÃªu cáº§u cá»§a ngÆ°á»i khÃ¡c', 403);
      }
      if (request.status === 'RESOLVED' || request.status === 'CANCELLED') {
        throw new AppError('YÃªu cáº§u nÃ y Ä‘Ã£ hoÃ n thÃ nh hoáº·c Ä‘Ã£ bá»‹ há»§y trÆ°á»›c Ä‘Ã³', 400);
      }
    }

    const updateData: any = { status };
    if (notes !== undefined) updateData.notes = notes;

    // Náº¿u hoÃ n thÃ nh, cáº­p nháº­t thá»i gian hoÃ n thÃ nh
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();

      // Náº¿u yÃªu cáº§u gáº¯n vá»›i tÃ i sáº£n cá»¥ thá»ƒ, tá»± Ä‘á»™ng chuyá»ƒn tráº¡ng thÃ¡i tÃ i sáº£n thÃ nh GOOD
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

    // 2. Gá»­i thÃ´ng bÃ¡o cho Sinh viÃªn cáº­p nháº­t tÃ¬nh hÃ¬nh sá»­a chá»¯a
    if (request.student.userId) {
      let statusLabel = 'Äang xá»­ lÃ½';
      if (status === 'RESOLVED') statusLabel = 'ÄÃ£ hoÃ n thÃ nh';
      if (status === 'CANCELLED') statusLabel = 'ÄÃ£ bá»‹ há»§y';

      await notificationService.send({
        userId: request.student.userId,
        type: 'SYSTEM',
        priority: 'MEDIUM',
        title: `Cáº­p nháº­t tráº¡ng thÃ¡i sá»­a chá»¯a â€” PhÃ²ng ${request.room.roomNumber}`,
        message: `YÃªu cáº§u "${request.title}" cá»§a báº¡n hiá»‡n á»Ÿ tráº¡ng thÃ¡i: [${statusLabel}]. ${notes ? `Ghi chÃº ká»¹ thuáº­t: "${notes}"` : ''}`,
        referenceId: request.id,
        referenceType: 'SYSTEM',
      });
    }

    sendSuccess(res, updated, 'Cáº­p nháº­t tráº¡ng thÃ¡i sá»­a chá»¯a thÃ nh cÃ´ng');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/maintenance/:id/rate ─────────────────────────────
export const rateRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { student: true }
    });
    if (!request) throw new AppError('Yêu cầu không tồn tại', 404);
    if (request.student.userId !== req.user!.sub) throw new AppError('Bạn không có quyền đánh giá', 403);
    if (request.status !== 'RESOLVED') throw new AppError('Chỉ có thể đánh giá khi đã hoàn thành', 400);
    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { rating, feedback }
    });
    sendSuccess(res, updated, 'Đánh giá thành công');
  } catch (err) {
    next(err);
  }
};
