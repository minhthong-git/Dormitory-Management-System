import { Response } from 'express';
import XLSX from 'xlsx';

export const exportInvoiceHistory = (res: Response, invoices: any[], filename = 'InvoiceHistory.xlsx') => {
  const data = invoices.map((inv) => ({
    'Mã Hóa đơn': inv.id,
    'Số phòng': inv.room?.roomNumber || 'N/A',
    'Tên Khách thuê': inv.contract?.user?.fullName || 'N/A',
    'Mã sinh viên': inv.contract?.user?.studentId || 'N/A',
    'Tháng': inv.billingMonth,
    'Năm': inv.billingYear,
    'Tiền phòng (đ)': inv.roomFee,
    'Tiền điện (đ)': inv.electricityFee,
    'Tiền nước (đ)': inv.waterFee,
    'Phí dịch vụ (đ)': inv.serviceFee,
    'Tổng cộng (đ)': inv.totalAmount,
    'Trạng thái': translateStatus(inv.paymentStatus),
    'Hạn thanh toán': new Date(inv.dueDate).toLocaleDateString('vi-VN'),
    'Ngày đóng tiền': inv.paidDate ? new Date(inv.paidDate).toLocaleDateString('vi-VN') : '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const cols = [
    { wch: 36 }, // ID
    { wch: 10 }, // Room
    { wch: 25 }, // Name
    { wch: 15 }, // Student ID
    { wch: 8 },  // Month
    { wch: 8 },  // Year
    { wch: 15 }, // Room Fee
    { wch: 15 }, // Elec Fee
    { wch: 15 }, // Water Fee
    { wch: 15 }, // Service Fee
    { wch: 15 }, // Total
    { wch: 15 }, // Status
    { wch: 15 }, // Due
    { wch: 15 }, // Paid
  ];
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử hóa đơn');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
};

export const exportMonthlyReport = (res: Response, monthlyStats: any[], filename = 'MonthlyReport.xlsx') => {
  const data = monthlyStats.map((item) => ({
    'Tháng/Kỳ': item.month,
    'Doanh thu tiền phòng (đ)': item.rentRevenue || 0,
    'Doanh thu dịch vụ (đ)': item.utilityRevenue || 0,
    'Tổng doanh thu phát sinh (đ)': item.amount || 0,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  const cols = [
    { wch: 15 },
    { wch: 25 },
    { wch: 25 },
    { wch: 30 },
  ];
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Thống kê theo tháng');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
};

export const exportYearlyReport = (res: Response, yearlyStats: any[], filename = 'YearlyReport.xlsx') => {
  const data = yearlyStats.map((item) => ({
    'Năm': item.year,
    'Doanh thu (đ)': item.amount || 0,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  const cols = [
    { wch: 10 },
    { wch: 25 },
  ];
  ws['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, 'Thống kê theo năm');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
};

const translateStatus = (status: string): string => {
  switch (status) {
    case 'PAID':
      return 'Đã thanh toán';
    case 'UNPAID':
      return 'Chưa thanh toán';
    case 'PARTIAL':
      return 'Thanh toán một phần';
    case 'OVERDUE':
      return 'Quá hạn';
    default:
      return status;
  }
};
