import React, { useState, useEffect } from 'react';
import axiosClient from '@/api/axiosClient';
import { utilityService } from '@/services/utilityService';

interface UtilityFormProps {
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const UtilityForm: React.FC<UtilityFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  const [roomId, setRoomId] = useState('');
  const [billingMonth, setBillingMonth] = useState(new Date().getMonth() + 1);
  const [billingYear, setBillingYear] = useState(new Date().getFullYear());

  const [previousElectric, setPreviousElectric] = useState(0);
  const [currentElectric, setCurrentElectric] = useState(0);
  const [previousWater, setPreviousWater] = useState(0);
  const [currentWater, setCurrentWater] = useState(0);

  const [electricPrice, setElectricPrice] = useState(3500);
  const [waterPrice, setWaterPrice] = useState(15000);
  const [serviceFee, setServiceFee] = useState(50000);

  const [roomFee, setRoomFee] = useState(0);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live calculations
  const [calculations, setCalculations] = useState({
    electricUsed: 0,
    waterUsed: 0,
    electricityFee: 0,
    waterFee: 0,
    totalAmount: 0,
  });

  // Load rooms and active contracts on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsRes, contractsRes] = await Promise.all([
          axiosClient.get('/rooms?limit=100'),
          axiosClient.get('/contracts?limit=100'),
        ]);
        // Only show rooms that have ACTIVE contracts
        const activeContracts = contractsRes.data.data || [];
        setContracts(activeContracts);

        const allRooms = roomsRes.data.data || [];
        const activeRoomIds = new Set(activeContracts.map((c: any) => c.roomId));
        const roomsWithActiveContracts = allRooms.filter((r: any) => activeRoomIds.has(r.id));
        setRooms(roomsWithActiveContracts);
      } catch (err) {
        console.error('Failed to load form dependencies:', err);
      }
    };
    loadData();
  }, []);

  // Update previous readings when room is selected
  useEffect(() => {
    if (!roomId) {
      setPreviousElectric(0);
      setPreviousWater(0);
      setRoomFee(0);
      return;
    }

    const loadLatestReading = async () => {
      setLoadingLatest(true);
      setError(null);
      try {
        const selectedRoom = rooms.find((r) => r.id === roomId);
        if (selectedRoom) {
          setRoomFee(selectedRoom.pricePerMonth);
        }

        // Fetch latest reading for the room
        const res = await axiosClient.get(`/utilities?roomId=${roomId}&limit=1`);
        const latest = res.data.data?.[0];

        if (latest) {
          setPreviousElectric(latest.currentElectric);
          setCurrentElectric(latest.currentElectric);
          setPreviousWater(latest.currentWater);
          setCurrentWater(latest.currentWater);
        } else {
          setPreviousElectric(0);
          setCurrentElectric(0);
          setPreviousWater(0);
          setCurrentWater(0);
        }
      } catch (err) {
        console.error('Failed to fetch latest readings:', err);
        setError('Không thể tải chỉ số điện nước gần nhất của phòng này');
      } finally {
        setLoadingLatest(false);
      }
    };

    loadLatestReading();
  }, [roomId, rooms]);

  // Handle live calculation updates
  useEffect(() => {
    const calc = async () => {
      if (!roomId) return;
      try {
        const res = await utilityService.calculate({
          roomFee,
          previousElectric,
          currentElectric,
          previousWater,
          currentWater,
          electricPrice,
          waterPrice,
          serviceFee,
        });
        setCalculations(res.data.data);
      } catch (err) {
        // Fallback calculations in case of service failure
        const eUsed = Math.max(0, currentElectric - previousElectric);
        const wUsed = Math.max(0, currentWater - previousWater);
        const eFee = eUsed * electricPrice;
        const wFee = wUsed * waterPrice;
        setCalculations({
          electricUsed: eUsed,
          waterUsed: wUsed,
          electricityFee: eFee,
          waterFee: wFee,
          totalAmount: roomFee + eFee + wFee + serviceFee,
        });
      }
    };

    const timer = setTimeout(calc, 200);
    return () => clearTimeout(timer);
  }, [
    roomId,
    roomFee,
    previousElectric,
    currentElectric,
    previousWater,
    currentWater,
    electricPrice,
    waterPrice,
    serviceFee,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roomId) {
      setError('Vui lòng chọn phòng');
      return;
    }

    if (currentElectric < previousElectric) {
      setError('Chỉ số điện mới không được nhỏ hơn chỉ số điện cũ');
      return;
    }

    if (currentWater < previousWater) {
      setError('Chỉ số nước mới không được nhỏ hơn chỉ số nước cũ');
      return;
    }

    onSubmit({
      roomId,
      billingMonth: parseInt(billingMonth.toString(), 10),
      billingYear: parseInt(billingYear.toString(), 10),
      currentElectric: parseFloat(currentElectric.toString()),
      currentWater: parseFloat(currentWater.toString()),
      electricPrice: parseFloat(electricPrice.toString()),
      waterPrice: parseFloat(waterPrice.toString()),
      serviceFee: parseFloat(serviceFee.toString()),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-slate-300">
      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Room selection */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-400 uppercase">Phòng thuê có hợp đồng</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          >
            <option value="">-- Chọn phòng ghi điện nước --</option>
            {rooms.map((r) => {
              const contract = contracts.find((c) => c.roomId === r.id && c.status === 'ACTIVE');
              return (
                <option key={r.id} value={r.id}>
                  Phòng {r.roomNumber} - Khách thuê: {contract?.user?.fullName || 'N/A'}
                </option>
              );
            })}
          </select>
        </div>

        {/* Month */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Tháng hóa đơn</label>
          <input
            type="number"
            min={1}
            max={12}
            value={billingMonth}
            onChange={(e) => setBillingMonth(parseInt(e.target.value, 10))}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Năm hóa đơn</label>
          <input
            type="number"
            min={2000}
            max={2100}
            value={billingYear}
            onChange={(e) => setBillingYear(parseInt(e.target.value, 10))}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        {/* Electricity inputs */}
        <div className="md:col-span-2 border-b border-slate-700/50 pb-2">
          <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">⚡ Chỉ số điện</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Chỉ số điện cũ (kWh)</label>
          <input
            type="number"
            min={0}
            value={previousElectric}
            onChange={(e) => setPreviousElectric(parseFloat(e.target.value) || 0)}
            disabled={loadingLatest}
            required
            className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Chỉ số điện mới (kWh)</label>
          <input
            type="number"
            min={0}
            value={currentElectric}
            onChange={(e) => setCurrentElectric(parseFloat(e.target.value) || 0)}
            disabled={loadingLatest || !roomId}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Water inputs */}
        <div className="md:col-span-2 border-b border-slate-700/50 pb-2">
          <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">💧 Chỉ số nước</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Chỉ số nước cũ (m³)</label>
          <input
            type="number"
            min={0}
            value={previousWater}
            onChange={(e) => setPreviousWater(parseFloat(e.target.value) || 0)}
            disabled={loadingLatest}
            required
            className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Chỉ số nước mới (m³)</label>
          <input
            type="number"
            min={0}
            value={currentWater}
            onChange={(e) => setCurrentWater(parseFloat(e.target.value) || 0)}
            disabled={loadingLatest || !roomId}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
          />
        </div>

        {/* Pricing inputs */}
        <div className="md:col-span-2 border-b border-slate-700/50 pb-2">
          <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5">⚙️ Đơn giá dịch vụ</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Đơn giá điện (đ/kWh)</label>
          <input
            type="number"
            min={0}
            value={electricPrice}
            onChange={(e) => setElectricPrice(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Đơn giá nước (đ/m³)</label>
          <input
            type="number"
            min={0}
            value={waterPrice}
            onChange={(e) => setWaterPrice(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Phí dịch vụ & Vệ sinh cố định (đ)</label>
          <input
            type="number"
            min={0}
            value={serviceFee}
            onChange={(e) => setServiceFee(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Live Invoice Estimate Details */}
      {roomId && (
        <div className="p-4 bg-slate-700/20 border border-slate-700 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Bảng tính toán tạm thời</span>
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-slate-400">Tiền thuê phòng:</span>
            <span className="text-right font-medium text-white">{roomFee.toLocaleString('vi-VN')} ₫</span>

            <span className="text-slate-400">Tiền điện ({calculations.electricUsed} kWh):</span>
            <span className="text-right font-medium text-white">{calculations.electricityFee.toLocaleString('vi-VN')} ₫</span>

            <span className="text-slate-400">Tiền nước ({calculations.waterUsed} m³):</span>
            <span className="text-right font-medium text-white">{calculations.waterFee.toLocaleString('vi-VN')} ₫</span>

            <span className="text-slate-400">Phí dịch vụ cố định:</span>
            <span className="text-right font-medium text-white">{serviceFee.toLocaleString('vi-VN')} ₫</span>

            <hr className="col-span-2 border-slate-700/50 my-1" />

            <span className="text-sm font-semibold text-slate-300">Dự tính tổng tiền:</span>
            <span className="text-right text-base font-bold text-emerald-400">
              {calculations.totalAmount.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl font-medium transition-all"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={isSubmitting || loadingLatest || !roomId}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Đang lập...' : 'Ghi số & Lập hóa đơn'}
        </button>
      </div>
    </form>
  );
};
export default UtilityForm;
