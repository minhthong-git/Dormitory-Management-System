import { Response } from 'express';
import PDFDocument from 'pdfkit';

// Translate status helper
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'PAID': return 'ĐÃ THANH TOÁN';
    case 'UNPAID': return 'CHƯA THANH TOÁN';
    case 'PARTIAL': return 'THANH TOÁN MỘT PHẦN';
    case 'OVERDUE': return 'QUÁ HẠN';
    default: return status;
  }
};

// Formats number to currency
const formatVND = (amount: number) => {
  return amount.toLocaleString('vi-VN') + ' ₫';
};

// Export invoice detail to PDF
export const exportInvoiceDetailPDF = (res: Response, invoice: any, filename = 'InvoiceDetail.pdf') => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  doc.pipe(res);

  // 1. Header (Dormitory logo & information)
  doc.fillColor('#5B5FEF').fontSize(22).font('Helvetica-Bold').text('ROOM RENTAL SYSTEM', 50, 50);
  doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('123 Đường 3/2, Quận Ninh Kiều, Cần Thơ', 50, 80);
  doc.text('Điện thoại: 0292.123.456 - Email: support@dormitory.com', 50, 95);

  doc.moveDown();
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, 115).lineTo(550, 115).stroke();

  // 2. Invoice Meta Title
  doc.fillColor('#071028').fontSize(18).font('Helvetica-Bold').text('HÓA ĐƠN TIỀN PHÒNG & DỊCH VỤ', 50, 135, { align: 'center' });
  doc.fontSize(10).fillColor('#64748b').font('Helvetica').text(`Kỳ hóa đơn: Tháng ${invoice.billingMonth}/${invoice.billingYear}`, 50, 155, { align: 'center' });

  // 3. Information details (Tenant & Invoice details)
  doc.fillColor('#071028').fontSize(11).font('Helvetica-Bold').text('THÔNG TIN KHÁCH THUÊ', 50, 180, { underline: true });
  doc.fontSize(10).fillColor('#334155').font('Helvetica');
  doc.text(`Khách thuê: ${invoice.contract?.user?.fullName || 'N/A'}`, 50, 200);
  doc.text(`Mã sinh viên: ${invoice.contract?.user?.studentId || 'N/A'}`, 50, 215);
  doc.text(`Số phòng: Phòng ${invoice.room?.roomNumber || 'N/A'}`, 50, 230);

  doc.fillColor('#071028').fontSize(11).font('Helvetica-Bold').text('THÔNG TIN HÓA ĐƠN', 320, 180, { underline: true });
  doc.fontSize(10).fillColor('#334155').font('Helvetica');
  doc.text(`Mã hóa đơn: ${invoice.id.substring(0, 8)}...`, 320, 200);
  doc.text(`Hạn thanh toán: ${new Date(invoice.dueDate).toLocaleDateString('vi-VN')}`, 320, 215);
  
  const statusColor = invoice.paymentStatus === 'PAID' ? '#10b981' : invoice.paymentStatus === 'OVERDUE' ? '#ef4444' : '#f59e0b';
  doc.text('Trạng thái: ', 320, 230).fillColor(statusColor).text(getStatusLabel(invoice.paymentStatus), 380, 230);

  doc.strokeColor('#e2e8f0').moveTo(50, 255).lineTo(550, 255).stroke();

  // 4. Charges Table Header
  let y = 275;
  doc.fillColor('#071028').fontSize(10).font('Helvetica-Bold');
  doc.text('Mục thanh toán', 50, y);
  doc.text('Chỉ số/Số lượng', 220, y, { align: 'right', width: 100 });
  doc.text('Đơn giá', 340, y, { align: 'right', width: 100 });
  doc.text('Thành tiền', 450, y, { align: 'right', width: 100 });

  doc.strokeColor('#475569').lineWidth(1.5).moveTo(50, y + 15).lineTo(550, y + 15).stroke();

  y += 25;
  
  // 5. Charges Table Rows
  // Room fee
  doc.fillColor('#334155').font('Helvetica');
  doc.text('Tiền thuê phòng', 50, y);
  doc.text('1 tháng', 220, y, { align: 'right', width: 100 });
  doc.text(formatVND(invoice.roomFee), 340, y, { align: 'right', width: 100 });
  doc.text(formatVND(invoice.roomFee), 450, y, { align: 'right', width: 100 });

  y += 20;

  // Electricity fee
  const elecUsed = invoice.electricityFee > 0 ? (invoice.electricityFee / 3500) : 0;
  doc.text('Tiền điện', 50, y);
  doc.text(`${elecUsed.toFixed(1)} kWh`, 220, y, { align: 'right', width: 100 });
  doc.text('3,500 đ', 340, y, { align: 'right', width: 100 });
  doc.text(formatVND(invoice.electricityFee), 450, y, { align: 'right', width: 100 });

  y += 20;

  // Water fee
  const waterUsed = invoice.waterFee > 0 ? (invoice.waterFee / 15000) : 0;
  doc.text('Tiền nước', 50, y);
  doc.text(`${waterUsed.toFixed(1)} m³`, 220, y, { align: 'right', width: 100 });
  doc.text('15,000 đ', 340, y, { align: 'right', width: 100 });
  doc.text(formatVND(invoice.waterFee), 450, y, { align: 'right', width: 100 });

  y += 20;

  // Service fee
  doc.text('Phí dịch vụ & Vệ sinh', 50, y);
  doc.text('Cố định', 220, y, { align: 'right', width: 100 });
  doc.text(formatVND(invoice.serviceFee), 340, y, { align: 'right', width: 100 });
  doc.text(formatVND(invoice.serviceFee), 450, y, { align: 'right', width: 100 });

  y += 20;
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
  y += 10;

  // Total Amount Row
  doc.fillColor('#5B5FEF').fontSize(12).font('Helvetica-Bold').text('TỔNG CỘNG THANH TOÁN', 50, y);
  doc.text(formatVND(invoice.totalAmount), 450, y, { align: 'right', width: 100 });

  // 6. Signatures & Footer
  y += 50;
  doc.fillColor('#64748b').fontSize(9).font('Helvetica-Oblique').text('Vui lòng hoàn thành thanh toán trước hạn nêu trên. Cám ơn quý khách!', 50, y, { align: 'center' });

  y += 40;
  doc.fillColor('#071028').fontSize(10).font('Helvetica-Bold');
  doc.text('NGƯỜI LẬP BIỂU', 100, y);
  doc.text('ĐẠI DIỆN BAN QUẢN LÝ', 380, y);
  
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748b');
  doc.text('(Ký và ghi rõ họ tên)', 106, y + 15);
  doc.text('(Ký tên và đóng dấu)', 392, y + 15);

  doc.end();
};

