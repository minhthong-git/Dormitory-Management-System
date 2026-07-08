import { prisma } from '@/config/db';
import { InvoiceRepository } from '@/repositories/invoice.repository';
import { UtilityRepository } from '@/repositories/utility.repository';
import { AppError } from '@/middleware/errorHandler';
import { PaymentStatus } from '@/types';
import { notificationService } from '@/services/notification.service';

export class BillingService {
  private invoiceRepository: InvoiceRepository;
  private utilityRepository: UtilityRepository;

  constructor() {
    this.invoiceRepository = new InvoiceRepository();
    this.utilityRepository = new UtilityRepository();
  }

  // Calculate utility fees and total amounts
  calculateInvoice(data: {
    roomFee: number;
    previousElectric: number;
    currentElectric: number;
    previousWater: number;
    currentWater: number;
    electricPrice: number;
    waterPrice: number;
    serviceFee: number;
  }) {
    const electricUsed = Math.max(0, data.currentElectric - data.previousElectric);
    const waterUsed = Math.max(0, data.currentWater - data.previousWater);

    const electricityFee = electricUsed * data.electricPrice;
    const waterFee = waterUsed * data.waterPrice;

    const totalAmount = data.roomFee + electricityFee + waterFee + data.serviceFee;

    return {
      electricUsed,
      waterUsed,
      electricityFee,
      waterFee,
      totalAmount,
    };
  }

  // Generate monthly utility reading & invoice
  async generateMonthlyInvoice(data: {
    roomId: string;
    billingMonth: number;
    billingYear: number;
    currentElectric: number;
    currentWater: number;
    electricPrice: number;
    waterPrice: number;
    serviceFee: number;
  }) {
    const { roomId, billingMonth, billingYear } = data;

    // 1. Prevent duplicate invoice for same room/month/year
    const existingInvoice = await this.invoiceRepository.findByRoomMonthYear(roomId, billingMonth, billingYear);
    if (existingInvoice) {
      throw new AppError(`Hóa đơn cho phòng này trong tháng ${billingMonth}/${billingYear} đã được lập.`, 400);
    }

    const existingReading = await this.utilityRepository.findByRoomMonthYear(roomId, billingMonth, billingYear);
    if (existingReading) {
      throw new AppError(`Chỉ số điện nước cho phòng này trong tháng ${billingMonth}/${billingYear} đã được ghi.`, 400);
    }

    // 2. Find room and active contract
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Phòng không tồn tại.', 404);
    }

    const activeContract = await prisma.contract.findFirst({
      where: { bed: { roomId }, status: 'ACTIVE' },
    });

    if (!activeContract) {
      throw new AppError('Không tìm thấy hợp đồng đang hoạt động cho phòng này. Không thể lập hóa đơn.', 400);
    }

    // 3. Find latest reading to get previous values
    const latestReading = await this.utilityRepository.findLatestByRoom(roomId);
    const previousElectric = latestReading ? latestReading.currentElectric : 0;
    const previousWater = latestReading ? latestReading.currentWater : 0;

    if (data.currentElectric < previousElectric) {
      throw new AppError(`Chỉ số điện mới (${data.currentElectric}) không được nhỏ hơn chỉ số cũ (${previousElectric}).`, 400);
    }
    if (data.currentWater < previousWater) {
      throw new AppError(`Chỉ số nước mới (${data.currentWater}) không được nhỏ hơn chỉ số cũ (${previousWater}).`, 400);
    }

    // 4. Auto calculate utility fees and total amount
    const calculations = this.calculateInvoice({
      roomFee: room.pricePerMonth,
      previousElectric,
      currentElectric: data.currentElectric,
      previousWater,
      currentWater: data.currentWater,
      electricPrice: data.electricPrice,
      waterPrice: data.waterPrice,
      serviceFee: data.serviceFee,
    });

