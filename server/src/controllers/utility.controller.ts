import { Response, NextFunction } from 'express';
import { UtilityService } from '@/services/utility.service';
import { BillingService } from '@/services/billing.service';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import type { AuthRequest } from '@/types';

const utilityService = new UtilityService();
const billingService = new BillingService();

// GET /api/utilities
export const getReadings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const roomId = req.query.roomId as string;
    
    // STUDENT only views their own room's utility readings
    const userId = req.user?.role === 'STUDENT' ? req.user.sub : undefined;

    const { items, total } = await utilityService.getReadings({
      roomId,
      skip,
      take: limit,
      userId,
    });

    sendPaginated(res, items, total, page, limit, 'Lấy danh sách chỉ số điện nước thành công');
  } catch (err) {
    next(err);
  }
};

// GET /api/utilities/:id
export const getReadingById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const reading = await utilityService.getReadingById(id);

    // STUDENT check: only allow viewing if they reside in the room
    if (req.user?.role === 'STUDENT') {
      const isRoomOccupiedByUser = await checkUserOccupiesRoom(req.user.sub, reading.roomId);
      if (!isRoomOccupiedByUser) {
        throw new AppError('Bạn không có quyền xem chỉ số điện nước này.', 403);
      }
    }

    sendSuccess(res, reading, 'Lấy chi tiết chỉ số điện nước thành công');
  } catch (err) {
    next(err);
  }
};

// POST /api/utilities
export const createReading = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reading = await utilityService.createReading({
      roomId: req.body.roomId,
      billingMonth: parseInt(req.body.billingMonth, 10),
      billingYear: parseInt(req.body.billingYear, 10),
      previousElectric: parseFloat(req.body.previousElectric),
      currentElectric: parseFloat(req.body.currentElectric),
      previousWater: parseFloat(req.body.previousWater),
      currentWater: parseFloat(req.body.currentWater),
      electricPrice: parseFloat(req.body.electricPrice),
      waterPrice: parseFloat(req.body.waterPrice),
    });

    sendSuccess(res, reading, 'Ghi chỉ số điện nước thành công', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/utilities/:id
export const updateReading = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const reading = await utilityService.updateReading(id, req.body);
    sendSuccess(res, reading, 'Cập nhật chỉ số điện nước thành công');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/utilities/:id
export const deleteReading = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await utilityService.deleteReading(id);
    sendSuccess(res, null, 'Xóa chỉ số điện nước thành công');
  } catch (err) {
    next(err);
  }
};

// POST /api/utilities/calculate
export const calculateUtility = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      roomFee,
      previousElectric,
      currentElectric,
      previousWater,
      currentWater,
      electricPrice,
      waterPrice,
      serviceFee,
    } = req.body;

    const calculations = billingService.calculateInvoice({
      roomFee: parseFloat(roomFee),
      previousElectric: parseFloat(previousElectric),
      currentElectric: parseFloat(currentElectric),
      previousWater: parseFloat(previousWater),
      currentWater: parseFloat(currentWater),
      electricPrice: parseFloat(electricPrice),
      waterPrice: parseFloat(waterPrice),
      serviceFee: parseFloat(serviceFee),
    });

    sendSuccess(res, calculations, 'Tính toán chi phí điện nước thành công');
  } catch (err) {
    next(err);
  }
};

// Helper function to check if student occupies room
async function checkUserOccupiesRoom(userId: string, roomId: string): Promise<boolean> {
  const { prisma } = await import('@/config/db');
  const activeContract = await prisma.contract.findFirst({
    where: {
      student: { userId },
      bed: { roomId },
      status: { in: ['ACTIVE', 'AWAITING_PAYMENT'] },
    },
  });
  return !!activeContract;
}
