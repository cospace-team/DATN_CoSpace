import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiCalendar, FiClock, FiMapPin, FiX, FiCheckCircle,
  FiAlertCircle, FiMaximize, FiCoffee, FiDownload, FiRefreshCw
} from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { formatVND } from '../../utils/formatters';
import { bookingApi, type BookingResponse } from '../../lib/bookingApi';

// Initial Mock Bookings
const MOCK_BOOKINGS = [
  {
    id: 'b1',
    code: 'WH-8823',
    workspaceName: 'Hot Desk HD-01',
    branchName: 'CoSpace Chi nhánh Quận 1',
    date: new Date(),
    startTime: '09:00',
    endTime: '11:00',
    status: 'confirmed',
    totalAmount: 100000,
    paymentMethod: 'momo',
  },
  {
    id: 'b2',
    code: 'WH-5512',
    workspaceName: 'Phòng họp Meeting Lotus',
    branchName: 'CoSpace Chi nhánh Quận 3',
    date: new Date(Date.now() - 86400000 * 2),
    startTime: '14:00',
    endTime: '16:00',
    status: 'completed',
    totalAmount: 450000,
    paymentMethod: 'momo',
  },
  {
    id: 'b3',
    code: 'WH-9911',
    workspaceName: 'Văn phòng riêng Private Bamboo',
    branchName: 'CoSpace Chi nhánh Quận 1',
    date: new Date(Date.now() + 86400000 * 5),
    startTime: '08:00',
    endTime: '18:00',
    status: 'confirmed',
    totalAmount: 1200000,
    paymentMethod: 'momo',
  },
];

const BookingHistoryPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'canceled'>('upcoming');
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(state?.message || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState(MOCK_BOOKINGS);
  const [loading, setLoading] = useState(false);

  // Parse MoMo Return URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resultCode = params.get('resultCode');
    const message = params.get('message');
    
    if (resultCode !== null) {
      if (resultCode === '0') {
        setSuccessMessage(message || 'Thanh toán MoMo thành công!');
      } else {
        setErrorMessage(message || 'Thanh toán MoMo thất bại hoặc người dùng đã hủy giao dịch.');
      }
      // Clean up URL without reloading the page
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.search]);

  // Sync state if redirected from checkout page with a new booking
  useEffect(() => {
    if (state?.newBookingCode) {
      const newBooking = {
        id: 'b-new-' + Date.now(),
        code: state.newBookingCode,
        workspaceName: 'Chỗ ngồi vừa đặt',
        branchName: 'CoSpace Chi nhánh Quận 1',
        date: new Date(),
        startTime: 'Hôm nay',
        endTime: 'Theo giờ đặt',
        status: 'confirmed',
        totalAmount: 100000,
        paymentMethod: 'momo',
      };
      setBookings((prev) => [newBooking, ...prev]);
    }
  }, [state]);

  // Load real API bookings if available
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const apiBookings = await bookingApi.getMyBookings();
        if (apiBookings && apiBookings.length > 0) {
          const mapped = apiBookings.map((b) => ({
            id: b.id,
            code: b.bookingCode,
            workspaceName: `Chỗ ngồi ${b.workspaceId.slice(0, 6)}`,
            branchName: 'CoSpace Chi nhánh',
            date: new Date(b.startAt),
            startTime: new Date(b.startAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(b.endAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: b.status,
            totalAmount: b.totalAmount,
            paymentMethod: 'momo',
          }));
          setBookings(mapped);
        }
      } catch (err) {
        console.warn('Using default mock bookings list');
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const getFilteredBookings = () => {
    return bookings.filter((b) => {
      if (activeTab === 'canceled') return b.status === 'canceled' || b.status === 'expired';
      if (activeTab === 'upcoming') return b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'pending_payment';
      return b.status === 'completed';
    });
  };

  const handleCancel = () => {
    if (!showCancelModal) return;

    setBookings((prev) =>
      prev.map((b) => (b.id === showCancelModal ? { ...b, status: 'canceled' } : b))
    );

    setShowCancelModal(null);
    setSuccessMessage('Yêu cầu hủy đơn đặt chỗ thành công.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const selectedCancelBooking = bookings.find((b) => b.id === showCancelModal);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 font-sans animate-fade-in">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 mb-10 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-700 rounded-full mix-blend-screen filter blur-3xl opacity-30 translate-x-1/3 -translate-y-1/3"></div>
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Quản lý Đặt chỗ
            </h1>
            <p className="text-sm font-medium bg-card/10 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 inline-block mt-3">
              Theo dõi mã QR, lịch sử và trạng thái booking của bạn.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-8 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-3 animate-fade-scale-in shadow-sm">
          <FiCheckCircle className="h-6 w-6 shrink-0 text-emerald-600" />
          <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-400 tracking-tight">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-8 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 flex items-center gap-3 animate-fade-scale-in shadow-sm">
          <FiAlertCircle className="h-6 w-6 shrink-0 text-rose-600" />
          <span className="font-semibold text-sm text-rose-800 dark:text-rose-400 tracking-tight">{errorMessage}</span>
        </div>
      )}

      {/* Block-based Navigation Tabs */}
      <div className="flex flex-wrap gap-4 mb-8">
        {[
          { id: 'upcoming', label: 'Sắp tới', icon: FiClock, color: '#F59E0B' },
          { id: 'past', label: 'Hoàn thành', icon: FiCheckCircle, color: '#22C55E' },
          { id: 'canceled', label: 'Đã hủy', icon: FiX, color: '#EF4444' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm tracking-tight rounded-full border border-border transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm -translate-y-1' 
                  : 'bg-card text-foreground shadow-sm hover:-translate-y-1 hover:shadow-sm'
              }`}
            >
              <Icon className="h-5 w-5" style={{ color: isActive ? tab.color : 'inherit' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      <div className="space-y-6">
        {getFilteredBookings().length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-muted/50 p-6">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mx-auto text-foreground mb-6 ">
              <FiCalendar className="h-10 w-10" />
            </div>
            <p className="text-lg font-semibold  text-foreground">Chưa có dữ liệu</p>
            <p className="text-sm font-medium text-foreground/70 mt-2">Không có đơn đặt chỗ nào trong danh mục này.</p>
          </div>
        ) : (
          getFilteredBookings().map((booking) => (
            <div
              key={booking.id}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row gap-6 transition-all shadow-sm hover:-translate-y-1 hover:shadow-sm"
            >
              {/* Left Details */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 text-xs font-semibold font-mono rounded-lg bg-slate-900 text-white border border-border shadow-sm">
                    {booking.code}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold  rounded-lg border border-border shadow-sm ${
                      booking.status === 'confirmed'
                        ? 'bg-muted text-foreground'
                        : booking.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-rose-100 text-rose-900'
                    }`}
                  >
                    {booking.status === 'confirmed'
                      ? '● Đã xác nhận'
                      : booking.status === 'completed'
                      ? '✓ Hoàn thành'
                      : '× Đã hủy'}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl md:text-2xl font-semibold  text-foreground">{booking.workspaceName}</h3>
                  <p className="text-sm font-medium text-foreground/70 flex items-center gap-2 mt-1">
                    <FiMapPin className="h-4 w-4 text-foreground" /> {booking.branchName}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm bg-muted/50 p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-card border border-border rounded-md"><FiCalendar className="text-muted-foreground h-4 w-4" /></div>
                    <span className="font-semibold text-foreground">
                      {booking.date instanceof Date
                        ? booking.date.toLocaleDateString('vi-VN')
                        : String(booking.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-card border border-border rounded-md"><FiClock className="text-muted-foreground h-4 w-4" /></div>
                    <span className="font-semibold text-foreground">
                      {booking.startTime} → {booking.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full mt-2 pt-2 border-t border-border">
                    <span className="font-semibold text-xs tracking-tight text-muted-foreground">Tổng tiền:</span>
                    <span className="font-semibold text-foreground font-mono text-lg ml-auto">
                      {formatVND(booking.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Quick Actions */}
              <div className="flex flex-row md:flex-col items-center justify-center gap-3 border-t-4 md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-6 min-w-[180px]">
                {booking.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => setShowQrModal(booking)}
                      className="w-full py-3 bg-slate-900 text-white font-semibold tracking-tight border border-border rounded-full shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all flex justify-center items-center gap-2 text-xs"
                    >
                      <FiMaximize className="h-4 w-4" /> Mã QR Pass
                    </button>
                    <button
                      className="w-full py-3 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:bg-red-50 dark:bg-red-950/30 dark:bg-red-950/30 hover:text-red-700 hover:border-red-200 dark:border-red-900/50 dark:border-red-900/50 transition-colors flex justify-center items-center gap-2 text-xs"
                      onClick={() => setShowCancelModal(booking.id)}
                    >
                      <FiX className="h-4 w-4" /> Hủy đặt chỗ
                    </button>
                  </>
                )}
                {booking.status === 'completed' && (
                  <button className="w-full py-3 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:bg-muted/50 transition-colors text-xs">
                    Đặt lại chỗ này
                  </button>
                )}
                {booking.status === 'canceled' && (
                  <div className="bg-muted/50 p-3 rounded-2xl border border-border border-dashed text-center w-full">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Đã hoàn tiền theo quy định
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* QR Check-in Pass Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-scale-in">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-sm p-8 text-center relative">
            <button
              onClick={() => setShowQrModal(null)}
              className="absolute -top-4 -right-4 h-12 w-12 rounded-full border border-border bg-slate-900 text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
            >
              <FiX className="h-6 w-6 font-semibold" />
            </button>

            <div className="mb-6">
              <span className="px-4 py-2 rounded-full text-xs font-mono font-semibold bg-slate-900 text-white border border-border inline-block mb-4 shadow-sm -rotate-2">
                MÃ CHECK-IN: {showQrModal.code}
              </span>
              <h3 className="text-2xl font-semibold  text-foreground ">{showQrModal.workspaceName}</h3>
              <p className="text-sm font-medium text-foreground/70 mt-2 bg-muted/50 inline-flex px-3 py-1 rounded-lg border border-border">{showQrModal.branchName}</p>
            </div>

            {/* QR Image */}
            <div className="p-4 bg-card rounded-2xl border border-border inline-block shadow-sm mb-6 ">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=CHECKIN_${showQrModal.code}`}
                alt="QR Pass"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="bg-muted/50 p-4 rounded-2xl border border-border border-dashed mb-6">
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                Đưa mã QR này cho lễ tân tại quầy hoặc máy quét kiosk để làm thủ tục <strong className="text-foreground">Check-in</strong>.
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-4 rounded-full bg-slate-900 text-white font-semibold tracking-tight border border-border shadow-sm hover:translate-y-1 hover:shadow-none transition-all"
            >
              Đóng thẻ
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedCancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-scale-in">
          <div className="bg-card rounded-3xl max-w-md w-full border border-border shadow-sm p-8 relative overflow-hidden">
            {/* Warning Tape Decoration */}
            <div className="absolute top-0 left-0 w-full h-4 bg-[repeating-linear-gradient(45deg,#F59E0B,#F59E0B_10px,#0F172A_10px,#0F172A_20px)] border-b border-border"></div>
            
            <div className="flex items-center gap-4 text-foreground mt-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border shadow-sm flex items-center justify-center shrink-0 text-white ">
                <FiAlertCircle className="h-8 w-8 font-semibold" />
              </div>
              <h2 className="text-2xl font-semibold   text-foreground">Hủy đặt chỗ?</h2>
            </div>

            <p className="text-sm font-medium text-foreground leading-relaxed mb-6">
              Bạn đang yêu cầu hủy đơn <span className="bg-slate-900 text-white px-2 py-0.5 rounded border border-border font-mono">{selectedCancelBooking.code}</span> tại <strong>{selectedCancelBooking.workspaceName}</strong>.
            </p>

            <div className="bg-muted/50 rounded-2xl p-5 border border-border space-y-3 mb-8 shadow-inner relative">
              <div className="absolute -top-3 right-4 bg-card border border-border px-2 py-0.5 rounded text-[10px] font-semibold  text-foreground">Chính sách</div>
              <div className="flex justify-between text-sm font-medium text-foreground/80 pt-2">
                <span>Tổng giá trị đơn:</span>
                <span className="font-mono">{formatVND(selectedCancelBooking.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-foreground">
                <span>Phí hủy (20%):</span>
                <span className="font-mono">-{formatVND(selectedCancelBooking.totalAmount * 0.2)}</span>
              </div>
              <div className="pt-3 border-t border-border/10 flex justify-between font-semibold text-lg text-foreground">
                <span>Hoàn tiền thực nhận:</span>
                <span className="font-mono">{formatVND(selectedCancelBooking.totalAmount * 0.8)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                className="flex-1 py-4 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:bg-muted/50 transition-colors"
                onClick={() => setShowCancelModal(null)}
              >
                Quay lại
              </button>
              <button
                className="flex-1 py-4 bg-red-600 text-white font-semibold tracking-tight border border-red-700 rounded-full shadow-sm hover:-translate-y-1 hover:shadow-md transition-all"
                onClick={handleCancel}
              >
                Đồng ý Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistoryPage;
