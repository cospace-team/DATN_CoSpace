import React, { useState } from 'react';
import {
  FiUser, FiClock, FiMapPin, FiCoffee,
  FiDollarSign, FiSearch, FiPlus, FiCheckCircle,
  FiCheck, FiUserPlus, FiMaximize, FiCreditCard, FiZap
} from 'react-icons/fi';
import { users, workspaces, extraServices, getWorkspace, floors, workspaceMaintenances, bookings } from '../../data/mockData';
import { formatVND } from '../../utils/formatters';
import { useToast } from '../../components/Toast';

const WalkinBookingPage: React.FC = () => {
  const { showToast } = useToast();

  // Step 1: Customer Info
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  // Step 2: Time & Space
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('11:00');
  const [selectedFloorId, setSelectedFloorId] = useState('floor-001');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [autoCheckIn, setAutoCheckIn] = useState(true);

  // Step 3: Add-on Services
  const [selectedServices, setSelectedServices] = useState<{ id: string; quantity: number }[]>([]);

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'card'>('cash');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBookingCode, setCreatedBookingCode] = useState('');

  // Customer search logic
  const handleSearchUser = () => {
    if (!phoneSearch.trim()) return;
    const found = users.find(u => u.phone === phoneSearch || u.full_name.toLowerCase().includes(phoneSearch.toLowerCase()));
    if (found) {
      setSelectedUser(found);
      setIsNewUser(false);
      showToast(`Đã chọn khách hàng: ${found.full_name}`, 'info');
    } else {
      setSelectedUser(null);
      setIsNewUser(true);
      showToast('Số điện thoại chưa có trên hệ thống, vui lòng tạo hồ sơ mới', 'info');
    }
  };

  // Pricing calculations
  const duration = Math.max(1, parseInt(endHour) - parseInt(startHour));
  const wsPrice = selectedWorkspaceId ? 50000 : 0;
  const subtotal = wsPrice * duration;
  const servicesTotal = selectedServices.reduce((sum, s) => {
    const svc = extraServices.find(e => e.id === s.id);
    return sum + (svc ? svc.price * s.quantity : 0);
  }, 0);
  const total = subtotal + servicesTotal;

  const checkOverlap = (wsId: string, sHour: number, eHour: number) => {
    const today = new Date();
    const checkStart = new Date(today);
    checkStart.setHours(sHour, 0, 0, 0);
    const checkEnd = new Date(today);
    checkEnd.setHours(eHour, 0, 0, 0);

    return bookings.some(b => {
      if (b.workspace_id !== wsId) return false;
      if (['canceled', 'completed', 'expired'].includes(b.status.toLowerCase())) return false;
      
      const bStart = new Date(b.start_at);
      const bEnd = new Date(b.end_at);
      
      // Is there an overlap for today?
      return checkStart < bEnd && bStart < checkEnd;
    });
  };

  const handleConfirm = () => {
    if ((!selectedUser && !newUserName) || !selectedWorkspaceId) {
      showToast('Vui lòng nhập thông tin khách hàng và chọn bàn làm việc!', 'error');
      return;
    }

    const sH = parseInt(startHour);
    const eH = parseInt(endHour);
    
    if (eH <= sH) {
      showToast('Giờ kết thúc phải lớn hơn giờ bắt đầu!', 'error');
      return;
    }

    if (checkOverlap(selectedWorkspaceId, sH, eH)) {
      showToast(`Vị trí này đã có người đặt trong khoảng thời gian từ ${startHour} đến ${endHour}. Vui lòng chọn giờ hoặc vị trí khác.`, 'error');
      return;
    }

    const code = 'WH-WK' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setCreatedBookingCode(code);
    setIsSuccess(true);
    showToast(`Đã tạo booking tại quầy thành công: ${code}`, 'success');
  };

  const handleReset = () => {
    setPhoneSearch('');
    setSelectedUser(null);
    setIsNewUser(false);
    setNewUserName('');
    setStartHour('08:00');
    setEndHour('11:00');
    setSelectedWorkspaceId('');
    setSelectedServices([]);
    setPaymentMethod('cash');
    setIsSuccess(false);
  };

  if (isSuccess) {
    const wsName = getWorkspace(selectedWorkspaceId)?.name || 'Chỗ ngồi';
    const customerName = selectedUser?.full_name || newUserName || 'Khách vãng lai';

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-fade-scale-in">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/300/10 text-emerald-500 rounded-3xl flex items-center justify-center mb-4 border border-emerald-500/30 shadow-xl">
          <FiCheckCircle className="h-10 w-10" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
          MÃ ĐƠN: {createdBookingCode}
        </span>
        <h1 className="text-2xl font-bold font-heading text-foreground mt-2">
          Tạo Đặt chỗ & Thu tiền thành công!
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          Khách hàng <strong className="text-foreground">{customerName}</strong> đã được xếp chỗ tại <strong className="text-primary">{wsName}</strong> ({duration} giờ).
        </p>

        {autoCheckIn && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/300/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <FiZap className="h-4 w-4" /> Đã tự động kích hoạt Check-in nhận vị trí ngay.
          </div>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button onClick={handleReset} className="btn btn-primary px-6 py-2.5 rounded-xl font-bold">
            + Tạo đơn Walk-in khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold font-heading text-foreground">Tạo Booking Walk-in Tại Quầy</h1>
        <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
          QUẬN 1 POS
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          
          {/* STEP 1: Customer Information */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-base text-foreground font-heading border-b border-border pb-3">
              <FiUser className="text-primary h-5 w-5" /> 1. Khách hàng
            </h2>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  value={phoneSearch}
                  onChange={e => setPhoneSearch(e.target.value)}
                  placeholder="Nhập SĐT hoặc Tên khách hàng để tìm..."
                  className="input-field !pl-10 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                />
              </div>
              <button onClick={handleSearchUser} className="btn btn-secondary px-4 text-xs font-bold">
                Tìm kiếm
              </button>
            </div>

            {selectedUser && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex justify-between items-center animate-fade-scale-in">
                <div>
                  <p className="font-bold text-sm text-primary">{selectedUser.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedUser.phone} · {selectedUser.email}</p>
                </div>
                <span className="badge badge-success text-[10px] font-bold">Hồ sơ có sẵn</span>
              </div>
            )}

            {isNewUser && !selectedUser && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/300/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 space-y-2 animate-fade-scale-in">
                <p className="text-xs font-bold flex items-center gap-2">
                  <FiUserPlus className="h-4 w-4" /> Khách hàng mới — Tạo hồ sơ nhanh:
                </p>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Nhập Họ và Tên đầy đủ của khách..."
                  className="input-field text-sm bg-card text-foreground"
                />
              </div>
            )}
          </div>

          {/* STEP 2: Time & Floor Space Selection */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-base text-foreground font-heading border-b border-border pb-3">
              <FiClock className="text-primary h-5 w-5" /> 2. Thời gian & Vị trí làm việc
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Giờ bắt đầu (Hôm nay)</label>
                <select value={startHour} onChange={e => setStartHour(e.target.value)} className="input-field text-sm font-semibold">
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Giờ kết thúc</label>
                <select value={endHour} onChange={e => setEndHour(e.target.value)} className="input-field text-sm font-semibold">
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FiMapPin className="text-primary" /> Chọn sơ đồ Tầng
                </label>
                <div className="flex gap-1.5">
                  {floors.filter(f => f.branch_id === 'branch-0001').map(f => (
                    <button 
                      key={f.id} 
                      onClick={() => setSelectedFloorId(f.id)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition ${
                        selectedFloorId === f.id ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {workspaces.filter(w => w.floor_id === selectedFloorId).map(ws => {
                  const isMaintenance = workspaceMaintenances.some(m => m.workspace_id === ws.id && m.status === 'active');
                  const sH = parseInt(startHour);
                  const eH = parseInt(endHour);
                  const isBooked = !isMaintenance && eH > sH && checkOverlap(ws.id, sH, eH);
                  const isSelected = selectedWorkspaceId === ws.id;
                  
                  let btnClass = "p-3 rounded-xl border text-center transition flex flex-col items-center justify-center min-h-[85px] relative overflow-hidden ";
                  if (isMaintenance) {
                    btnClass += "border-red-500/30 bg-red-50 dark:bg-red-950/300/10 text-red-400 cursor-not-allowed opacity-60";
                  } else if (isBooked) {
                    btnClass += "border-orange-500/30 bg-orange-50 dark:bg-orange-950/300/10 text-orange-500 cursor-not-allowed opacity-80";
                  } else if (isSelected) {
                    btnClass += "border-primary bg-primary/10 ring-2 ring-primary text-primary font-bold shadow-md shadow-primary/10";
                  } else {
                    btnClass += "border-border hover:border-primary/50 text-foreground bg-card";
                  }

                  return (
                    <button 
                      key={ws.id} 
                      disabled={isMaintenance || isBooked}
                      onClick={() => setSelectedWorkspaceId(ws.id)}
                      className={btnClass}
                    >
                      <p className="font-bold text-sm font-heading">{ws.name}</p>
                      {isMaintenance ? (
                        <span className="text-[9px] font-mono font-bold mt-1 text-red-500 uppercase tracking-wider">Bảo trì</span>
                      ) : isBooked ? (
                        <span className="text-[9px] font-mono font-bold mt-1 text-orange-500 uppercase tracking-wider">Đã đặt</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono mt-1 font-semibold">50k/h</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 3: Extra Services */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-base text-foreground font-heading border-b border-border pb-3">
              <FiCoffee className="text-primary h-5 w-5" /> 3. Dịch vụ ăn uống & Tiện ích kèm theo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {extraServices.slice(0, 4).map(svc => {
                const selected = selectedServices.find(s => s.id === svc.id);
                return (
                  <div key={svc.id} className="p-3.5 rounded-xl border border-border bg-muted/20 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-xs text-foreground">{svc.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{formatVND(svc.price)} / {svc.unit}</p>
                    </div>
                    {selected ? (
                      <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border">
                        <button onClick={() => setSelectedServices(prev => prev.map(s => s.id === svc.id ? { ...s, quantity: Math.max(0, s.quantity - 1) } : s).filter(s => s.quantity > 0))} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground hover:text-foreground">-</button>
                        <span className="text-xs font-mono font-bold w-4 text-center">{selected.quantity}</span>
                        <button onClick={() => setSelectedServices(prev => prev.map(s => s.id === svc.id ? { ...s, quantity: s.quantity + 1 } : s))} className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">+</button>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedServices([...selectedServices, { id: svc.id, quantity: 1 }])} className="px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold transition">
                        + Thêm
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: POS Payment & Checkout Summary */}
        <div>
          <div className="rounded-2xl border border-border bg-card p-6 sticky top-24 shadow-lg space-y-5">
            <h2 className="font-bold text-base uppercase tracking-wider text-muted-foreground font-heading">
              Tóm tắt POS & Thu tiền
            </h2>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tiền chỗ ({duration} giờ)</span>
                <span className="font-mono font-semibold text-foreground">{formatVND(subtotal)}</span>
              </div>
              {selectedServices.map(s => {
                const svc = extraServices.find(e => e.id === s.id);
                if (!svc) return null;
                return (
                  <div key={s.id} className="flex justify-between text-muted-foreground">
                    <span>{svc.name} ×{s.quantity}</span>
                    <span className="font-mono font-semibold text-foreground">{formatVND(svc.price * s.quantity)}</span>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-border flex justify-between items-end">
                <span className="font-bold text-sm">Tổng thu khách</span>
                <span className="font-extrabold text-2xl text-primary font-mono">{formatVND(total)}</span>
              </div>
            </div>

            {/* Payment Method Option */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hình thức thanh toán</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                    paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/300/10 text-emerald-600 dark:text-emerald-400' : 'border-border text-muted-foreground'
                  }`}
                >
                  <FiDollarSign className="h-4 w-4" />
                  <span>Tiền mặt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                    paymentMethod === 'momo' ? 'border-[#A50064] bg-[#A50064]/10 text-[#A50064]' : 'border-border text-muted-foreground'
                  }`}
                >
                  <FiMaximize className="h-4 w-4" />
                  <span>Ví MoMo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-2.5 rounded-xl border text-center text-xs font-bold transition flex flex-col items-center gap-1 ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  <FiCreditCard className="h-4 w-4" />
                  <span>Quẹt thẻ</span>
                </button>
              </div>
            </div>

            {/* Auto Check-in Toggle */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={autoCheckIn}
                onChange={e => setAutoCheckIn(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-xs font-semibold text-foreground">Kích hoạt Check-in ngay cho khách</span>
            </label>

            <button 
              disabled={(!selectedUser && !newUserName) || !selectedWorkspaceId} 
              onClick={handleConfirm}
              className="btn btn-primary w-full py-4 text-sm font-bold shadow-lg shadow-primary/25 rounded-xl"
            >
              <FiCheck className="h-4 w-4 mr-1.5" />
              <span>Xác nhận & Thu tiền POS</span>
            </button>

            {((!selectedUser && !newUserName) || !selectedWorkspaceId) && (
              <p className="text-[11px] text-center text-destructive font-semibold">
                Vui lòng điền tên khách và chọn bàn trước khi thu tiền.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkinBookingPage;
