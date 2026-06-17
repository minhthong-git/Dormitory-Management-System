import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '@/services/invoiceService';
import './StudentInvoicesPage.css';

const StudentInvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Mock payment state
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invoiceService.getAll({
        page,
        limit,
        status: status || undefined,
      });
      setInvoices(response.data.data || []);
      setTotalCount(response.data.pagination?.total || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải danh sách hóa đơn cá nhân');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, status]);

  // Payment mock confirm
  const handleStartPayment = (invoice: any) => {
    setPayingInvoice(invoice);
  };

  const handleConfirmPayment = async () => {
    if (!payingInvoice) return;
    setIsProcessingPayment(true);
    try {
      await invoiceService.updatePayment(payingInvoice.id, {
        paymentStatus: 'PAID',
        paidDate: new Date().toISOString(),
      });
      setPayingInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi xử lý thanh toán');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  // Summaries
  const unpaidCount = invoices.filter(i => i.paymentStatus !== 'PAID').length;
  const overdueCount = invoices.filter(i => i.paymentStatus === 'OVERDUE').length;

  return (
    <div className="invoice-student-page max-w-6xl mx-auto px-4 py-8 space-y-8 text-slate-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Hóa đơn của tôi</h1>
          <p className="text-slate-400 text-sm mt-1">
            Theo dõi lịch sử hóa đơn, tiền phòng và dịch vụ điện nước hàng tháng.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase">Tổng hóa đơn kỳ này</span>
            <span className="text-3xl font-bold text-white mt-1">{invoices.length}</span>
          </div>
          <span className="text-3xl">📄</span>
        </div>
        
        <div className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-lg ${unpaidCount > 0 ? 'ring-1 ring-amber-500/20 bg-amber-500/5' : ''}`}>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase">Chưa thanh toán</span>
            <span className={`text-3xl font-bold mt-1 ${unpaidCount > 0 ? 'text-amber-400' : 'text-white'}`}>{unpaidCount}</span>
          </div>
          <span className="text-3xl">⏳</span>
        </div>

        <div className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center justify-between shadow-lg ${overdueCount > 0 ? 'ring-1 ring-rose-500/20 bg-rose-500/5' : ''}`}>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 uppercase">Hóa đơn quá hạn</span>
            <span className={`text-3xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-400' : 'text-white'}`}>{overdueCount}</span>
          </div>
          <span className="text-3xl">⚠️</span>
        </div>
      </div>

      {/* List Card */}
      <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-white">Lịch sử thanh toán</h2>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-400">Trạng thái:</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg outline-none focus:border-primary"
            >
              <option value="">Tất cả</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PARTIAL">Một phần</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="OVERDUE">Quá hạn</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="spinner" />
            <p className="text-slate-400 text-sm">Đang tải danh sách hóa đơn...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
            <p>⚠️ {error}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 space-y-3 border border-slate-700/50 rounded-2xl bg-slate-800/10">
            <span className="text-4xl">🎉</span>
            <p className="text-slate-400 font-medium">Tuyệt vời! Bạn không có hóa đơn nào cần thanh toán.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoices.map((invoice) => {
              const isPaid = invoice.paymentStatus === 'PAID';
              const isOverdue = invoice.paymentStatus === 'OVERDUE';
              const hasUtilities = invoice.electricityFee > 0 || invoice.waterFee > 0;

              return (
                <div
                  key={invoice.id}
                  className={`bg-slate-800/40 border rounded-2xl p-6 space-y-4 hover:shadow-2xl transition-all duration-200 flex flex-col justify-between ${
                    isPaid
                      ? 'border-emerald-500/15 hover:border-emerald-500/30 bg-emerald-500/5'
                      : isOverdue
                      ? 'border-rose-500/15 hover:border-rose-500/30 bg-rose-500/5'
                      : 'border-slate-750 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-700/40">
                      <div>
                        <h3 className="text-lg font-bold text-white">Tháng {invoice.billingMonth}/{invoice.billingYear}</h3>
                        <span className="text-xs text-slate-500">
                          {hasUtilities ? 'Tiền phòng & Điện nước' : 'Tiền thuê phòng'}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xxs font-bold rounded-full uppercase border ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : isOverdue
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {invoice.paymentStatus === 'PAID' ? 'Đã thanh toán' : invoice.paymentStatus === 'UNPAID' ? 'Chưa thanh toán' : invoice.paymentStatus === 'PARTIAL' ? 'Một phần' : 'Quá hạn'}
                      </span>
                    </div>

                    <div className="py-4 space-y-2 text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-400">Số tiền cần đóng:</span>
                        <span className="text-xl font-bold text-primary">{invoice.totalAmount.toLocaleString('vi-VN')} ₫</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hạn đóng:</span>
                        <span className="font-medium text-slate-300">{new Date(invoice.dueDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {invoice.paidDate && (
                        <div className="flex justify-between">
                          <span className="text-emerald-400">Đã đóng ngày:</span>
                          <span className="text-emerald-400 font-bold">{new Date(invoice.paidDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/40">
                    <button
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition-colors"
                    >
                      👁️ Chi tiết
                    </button>
                    {!isPaid && (
                      <button
                        onClick={() => handleStartPayment(invoice)}
                        className="w-full px-4 py-2 bg-primary hover:bg-primary-hover rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-md shadow-primary/10"
                      >
                        💳 Thanh toán
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <span className="text-xs text-slate-400">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                « Trước
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Sau »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mock Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-lg font-bold text-white">Thanh toán KTX</h3>
              <button onClick={() => setPayingInvoice(null)} className="text-2xl text-slate-500 hover:text-white transition-colors">
                ×
              </button>
            </div>
            
            <div className="p-6 text-center space-y-6">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold block uppercase">Cổng thanh toán tự động DormPay</span>
                <span className="text-3xl font-extrabold text-primary">
                  {payingInvoice.totalAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              <div className="w-48 h-48 bg-slate-850 border border-slate-700/50 rounded-2xl mx-auto flex flex-col items-center justify-center p-4 relative bg-white text-black select-none">
                <span className="font-black text-xs text-slate-600">DormMS</span>
                <span className="text-xxs text-slate-400 mt-2 font-mono">SCAN TO PAY</span>
                <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-slate-950" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-slate-950" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-slate-950" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-slate-950" />
              </div>

              <div className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử để chuyển tiền tự động. Bấm xác nhận sau khi chuyển.
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="px-4 py-2 text-xs font-semibold bg-transparent text-slate-400 hover:text-white transition-colors"
                disabled={isProcessingPayment}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 transition-all"
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? 'Đang xác thực...' : 'Xác nhận Đã chuyển khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentInvoicesPage;
