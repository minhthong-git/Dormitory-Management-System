import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoiceService } from '@/services/invoiceService';
import { utilityService } from '@/services/utilityService';
import { StatisticCard } from '@/components/admin/StatisticCard';
import { ExportButton } from '@/components/admin/ExportButton';
import { InvoiceTable } from '@/components/admin/InvoiceTable';
import { InvoiceForm } from '@/components/admin/InvoiceForm';
import { UtilityForm } from '@/components/admin/UtilityForm';
import './AdminInvoicesPage.css';

const AdminInvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setInvoiceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [billingMonth, setBillingMonth] = useState<number | undefined>(undefined);
  const [billingYear, setBillingYear] = useState<number | undefined>(undefined);
  
  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isUtilityModalOpen, setIsUtilityModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;

  // KPI Metrics state
  const [metrics, setMetrics] = useState({
    totalInvoices: 0,
    paidRevenue: 0,
    unpaidRevenue: 0,
    overdueInvoices: 0,
    growthPercent: 0,
  });

  const fetchInvoices = async () => {
    setInvoiceLoading(true);
    setError(null);
    try {
      const res = await invoiceService.getAll({
        page,
        limit,
        status: status || undefined,
        roomId: undefined,
        billingMonth,
        billingYear,
        search: search || undefined,
      });
      setInvoices(res.data.data || []);
      setTotalCount(res.data.pagination?.total || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải danh sách hóa đơn');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const statsRes = await invoiceService.getStatistics();
      const s = statsRes.data.data;
      setMetrics({
        totalInvoices: s.totalInvoices || 0,
        paidRevenue: s.paidRevenue || 0,
        unpaidRevenue: s.unpaidRevenue || 0,
        overdueInvoices: s.overdueInvoices || 0,
        growthPercent: s.revenueGrowthPercent || 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, status, billingMonth, billingYear]);

  useEffect(() => {
    fetchMetrics();
  }, [invoices]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!window.confirm('Xác nhận hóa đơn này đã được thanh toán hoàn tất?')) return;
    try {
      await invoiceService.updatePayment(id, { paymentStatus: 'PAID', paidDate: new Date().toISOString() });
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi cập nhật hóa đơn');
    }
  };


  const handleCreateInvoiceSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      await invoiceService.create(formData);
      setIsInvoiceModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi tạo hóa đơn thủ công');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUtilitySubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      // 1. Ghi nhận chỉ số điện nước
      await utilityService.create({
        roomId: formData.roomId,
        billingMonth: formData.billingMonth,
        billingYear: formData.billingYear,
        previousElectric: formData.previousElectric,
        currentElectric: formData.currentElectric,
        previousWater: formData.previousWater,
        currentWater: formData.currentWater,
        electricPrice: formData.electricPrice,
        waterPrice: formData.waterPrice,
      });

      // 2. Tự động sinh hóa đơn từ chỉ số vừa ghi
      await invoiceService.generate({
        roomId: formData.roomId,
        billingMonth: formData.billingMonth,
        billingYear: formData.billingYear,
        serviceFee: formData.serviceFee,
      });

      setIsUtilityModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi ghi điện nước hoặc lập hóa đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export handlers
  const handleExportExcel = async (reportType: string) => {
    try {
      await invoiceService.exportExcel({
        reportType,
        billingMonth,
        billingYear,
      });
    } catch (e) {
      alert('Không thể tải tệp báo cáo Excel');
    }
  };

  const handleExportPdfList = async () => {
    try {
      await invoiceService.exportPdf({
        billingMonth,
        billingYear,
      });
    } catch (e) {
      alert('Không thể tải báo cáo PDF');
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="invoice-admin-page max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Hóa đơn & Tiện ích</h1>
          <p className="text-slate-400 text-sm mt-1">
            Ghi điện nước hàng tháng, lập hóa đơn tự động và theo dõi các khoản nợ khách thuê.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButton onExportExcel={handleExportExcel} onExportPdf={handleExportPdfList} />
          
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 rounded-xl font-medium text-slate-200 transition-all active:scale-95"
          >
            ➕ Tạo hóa đơn tay
          </button>

          <button
            onClick={() => setIsUtilityModalOpen(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            ⚡ Ghi điện nước & Tính tiền
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatisticCard
          title="Tổng Doanh Thu Hóa Đơn"
          value={`${metrics.paidRevenue.toLocaleString('vi-VN')} đ`}
          subtitle="Doanh thu thực tế đã thu hồi"
          trend={{ value: metrics.growthPercent, isPositive: metrics.growthPercent >= 0 }}
          accentClass="text-emerald-400"
          icon={<span>💰</span>}
        />
        <StatisticCard
          title="Tổng Số Hóa Đơn"
          value={metrics.totalInvoices}
          subtitle="Tổng số hóa đơn phát sinh"
          icon={<span>📄</span>}
        />
        <StatisticCard
          title="Dư Nợ Chưa Thu"
          value={`${metrics.unpaidRevenue.toLocaleString('vi-VN')} đ`}
          subtitle="Hóa đơn chờ hoặc một phần"
          accentClass="text-amber-400"
          icon={<span>⏳</span>}
        />
        <StatisticCard
          title="Hóa Đơn Quá Hạn"
          value={metrics.overdueInvoices}
          subtitle="Yêu cầu liên hệ nhắc nhở"
          accentClass="text-rose-400"
          icon={<span>⚠️</span>}
        />
      </div>

      {/* Main Table & Filters */}
      <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-md items-center gap-2">
            <input
              type="text"
              placeholder="Tìm số phòng, tên SV..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-primary text-sm transition-all"
            />
            <button type="submit" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition-colors">
              Tìm
            </button>
          </form>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Trạng thái:</span>
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

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Kỳ hóa đơn:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Tháng"
                  min={1}
                  max={12}
                  value={billingMonth || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setBillingMonth(isNaN(val) ? undefined : val);
                    setPage(1);
                  }}
                  className="w-16 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg outline-none focus:border-primary text-center"
                />
                <input
                  type="number"
                  placeholder="Năm"
                  min={2000}
                  max={2100}
                  value={billingYear || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setBillingYear(isNaN(val) ? undefined : val);
                    setPage(1);
                  }}
                  className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg outline-none focus:border-primary text-center"
                />
                {(billingMonth || billingYear) && (
                  <button
                    onClick={() => { setBillingMonth(undefined); setBillingYear(undefined); }}
                    className="text-xs text-rose-400 hover:text-rose-300 ml-1"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="spinner" />
            <p className="text-slate-400 text-sm">Đang tải danh sách hóa đơn...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
            <p className="text-lg">⚠️ Lỗi tải dữ liệu</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-slate-700/50 rounded-2xl bg-slate-800/10">
            <span className="text-4xl text-slate-600">📄</span>
            <p className="text-slate-400 font-medium">Không tìm thấy hóa đơn nào khớp bộ lọc</p>
          </div>
        ) : (
          <InvoiceTable
            invoices={invoices}
            isAdmin={true}
            onViewDetail={(id) => navigate(`/invoices/${id}`)}
            onMarkAsPaid={handleMarkAsPaid}
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        )}
      </div>

      {/* Record Utility Dialog / Modal */}
      {isUtilityModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up my-8">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-lg font-bold text-white">⚡ Ghi số điện nước & lập hóa đơn</h3>
              <button onClick={() => setIsUtilityModalOpen(false)} className="text-2xl text-slate-500 hover:text-white transition-colors">
                ×
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <UtilityForm
                onSubmit={handleUtilitySubmit}
                onCancel={() => setIsUtilityModalOpen(false)}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Create Invoice Dialog / Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up my-8">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-lg font-bold text-white">➕ Tạo hóa đơn thủ công</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-2xl text-slate-500 hover:text-white transition-colors">
                ×
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <InvoiceForm
                onSubmit={handleCreateInvoiceSubmit}
                onCancel={() => setIsInvoiceModalOpen(false)}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvoicesPage;
