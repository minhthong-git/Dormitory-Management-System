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

    // Student chỉ xem hợp đồng của mình (map từ User -> Student)
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
      where.studentId = student.id;
    }

    const [contracts, total] = await prisma.$transaction([
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, studentCode: true, fullName: true, email: true } },
          bed: {
            select: {
              id: true,
              bedNumber: true,
              status: true,
              room: { select: { id: true, roomNumber: true, type: true, floor: true, pricePerMonth: true } },
            },
          },
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
        student: { select: { id: true, studentCode: true, fullName: true, email: true } },
        bed: {
          select: {
            id: true,
            bedNumber: true,
            status: true,
            room: { select: { id: true, roomNumber: true, type: true, floor: true, pricePerMonth: true } },
          },
        },
        invoices: true,
        transferHistories: { orderBy: { createdAt: 'desc' } },
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
    const { studentId, bedId, startDate, endDate, price, deposit, monthlyFee } = req.body;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new AppError('Sinh viên không tồn tại', 404);

    const bed = await prisma.bed.findUnique({ where: { id: bedId }, include: { room: true } });
    if (!bed) throw new AppError('Giường không tồn tại', 404);
    if (bed.status !== 'AVAILABLE') throw new AppError('Giường không có sẵn để đăng ký', 400);
    if (bed.room.status === 'MAINTENANCE') throw new AppError('Phòng đang bảo trì', 400);

    const activeContract = await prisma.contract.findFirst({ where: { studentId, status: 'ACTIVE' } });
    if (activeContract) throw new AppError('Sinh viên đã có hợp đồng đang hoạt động', 409);

    const finalPrice = price ?? bed.room.pricePerMonth;
    const finalDeposit = deposit ?? finalPrice;
    const finalMonthlyFee = monthlyFee ?? finalPrice;

    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: {
          studentId,
          bedId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          price: finalPrice,
          deposit: finalDeposit,
          monthlyFee: finalMonthlyFee,
          status: 'ACTIVE',
        },
        include: {
          student: { select: { id: true, studentCode: true, fullName: true, email: true } },
          bed: { select: { id: true, bedNumber: true, status: true, room: { select: { id: true, roomNumber: true } } } },
        },
      }),
      prisma.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } }),
      prisma.room.update({
        where: { id: bed.roomId },
        data: {
          currentOccupancy: { increment: 1 },
          status: bed.room.currentOccupancy + 1 >= bed.room.capacity ? 'FULL' : 'AVAILABLE',
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
    const contract = await prisma.contract.findUnique({ where: { id }, include: { bed: { include: { room: true } } } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (contract.status !== 'ACTIVE') throw new AppError('Hợp đồng không còn hiệu lực', 400);

    const [updated] = await prisma.$transaction([
      prisma.contract.update({ where: { id }, data: { status: 'TERMINATED' } }),
      prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }),
      prisma.room.update({
        where: { id: contract.bed.roomId },
        data: { currentOccupancy: { decrement: 1 }, status: 'AVAILABLE' },
      }),
    ]);

    // Trigger notification (fire-and-forget)
    notificationService.onContractTerminated(id).catch(() => {});

    sendSuccess(res, updated, 'Chấm dứt hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contracts/check-in ───────────────────────────────
export const checkIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId, bedId } = req.body as { studentId: string; bedId: string };

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new AppError('Sinh viên không tồn tại', 404);

    const bed = await prisma.bed.findUnique({ where: { id: bedId }, include: { room: true } });
    if (!bed) throw new AppError('Giường không tồn tại', 404);
    if (bed.status !== 'AVAILABLE') throw new AppError('Giường không có sẵn', 400);

    const activeContract = await prisma.contract.findFirst({ where: { studentId, status: 'ACTIVE' } });
    if (activeContract) throw new AppError('Sinh viên đã có hợp đồng đang hoạt động', 409);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    const price = bed.room.pricePerMonth;
    const deposit = bed.room.pricePerMonth;
    const monthlyFee = bed.room.pricePerMonth;

    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: { studentId, bedId, startDate, endDate, price, deposit, monthlyFee, status: 'ACTIVE' },
        include: {
          student: { select: { id: true, studentCode: true, fullName: true } },
          bed: { select: { id: true, bedNumber: true, room: { select: { id: true, roomNumber: true } } } },
        },
      }),
      prisma.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } }),
      prisma.room.update({
        where: { id: bed.roomId },
        data: {
          currentOccupancy: { increment: 1 },
          status: bed.room.currentOccupancy + 1 >= bed.room.capacity ? 'FULL' : 'AVAILABLE',
        },
      }),
    ]);

    sendSuccess(res, contract, 'Check-in thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contracts/check-out ──────────────────────────────
export const checkOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contractId } = req.body as { contractId: string };

    const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: { bed: { include: { room: true } } } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (contract.status !== 'ACTIVE') throw new AppError('Hợp đồng không còn hiệu lực', 400);

    const [updated] = await prisma.$transaction([
      prisma.contract.update({ where: { id: contractId }, data: { status: 'TERMINATED' } }),
      prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }),
      prisma.room.update({
        where: { id: contract.bed.roomId },
        data: { currentOccupancy: { decrement: 1 }, status: 'AVAILABLE' },
      }),
    ]);

    sendSuccess(res, updated, 'Check-out thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contracts/transfer ───────────────────────────────
export const transferBed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentId, newBedId, reason } = req.body as { studentId: string; newBedId: string; reason?: string };

    const contract = await prisma.contract.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: { bed: { include: { room: true } }, student: true },
    });
    if (!contract) throw new AppError('Không tìm thấy hợp đồng ACTIVE', 404);

    const newBed = await prisma.bed.findUnique({ where: { id: newBedId }, include: { room: true } });
    if (!newBed) throw new AppError('Giường mới không tồn tại', 404);
    if (newBed.status !== 'AVAILABLE') throw new AppError('Giường mới không có sẵn', 400);

    const oldBedId = contract.bedId;
    const oldRoomId = contract.bed.roomId;
    const newRoomId = newBed.roomId;

    const transactionTasks: any[] = [
      prisma.contract.update({ where: { id: contract.id }, data: { bedId: newBedId } }),
      prisma.bed.update({ where: { id: oldBedId }, data: { status: 'AVAILABLE' } }),
      prisma.bed.update({ where: { id: newBedId }, data: { status: 'OCCUPIED' } }),
      prisma.transferHistory.create({
        data: {
          contractId: contract.id,
          studentId,
          oldBedId,
          newBedId,
          reason,
        },
      }),
    ];

    // If rooms are different, update currentOccupancy and status for both rooms
    if (oldRoomId !== newRoomId) {
      transactionTasks.push(
        prisma.room.update({
          where: { id: oldRoomId },
          data: {
            currentOccupancy: { decrement: 1 },
            status: 'AVAILABLE',
          },
        }),
        prisma.room.update({
          where: { id: newRoomId },
          data: {
            currentOccupancy: { increment: 1 },
            status: newBed.room.currentOccupancy + 1 >= newBed.room.capacity ? 'FULL' : 'AVAILABLE',
          },
        })
      );
    }

    const [updatedContract] = await prisma.$transaction(transactionTasks);

    sendSuccess(res, updatedContract, 'Chuyển giường thành công');
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/contracts/:id ─────────────────────────────────────
export const updateContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { price, deposit, monthlyFee } = req.body;

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);

    const updated = await prisma.contract.update({
      where: { id },
      data: { price, deposit, monthlyFee },
    });

    sendSuccess(res, updated, 'Cập nhật hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/contracts/:id/extend ────────────────────────────
export const extendContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { endDate } = req.body;

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (contract.status !== 'ACTIVE') throw new AppError('Chỉ có thể gia hạn hợp đồng đang hoạt động', 400);

    const updated = await prisma.contract.update({
      where: { id },
      data: { endDate: new Date(endDate) },
    });

    sendSuccess(res, updated, 'Gia hạn hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/contracts/:id ──────────────────────────────────
export const deleteContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({ where: { id }, include: { bed: { include: { room: true } } } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);

    if (contract.status === 'ACTIVE') {
      // Revert bed and room if deleting an active contract
      await prisma.$transaction([
        prisma.contract.delete({ where: { id } }),
        prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }),
        prisma.room.update({
          where: { id: contract.bed.roomId },
          data: { currentOccupancy: { decrement: 1 }, status: 'AVAILABLE' },
        }),
      ]);
    } else {
      await prisma.contract.delete({ where: { id } });
    }

    sendSuccess(res, null, 'Xóa hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};
