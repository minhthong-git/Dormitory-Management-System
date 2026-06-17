import { Response, NextFunction } from 'express';
import { InvoiceService } from '@/services/invoice.service';
import { BillingService } from '@/services/billing.service';
import { sendSuccess, sendPaginated } from '@/utils/response';
import { AppError } from '@/middleware/errorHandler';
import { exportInvoiceHistory, exportMonthlyReport, exportYearlyReport } from '@/utils/excelExport';
import { exportInvoiceDetailPDF, exportInvoiceHistoryPDF } from '@/utils/pdfExport';
import type { AuthRequest } from '@/types';
import { PaymentStatus } from '@/types';

const invoiceService = new InvoiceService();
const billingService = new BillingService();

// GET /api/invoices
export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const status = req.query.status as string;
    const roomId = req.query.roomId as string;
    const billingMonth = req.query.billingMonth ? parseInt(req.query.billingMonth as string, 10) : undefined;
    const billingYear = req.query.billingYear ? parseInt(req.query.billingYear as string, 10) : undefined;
    const search = req.query.search as string;

    // STUDENT only views their own invoices
    const userId = req.user?.role === 'STUDENT' ? req.user.sub : undefined;

    const { items, total } = await invoiceService.getInvoices({
      status,
      roomId,
      billingMonth,
      billingYear,
      search,
      skip,
      take: limit,
      userId,
    });

    sendPaginated(res, items, total, page, limit, 'Lấy danh sách hóa đơn thành công');
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/:id
export const getInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);

    // STUDENT security validation
    if (req.user?.role === 'STUDENT' && invoice.contract?.userId !== req.user.sub) {
      throw new AppError('Bạn không có quyền xem chi tiết hóa đơn này.', 403);
    }

    sendSuccess(res, invoice, 'Lấy chi tiết hóa đơn thành công');
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices
export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await invoiceService.createInvoice(req.body);
    sendSuccess(res, invoice, 'Tạo hóa đơn thành công', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/invoices/:id
export const updateInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    let updatedInvoice;
    if (paymentStatus) {
      // If status is updated, route through billingService to handle paidDate logic
      updatedInvoice = await billingService.updatePaymentStatus(id, paymentStatus as PaymentStatus, req.body.paidDate);
    } else {
      updatedInvoice = await invoiceService.updateInvoice(id, req.body);
    }

    sendSuccess(res, updatedInvoice, 'Cập nhật hóa đơn thành công');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/invoices/:id
export const deleteInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await invoiceService.deleteInvoice(id);
    sendSuccess(res, null, 'Xóa hóa đơn thành công');
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/statistics
export const getInvoiceStatistics = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await billingService.getRevenueStatistics();
    sendSuccess(res, stats, 'Lấy dữ liệu thống kê doanh thu thành công');
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/export/excel
export const exportInvoiceExcel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomId = req.query.roomId as string;
    const billingMonth = req.query.billingMonth ? parseInt(req.query.billingMonth as string, 10) : undefined;
    const billingYear = req.query.billingYear ? parseInt(req.query.billingYear as string, 10) : undefined;

    const invoices = await billingService.getInvoiceHistoryData({
      roomId,
      billingMonth,
      billingYear,
    });

    const reportType = req.query.reportType as string; // 'monthly' | 'yearly' | 'history'

    if (reportType === 'monthly') {
      const stats = await billingService.getRevenueStatistics();
      const monthlyData = stats.monthlyRevenue.map((item) => ({
        month: item.month,
        rentRevenue: item.amount * 0.8, // estimated room percentage
        utilityRevenue: item.amount * 0.2, // estimated utilities percentage
        amount: item.amount,
      }));
      exportMonthlyReport(res, monthlyData, `BaoCaoDoanhThuThang_${new Date().getFullYear()}.xlsx`);
    } else if (reportType === 'yearly') {
      const stats = await billingService.getRevenueStatistics();
      exportYearlyReport(res, stats.yearlyRevenue, 'BaoCaoDoanhThuNam.xlsx');
    } else {
      exportInvoiceHistory(res, invoices, `LichSuHoaDon_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/invoices/export/pdf
export const exportInvoicePDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.query.id as string;

    if (id) {
      // Export single invoice detail
      const invoice = await invoiceService.getInvoiceById(id);
      
      // STUDENT security check
      if (req.user?.role === 'STUDENT' && invoice.contract?.userId !== req.user.sub) {
        throw new AppError('Bạn không có quyền xuất hóa đơn này.', 403);
      }

      exportInvoiceDetailPDF(res, invoice, `HoaDon_${invoice.room?.roomNumber || 'N/A'}_T${invoice.billingMonth}_${invoice.billingYear}.pdf`);
    } else {
      // Export all list
      const roomId = req.query.roomId as string;
      const billingMonth = req.query.billingMonth ? parseInt(req.query.billingMonth as string, 10) : undefined;
      const billingYear = req.query.billingYear ? parseInt(req.query.billingYear as string, 10) : undefined;

      const invoices = await billingService.getInvoiceHistoryData({
        roomId,
        billingMonth,
        billingYear,
      });

      exportInvoiceHistoryPDF(res, invoices, `LichSuHoaDon_${new Date().toISOString().slice(0, 10)}.pdf`);
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/invoices/generate
export const generateMonthlyInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, billingMonth, billingYear, serviceFee } = req.body;
    
    if (!roomId || !billingMonth || !billingYear) {
      throw new AppError('Mã phòng, tháng và năm hóa đơn là bắt buộc.', 400);
    }

    const invoice = await billingService.generateInvoiceFromReading(
      roomId,
      parseInt(billingMonth, 10),
      parseInt(billingYear, 10),
      parseFloat(serviceFee || '0')
    );

    sendSuccess(res, invoice, 'Tự động lập hóa đơn thành công', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/invoices/:id/payment
export const updatePaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, paidDate } = req.body;

    if (!paymentStatus) {
      throw new AppError('Trạng thái thanh toán là bắt buộc.', 400);
    }

    const updatedInvoice = await billingService.updatePaymentStatus(
      id,
      paymentStatus as PaymentStatus,
      paidDate
    );

    sendSuccess(res, updatedInvoice, 'Cập nhật trạng thái thanh toán thành công');
  } catch (err) {
    next(err);
  }
};

