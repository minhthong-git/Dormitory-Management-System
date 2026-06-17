import { UtilityRepository } from '@/repositories/utility.repository';
import type { CreateUtilityReadingDto, UpdateUtilityReadingDto } from '@/types';
import { AppError } from '@/middleware/errorHandler';

export class UtilityService {
  private utilityRepository: UtilityRepository;

  constructor() {
    this.utilityRepository = new UtilityRepository();
  }

  async getReadings(filters: { roomId?: string; skip?: number; take?: number; userId?: string }) {
    return this.utilityRepository.findAll(filters);
  }

  async getReadingById(id: string) {
    const reading = await this.utilityRepository.findById(id);
    if (!reading) {
      throw new AppError('Không tìm thấy chỉ số điện nước', 404);
    }
    return reading;
  }

  async createReading(data: CreateUtilityReadingDto) {
    // Check if reading already exists for this room, month, and year
    const existing = await this.utilityRepository.findByRoomMonthYear(
      data.roomId,
      data.billingMonth,
      data.billingYear
    );
    if (existing) {
      throw new AppError(`Chỉ số điện nước cho phòng này trong tháng ${data.billingMonth}/${data.billingYear} đã tồn tại.`, 400);
    }

    if (data.currentElectric < data.previousElectric) {
      throw new AppError('Chỉ số điện mới không được nhỏ hơn chỉ số cũ.', 400);
    }
    if (data.currentWater < data.previousWater) {
      throw new AppError('Chỉ số nước mới không được nhỏ hơn chỉ số cũ.', 400);
    }

    return this.utilityRepository.createReading(data);
  }

  async updateReading(id: string, data: UpdateUtilityReadingDto) {
    const existing = await this.utilityRepository.findById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy chỉ số điện nước', 404);
    }

    // Validate new values if provided
    const prevElec = data.previousElectric !== undefined ? data.previousElectric : existing.previousElectric;
    const currElec = data.currentElectric !== undefined ? data.currentElectric : existing.currentElectric;
    const prevWater = data.previousWater !== undefined ? data.previousWater : existing.previousWater;
    const currWater = data.currentWater !== undefined ? data.currentWater : existing.currentWater;

    if (currElec < prevElec) {
      throw new AppError('Chỉ số điện mới không được nhỏ hơn chỉ số cũ.', 400);
    }
    if (currWater < prevWater) {
      throw new AppError('Chỉ số nước mới không được nhỏ hơn chỉ số cũ.', 400);
    }

    // Check duplicate month/year if updating
    if (data.roomId || data.billingMonth || data.billingYear) {
      const room = data.roomId || existing.roomId;
      const month = data.billingMonth || existing.billingMonth;
      const year = data.billingYear || existing.billingYear;

      if (room !== existing.roomId || month !== existing.billingMonth || year !== existing.billingYear) {
        const dup = await this.utilityRepository.findByRoomMonthYear(room, month, year);
        if (dup && dup.id !== id) {
          throw new AppError(`Chỉ số điện nước cho phòng này trong tháng ${month}/${year} đã tồn tại.`, 400);
        }
      }
    }

    return this.utilityRepository.updateReading(id, data);
  }

  async deleteReading(id: string) {
    const existing = await this.utilityRepository.findById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy chỉ số điện nước', 404);
    }
    return this.utilityRepository.deleteReading(id);
  }

  async getLatestReading(roomId: string) {
    return this.utilityRepository.findLatestByRoom(roomId);
  }
}
