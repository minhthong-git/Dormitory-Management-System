import React from 'react';

interface StatusBadgeProps {
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'PAID':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          label: 'Đã thanh toán',
          dot: 'bg-emerald-400',
        };
      case 'PARTIAL':
        return {
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          label: 'Một phần',
          dot: 'bg-sky-400',
        };
      case 'OVERDUE':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          label: 'Quá hạn',
          dot: 'bg-rose-400',
        };
      case 'UNPAID':
      default:
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          label: 'Chưa thanh toán',
          dot: 'bg-amber-400',
        };
    }
  };

  const styles = getStyles();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${styles.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {styles.label}
    </span>
  );
};
