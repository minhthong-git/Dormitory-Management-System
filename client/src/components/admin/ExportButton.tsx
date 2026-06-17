import React, { useState, useRef, useEffect } from 'react';

interface ExportButtonProps {
  onExportExcel: (reportType: string) => Promise<void> | void;
  onExportPdf: () => Promise<void> | void;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExportExcel, onExportPdf, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (type: string) => {
    setIsOpen(false);
    if (type === 'pdf') {
      await onExportPdf();
    } else {
      await onExportExcel(type);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-700 hover:text-white border border-slate-600/50 rounded-xl font-medium text-slate-200 shadow-sm transition-all duration-150 active:scale-95 disabled:opacity-55 disabled:pointer-events-none"
      >
        <span>📥</span>
        <span>Xuất dữ liệu</span>
        <span className="text-xs text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden divide-y divide-slate-700/50 animation-fade-in">
          <div className="py-1">
            <div className="px-3 py-1.5 text-xxs font-semibold text-slate-500 uppercase tracking-wider">Bản Excel</div>
            <button
              onClick={() => handleAction('history')}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>📊</span> Lịch sử hóa đơn (.xlsx)
            </button>
            <button
              onClick={() => handleAction('monthly')}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>📈</span> Báo cáo doanh thu tháng (.xlsx)
            </button>
            <button
              onClick={() => handleAction('yearly')}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>📆</span> Báo cáo doanh thu năm (.xlsx)
            </button>
          </div>
          <div className="py-1">
            <div className="px-3 py-1.5 text-xxs font-semibold text-slate-500 uppercase tracking-wider">Bản PDF</div>
            <button
              onClick={() => handleAction('pdf')}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>📄</span> Xuất DS hóa đơn PDF (.pdf)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExportButton;
