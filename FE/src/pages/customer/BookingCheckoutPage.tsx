import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiChevronLeft, FiMapPin, FiCalendar, FiClock,
  FiCheckCircle, FiAlertTriangle, FiMaximize, FiLock, FiExternalLink, FiX, FiCreditCard
} from 'react-icons/fi';
import { formatVND, durationUnitLabel } from '../../utils/formatters';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { bookingApi } from '../../lib/bookingApi';
import { useToast } from '../../components/Toast';
import { ADDON_SERVICES as MOCK_SERVICES } from '../../data/addonServices';
import { resolveBranchId } from '../../data/branchAliases';

const BookingCheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const state = location.state as any;
  const workspace = state?.workspace;
  const workspaceType = state?.workspaceType;
  const date = (state?.date ? new Date(state.date) : new Date());
  const startHour = state?.hour || 9;
  const endHour = state?.endHour || 11;
  // Multi-day support: endDate and durationUnit passed from BookingPanel
  const rawEndDate = state?.endDate ? new Date(state.endDate) : null;
  const bookingDurationUnit: 'hour' | 'day' | 'week' = state?.durationUnit || 'hour';
  const endDate = rawEndDate && bookingDurationUnit !== 'hour' ? rawEndDate : new Date(date);
  const services = state?.services || {};
  const basePrice = state?.price?.price || 0;
  const subtotal = state?.subtotal || 0;
  const addonTotal = state?.addonTotal || 0;
  const total = state?.total || 0;

  // Derived display values
  const isMultiDay = bookingDurationUnit !== 'hour';
  const unitCount = isMultiDay
    ? (bookingDurationUnit === 'week'
        ? Math.max(1, Math.round(Math.abs(endDate.getTime() - date.getTime()) / (86_400_000 * 7)))
        : Math.max(1, Math.round(Math.abs(endDate.getTime() - date.getTime()) / 86_400_000)))
    : Math.max(1, endHour - startHour);

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'payos' | 'momo' | 'cash'>('payos');
  const [holdExpired, setHoldExpired] = useState(false);

  // Before a booking is created there's no real hold yet, so this is only an advisory display —
  // the moment activeBooking.paymentDeadlineAt comes back from the server, the countdown re-syncs
  // to that authoritative deadline so it can never drift from what the backend will actually expire.
  const [softDeadline] = useState(() => Date.now() + 15 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const deadlineMs = activeBooking?.paymentDeadlineAt
      ? new Date(activeBooking.paymentDeadlineAt).getTime()
      : softDeadline;

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && activeBooking) {
        setHoldExpired(true);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeBooking, softDeadline]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Once the server-side hold actually expires, the backend's BookingExpiryScheduler releases the
  // workspace within ~60s — send the customer back to Explore instead of leaving them on a stale
  // checkout page for a booking that no longer holds the seat.
  useEffect(() => {
    if (!holdExpired) return;
    showToast('Thời gian giữ chỗ đã hết hạn. Vui lòng chọn lại chỗ ngồi.', 'error');
    const redirect = setTimeout(() => navigate('/customer/explore'), 3000);
    return () => clearTimeout(redirect);
  }, [holdExpired]);

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FiAlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-medium  mb-2">Chưa chọn chỗ ngồi</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Vui lòng quay lại trang Khám phá để chọn không gian và thời gian làm việc.
        </p>
        <Button onClick={() => navigate('/customer/explore')} className="bg-primary">
          <FiChevronLeft className="mr-2" /> Quay lại Khám phá
        </Button>
      </div>
    );
  }

  const handleCreateBooking = async () => {
    if (holdExpired) return;
    setIsProcessing(true);
    try {
      // 1. Build startAt/endAt based on durationUnit
      const startAtDate = new Date(date);
      startAtDate.setHours(startHour, 0, 0, 0);

      const now = new Date();
      now.setMinutes(0, 0, 0); // Allow booking for the current hour even if minutes have passed
      
      if (startAtDate < now) {
        showToast('Không thể đặt chỗ trong quá khứ. Vui lòng chọn thời gian khác.', 'error');
        setIsProcessing(false);
        return;
      }

      let endAtDate: Date;
      if (isMultiDay) {
        // For day/week bookings: end at 23:59:59 of the selected end date
        endAtDate = new Date(endDate);
        endAtDate.setHours(23, 59, 59, 999);
      } else {
        // For hour bookings: same day, specified end hour
        endAtDate = new Date(date);
        endAtDate.setHours(endHour, 0, 0, 0);
      }

      let bookingRes = activeBooking;
      if (!bookingRes) {
        bookingRes = await bookingApi.createBooking({
          branchId: resolveBranchId(workspace.branch_id || workspace.branchId),
          workspaceId: workspace.id,
          workspaceTypeId: workspace.workspace_type_id || workspace.workspaceTypeId || 'wst-desk',
          startAt: startAtDate.toISOString(),
          endAt: endAtDate.toISOString(),
          unit: bookingDurationUnit,
          unitCount: unitCount,
          services,
          source: 'web',
        });
        setActiveBooking(bookingRes);
      }

      // 2. Handle Payment Flow
      if (paymentMethod === 'cash') {
        showToast(`Đặt chỗ thành công! Vui lòng thanh toán tiền mặt tại quầy (Mã: ${bookingRes.bookingCode})`, 'success');
        navigate('/customer/history', { 
          state: { 
            message: `Đặt chỗ thành công! Mã đơn của bạn là ${bookingRes.bookingCode}. Vui lòng thanh toán tại quầy khi nhận chỗ.`,
            newBookingCode: bookingRes.bookingCode,
            branchName: state.branchName || "CoSpace Chi nhánh",
          } 
        });
        setIsProcessing(false);
        return;
      }

      if (paymentMethod === 'payos') {
        showToast('Đang kết nối cổng thanh toán VietQR (PayOS)...', 'info');
        const payosRes = await bookingApi.createPayosPayment(bookingRes.id, total);

        if (payosRes.checkoutUrl && payosRes.checkoutUrl.startsWith('http')) {
          window.location.href = payosRes.checkoutUrl;
        } else {
          showToast('Tạo yêu cầu thanh toán VietQR thành công!', 'success');
          navigate('/customer/history', { 
            state: { 
              message: `Đặt chỗ thành công! Mã đơn của bạn là ${bookingRes.bookingCode}.`,
              newBookingCode: bookingRes.bookingCode,
              branchName: state.branchName || "CoSpace Chi nhánh",
            } 
          });
        }
        setIsProcessing(false);
        return;
      }

      // 3. Request MoMo Sandbox Payment API & redirect to MoMo Gateway
      showToast('Đang chuyển hướng sang cổng thanh toán MoMo Sandbox...', 'info');
      const momoRes = await bookingApi.createMomoPayment(bookingRes.id, total);

      if (momoRes.payUrl && momoRes.payUrl.startsWith('http')) {
        window.location.href = momoRes.payUrl;
      } else {
        showToast('Đặt chỗ thành công!', 'success');
        navigate('/customer/history', { 
          state: { 
            message: `Đặt chỗ thành công! Mã đơn của bạn là ${bookingRes.bookingCode}.`,
            newBookingCode: bookingRes.bookingCode,
            branchName: state.branchName || "CoSpace Chi nhánh",
          } 
        });
      }

    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý đặt chỗ / thanh toán', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 font-sans animate-fade-in space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 px-4 py-2 font-semibold text-sm  tracking-tight rounded-3xl border border-border bg-card text-foreground shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all"
        >
          <FiChevronLeft className="h-5 w-5" /> Quay lại chọn chỗ
        </button>

        {/* Live Countdown Badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-3xl text-sm font-semibold font-mono  border border-border shadow-sm ${
          timeLeft < 180 ? 'bg-rose-500 text-white animate-pulse border-rose-600' : 'bg-muted text-foreground'
        }`}>
          <FiClock className="h-5 w-5" />
          <span>Giữ chỗ: {formatCountdown(timeLeft)}</span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-muted rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3"></div>
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold  text-white tracking-tight ">
              Thanh toán Đặt chỗ
            </h1>
            <p className="text-sm font-medium bg-muted text-foreground px-3 py-1.5 rounded-lg border border-border inline-block mt-3 shadow-sm">
              Kiểm tra thông tin và hoàn tất thanh toán.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Add-ons */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Workspace Summary Card */}
          <section className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              
              <div className="relative z-10">
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-white">
                  <FiMapPin className="text-slate-300 h-6 w-6" /> {workspace.name}
                </h2>
                <p className="text-sm font-medium text-slate-300 mt-2 flex flex-wrap gap-2 items-center">
                  <span className="bg-card/10 text-white px-2 py-1 rounded border border-white/10 text-[10px] tracking-tight">{workspaceType?.name || 'Không gian'}</span>
                  <span>·</span>
                  <span>Sức chứa: {workspace.capacity} chỗ</span>
                </p>
              </div>
              <span className="px-4 py-2 rounded-3xl text-lg font-semibold font-mono bg-card/10 text-white border border-white/10 relative z-10">
                {workspace.code}
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-card">
              <div className="space-y-2 p-4 bg-muted/50 rounded-3xl border border-border shadow-inner">
                <p className="text-[10px] text-foreground  tracking-tight font-semibold">
                  {isMultiDay ? 'Từ ngày' : 'Ngày sử dụng'}
                </p>
                <p className="flex items-center gap-3 font-semibold text-lg text-foreground">
                  <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiCalendar className="text-foreground h-5 w-5" /></div>
                  {date.toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-3xl border border-border shadow-inner">
                {isMultiDay ? (
                  <>
                    <p className="text-[10px] text-foreground tracking-tight font-semibold">Đến ngày</p>
                    <p className="flex items-center gap-3 font-semibold text-lg text-foreground">
                      <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiCalendar className="text-foreground h-5 w-5" /></div>
                      {endDate.toLocaleDateString('vi-VN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {unitCount} {bookingDurationUnit === 'week' ? 'tuần' : 'ngày'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-foreground  tracking-tight font-semibold">Khung giờ</p>
                    <div className="flex items-center gap-3 font-semibold text-lg text-foreground">
                      <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiClock className="text-foreground h-5 w-5" /></div>
                      <span>{String(startHour).padStart(2, '0')}:00 → {String(endHour).padStart(2, '0')}:00</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{unitCount} giờ</p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Add-ons List */}
          {Object.keys(services).length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-xl   text-foreground flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/300 rounded-full flex items-center justify-center text-white text-sm">{Object.keys(services).length}</div>
                Dịch vụ bổ sung
              </h3>
              <div className="space-y-4">
                {Object.keys(services).map(id => {
                  const service = MOCK_SERVICES.find(s => s.id === id);
                  if (!service) return null;
                  return (
                    <div key={service.id} className="flex items-center justify-between p-4 rounded-3xl border border-border bg-muted/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-3xl bg-card border border-border text-foreground flex items-center justify-center text-xl shadow-sm">
                          {service.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-foreground">{service.name}</p>
                          <p className="text-xs font-medium text-foreground/70  tracking-tight">{formatVND(service.price)} / lượt</p>
                        </div>
                      </div>
                      <span className="text-lg font-mono font-semibold px-4 py-2 rounded-3xl bg-slate-900 text-white border border-border shadow-sm">
                        + {formatVND(service.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Payment Method Selector */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-xl   text-foreground flex items-center gap-2">
              <FiCreditCard className="text-foreground" /> Phương thức thanh toán
            </h3>
            
            <div className="space-y-4">
              {/* PayOS VietQR Option */}
              <label className={`flex items-center justify-between p-4 rounded-3xl border-4 cursor-pointer transition-all ${
                paymentMethod === 'payos' ? 'border-[#0052cc] bg-blue-50/20 dark:bg-blue-950/20 shadow-sm' : 'border-border hover:-translate-y-1 hover:shadow-sm'
              }`}>
                <div className="flex items-center gap-4">
                  <input 
                    type="radio" 
                    name="payment" 
                    value="payos" 
                    checked={paymentMethod === 'payos'} 
                    onChange={() => setPaymentMethod('payos')} 
                    className="w-5 h-5 accent-[#0052cc]" 
                  />
                  <div className="h-12 w-12 rounded-3xl bg-[#0052cc] flex items-center justify-center shadow-sm text-white font-bold text-xs tracking-tight">
                    VietQR
                  </div>
                  <div>
                    <span className="font-semibold text-lg block text-foreground">Chuyển khoản VietQR</span>
                    <span className="text-xs font-medium text-foreground/70">Quét mã QR qua mọi ứng dụng ngân hàng (NAPAS 247) · Tự động xác nhận</span>
                  </div>
                </div>
                <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${paymentMethod === 'payos' ? 'bg-[#0052cc] border-[#0052cc] text-white' : 'border-border/50 text-transparent'}`}>
                  <FiCheckCircle className="h-5 w-5 font-semibold" />
                </div>
              </label>

              <label className={`flex items-center justify-between p-4 rounded-3xl border-4 cursor-pointer transition-all ${
                paymentMethod === 'momo' ? 'border-[#A50064] bg-muted/5 shadow-sm' : 'border-border hover:-translate-y-1 hover:shadow-sm'
              }`}>
                <div className="flex items-center gap-4">
                  <input 
                    type="radio" 
                    name="payment" 
                    value="momo" 
                    checked={paymentMethod === 'momo'} 
                    onChange={() => setPaymentMethod('momo')} 
                    className="w-5 h-5 accent-[#A50064]" 
                  />
                  <div className="h-12 w-12 rounded-3xl bg-[#A50064] flex items-center justify-center shadow-sm">
                    <span className="text-white font-semibold text-[10px] tracking-tight">MoMo</span>
                  </div>
                  <div>
                    <span className="font-semibold text-lg block text-foreground">Ví MoMo</span>
                    <span className="text-xs font-medium text-foreground/70">Thanh toán qua mã QR</span>
                  </div>
                </div>
                <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${paymentMethod === 'momo' ? 'bg-[#A50064] border-[#A50064] text-white' : 'border-border/50 text-transparent'}`}>
                  <FiCheckCircle className="h-5 w-5 font-semibold" />
                </div>
              </label>

              <label className={`flex items-center justify-between p-4 rounded-3xl border-4 cursor-pointer transition-all ${
                paymentMethod === 'cash' ? 'border-emerald-500 bg-muted/5 shadow-sm' : 'border-border hover:-translate-y-1 hover:shadow-sm'
              }`}>
                <div className="flex items-center gap-4">
                  <input 
                    type="radio" 
                    name="payment" 
                    value="cash" 
                    checked={paymentMethod === 'cash'} 
                    onChange={() => setPaymentMethod('cash')} 
                    className="w-5 h-5 accent-emerald-500" 
                  />
                  <div className="h-12 w-12 rounded-3xl bg-emerald-500 flex items-center justify-center shadow-sm">
                    <span className="text-white font-semibold text-[10px] tracking-tight">CASH</span>
                  </div>
                  <div>
                    <span className="font-semibold text-lg block text-foreground">Tiền mặt tại quầy</span>
                    <span className="text-xs font-medium text-foreground/70">Thanh toán trực tiếp khi đến nơi</span>
                  </div>
                </div>
                <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border/50 text-transparent'}`}>
                  <FiCheckCircle className="h-5 w-5 font-semibold" />
                </div>
              </label>
              
              <div className="p-4 rounded-3xl bg-muted/50 border border-border text-sm font-medium text-foreground flex items-start gap-3 shadow-inner">
                <FiLock className="h-6 w-6 shrink-0 text-foreground mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-foreground ">Bảo vệ giao dịch:</strong> Đơn đặt chỗ của bạn được giữ tự động trong <strong className="text-rose-500 text-base">15 phút</strong>. Vui lòng thanh toán trước khi hết giờ.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary Telemetry */}
        <div>
          <div className="rounded-3xl border border-border bg-card sticky top-24 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-slate-900 flex items-center justify-between relative">
              
              <h3 className="font-semibold text-xl tracking-tight text-white relative z-10">
                Hóa đơn
              </h3>
              <span className="px-3 py-1 bg-rose-500 text-white font-semibold font-mono text-xs tracking-tight rounded-lg shadow-sm animate-pulse relative z-10">LIVE</span>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-3xl border border-border">
                <div className="flex justify-between items-center text-sm font-medium text-foreground/70">
                  <span className="">Tiền thuê ({formatVND(basePrice)}) × {unitCount}{bookingDurationUnit === 'week' ? ' tuần' : bookingDurationUnit === 'day' ? ' ngày' : 'h'}</span>
                  <span className="font-semibold text-foreground font-mono text-lg">{formatVND(subtotal)}</span>
                </div>
                
                {addonTotal > 0 && (
                  <div className="flex justify-between items-center text-sm font-medium text-foreground/70 border-t border-border/10 pt-2 mt-2">
                    <span className="">Dịch vụ cộng thêm</span>
                    <span className="font-semibold text-foreground font-mono text-lg">+{formatVND(addonTotal)}</span>
                  </div>
                )}
              </div>
              
              <div className="pt-6 border-t border-border border-dashed">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="font-semibold text-lg block text-foreground ">Tổng cộng</span>
                    <span className="text-[10px] font-medium text-foreground/50  tracking-tight">Đã bao gồm VAT</span>
                  </div>
                  <span className="font-semibold text-3xl text-foreground font-mono">{formatVND(total)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 space-y-4">
              <button 
                onClick={handleCreateBooking} 
                disabled={isProcessing || timeLeft <= 0}
                className={`w-full py-5 text-lg font-semibold tracking-tight border border-border rounded-3xl shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all flex justify-center items-center gap-3 ${
                  isProcessing || timeLeft <= 0 ? 'bg-gray-600 text-white opacity-50 cursor-not-allowed' : 'bg-[#A50064] text-white hover:bg-[#8A0053]'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border-4 border-white border-t-transparent animate-spin" />
                    <span>Đang xử lý...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="h-6 w-6 font-semibold" />
                    <span>Thanh toán ngay</span>
                  </div>
                )}
              </button>
              <p className="text-xs text-center font-medium text-white/60 leading-relaxed px-4">
                Bằng việc thanh toán, bạn đồng ý với <span className="text-[#A50064] underline decoration-2 underline-offset-2">Chính sách CoSpace</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCheckoutPage;
