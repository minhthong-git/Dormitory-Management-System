import React, { useEffect, useState } from 'react';
import { invoiceService } from '@/services/invoiceService';
import { StatisticCard } from '@/components/admin/StatisticCard';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { ExportButton } from '@/components/admin/ExportButton';
import './RevenueStatisticsPage.css';

const RevenueStatisticsPage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await invoiceService.getStatistics();
      setStats(res.data.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải dữ liệu thống kê doanh thu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportExcel = async (reportType: string) => {
    try {
      await invoiceService.exportExcel({ reportType });
    } catch (err) {
      alert('Lỗi xuất tệp thống kê doanh thu');
    }
  };

  const handleExportPdf = async () => {
    try {
      await invoiceService.exportPdf({});
    } catch (err) {
      alert('Lỗi xuất tệp PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="spinner" />
        <p className="text-slate-400 text-sm">Đang tải báo cáo doanh thu...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
        <p className="text-lg">⚠️ Lỗi tải dữ liệu</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs">
          Thử lại
        </button>
      </div>
    );
  }

  // Map Recharts datasets
  const chartMonthly = stats.monthlyRevenue.map((item: any) => ({
    label: item.month,
    value: item.amount,
  }));

  const chartYearly = stats.yearlyRevenue.map((item: any) => ({
    label: String(item.year),
    value: item.amount,
  }));

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Đã thu';
      case 'OVERDUE': return 'Quá hạn';
      case 'UNPAID': return 'Chưa thu';
      case 'PARTIAL': return 'Thu một phần';
      default: return status;
    }
  };

  const chartStatus = stats.revenueByStatus.map((item: any) => ({
    label: getStatusLabel(item.status),
    value: item.amount,
  }));

  const chartRoom = stats.revenueByRoom.map((item: any) => ({
    label: `Phòng ${item.roomNumber}`,
    value: item.amount,
  }));

  return (
    <div className="revenue-stats-page max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Báo cáo & Thống kê doanh thu</h1>
          <p className="text-slate-400 text-sm mt-1">
            Theo dõi xu hướng thu chi tiền phòng và tiền điện nước theo thời gian.
          </p>
        </div>
        <div>
          <ExportButton onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatisticCard
          title="Tổng Doanh Thu Phát Sinh"
          value={`${stats.totalRevenue.toLocaleString('vi-VN')} đ`}
          subtitle="Doanh số ghi nhận trên hệ thống"
          trend={{ value: stats.revenueGrowthPercent, isPositive: stats.revenueGrowthPercent >= 0 }}
          accentClass="text-primary"
          icon={<span>📊</span>}
        />
        <StatisticCard
          title="Doanh Thu Đã Thu"
          value={`${stats.paidRevenue.toLocaleString('vi-VN')} đ`}
          subtitle="Doanh thu thực tế đã thu hồi"
          accentClass="text-emerald-400"
          icon={<span>💰</span>}
        />
        <StatisticCard
          title="Dư Nợ Chưa Thu"
          value={`${stats.unpaidRevenue.toLocaleString('vi-VN')} đ`}
          subtitle="Các hóa đơn chưa đóng"
          accentClass="text-amber-400"
          icon={<span>⏳</span>}
        />
        <StatisticCard
          title="Hóa Đơn Quá Hạn"
          value={stats.overdueInvoices}
          subtitle="Hóa đơn quá kỳ hạn thanh toán"
          accentClass="text-rose-400"
          icon={<span>⚠️</span>}
        />
      </div>

      {/* Charts Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block">Doanh thu theo tháng</span>
          <RevenueChart type="monthly" data={chartMonthly} />
        </div>

        {/* Status Distribution */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block">Phân bổ theo trạng thái</span>
          <RevenueChart type="status" data={chartStatus} />
        </div>

        {/* Top Rooms */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block">Top 10 phòng phát sinh cao nhất</span>
          <RevenueChart type="room" data={chartRoom} />
        </div>

        {/* Yearly Revenue */}
        <div className="space-y-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block">Doanh thu theo năm</span>
          <RevenueChart type="yearly" data={chartYearly} />
        </div>
      </div>

      {/* Table grid for detailed data */}
      <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">Bảng chi tiết doanh thu từng tháng</h3>
        <div className="overflow-x-auto border border-slate-700/50 rounded-xl bg-slate-800/40">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400 font-semibold uppercase bg-slate-800/80">
                <th className="px-6 py-3">Tháng kỳ hóa đơn</th>
                <th className="px-6 py-3 text-right">Tổng doanh thu phát sinh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-slate-300">
              {stats.monthlyRevenue.map((item: any) => (
                <tr key={item.month} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-white">{item.month}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-emerald-400">
                    {item.amount.toLocaleString('vi-VN')} ₫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueStatisticsPage;
