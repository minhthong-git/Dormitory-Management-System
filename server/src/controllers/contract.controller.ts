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
          student: { select: { id: true, studentCode: true, fullName: true, email: true, faculty: true, major: true, course: true } },
          bed: {
            select: {
              id: true,
              roomId: true,
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
        student: { select: { id: true, studentCode: true, fullName: true, email: true, faculty: true, major: true, course: true } },
        bed: {
          select: {
            id: true,
            roomId: true,
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
      userId: student.userId || '',
      roomId: bed.roomId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    }).catch(() => {});

    sendSuccess(res, contract, 'Tạo hợp đồng thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contracts/book ───────────────────────────────────────
export const bookBed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sub: userId } = req.user!;
    const { bedId, startDate, endDate } = req.body;

    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new AppError('Vui lòng cập nhật đầy đủ hồ sơ cá nhân để thuê phòng', 400);
    }
    
    // Yêu cầu đầy đủ thông tin để book phòng
    const missingInfo = [];
    if (!student.phone) missingInfo.push('Số điện thoại');
    if (!student.dateOfBirth) missingInfo.push('Ngày sinh');
    if (student.gender === 'OTHER') missingInfo.push('Giới tính (Nam/Nữ)');
    if (!student.faculty) missingInfo.push('Khoa');
    if (!student.major) missingInfo.push('Chuyên ngành');
    if (!student.course) missingInfo.push('Khóa/Lớp học');
    
    if (missingInfo.length > 0) {
      throw new AppError(`Vui lòng cập nhật đầy đủ thông tin: ${missingInfo.join(', ')} trong hồ sơ cá nhân để thuê phòng.`, 400);
    }

    const bed = await prisma.bed.findUnique({ where: { id: bedId }, include: { room: true } });
    if (!bed) throw new AppError('Giường không tồn tại', 404);
    if (bed.status !== 'AVAILABLE') throw new AppError('Giường đã được người khác đặt hoặc đang sử dụng', 400);
    if (bed.room.status === 'MAINTENANCE') throw new AppError('Phòng đang bảo trì', 400);
    
    // Check Room Gender
    if (bed.room.genderType !== student.gender) {
      throw new AppError('Phòng này không dành cho giới tính của bạn', 400);
    }

    // Check if student already has ACTIVE or PENDING contract
    const existingContract = await prisma.contract.findFirst({
      where: { 
        studentId: student.id, 
        status: { in: ['ACTIVE', 'PENDING'] } 
      }
    });
    if (existingContract) throw new AppError('Bạn đã có hợp đồng đang hoạt động hoặc chờ duyệt', 409);

    const price = bed.room.pricePerMonth;
    const sDate = new Date(startDate || new Date());
    const eDate = new Date(endDate || new Date(new Date().setMonth(new Date().getMonth() + 3))); // Default 3 months

    const [contract] = await prisma.$transaction([
      prisma.contract.create({
        data: {
          studentId: student.id,
          bedId,
          startDate: sDate,
          endDate: eDate,
          price: price,
          deposit: price,
          monthlyFee: price,
          status: 'PENDING',
        },
      }),
      prisma.bed.update({ where: { id: bedId }, data: { status: 'RESERVED' } }),
    ]);

    sendSuccess(res, contract, 'Đã gửi yêu cầu đặt phòng thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/contracts/:id/renew ──────────────────────────────────
export const renewContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { sub: userId } = req.user!;
    
    const oldContract = await prisma.contract.findUnique({
      where: { id },
      include: { student: true, bed: { include: { room: true } } }
    });
    
    if (!oldContract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (oldContract.student.userId !== userId) throw new AppError('Không có quyền gia hạn hợp đồng này', 403);
    if (oldContract.renewalStatus !== 'PRIORITY') throw new AppError('Bạn chưa được cấp quyền ưu tiên gia hạn hoặc quyền đã hết hạn', 400);
    if (oldContract.status !== 'ACTIVE') throw new AppError('Hợp đồng hiện tại không còn hiệu lực', 400);

    // Tính toán ngày kết thúc cũ + 1 tháng nghỉ -> ngày bắt đầu mới
    const nextStartDate = new Date(oldContract.endDate);
    nextStartDate.setMonth(nextStartDate.getMonth() + 1);
    
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setMonth(nextEndDate.getMonth() + 3);

    const price = oldContract.bed.room.pricePerMonth;
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 3); // 3 ngày để thanh toán

    const newContract = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          studentId: oldContract.studentId,
          bedId: oldContract.bedId,
          startDate: nextStartDate,
          endDate: nextEndDate,
          price: price,
          deposit: price,
          monthlyFee: price,
          status: 'AWAITING_PAYMENT',
          renewalStatus: 'RENEWED',
        }
      });

      await tx.invoice.create({
        data: {
          roomId: oldContract.bed.roomId,
          contractId: contract.id,
          billingMonth: nextStartDate.getMonth() + 1, // Tháng của chu kỳ mới
          billingYear: nextStartDate.getFullYear(),
          roomFee: price,
          electricityFee: 0,
          waterFee: 0,
          serviceFee: 0,
          totalAmount: price * 2, // Tiền phòng tháng đầu + cọc (bằng 1 tháng)
          dueDate: dueDate,
        }
      });

      await tx.contract.update({
        where: { id: oldContract.id },
        data: { renewalStatus: 'RENEWED' } // Đánh dấu đã đăng ký gia hạn
      });

      return contract;
    });

    sendSuccess(res, newContract, 'Đã tạo yêu cầu gia hạn phòng. Vui lòng thanh toán hóa đơn trong vòng 3 ngày.', 201);
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/contracts/:id/approve ───────────────────────────────
export const approveContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({ where: { id }, include: { bed: { include: { room: true } } } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (contract.status !== 'PENDING') throw new AppError('Hợp đồng không ở trạng thái chờ duyệt', 400);

    const invoiceAmount = contract.deposit + contract.monthlyFee;
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 10); // Hạn thanh toán: 10 phút

    const [updated] = await prisma.$transaction([
      prisma.contract.update({ where: { id }, data: { status: 'AWAITING_PAYMENT' } }),
      // Giường vẫn giữ trạng thái RESERVED cho đến khi thanh toán xong
      prisma.invoice.create({
        data: {
          roomId: contract.bed.roomId,
          contractId: contract.id,
          billingMonth: new Date().getMonth() + 1,
          billingYear: new Date().getFullYear(),
          roomFee: contract.monthlyFee,
          electricityFee: 0,
          waterFee: 0,
          serviceFee: contract.deposit, // Dùng serviceFee để lưu tiền cọc cho hóa đơn đầu tiên
          totalAmount: invoiceAmount,
          paymentStatus: 'UNPAID',
          dueDate,
        }
      })
    ]);

    sendSuccess(res, updated, 'Đã duyệt yêu cầu. Vui lòng thanh toán hóa đơn để hoàn tất check-in.');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/contracts/:id/reject ───────────────────────────────
export const rejectContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    if (contract.status !== 'PENDING' && contract.status !== 'AWAITING_PAYMENT') throw new AppError('Hợp đồng không ở trạng thái chờ duyệt hoặc chờ thanh toán', 400);

    const [updated] = await prisma.$transaction([
      prisma.contract.update({ where: { id }, data: { status: 'REJECTED' } }),
      prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }),
    ]);

    sendSuccess(res, updated, 'Đã từ chối hợp đồng');
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/contracts/:id/cancel ───────────────────────────────
export const cancelContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const contract = await prisma.contract.findUnique({ where: { id }, include: { student: true } });
    if (!contract) throw new AppError('Hợp đồng không tồn tại', 404);
    
    // Check if the current user is the owner
    // @ts-ignore
    const user = req.user;
    if (user?.role === 'STUDENT' && contract.student?.userId !== user?.sub) {
      throw new AppError('Không có quyền hủy hợp đồng này', 403);
    }

    if (contract.status !== 'PENDING' && contract.status !== 'AWAITING_PAYMENT') {
      throw new AppError('Chỉ có thể hủy hợp đồng đang chờ duyệt hoặc chờ thanh toán', 400);
    }

    const [updated] = await prisma.$transaction([
      prisma.contract.update({ where: { id }, data: { status: 'REJECTED' } }),
      prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }),
      prisma.invoice.updateMany({ 
        where: { contractId: id, paymentStatus: 'UNPAID' },
        data: { paymentStatus: 'OVERDUE' }
      })
    ]);

    sendSuccess(res, updated, 'Đã hủy yêu cầu thuê phòng thành công');
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

    const transactionTasks: any[] = [];

    // 1. Delete unpaid invoices and their payment transactions
    const unpaidInvoices = await prisma.invoice.findMany({ where: { contractId: id, paymentStatus: 'UNPAID' } });
    const unpaidInvoiceIds = unpaidInvoices.map(i => i.id);
    if (unpaidInvoiceIds.length > 0) {
      transactionTasks.push(prisma.paymentTransaction.deleteMany({ where: { invoiceId: { in: unpaidInvoiceIds } } }));
      transactionTasks.push(prisma.invoice.deleteMany({ where: { id: { in: unpaidInvoiceIds } } }));
    }

    // 2. Unlink any remaining paid invoices to preserve financial history
    transactionTasks.push(prisma.invoice.updateMany({ where: { contractId: id }, data: { contractId: null } }));

    // 3. Delete transfer histories (contractId is required, so they must be deleted)
    transactionTasks.push(prisma.transferHistory.deleteMany({ where: { contractId: id } }));

    // 4. Revert Bed and Room statuses based on contract status
    if (contract.status === 'ACTIVE') {
      transactionTasks.push(prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }));
      transactionTasks.push(prisma.room.update({
        where: { id: contract.bed.roomId },
        data: { currentOccupancy: { decrement: 1 }, status: 'AVAILABLE' },
      }));
    } else if (contract.status === 'PENDING' || contract.status === 'AWAITING_PAYMENT') {
      transactionTasks.push(prisma.bed.update({ where: { id: contract.bedId }, data: { status: 'AVAILABLE' } }));
      // Room occupancy was never incremented for these statuses, so no decrement needed.
    }

    // 5. Finally, delete the contract itself
    transactionTasks.push(prisma.contract.delete({ where: { id } }));

    await prisma.$transaction(transactionTasks);

    sendSuccess(res, null, 'Xóa hợp đồng thành công');
  } catch (err) {
    next(err);
  }
};
