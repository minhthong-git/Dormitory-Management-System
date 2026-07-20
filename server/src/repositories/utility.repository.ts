import { prisma } from '@/config/db';
import type { CreateUtilityReadingDto, UpdateUtilityReadingDto } from '@/types';

export class UtilityRepository {
  async createReading(data: CreateUtilityReadingDto) {
    const electricUsed = data.currentElectric - data.previousElectric;
    const waterUsed = data.currentWater - data.previousWater;

    return prisma.utilityReading.create({
      data: {
        roomId: data.roomId,
        billingMonth: data.billingMonth,
        billingYear: data.billingYear,
        previousElectric: data.previousElectric,
        currentElectric: data.currentElectric,
        electricUsed: electricUsed >= 0 ? electricUsed : 0,
        previousWater: data.previousWater,
        currentWater: data.currentWater,
        waterUsed: waterUsed >= 0 ? waterUsed : 0,
        electricPrice: data.electricPrice,
        waterPrice: data.waterPrice,
      },
      include: {
        room: { select: { roomNumber: true } }
      }
    });
  }

  async updateReading(id: string, data: UpdateUtilityReadingDto) {
    const updateData: any = {};
    if (data.roomId !== undefined) updateData.roomId = data.roomId;
    if (data.billingMonth !== undefined) updateData.billingMonth = data.billingMonth;
    if (data.billingYear !== undefined) updateData.billingYear = data.billingYear;
    if (data.previousElectric !== undefined) updateData.previousElectric = data.previousElectric;
    if (data.currentElectric !== undefined) updateData.currentElectric = data.currentElectric;
    if (data.previousWater !== undefined) updateData.previousWater = data.previousWater;
    if (data.currentWater !== undefined) updateData.currentWater = data.currentWater;
    if (data.electricPrice !== undefined) updateData.electricPrice = data.electricPrice;
    if (data.waterPrice !== undefined) updateData.waterPrice = data.waterPrice;

    // If electricity/water readings are updated, recalculate the usage
    if (data.previousElectric !== undefined || data.currentElectric !== undefined) {
      const currentRecord = await prisma.utilityReading.findUnique({ where: { id } });
      if (currentRecord) {
        const prev = data.previousElectric !== undefined ? data.previousElectric : currentRecord.previousElectric;
        const curr = data.currentElectric !== undefined ? data.currentElectric : currentRecord.currentElectric;
        updateData.electricUsed = Math.max(0, curr - prev);
      }
    }

    if (data.previousWater !== undefined || data.currentWater !== undefined) {
      const currentRecord = await prisma.utilityReading.findUnique({ where: { id } });
      if (currentRecord) {
        const prev = data.previousWater !== undefined ? data.previousWater : currentRecord.previousWater;
        const curr = data.currentWater !== undefined ? data.currentWater : currentRecord.currentWater;
        updateData.waterUsed = Math.max(0, curr - prev);
      }
    }

    return prisma.utilityReading.update({
      where: { id },
      data: updateData,
      include: {
        room: { select: { roomNumber: true } }
      }
    });
  }

  async deleteReading(id: string) {
    return prisma.utilityReading.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    return prisma.utilityReading.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true, pricePerMonth: true } }
      }
    });
  }

  async findAll(filters: {
    roomId?: string;
    skip?: number;
    take?: number;
    userId?: string; // for Student filtering
  }) {
    const where: any = {};
    if (filters.roomId) where.roomId = filters.roomId;

    if (filters.userId) {
      where.room = {
        beds: {
          some: {
            contracts: {
              some: {
                student: {
                  userId: filters.userId
                },
                status: { in: ['ACTIVE', 'AWAITING_PAYMENT'] }
              }
            }
          }
        }
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.utilityReading.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }],
        include: {
          room: { select: { roomNumber: true, pricePerMonth: true } }
        }
      }),
      prisma.utilityReading.count({ where }),
    ]);

    return { items, total };
  }

  async findByRoom(roomId: string) {
    return prisma.utilityReading.findMany({
      where: { roomId },
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }],
    });
  }

  async findByRoomMonthYear(roomId: string, month: number, year: number) {
    return prisma.utilityReading.findUnique({
      where: {
        roomId_billingMonth_billingYear: {
          roomId,
          billingMonth: month,
          billingYear: year,
        }
      }
    });
  }

  async findLatestByRoom(roomId: string) {
    return prisma.utilityReading.findFirst({
      where: { roomId },
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }],
    });
  }
}
