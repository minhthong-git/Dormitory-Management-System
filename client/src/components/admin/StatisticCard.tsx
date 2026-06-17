import React from 'react';

interface StatisticCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  accentClass?: string;
}

export const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  accentClass = 'text-primary',
}) => {
  return (
    <div className="relative overflow-hidden bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:border-slate-600/50 transition-all duration-300 group">
      {/* Background glowing orb */}
      <div className="absolute -right-10 -top-10 w-24 h-24 bg-gradient-to-br from-primary/10 to-secondary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />

      <div className="flex items-center justify-between gap-4 mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-3 rounded-xl bg-slate-700/40 group-hover:bg-slate-700/80 transition-colors duration-300 ${accentClass}`}>
          {icon || <span className="text-xl">📊</span>}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.isPositive 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-rose-500/10 text-rose-400'
          }`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-500 font-medium">{subtitle}</p>
      )}
    </div>
  );
};
export default StatisticCard;
