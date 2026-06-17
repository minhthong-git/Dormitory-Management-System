import React, { useState, useEffect } from 'react';
import axiosClient from '@/api/axiosClient';

interface InvoiceFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  const [roomId, setRoomId] = useState(initialData?.roomId || '');
  const [contractId, setContractId] = useState(initialData?.contractId || '');
  const [billingMonth, setBillingMonth] = useState(initialData?.billingMonth || new Date().getMonth() + 1);
  const [billingYear, setBillingYear] = useState(initialData?.billingYear || new Date().getFullYear());
  const [roomFee, setRoomFee] = useState(initialData?.roomFee || 0);
  const [electricityFee, setElectricityFee] = useState(initialData?.electricityFee || 0);
  const [waterFee, setWaterFee] = useState(initialData?.waterFee || 0);
  const [serviceFee, setServiceFee] = useState(initialData?.serviceFee || 0);
  const [paymentStatus, setPaymentStatus] = useState(initialData?.paymentStatus || 'UNPAID');
  
  // Set default due date to 10 days from now
  const getDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().slice(0, 10);
  };
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 10) : getDefaultDueDate()
  );
  
  const [paidDate, setPaidDate] = useState(
    initialData?.paidDate ? new Date(initialData.paidDate).toISOString().slice(0, 10) : ''
  );

  const [error, setError] = useState<string | null>(null);

  // Load rooms and active contracts on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [roomsRes, contractsRes] = await Promise.all([
          axiosClient.get('/rooms?limit=100'),
          axiosClient.get('/contracts?limit=100'),
        ]);
        setRooms(roomsRes.data.data || []);
        setContracts(contractsRes.data.data || []);
      } catch (err) {
        console.error('Failed to load form dependencies:', err);
      }
    };
    loadData();
  }, []);

  // Update room fee and contract when room is selected
  const handleRoomSelect = (id: string) => {
    setRoomId(id);
    const selectedRoom = rooms.find((r) => r.id === id);
    if (selectedRoom) {
      setRoomFee(selectedRoom.pricePerMonth);
    }

    // Attempt to auto-link contract for this room
    const relatedContract = contracts.find((c) => c.roomId === id && c.status === 'ACTIVE');
    if (relatedContract) {
      setContractId(relatedContract.id);
    } else {
      setContractId('');
    }
  };

  const totalAmount = roomFee + electricityFee + waterFee + serviceFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roomId) {
      setError('Vui lòng chọn phòng');
      return;
    }

    onSubmit({
      roomId,
      contractId: contractId || null,
      billingMonth: parseInt(billingMonth.toString(), 10),
      billingYear: parseInt(billingYear.toString(), 10),
      roomFee: parseFloat(roomFee.toString()),
      electricityFee: parseFloat(electricityFee.toString()),
      waterFee: parseFloat(waterFee.toString()),
      serviceFee: parseFloat(serviceFee.toString()),
      totalAmount,
      paymentStatus,
      dueDate: new Date(dueDate).toISOString(),
      paidDate: paymentStatus === 'PAID' ? (paidDate ? new Date(paidDate).toISOString() : new Date().toISOString()) : null,
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
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Phòng</label>
          <select
            value={roomId}
            onChange={(e) => handleRoomSelect(e.target.value)}
            disabled={!!initialData}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          >
            <option value="">-- Chọn phòng --</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Phòng {r.roomNumber} - {r.pricePerMonth.toLocaleString('vi-VN')} đ/tháng
              </option>
            ))}
          </select>
        </div>

        {/* Contract Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Hợp đồng liên kết (Không bắt buộc)</label>
          <select
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          >
            <option value="">-- Chọn hợp đồng --</option>
            {contracts
              .filter((c) => !roomId || c.roomId === roomId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  HĐ: {c.user?.fullName} ({c.status})
                </option>
              ))}
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

        {/* Fees */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Tiền phòng (đ)</label>
          <input
            type="number"
            min={0}
            value={roomFee}
            onChange={(e) => setRoomFee(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Tiền điện (đ)</label>
          <input
            type="number"
            min={0}
            value={electricityFee}
            onChange={(e) => setElectricityFee(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Tiền nước (đ)</label>
          <input
            type="number"
            min={0}
            value={waterFee}
            onChange={(e) => setWaterFee(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Phí dịch vụ khác (đ)</label>
          <input
            type="number"
            min={0}
            value={serviceFee}
            onChange={(e) => setServiceFee(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        {/* Due date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Hạn thanh toán</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase">Trạng thái thanh toán</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          >
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIAL">Thanh toán một phần</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>
        </div>

        {paymentStatus === 'PAID' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">Ngày thanh toán thực tế</label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-700/30 border border-slate-700 rounded-2xl flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-400 uppercase">Tổng số tiền hóa đơn:</span>
        <span className="text-2xl font-bold text-emerald-400">
          {totalAmount.toLocaleString('vi-VN')} ₫
        </span>
      </div>

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
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-55 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Đang lưu...' : 'Lưu hóa đơn'}
        </button>
      </div>
    </form>
  );
};
export default InvoiceForm;
