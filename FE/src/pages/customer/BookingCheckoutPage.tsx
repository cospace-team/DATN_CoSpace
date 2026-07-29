import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiChevronLeft, FiMapPin, FiCalendar, FiClock,
  FiCheckCircle, FiCoffee, FiMonitor, FiPrinter,
  FiAlertTriangle, FiMaximize, FiLock, FiExternalLink, FiX, FiCreditCard
} from 'react-icons/fi';
import { formatVND, durationUnitLabel } from '../../utils/formatters';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { bookingApi } from '../../lib/bookingApi';
import { useToast } from '../../components/Toast';

const MOCK_SERVICES = [
  { id: 'coffee', name: 'Cà phê rang xay', price: 35000, icon: <FiCoffee /> },
  { id: 'lunch', name: 'Cơm trưa văn phòng', price: 55000, icon: <FiCoffee /> },
  { id: 'monitor', name: 'Màn hình phụ 24"', price: 50000, icon: <FiMonitor /> },
  { id: 'printing', name: 'In ấn (50 trang)', price: 20000, icon: <FiPrinter /> },
];

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
  const services = state?.services || {};
  const basePrice = state?.price?.price || 0;
  const durationUnit = state?.price?.duration_unit || 'hour';
  const subtotal = state?.subtotal || 0;
  const addonTotal = state?.addonTotal || 0;
  const total = state?.total || 0;

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'momo'>('momo');
  
  // 15-Minute Expiration Countdown
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 900 seconds

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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

  const duration = Math.max(1, endHour - startHour);

  const handleCreateBooking = async () => {
    setIsProcessing(true);
    try {
      // 1. Send API booking request
      const startAtDate = new Date(date);
      startAtDate.setHours(startHour, 0, 0, 0);
      const endAtDate = new Date(date);
      endAtDate.setHours(endHour, 0, 0, 0);

      const bookingRes = await bookingApi.createBooking({
        branchId: workspace.branch_id || '7c27278b-eeba-462f-9720-23849d1c3703',
        workspaceId: workspace.id,
        workspaceTypeId: workspace.workspace_type_id,
        startAt: startAtDate.toISOString(),
        endAt: endAtDate.toISOString(),
        unit: 'hour',
        unitCount: duration,
        services,
        source: 'web',
      });

      // 2. Request MoMo Sandbox Payment API & redirect directly to MoMo Gateway page
      const momoRes = await bookingApi.createMomoPayment(bookingRes.id, total);

      if (momoRes.payUrl && momoRes.payUrl.startsWith('http')) {
        showToast('Đang chuyển hướng sang cổng thanh toán MoMo Sandbox...', 'info');
        window.location.href = momoRes.payUrl;
      } else {
        // Fallback for offline/mock mode
        showToast('Đặt chỗ thành công (Chế độ Sandbox)!', 'success');
        navigate('/customer/history', { 
          state: { 
            message: `Đặt chỗ thành công! Mã đơn của bạn là ${bookingRes.bookingCode}.`,
            newBookingCode: bookingRes.bookingCode,
          } 
        });
      }

    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý thanh toán MoMo', 'error');
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
                <p className="text-[10px] text-foreground  tracking-tight font-semibold">Ngày sử dụng</p>
                <p className="flex items-center gap-3 font-semibold text-lg text-foreground">
                  <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiCalendar className="text-foreground h-5 w-5" /></div>
                  {date.toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-3xl border border-border shadow-inner">
                <p className="text-[10px] text-foreground  tracking-tight font-semibold">Khung giờ</p>
                <div className="flex items-center gap-3 font-semibold text-lg text-foreground">
                  <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiClock className="text-foreground h-5 w-5" /></div>
                  <span>{String(startHour).padStart(2, '0')}:00 → {String(endHour).padStart(2, '0')}:00</span>
                </div>
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
                  <span className="">Tiền thuê ({formatVND(basePrice)}) × {duration}h</span>
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
