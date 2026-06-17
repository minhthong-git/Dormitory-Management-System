import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: any;
}

interface RevenueChartProps {
  type: 'monthly' | 'yearly' | 'status' | 'room';
  data: ChartDataPoint[];
}

const COLORS = ['#5B5FEF', '#06b6d4', '#ef4444', '#f59e0b'];

export const RevenueChart: React.FC<RevenueChartProps> = ({ type, data }) => {
  const formatYAxis = (tick: number) => {
    if (tick >= 1_000_000) return `${(tick / 1_000_000).toFixed(1)}M ₫`;
    if (tick >= 1_000) return `${(tick / 1_000).toFixed(0)}k ₫`;
    return `${tick} ₫`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-2xl">
          <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.payload.fill }} />
              <span className="text-slate-300 font-medium">{p.name || 'Doanh thu'}:</span>
              <span className="text-white font-bold">{p.value.toLocaleString('vi-VN')} ₫</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'monthly':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5B5FEF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#5B5FEF" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              name="Doanh thu"
              stroke="#5B5FEF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMonthly)"
            />
          </AreaChart>
        );

      case 'yearly':
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Doanh thu" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={50} />
          </BarChart>
        );

      case 'status':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              nameKey="label"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        );

      case 'room':
        return (
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatYAxis} />
            <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Doanh số" fill="#5B5FEF" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-80 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 shadow-lg">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart() || <div className="text-slate-500 text-sm flex items-center justify-center h-full">Không có dữ liệu biểu đồ.</div>}
      </ResponsiveContainer>
    </div>
  );
};
export default RevenueChart;
