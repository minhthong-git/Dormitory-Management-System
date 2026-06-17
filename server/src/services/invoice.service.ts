import { InvoiceRepository } from '@/repositories/invoice.repository';
import type { CreateInvoiceDto, UpdateInvoiceDto } from '@/types';
import { AppError } from '@/middleware/errorHandler';

export class InvoiceService {
  private invoiceRepository: InvoiceRepository;

  constructor() {
    this.invoiceRepository = new InvoiceRepository();
  }

  async getInvoices(filters: {
    status?: string;
    roomId?: string;
    billingMonth?: number;
    billingYear?: number;
    search?: string;
    skip?: number;
    take?: number;
    userId?: string;
  }) {
    return this.invoiceRepository.findAll(filters);
  }

  async getInvoiceById(id: string) {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new AppError('Không tìm thấy hóa đơn', 404);
    }
    return invoice;
  }

  async createInvoice(data: CreateInvoiceDto) {
    const existing = await this.invoiceRepository.findByRoomMonthYear(
      data.roomId,
      data.billingMonth,
      data.billingYear
    );
    if (existing) {
      throw new AppError(`Hóa đơn cho phòng này trong tháng ${data.billingMonth}/${data.billingYear} đã tồn tại.`, 400);
    }
    return this.invoiceRepository.createInvoice(data);
  }

  async updateInvoice(id: string, data: UpdateInvoiceDto) {
    const existing = await this.invoiceRepository.findById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy hóa đơn', 404);
    }

    if (data.roomId || data.billingMonth || data.billingYear) {
      const room = data.roomId || existing.roomId;
      const month = data.billingMonth || existing.billingMonth;
      const year = data.billingYear || existing.billingYear;

      if (room !== existing.roomId || month !== existing.billingMonth || year !== existing.billingYear) {
        const dup = await this.invoiceRepository.findByRoomMonthYear(room, month, year);
        if (dup && dup.id !== id) {
          throw new AppError(`Hóa đơn cho phòng này trong tháng ${month}/${year} đã tồn tại.`, 400);
        }
      }
    }

    return this.invoiceRepository.updateInvoice(id, data);
  }

  async deleteInvoice(id: string) {
    const existing = await this.invoiceRepository.findById(id);
    if (!existing) {
      throw new AppError('Không tìm thấy hóa đơn', 404);
    }
    return this.invoiceRepository.deleteInvoice(id);
  }
}