    // 5. Due date is 10 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    // Save using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Utility Reading
      const reading = await tx.utilityReading.create({
        data: {
          roomId,
          billingMonth,
          billingYear,
          previousElectric,
          currentElectric: data.currentElectric,
          electricUsed: calculations.electricUsed,
          previousWater,
          currentWater: data.currentWater,
          waterUsed: calculations.waterUsed,
          electricPrice: data.electricPrice,
          waterPrice: data.waterPrice,
        },
      });

      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          roomId,
          contractId: activeContract.id,
          billingMonth,
          billingYear,
          roomFee: room.pricePerMonth,
          electricityFee: calculations.electricityFee,
          waterFee: calculations.waterFee,
          serviceFee: data.serviceFee,
          totalAmount: calculations.totalAmount,
          paymentStatus: 'UNPAID',
          dueDate,
        },
        include: {
          room: { select: { roomNumber: true } },
          contract: {
            include: {
              student: { include: { user: { select: { fullName: true, studentId: true } } } },
            },
          },
        },
      });

      return { reading, invoice };
    });

    // Trigger notification (fire-and-forget)
    notificationService.onInvoiceCreated(result.invoice).catch(() => {});

    return result;
  }

  // Generate invoice based on previously saved utility reading (decoupled flow)
  async generateInvoiceFromReading(roomId: string, billingMonth: number, billingYear: number, serviceFee = 0) {
    // 1. Prevent duplicate invoice for same room/month/year (Rule 2)
    const existingInvoice = await this.invoiceRepository.findByRoomMonthYear(roomId, billingMonth, billingYear);
    if (existingInvoice) {
      throw new AppError(`Hóa đơn cho phòng này trong tháng ${billingMonth}/${billingYear} đã được lập.`, 400);
    }

    // 2. Fetch the utility reading (Rule 4: "Cannot generate invoice if utility reading is missing")
    const utilityReading = await this.utilityRepository.findByRoomMonthYear(roomId, billingMonth, billingYear);
    if (!utilityReading) {
      throw new AppError(`Không tìm thấy chỉ số điện nước ghi nhận cho tháng ${billingMonth}/${billingYear}. Vui lòng nhập chỉ số điện nước trước.`, 400);
    }

    // 3. Fetch active contract for the room (Rule 1: "Only active contracts can generate invoices")
    const activeContract = await prisma.contract.findFirst({
      where: { bed: { roomId }, status: 'ACTIVE' },
    });
    if (!activeContract) {
      throw new AppError('Không tìm thấy hợp đồng đang hoạt động cho phòng này. Không thể lập hóa đơn.', 400);
    }

    // 4. Fetch room to get room price
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Phòng không tồn tại.', 404);
    }

    // Calculate fees
    const electricityFee = utilityReading.electricUsed * utilityReading.electricPrice;
    const waterFee = utilityReading.waterUsed * utilityReading.waterPrice;
    const totalAmount = room.pricePerMonth + electricityFee + waterFee + serviceFee;

    // Due date is 10 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    const invoice = await prisma.invoice.create({
      data: {
        roomId,
        contractId: activeContract.id,
        billingMonth,
        billingYear,
        roomFee: room.pricePerMonth,
        electricityFee,
        waterFee,
        serviceFee,
        totalAmount,
        paymentStatus: 'UNPAID',
        dueDate,
      },
      include: {
        room: { select: { roomNumber: true } },
        contract: {
          include: {
            student: { include: { user: { select: { fullName: true, studentId: true } } } },
          },
        },
      },
    });

    // Trigger notification (fire-and-forget)
    notificationService.onInvoiceCreated(invoice).catch(() => {});

    return invoice;
  }

  // Update payment status
  async updatePaymentStatus(invoiceId: string, status: PaymentStatus, paidDate?: string | Date) {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Hóa đơn không tồn tại.', 404);
    }

    const updatedPaidDate = status === PaymentStatus.PAID ? (paidDate ? new Date(paidDate) : new Date()) : null;

    const updated = await this.invoiceRepository.updateInvoice(invoiceId, {
      paymentStatus: status,
      paidDate: updatedPaidDate,
    });

    // Trigger notification on PAID (fire-and-forget)
    if (status === PaymentStatus.PAID) {
      notificationService.onInvoicePaid(invoiceId).catch(() => {});
    }

    return updated;
  }

  // Get revenue statistics
  async getRevenueStatistics() {
    const invoices = await this.invoiceRepository.findRevenue();

    let totalRevenue = 0;
    let paidRevenue = 0;
    let unpaidRevenue = 0;
    let totalInvoices = invoices.length;
    let overdueInvoices = 0;

    const monthlyMap: Record<string, number> = {};
    const yearlyMap: Record<number, number> = {};
    const statusMap: Record<string, { amount: number; count: number }> = {};
    const roomMap: Record<string, number> = {};

    const now = new Date();

    for (const inv of invoices) {
      const amount = inv.totalAmount;
      const status = inv.paymentStatus;

      // Unpaid or Overdue checking
      let isOverdue = false;
      if (status !== 'PAID' && new Date(inv.dueDate) < now) {
        isOverdue = true;
        overdueInvoices++;
      }

      totalRevenue += amount;
      if (status === 'PAID') {
        paidRevenue += amount;
      } else {
        unpaidRevenue += amount;
      }

      // Group by status
      const mappedStatus = isOverdue ? 'OVERDUE' : status;
      if (!statusMap[mappedStatus]) {
        statusMap[mappedStatus] = { amount: 0, count: 0 };
      }
      statusMap[mappedStatus].amount += amount;
      statusMap[mappedStatus].count++;

      // Revenue only counts PAID invoices (Rule 8)
      if (status === 'PAID') {
        // Group by Month (YYYY-MM)
        const monthStr = `${inv.billingYear}-${String(inv.billingMonth).padStart(2, '0')}`;
        monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + amount;

        // Group by Year (YYYY)
        yearlyMap[inv.billingYear] = (yearlyMap[inv.billingYear] || 0) + amount;

        // Group by Room
        const roomNum = inv.room?.roomNumber || 'N/A';
        roomMap[roomNum] = (roomMap[roomNum] || 0) + amount;
      }
    }

    // Sort lists
    const monthlyRevenue = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const yearlyRevenue = Object.entries(yearlyMap)
      .map(([yearStr, amount]) => ({ year: parseInt(yearStr, 10), amount }))
      .sort((a, b) => a.year - b.year);

    const revenueByStatus = Object.entries(statusMap).map(([status, details]) => ({
      status,
      amount: details.amount,
      count: details.count,
    }));

    const revenueByRoom = Object.entries(roomMap)
      .map(([roomNumber, amount]) => ({ roomNumber, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // top 10 rooms

    // Calculate growth % (current month vs previous month)
    let revenueGrowthPercent = 0;
    if (monthlyRevenue.length >= 2) {
      const currMonthAmount = monthlyRevenue[monthlyRevenue.length - 1].amount;
      const prevMonthAmount = monthlyRevenue[monthlyRevenue.length - 2].amount;
      if (prevMonthAmount > 0) {
        revenueGrowthPercent = ((currMonthAmount - prevMonthAmount) / prevMonthAmount) * 100;
      } else {
        revenueGrowthPercent = 100;
      }
    } else if (monthlyRevenue.length === 1) {
      revenueGrowthPercent = 100;
    }

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      totalInvoices,
      overdueInvoices,
      revenueGrowthPercent,
      monthlyRevenue,
      yearlyRevenue,
      revenueByStatus,
      revenueByRoom,
    };
  }

  // Get raw history data for export
  async getInvoiceHistoryData(filters: { roomId?: string; billingMonth?: number; billingYear?: number }) {
    const where: any = {};
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.billingMonth) where.billingMonth = filters.billingMonth;
    if (filters.billingYear) where.billingYear = filters.billingYear;

    return prisma.invoice.findMany({
      where,
      include: {
        room: { select: { roomNumber: true } },
        contract: {
          include: {
            student: { include: { user: { select: { fullName: true, studentId: true } } } },
          },
        },
      },
      orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }],
    });
  }
}
