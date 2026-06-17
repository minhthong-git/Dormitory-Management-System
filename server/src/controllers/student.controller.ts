import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';

// ── GET /api/students ──────────────────────────────────────────
export const getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;
    const searchName = ((req.query.fullName || req.query.name) as string | undefined)?.trim();
    const searchCode = (req.query.studentCode as string | undefined)?.trim();
    const status = (req.query.status as string | undefined)?.trim();

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (searchName) where.fullName = { contains: searchName };
    if (searchCode) where.studentCode = { contains: searchCode };

    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    sendPaginated(res, students, total, page, limit, 'Lấy danh sách sinh viên thành công');
  } catch (err) {
    next(err);
  }
};

// ── GET /api/students/:id ──────────────────────────────────────
export const getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) throw new AppError('Sinh viên không tồn tại', 404);
    sendSuccess(res, student, 'Lấy thông tin sinh viên thành công');
  } catch (err) {
    next(err);
  }
};

// ── POST /api/students ─────────────────────────────────────────
export const createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { studentCode, fullName, gender, dateOfBirth, email, phone, faculty, major, course, emergencyContact, emergencyPhone, status, userId } = req.body;

    const existing = await prisma.student.findFirst({
      where: { OR: [{ studentCode }, { email }, ...(userId ? [{ userId }] : [])] },
    });
    if (existing) throw new AppError('Sinh viên đã tồn tại (studentCode/email/userId trùng)', 409);

    const student = await prisma.student.create({
      data: {
        studentCode,
        fullName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        email,
        phone,
        faculty,
        major,
        course,
        emergencyContact,
        emergencyPhone,
        status: status ?? 'ACTIVE',
        userId: userId || null,
      },
    });
    sendSuccess(res, student, 'Tạo sinh viên thành công', 201);
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/students/:id ──────────────────────────────────────
export const updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { studentCode, fullName, gender, dateOfBirth, email, phone, faculty, major, course, emergencyContact, emergencyPhone, status, userId } = req.body;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) throw new AppError('Sinh viên không tồn tại', 404);

    if (studentCode && studentCode !== student.studentCode) {
      const dup = await prisma.student.findUnique({ where: { studentCode } });
      if (dup) throw new AppError('studentCode đã tồn tại', 409);
    }
    if (email && email !== student.email) {
      const dup = await prisma.student.findUnique({ where: { email } });
      if (dup) throw new AppError('email đã tồn tại', 409);
    }
    if (userId && userId !== student.userId) {
      const dup = await prisma.student.findUnique({ where: { userId } });
      if (dup) throw new AppError('userId đã được gán cho sinh viên khác', 409);
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        studentCode,
        fullName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : (dateOfBirth === null ? null : undefined),
        email,
        phone,
        faculty,
        major,
        course,
        emergencyContact,
        emergencyPhone,
        status,
        userId: userId || (userId === null ? null : undefined),
      },
    });
    sendSuccess(res, updated, 'Cập nhật sinh viên thành công');
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/students/:id ───────────────────────────────────
export const deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) throw new AppError('Sinh viên không tồn tại', 404);

    const activeContract = await prisma.contract.findFirst({ where: { studentId: id, status: 'ACTIVE' } });
    if (activeContract) throw new AppError('Không thể xóa sinh viên đang có hợp đồng ACTIVE', 400);

    await prisma.student.delete({ where: { id } });
    sendSuccess(res, null, 'Xóa sinh viên thành công');
  } catch (err) {
    next(err);
  }
};

