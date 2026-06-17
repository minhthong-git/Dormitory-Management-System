import React from 'react';
import { StatusBadge } from './StatusBadge';

interface InvoiceTableProps {
  invoices: any[];
  isAdmin: boolean;
  onViewDetail: (id: string) => void;
  onMarkAsPaid?: (id: string) => void;
  onDelete?: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  isAdmin,
  onViewDetail,
  onMarkAsPaid,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="overflow-x-auto border border-slate-700/50 rounded-2xl bg-slate-800/40 backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-800/80">
              <th className="px-6 py-4">Phòng</th>
              <th className="px-6 py-4">Khách thuê</th>
              <th className="px-6 py-4">Kỳ hóa đơn</th>
              <th className="px-6 py-4">Tổng tiền</th>
              <th className="px-6 py-4">Hạn đóng</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40 text-sm">
            {invoices.map((inv) => {
              const isPaid = inv.paymentStatus === 'PAID';
              return (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-700/20 transition-colors duration-150 text-slate-300"
                >
                  <td className="px-6 py-4 font-semibold text-white">
                    Phòng {inv.room?.roomNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{inv.contract?.user?.fullName || 'N/A'}</span>
                      <span className="text-xs text-slate-500">{inv.contract?.user?.studentId || ''}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    Tháng {inv.billingMonth}/{inv.billingYear}
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">
                    {inv.totalAmount.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(inv.dueDate).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={inv.paymentStatus} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => onViewDetail(inv.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-700/40 hover:bg-slate-700 border border-slate-600/30 rounded-lg transition-all"
                      >
                        👁️ Chi tiết
                      </button>
                      {isAdmin && !isPaid && onMarkAsPaid && (
                        <button
                          onClick={() => onMarkAsPaid(inv.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                        >
                          ✓ Thu tiền
                        </button>
                      )}
                      {isAdmin && !isPaid && onDelete && (
                        <button
                          onClick={() => onDelete(inv.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Xóa hóa đơn"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <span className="text-xs text-slate-400">
            Trang {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              « Trước
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Sau »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoiceTable;
