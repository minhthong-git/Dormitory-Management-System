import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { paymentService } from '@/services/paymentService';
import './PaymentResultPage.css';

const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'SUCCESS' | 'CANCELLED' | 'FAILED' | 'EXPIRED' | 'PENDING' | 'ERROR'>('PENDING');
  const [orderCode, setOrderCode] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [invoiceId, setInvoiceId] = useState<string>('');

  useEffect(() => {
    const codeParam = searchParams.get('orderCode');
    const statusParam = searchParams.get('status');

    if (!codeParam) {
      setStatus('ERROR');
      setIsLoading(false);
      return;
    }

    const code = parseInt(codeParam, 10);
    setOrderCode(code);

    const checkPayment = async () => {
      try {
        const res = await paymentService.getStatus(code);
        const transaction = res.data.data;
        
        setStatus(transaction.status);
        setAmount(transaction.amount);
        setInvoiceId(transaction.invoiceId);
      } catch (err) {
        console.error('Lỗi kiểm tra giao dịch:', err);
        // Fallback to query param if API fails
        if (statusParam === 'CANCELLED') {
          setStatus('CANCELLED');
        } else {
          setStatus('ERROR');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkPayment();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="payment-result-loading flex flex-col items-center justify-center py-24 gap-4 text-slate-300">
        <div className="spinner" />
        <p className="text-sm text-slate-400">Đang kiểm tra kết quả giao dịch thanh toán...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (status) {
      case 'SUCCESS':
        return (
          <div className="payment-result-card payment-result-card--success text-center space-y-6 animate-scale-up">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Thanh toán thành công!</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Hóa đơn của bạn đã được thanh toán hoàn tất trên hệ thống. Cảm ơn bạn!
              </p>
            </div>
            <div className="bg-slate-850/50 rounded-2xl p-5 border border-slate-800 text-xs space-y-2 max-w-xs mx-auto text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono text-slate-300 font-bold">{orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền:</span>
                <span className="text-emerald-400 font-bold">{amount.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => navigate(`/invoices/${invoiceId}`)}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors"
              >
                Xem hóa đơn chi tiết
              </button>
              <Link
                to="/invoices"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Về danh sách hóa đơn
              </Link>
            </div>
          </div>
        );

      case 'CANCELLED':
        return (
          <div className="payment-result-card payment-result-card--cancelled text-center space-y-6 animate-scale-up">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              ✕
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Giao dịch đã hủy</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Bạn đã hủy giao dịch thanh toán. Hóa đơn vẫn đang ở trạng thái chưa thanh toán.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              {invoiceId && (
                <button
                  onClick={() => navigate(`/invoices/${invoiceId}`)}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Thử thanh toán lại
                </button>
              )}
              <Link
                to="/invoices"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Về danh sách hóa đơn
              </Link>
            </div>
          </div>
        );

      case 'FAILED':
      case 'EXPIRED':
        return (
          <div className="payment-result-card payment-result-card--failed text-center space-y-6 animate-scale-up">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              ⚠️
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Giao dịch thất bại</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Rất tiếc, giao dịch thanh toán đã bị lỗi hoặc đã hết hạn. Vui lòng thực hiện lại.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              {invoiceId && (
                <button
                  onClick={() => navigate(`/invoices/${invoiceId}`)}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Quay lại hóa đơn
                </button>
              )}
              <Link
                to="/invoices"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Về danh sách hóa đơn
              </Link>
            </div>
          </div>
        );

      default:
        return (
          <div className="payment-result-card payment-result-card--error text-center space-y-6 animate-scale-up">
            <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              ?
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Lỗi thông tin giao dịch</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Không tìm thấy thông tin chi tiết của giao dịch này hoặc có lỗi xảy ra.
              </p>
            </div>
            <div className="pt-4">
              <Link
                to="/invoices"
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors"
              >
                Về danh sách hóa đơn
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="payment-result-page flex items-center justify-center px-4 py-16 min-h-[60vh]">
      {renderContent()}
    </div>
  );
};

export default PaymentResultPage;
