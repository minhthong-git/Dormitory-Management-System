import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoiceService } from '@/services/invoiceService';
import { utilityService } from '@/services/utilityService';
import { paymentService } from '@/services/paymentService';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/admin/StatusBadge';
import './InvoiceDetailPage.css';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<any | null>(null);
  const [utility, setUtility] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment states
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showManualPayModal, setShowManualPayModal] = useState(false);
  const [payosLink, setPayosLink] = useState<{
    checkoutUrl: string;
    qrCode: string;
    orderCode: number;
  } | null>(null);
  const [pollingIntervalId, setPollingIntervalId] = useState<number | null>(null);

  const fetchInvoiceAndUtility = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const invRes = await invoiceService.getById(id);
      const inv = invRes.data.data;
      setInvoice(inv);

      // Fetch corresponding utility reading based on roomId, month, year
      if (inv) {
        const utilRes = await utilityService.getAll({ roomId: inv.roomId });
        const readings = utilRes.data.data || [];
        const match = readings.find(
          (r: any) => r.billingMonth === inv.billingMonth && r.billingYear === inv.billingYear
        );
        setUtility(match || null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải thông tin hóa đơn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceAndUtility();
  }, [id]);

  const handlePayOS = async () => {
    if (!invoice) return;
    setIsProcessingPayment(true);
    setError(null);
    try {
      const res = await paymentService.create(invoice.id);
      setPayosLink(res.data.data);
      setShowPayModal(true);
      
      // Start polling for status
      const orderCode = res.data.data.orderCode;
      const intervalId = window.setInterval(async () => {
        try {
          const statusRes = await paymentService.getStatus(orderCode);
          if (statusRes.data.data.status === 'SUCCESS') {
            window.clearInterval(intervalId);
            setPollingIntervalId(null);
            setPayosLink(null);
            setShowPayModal(false);
            alert('Thanh toán qua PayOS thành công!');
            fetchInvoiceAndUtility();
          } else if (['CANCELLED', 'FAILED', 'EXPIRED'].includes(statusRes.data.data.status)) {
            window.clearInterval(intervalId);
            setPollingIntervalId(null);
            setPayosLink(null);
            setShowPayModal(false);
            alert(`Thanh toán thất bại hoặc đã bị hủy (Trạng thái: ${statusRes.data.data.status})`);
            fetchInvoiceAndUtility();
          }
        } catch (e) {
          console.error('Lỗi khi kiểm tra trạng thái thanh toán:', e);
        }
      }, 3000);
      
      setPollingIntervalId(intervalId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo liên kết thanh toán PayOS');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleClosePayModal = () => {
    if (pollingIntervalId) {
      window.clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
    setPayosLink(null);
    setShowPayModal(false);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalId) {
        window.clearInterval(pollingIntervalId);
      }
    };
  }, [pollingIntervalId]);

  const handleManualPay = async () => {
    if (!invoice) return;
    setIsProcessingPayment(true);
    try {
      // Mark as PAID
      await invoiceService.updatePayment(invoice.id, {
        paymentStatus: 'PAID',
        paidDate: new Date().toISOString(),
      });
      setShowManualPayModal(false);
      fetchInvoiceAndUtility();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thanh toán hóa đơn thất bại');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!id) return;
    try {
      await invoiceService.exportPdf({ id });
    } catch (e) {
      alert('Không thể xuất tệp PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="invoice-detail-loading flex flex-col items-center justify-center py-20 gap-4">
        <div className="spinner" />
        <p className="text-slate-400 text-sm">Đang tải hóa đơn...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="invoice-detail-error flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-4xl text-rose-500">⚠️</span>
        <p className="text-rose-400 font-medium">{error || 'Hóa đơn không tồn tại'}</p>
        <button className="px-5 py-2 bg-primary text-white rounded-xl text-sm" onClick={() => navigate(-1)}>
          Quay lại
        </button>
      </div>
    );
  }

  const isPaid = invoice.paymentStatus === 'PAID';
  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="invoice-detail-page max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Detail actions panel */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 no-print bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
        <button
          className="text-slate-400 hover:text-white text-sm font-semibold transition-colors text-left"
          onClick={() => navigate(isStudent ? '/invoices' : '/admin/invoices')}
        >
          ← Quay lại danh sách hóa đơn
        </button>
        <div className="flex gap-2.5">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            📥 Xuất PDF
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            🖨️ In hóa đơn
          </button>
          {!isPaid && (
            isStudent ? (
              <button
                onClick={handlePayOS}
                disabled={isProcessingPayment}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-55"
              >
                💳 Thanh toán PayOS
              </button>
            ) : (
              <button
                onClick={() => setShowManualPayModal(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
              >
                ✓ Xác nhận đã thu tiền
              </button>
            )
          )}
        </div>
      </div>

      {/* Invoice Receipt Container */}
      <div className="bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl relative" id="printable-receipt">
        <div className="h-2 bg-gradient-to-r from-primary via-secondary to-purple-500" />
        
        <div className="p-8 sm:p-12 space-y-8">
          {/* Header Brand */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white text-xl font-black">
                D
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight">DormMS</h2>
                <p className="text-xs text-slate-500 font-medium">Hệ thống Quản lý Ký túc xá</p>
              </div>
            </div>
            <div className="sm:text-right space-y-1">
              <StatusBadge status={invoice.paymentStatus} />
              <p className="text-xxs text-slate-500 font-mono tracking-wider pt-1">
                MÃ HĐ: {invoice.id.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Service provider & invoice dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Đơn vị cung cấp</span>
              <p className="font-bold text-white">Ban Quản lý Ký túc xá DormMS</p>
              <p className="text-slate-400 text-xs">123 Đường 3/2, Quận Ninh Kiều, Cần Thơ</p>
              <p className="text-slate-400 text-xs">Hotline: 0292.123.456 · Email: support@dormitory.com</p>
            </div>
            
            <div className="space-y-1 bg-slate-850/40 p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Kỳ hóa đơn:</span>
                <span className="font-bold text-white">Tháng {invoice.billingMonth}/{invoice.billingYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày tạo:</span>
                <span className="font-semibold text-slate-300">{new Date(invoice.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hạn thanh toán:</span>
                <span className="font-semibold text-rose-400">{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</span>
              </div>
              {invoice.paidDate && (
                <div className="flex justify-between pt-1 border-t border-slate-700/50 mt-1">
                  <span className="text-emerald-400 font-bold">Ngày thanh toán:</span>
                  <span className="text-emerald-400 font-bold">{new Date(invoice.paidDate).toLocaleDateString('vi-VN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tenant Information Details */}
          <div className="bg-slate-850/20 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thông tin khách thuê</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 block">Sinh viên</span>
                <span className="font-bold text-white">{invoice.contract?.user?.fullName || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Mã sinh viên</span>
                <span className="font-bold text-white">{invoice.contract?.user?.studentId || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Số điện thoại</span>
                <span className="font-bold text-white">{invoice.contract?.user?.phone || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">Số phòng</span>
                <span className="font-bold text-primary">Phòng {invoice.room?.roomNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Charges Table */}
          <div className="overflow-hidden border border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-850/80 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="px-6 py-3.5">Mục thanh toán</th>
                  <th className="px-6 py-3.5 text-center">Chỉ số cũ</th>
                  <th className="px-6 py-3.5 text-center">Chỉ số mới</th>
                  <th className="px-6 py-3.5 text-center">Tiêu thụ</th>
                  <th className="px-6 py-3.5 text-right">Đơn giá</th>
                  <th className="px-6 py-3.5 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {/* Room Rent */}
                <tr>
                  <td className="px-6 py-4 font-semibold text-white">Tiền phòng ở</td>
                  <td className="px-6 py-4 text-center text-slate-600">—</td>
                  <td className="px-6 py-4 text-center text-slate-600">—</td>
                  <td className="px-6 py-4 text-center">1 tháng</td>
                  <td className="px-6 py-4 text-right">{invoice.roomFee.toLocaleString('vi-VN')} ₫</td>
                  <td className="px-6 py-4 text-right font-bold text-white">
                    {invoice.roomFee.toLocaleString('vi-VN')} ₫
                  </td>
                </tr>

                {/* Electric Charge */}
                {invoice.electricityFee > 0 && (
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white">Tiền điện sinh hoạt</td>
                    <td className="px-6 py-4 text-center">{utility?.previousElectric ?? 0}</td>
                    <td className="px-6 py-4 text-center">{utility?.currentElectric ?? 0}</td>
                    <td className="px-6 py-4 text-center">{(utility?.electricUsed ?? 0).toFixed(1)} kWh</td>
                    <td className="px-6 py-4 text-right">{(utility?.electricPrice ?? 3500).toLocaleString('vi-VN')} ₫</td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {invoice.electricityFee.toLocaleString('vi-VN')} ₫
                    </td>
                  </tr>
                )}

                {/* Water Charge */}
                {invoice.waterFee > 0 && (
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white">Tiền nước sinh hoạt</td>
                    <td className="px-6 py-4 text-center">{utility?.previousWater ?? 0}</td>
                    <td className="px-6 py-4 text-center">{utility?.currentWater ?? 0}</td>
                    <td className="px-6 py-4 text-center">{(utility?.waterUsed ?? 0).toFixed(1)} m³</td>
                    <td className="px-6 py-4 text-right">{(utility?.waterPrice ?? 15000).toLocaleString('vi-VN')} ₫</td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {invoice.waterFee.toLocaleString('vi-VN')} ₫
                    </td>
                  </tr>
                )}

                {/* Service Charge */}
                {invoice.serviceFee > 0 && (
                  <tr>
                    <td className="px-6 py-4 font-semibold text-white">Phí quản lý & dịch vụ</td>
                    <td className="px-6 py-4 text-center text-slate-600">—</td>
                    <td className="px-6 py-4 text-center text-slate-600">—</td>
                    <td className="px-6 py-4 text-center">Cố định</td>
                    <td className="px-6 py-4 text-right">{invoice.serviceFee.toLocaleString('vi-VN')} ₫</td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {invoice.serviceFee.toLocaleString('vi-VN')} ₫
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Grand totals */}
          <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
            <div className="flex gap-4">
              <span>Thuế giá trị gia tăng (VAT 0%):</span>
              <span className="font-bold text-white">0 ₫</span>
            </div>
            <div className="flex gap-4 text-sm font-extrabold text-white mt-1">
              <span className="text-primary uppercase">Tổng số tiền thanh toán:</span>
              <span className="text-base text-emerald-400">
                {invoice.totalAmount.toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>

          {/* Note and signature layout */}
          <div className="pt-10 flex flex-col sm:flex-row justify-between gap-8 text-xs text-slate-500 border-t border-slate-800">
            <div className="space-y-1">
              <p className="font-semibold text-slate-400">Lưu ý thanh toán:</p>
              <p>Học viên quét mã QR hoặc đóng trực tiếp tại Văn phòng Ban Quản lý.</p>
              <p>Hóa đơn quá hạn đóng sẽ bị khóa phòng hoặc tính phí trễ hạn.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-12 text-center text-slate-400">
              <div className="space-y-10">
                <span className="font-bold block">Khách thuê phòng</span>
                <span className="text-slate-600 italic block">(Ký và ghi rõ họ tên)</span>
              </div>
              <div className="space-y-10">
                <span className="font-bold block">Đại diện Ban Quản lý</span>
                <span className="text-slate-600 italic block">(Đã ký đóng dấu)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pay QR Modal (PayOS) */}
      {showPayModal && payosLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-lg font-bold text-white">Quét mã QR thanh toán</h3>
              <button onClick={handleClosePayModal} className="text-2xl text-slate-500 hover:text-white transition-colors">
                ×
              </button>
            </div>
            
            <div className="p-6 text-center space-y-6">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold block uppercase">Cổng thanh toán tự động PayOS</span>
                <span className="text-3xl font-extrabold text-primary">
                  {invoice.totalAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              {/* QR Code */}
              <div className="w-52 h-52 bg-white rounded-2xl mx-auto flex items-center justify-center p-2 border border-slate-700/50 shadow-md">
                {payosLink.qrCode ? (
                  <img src={payosLink.qrCode} alt="VietQR PayOS" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-black font-semibold text-sm">QR Code not available</div>
                )}
              </div>

              <div className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto space-y-3">
                <p>Mở ứng dụng ngân hàng quét mã VietQR để thanh toán nhanh.</p>
                <p className="text-slate-500">Mã đơn hàng: <span className="font-mono text-slate-400 font-bold">{payosLink.orderCode}</span></p>
              </div>

              <div>
                <a
                  href={payosLink.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  🔗 Mở trang thanh toán PayOS
                </a>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleClosePayModal}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Confirmation Modal (Staff/Admin) */}
      {showManualPayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-lg font-bold text-white">Xác nhận thanh toán</h3>
              <button onClick={() => setShowManualPayModal(false)} className="text-2xl text-slate-500 hover:text-white transition-colors">
                ×
              </button>
            </div>
            
            <div className="p-6 text-center space-y-4">
              <span className="text-3xl block">💵</span>
              <p className="text-slate-300 text-sm">
                Bạn có chắc chắn muốn xác nhận đã thu tiền và đánh dấu hóa đơn này là <strong>ĐÃ THANH TOÁN</strong>?
              </p>
              <p className="text-2xl font-bold text-emerald-400">
                {invoice.totalAmount.toLocaleString('vi-VN')} ₫
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowManualPayModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-transparent text-slate-400 hover:text-white transition-colors"
                disabled={isProcessingPayment}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleManualPay}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? 'Đang thực hiện...' : 'Xác nhận Đã Thu Tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetailPage;
