import { prisma } from '@/config/db';
import type { CreateInvoiceDto, UpdateInvoiceDto, PaymentStatus } from '@/types';

// Helper function to map student user details to contract user details for backward compatibility
function mapContractUser(invoice: any): any {
  if (invoice?.contract?.student) {
    const student = invoice.contract.student;
    invoice.contract.userId = student.userId;
    invoice.contract.user = student.user || {
      fullName: student.fullName,
      studentId: student.studentCode,
      phone: student.phone,
      email: student.email,
    };
  }
  return invoice;
}

export class InvoiceRepository {
  async checkAndUpdateOverdueInvoices() {
    const now = new Date();
    await prisma.invoice.updateMany({
      where: {
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { lt: now }
      },
      data: {
        paymentStatus: 'OVERDUE'
      }
    });
  }

  async createInvoice(data: CreateInvoiceDto) {
    const invoice = await prisma.invoice.create({
      data: {
        roomId: data.roomId,
        contractId: data.contractId || null,
        billingMonth: data.billingMonth,
        billingYear: data.billingYear,
        roomFee: data.roomFee,
        electricityFee: data.electricityFee,
        waterFee: data.waterFee,
        serviceFee: data.serviceFee,
        totalAmount: data.totalAmount,
        paymentStatus: data.paymentStatus || 'UNPAID',
        dueDate: new Date(data.dueDate),
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
      },
      include: {
        room: { select: { roomNumber: true } },
        contract: {
          include: {
            student: {
              include: {
                user: { select: { fullName: true, studentId: true } }
              }
            }
          }
        }
      }
    });
    return mapContractUser(invoice);
  }

  async updateInvoice(id: string, data: UpdateInvoiceDto) {
    const updateData: any = {};
    if (data.roomId !== undefined) updateData.roomId = data.roomId;
    if (data.contractId !== undefined) updateData.contractId = data.contractId;
    if (data.billingMonth !== undefined) updateData.billingMonth = data.billingMonth;
    if (data.billingYear !== undefined) updateData.billingYear = data.billingYear;
    if (data.roomFee !== undefined) updateData.roomFee = data.roomFee;
    if (data.electricityFee !== undefined) updateData.electricityFee = data.electricityFee;
    if (data.waterFee !== undefined) updateData.waterFee = data.waterFee;
    if (data.serviceFee !== undefined) updateData.serviceFee = data.serviceFee;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.paidDate !== undefined) updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        room: { select: { roomNumber: true } },
        contract: {
          include: {
            student: {
              include: {
                user: { select: { fullName: true, studentId: true } }
              }
            }
          }
        }
      }
    });
    return mapContractUser(invoice);
  }

  async deleteInvoice(id: string) {
    return prisma.invoice.delete({
      where: { id },
    });
  }

  async findById(id: string) {
    await this.checkAndUpdateOverdueInvoices();
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true } },
        contract: {
          include: {
            student: {
              include: {
                user: { select: { id: true, fullName: true, studentId: true, phone: true, email: true } }
              }
            },
            bed: {
              include: {
                room: { select: { roomNumber: true, pricePerMonth: true, floor: true, type: true } }
              }
            }
          }
        }
      }
    });

    if (invoice && invoice.contract) {
      (invoice.contract as any).room = invoice.contract.bed?.room;
    }
    return mapContractUser(invoice);
  }

  async findAll(filters: {
    status?: string;
    roomId?: string;
    billingMonth?: number;
    billingYear?: number;
    search?: string;
    skip?: number;
    take?: number;
    userId?: string; // for Student filtering
  }) {
    await this.checkAndUpdateOverdueInvoices();
    const where: any = {};
    if (filters.status) where.paymentStatus = filters.status;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.billingMonth) where.billingMonth = filters.billingMonth;
    if (filters.billingYear) where.billingYear = filters.billingYear;

    if (filters.userId) {
      where.contract = { student: { userId: filters.userId } };
    }

    if (filters.search) {
      where.OR = [
        { room: { roomNumber: { contains: filters.search } } },
        { contract: { student: { fullName: { contains: filters.search } } } },
        { contract: { student: { studentCode: { contains: filters.search } } } }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: [{ billingYear: 'desc' }, { billingMonth: 'desc' }, { createdAt: 'desc' }],
        include: {
          room: { select: { roomNumber: true } },
          contract: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, fullName: true, studentId: true } }
                }
              },
              bed: {
                include: {
                  room: { select: { roomNumber: true } }
                }
              }
            }
          }
        }
      }),
      prisma.invoice.count({ where }),
    ]);

    const mappedItems = items.map((item) => {
      if (item.contract) {
        (item.contract as any).room = item.contract.bed?.room;
      }
      return mapContractUser(item);
    });

    return { items: mappedItems, total };
  }

  async findByMonth(month: number, year: number) {
    return prisma.invoice.findMany({
      where: { billingMonth: month, billingYear: year },
      include: {
        room: { select: { roomNumber: true } }
      }
    });
  }

  async findByRoomMonthYear(roomId: string, month: number, year: number) {
    await this.checkAndUpdateOverdueInvoices();
    return prisma.invoice.findUnique({
      where: {
        roomId_billingMonth_billingYear: {
          roomId,
          billingMonth: month,
          billingYear: year
        }
      }
    });
  }

  async findRevenue() {
    await this.checkAndUpdateOverdueInvoices();
    // Return all invoices to be grouped/aggregated in services
    return prisma.invoice.findMany({
      include: {
        room: { select: { roomNumber: true } }
      }
    });
  }

  async findByStatus(status: PaymentStatus) {
    await this.checkAndUpdateOverdueInvoices();
    return prisma.invoice.findMany({
      where: { paymentStatus: status },
      include: {
        room: { select: { roomNumber: true } }
      }
    });
  }
}
