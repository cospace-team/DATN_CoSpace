import React, { useMemo, useState } from 'react';
import { FiCalendar, FiMapPin, FiSearch, FiX, FiCheckCircle } from 'react-icons/fi';
import { bookings, getWorkspace, getBranch, getPaymentsByBooking, bookingCancellations } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { formatVND, formatDateTime, bookingStatusLabel, bookingStatusColor, paymentStatusLabel, durationUnitLabel } from '../../utils/formatters';

const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  const myBookings = useMemo(() => {
    let list = bookings.filter(b => b.user_id === user?.id);
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter);
    if (search) list = list.filter(b => b.booking_code.toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [user, statusFilter, search]);

  const detail = selectedBooking ? bookings.find(b => b.id === selectedBooking) : null;
  const detailWorkspace = detail ? getWorkspace(detail.workspace_id) : null;
  const detailBranch = detail ? getBranch(detail.branch_id) : null;
  const detailPayments = detail ? getPaymentsByBooking(detail.id) : [];
  const detailCancel = detail ? bookingCancellations.find(c => c.booking_id === detail.id) : null;
  const statuses = ['all', 'pending_payment', 'confirmed', 'checked_in', 'completed', 'canceled', 'expired'] as const;

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden">
        {/* Geometric Decor */}
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-slate-900 opacity-20 border border-border"></div>
        
        <p className="text-xs font-medium tracking-tight text-foreground">Đặt chỗ của tôi</p>
        <h1 className="text-3xl font-semibold  mt-1 text-foreground ">Lịch sử đặt chỗ</h1>
        
        <div className="mt-6 flex flex-wrap gap-3">
          {statuses.map(s => (
            <button 
              key={s} 
              onClick={() => setStatusFilter(s)} 
              className={`px-4 py-2 rounded-full text-sm font-medium border border-border transition-all ${
                statusFilter === s 
                  ? 'bg-slate-900 text-white shadow-sm translate-y-0' 
                  : 'bg-muted text-foreground hover:bg-card hover:-translate-y-1 hover:shadow-sm'
              }`}
            >
              {s === 'all' ? 'Tất cả' : bookingStatusLabel[s]}
            </button>
          ))}
        </div>
        
        <div className="mt-6 relative max-w-sm">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground h-5 w-5" />
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Tìm mã booking..." 
            className="w-full pl-12 pr-4 py-3 rounded-full border border-border bg-muted/50 font-medium text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-inner" 
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {myBookings.map(b => {
            const ws = getWorkspace(b.workspace_id);
            const branch = getBranch(b.branch_id);
            const isSelected = selectedBooking === b.id;
            return (
              <div 
                key={b.id} 
                onClick={() => setSelectedBooking(b.id)}
                className={`rounded-2xl border border-border p-6 cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-muted text-foreground shadow-sm -translate-y-1' 
                    : 'bg-card shadow-sm hover:shadow-sm hover:-translate-y-1'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full border border-border ${isSelected ? 'bg-card' : 'bg-muted/50'}`}>
                      <FiCalendar className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-lg">{ws?.name || b.workspace_id}</p>
                      <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${isSelected ? 'text-foreground/80' : 'text-foreground/60'}`}>
                        <FiMapPin className="h-3 w-3" /> {branch?.name}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-tight border border-border shadow-sm ${
                    b.status === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/300 text-white' : 
                    b.status === 'canceled' ? 'bg-rose-500 text-white' : 
                    b.status === 'pending_payment' ? 'bg-muted text-foreground' : 
                    'bg-muted text-foreground'
                  }`}>
                    {bookingStatusLabel[b.status]}
                  </span>
                </div>
                <div className={`mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 p-4 rounded-full border border-border ${isSelected ? 'bg-card' : 'bg-muted/50'}`}>
                  <div><p className="text-[10px] font-medium  text-foreground/70">Mã booking</p><p className="text-sm font-mono font-semibold mt-1">{b.booking_code}</p></div>
                  <div><p className="text-[10px] font-medium  text-foreground/70">Bắt đầu</p><p className="text-sm font-medium mt-1">{formatDateTime(b.start_at)}</p></div>
                  <div><p className="text-[10px] font-medium  text-foreground/70">Thời lượng</p><p className="text-sm font-medium mt-1">{b.unit_count} {durationUnitLabel[b.duration_unit]?.toLowerCase()}</p></div>
                  <div><p className="text-[10px] font-medium  text-foreground/70">Tổng tiền</p><p className="text-sm font-semibold text-foreground mt-1">{formatVND(b.total_amount)}</p></div>
                </div>
              </div>
            );
          })}
          {myBookings.length === 0 && (
            <div className="rounded-2xl border border-border bg-card text-center py-16 px-6 shadow-sm">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto border border-border">
                <FiCalendar className="h-10 w-10 text-foreground/50" />
              </div>
              <p className="mt-6 text-xl font-medium  ">Chưa có booking nào</p>
              <p className="mt-2 text-sm font-semibold text-foreground/70">Khám phá không gian để đặt chỗ đầu tiên nhé!</p>
            </div>
          )}
        </div>

        {detail && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-slide-in-right sticky top-24 self-start">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <p className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                <FiCheckCircle className="h-5 w-5" /> Chi tiết booking
              </p>
              <button 
                onClick={() => setSelectedBooking(null)} 
                className="h-8 w-8 rounded-full border border-border flex items-center justify-center bg-muted hover:bg-muted hover:text-white transition-colors"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-4xl font-mono font-semibold text-muted-foreground tracking-tight drop-shadow-sm">{detail.booking_code}</p>
              <div className="mt-3 inline-block">
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight border border-border shadow-sm ${
                  detail.status === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/300 text-white' : 
                  detail.status === 'canceled' ? 'bg-rose-500 text-white' : 
                  detail.status === 'pending_payment' ? 'bg-muted text-foreground' : 
                  'bg-muted text-foreground'
                }`}>
                  {bookingStatusLabel[detail.status]}
                </span>
              </div>
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="rounded-full bg-muted/50 p-4 border border-border">
                <p className="text-[10px] font-medium tracking-tight text-foreground/60 mb-1">Workspace</p>
                <p className="font-medium text-lg">{detailWorkspace?.name}</p>
                <p className="text-sm font-semibold text-foreground/70 mt-1 flex items-center gap-1">
                  <FiMapPin className="h-3 w-3" /> {detailBranch?.name}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-full bg-muted/50 p-4 border border-border">
                  <p className="text-[10px] font-medium tracking-tight text-foreground/60 mb-1">Check-in</p>
                  <p className="text-sm font-medium">{formatDateTime(detail.start_at)}</p>
                </div>
                <div className="rounded-full bg-muted/50 p-4 border border-border">
                  <p className="text-[10px] font-medium tracking-tight text-foreground/60 mb-1">Check-out</p>
                  <p className="text-sm font-medium">{formatDateTime(detail.end_at)}</p>
                </div>
              </div>
              
              <div className="rounded-full bg-muted p-5 border border-border space-y-3">
                <p className="text-xs font-semibold tracking-tight text-foreground mb-3">Chi tiết giá</p>
                <div className="flex justify-between text-sm font-semibold"><span>Giá gốc</span><span>{formatVND(detail.subtotal_amount)}</span></div>
                {detail.discount_amount > 0 && <div className="flex justify-between text-sm font-medium text-foreground"><span>Giảm giá</span><span>-{formatVND(detail.discount_amount)}</span></div>}
                {detail.addon_amount > 0 && <div className="flex justify-between text-sm font-semibold"><span>Dịch vụ thêm</span><span>+{formatVND(detail.addon_amount)}</span></div>}
                <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg mt-2">
                  <span>Tổng cộng</span>
                  <span className="text-foreground">{formatVND(detail.total_amount)}</span>
                </div>
              </div>
              
              {detailPayments.length > 0 && (
                <div className="rounded-full bg-card p-4 border border-border shadow-sm">
                  <p className="text-xs font-semibold tracking-tight text-foreground mb-3">Thanh toán</p>
                  {detailPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm font-medium">
                      <span className="capitalize">{p.provider} - {p.method}</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] tracking-tight border border-border ${
                        p.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/300 text-white' : 
                        p.status === 'pending' ? 'bg-muted text-foreground' : 
                        'bg-secondary text-white'
                      }`}>
                        {paymentStatusLabel[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {detailCancel && (
                <div className="rounded-full border border-border bg-muted p-4 shadow-sm">
                  <p className="text-sm font-semibold tracking-tight text-foreground mb-2">Đã hủy</p>
                  <p className="text-sm font-semibold mb-1">Lý do: {detailCancel.reason}</p>
                  <p className="text-sm font-medium">Hoàn tiền: {formatVND(detailCancel.refund_amount)} ({detailCancel.refund_percent}%)</p>
                </div>
              )}
              
              {(detail.status === 'confirmed' || detail.status === 'pending_payment') && (
                <button className="w-full mt-4 bg-muted text-white border border-border py-3 rounded-full font-semibold shadow-sm hover:translate-y-1 hover:shadow-none transition-all tracking-tight">
                  Hủy booking
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookingsPage;