// Export list of invoices to PDF
export const exportInvoiceHistoryPDF = (res: Response, invoices: any[], filename = 'InvoiceHistory.pdf') => {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  doc.pipe(res);

  doc.fillColor('#5B5FEF').fontSize(18).font('Helvetica-Bold').text('BÁO CÁO LỊCH SỬ HÓA ĐƠN', 40, 40);
  doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`, 40, 60);

  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 80).lineTo(570, 80).stroke();

  let y = 100;
  doc.fillColor('#071028').fontSize(9).font('Helvetica-Bold');
  doc.text('Số phòng', 40, y);
  doc.text('Khách thuê', 100, y);
  doc.text('Kỳ (Tháng/Năm)', 220, y);
  doc.text('Hạn đóng', 310, y);
  doc.text('Trạng thái', 390, y);
  doc.text('Tổng tiền', 490, y, { align: 'right', width: 80 });

  doc.strokeColor('#475569').lineWidth(1.5).moveTo(40, y + 15).lineTo(570, y + 15).stroke();
  y += 25;

  doc.fontSize(8).fillColor('#334155').font('Helvetica');
  invoices.forEach((inv) => {
    // Add page if layout overflows
    if (y > 700) {
      doc.addPage();
      y = 50;
      doc.fillColor('#071028').fontSize(9).font('Helvetica-Bold');
      doc.text('Số phòng', 40, y);
      doc.text('Khách thuê', 100, y);
      doc.text('Kỳ (Tháng/Năm)', 220, y);
      doc.text('Hạn đóng', 310, y);
      doc.text('Trạng thái', 390, y);
      doc.text('Tổng tiền', 490, y, { align: 'right', width: 80 });
      doc.strokeColor('#475569').lineWidth(1.5).moveTo(40, y + 15).lineTo(570, y + 15).stroke();
      y += 25;
      doc.fontSize(8).fillColor('#334155').font('Helvetica');
    }

    const roomNum = inv.room?.roomNumber || 'N/A';
    const tenant = inv.contract?.user?.fullName || 'N/A';
    const period = `${inv.billingMonth}/${inv.billingYear}`;
    const dueDate = new Date(inv.dueDate).toLocaleDateString('vi-VN');
    const status = getStatusLabel(inv.paymentStatus);
    const amount = formatVND(inv.totalAmount);

    doc.text(roomNum, 40, y);
    doc.text(tenant, 100, y, { width: 110, ellipsis: true });
    doc.text(period, 220, y);
    doc.text(dueDate, 310, y);
    doc.text(status, 390, y);
    doc.text(amount, 490, y, { align: 'right', width: 80 });

    doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, y + 12).lineTo(570, y + 12).stroke();
    y += 18;
  });

  doc.end();
};
