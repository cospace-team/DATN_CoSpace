import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FiHash, FiCheckCircle, FiAlertCircle, FiLogOut, FiClock, 
  FiInbox, FiSearch, FiUser, FiMapPin, FiCalendar, FiDollarSign, 
  FiCheck, FiAlertTriangle, FiRefreshCw, FiX, FiTag, FiPhone, FiInfo,
  FiCamera, FiUsers, FiArrowRight, FiCoffee
} from 'react-icons/fi';
import { formatTime, formatDate, bookingStatusLabel, bookingStatusColor } from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLocation } from 'react-router-dom';
import { staffApi, BookingWithDetailsDto, BranchTodayBookingDto } from '../../api/staffApi';
import { useAuth } from '../../context/AuthContext';
import QrScannerModal from '../../components/QrScannerModal';
import BookingTabPanel from '../../components/staff/BookingTabPanel';
import type { BookingTabDto } from '../../api/addonApi';

import { BookingPackageDisplay, getBookingPackageDisplay } from '../../utils/bookingPackage';

export type { BookingPackageDisplay };
export { getBookingPackageDisplay };

export interface CheckinItemMeta {
  durationMinutes: number;
  remainingMinutes: number;
  timeStatus: 'valid' | 'near_expiry' | 'overdue';
  overdueMinutes: number;
  durationFormatted: string;
  remainingFormatted: string;
  isCheckedInToday: boolean;
  pkg: BookingPackageDisplay;
}

export type BookingWithMeta = BookingWithDetailsDto & {
  meta: CheckinItemMeta;
};

const CheckInPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const branchId = user?.branchId || '';
  const branchName = user?.branchName || '';
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchedBooking, setSearchedBooking] = useState<BookingWithDetailsDto | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Chế độ xem: Khách đang ngồi vs Lịch trình khách hôm nay
  const [activeView, setActiveView] = useState<'seated' | 'today_schedule'>('seated');
  const [branchBookingsToday, setBranchBookingsToday] = useState<BranchTodayBookingDto[]>([]);
  const [scheduleTab, setScheduleTab] = useState<'all' | 'incoming' | 'seated' | 'completed'>('all');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const [activeCheckins, setActiveCheckins] = useState<BookingWithDetailsDto[]>([]);
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'near_expiry' | 'overdue'>('all');

  // Real-time Clock (cập nhật mỗi 10 giây)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Modal Check-out State
  const [selectedCheckoutItem, setSelectedCheckoutItem] = useState<BookingWithMeta | null>(null);
  const [checkoutNote, setCheckoutNote] = useState('');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  // Running tab of the guest being checked out: checkout stays blocked while anything is owed.
  const [checkoutTab, setCheckoutTab] = useState<BookingTabDto | null>(null);
  // Guest whose running tab is open from the seated list.
  const [tabItem, setTabItem] = useState<BookingWithMeta | null>(null);

  // QR Scanner Modal State
  const [showQrScanner, setShowQrScanner] = useState(false);

  // Ticker đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!branchId) return;
    try {
      setRefreshing(true);
      const [checkins, todayBookings] = await Promise.all([
        staffApi.getActiveCheckins(branchId),
        staffApi.getBranchTodayBookings(branchId)
      ]);
      setActiveCheckins(checkins);
      setBranchBookingsToday(todayBookings);
    } catch (error) {
      console.error('Failed to fetch checkin/schedule data', error);
    } finally {
      setRefreshing(false);
    }
  }, [branchId]);

  const fetchActiveCheckins = fetchDashboardData;

  // Tự động load dữ liệu và refresh định kỳ mỗi 60 giây
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Tự động nhận mã code nếu được điều hướng từ Dashboard sang
  useEffect(() => {
    const state = location.state as { bookingCode?: string };
    if (state?.bookingCode) {
      setCode(state.bookingCode);
      handleSearchTicket(state.bookingCode);
    }
  }, [location]);

  // Số lượng theo trạng thái lịch trình hôm nay
  const todayCounts = useMemo(() => {
    return {
      all: branchBookingsToday.length,
      incoming: branchBookingsToday.filter(b => b.status === 'CONFIRMED').length,
      seated: branchBookingsToday.filter(b => b.status === 'CHECKED_IN').length,
      completed: branchBookingsToday.filter(b => b.status === 'COMPLETED').length,
    };
  }, [branchBookingsToday]);



  // Lọc danh sách lịch trình hôm nay
  const filteredTodayBookings = useMemo(() => {
    return branchBookingsToday.filter(b => {
      if (scheduleTab === 'incoming' && b.status !== 'CONFIRMED') return false;
      if (scheduleTab === 'seated' && b.status !== 'CHECKED_IN') return false;
      if (scheduleTab === 'completed' && b.status !== 'COMPLETED') return false;

      if (scheduleSearch.trim()) {
        const q = scheduleSearch.toLowerCase().trim();
        const pkg = getBookingPackageDisplay(b);
        const matchName = b.customerName?.toLowerCase().includes(q);
        const matchPhone = b.customerPhone?.toLowerCase().includes(q);
        const matchCode = b.bookingCode?.toLowerCase().includes(q);
        const matchWs = b.workspaceName?.toLowerCase().includes(q);
        const matchType = pkg.packageType.toLowerCase().includes(q);
        return matchName || matchPhone || matchCode || matchWs || matchType;
      }
      return true;
    });
  }, [branchBookingsToday, scheduleTab, scheduleSearch]);

  const handleSelectBookingForCheckin = (bookingCode: string) => {
    setCode(bookingCode);
    handleSearchTicket(bookingCode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tìm kiếm & kiểm tra vé trước khi Check-in
  const handleSearchTicket = async (inputCode: string) => {
    if (!inputCode.trim()) return;
    setLoading(true);
    setSearchError(null);
    setSuccessMessage(null);
    setSearchedBooking(null);

    try {
      const bkDetails = await staffApi.getBookingByCode(inputCode.trim(), branchId);
      setSearchedBooking(bkDetails);

      const now = Date.now();
      const startAtMs = new Date(bkDetails.booking.startAt).getTime();
      const endAtMs = new Date(bkDetails.booking.endAt).getTime();
      const isMultiDayPass = bkDetails.booking.isContract 
        || bkDetails.booking.unit === 'week' 
        || bkDetails.booking.unit === 'month' 
        || (bkDetails.booking.unit === 'day' && (bkDetails.booking.unitCount || 1) > 1);

      if (bkDetails.alreadyCheckedIn) {
        setSearchError('Khách hàng này đã được Check-in và hiện đang ở trong không gian!');
      } else if (bkDetails.booking.status !== 'CONFIRMED' && (!isMultiDayPass || bkDetails.booking.status !== 'CHECKED_IN')) {
        setSearchError(`Vé này đang ở trạng thái "${bookingStatusLabel[bkDetails.booking.status?.toLowerCase()] || bkDetails.booking.status}", không thể Check-in.`);
      } else if (!isMultiDayPass && now < startAtMs - 30 * 60 * 1000) {
        setSearchError(`Chưa đến giờ Check-in! Khách chỉ được Check-in sớm tối đa 30 phút trước giờ bắt đầu (${formatTime(bkDetails.booking.startAt)}).`);
      } else if (isMultiDayPass && now < startAtMs - 30 * 60 * 1000 && new Date(bkDetails.booking.startAt).toDateString() === new Date(now).toDateString()) {
        setSearchError(`Chưa đến giờ Check-in ngày đầu tiên (${formatTime(bkDetails.booking.startAt)}).`);
      } else if (!isMultiDayPass && now > endAtMs) {
        setSearchError(`Vé đặt chỗ đã quá hạn giờ kết thúc (${formatTime(bkDetails.booking.endAt)}). Không thể Check-in.`);
      } else if (isMultiDayPass && now > endAtMs) {
        setSearchError(`Gói đặt chỗ dài hạn đã hết hạn (${formatTime(bkDetails.booking.endAt)}). Không thể Check-in.`);
      }
    } catch (error: any) {
      setSearchError('Mã đặt chỗ không tồn tại hoặc không thuộc chi nhánh này. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận Check-in cho khách vào
  const handleConfirmCheckin = async () => {
    if (!searchedBooking || searchedBooking.alreadyCheckedIn) return;
    setLoading(true);
    setSearchError(null);

    try {
      await staffApi.checkin(searchedBooking.booking.id, 'Check-in tại quầy');
      setSuccessMessage(`✅ Check-in thành công! Mời khách hàng ${searchedBooking.customer?.fullName || ''} vào vị trí ${searchedBooking.workspace?.name || ''}.`);
      setSearchedBooking(null);
      setCode('');
      await fetchActiveCheckins();
    } catch (error: any) {
      setSearchError(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi Check-in');
    } finally {
      setLoading(false);
    }
  };

  // Mở modal Check-out
  const openCheckoutModal = (ci: BookingWithMeta) => {
    setSelectedCheckoutItem(ci);
    setCheckoutNote('');
    setCheckoutTab(null);
  };


  // Xác nhận Check-out giải phóng bàn
  const handleConfirmCheckout = async () => {
    if (!selectedCheckoutItem?.activeCheckin?.id) return;
    setCheckoutSubmitting(true);

    try {
      await staffApi.checkout(selectedCheckoutItem.activeCheckin.id, checkoutNote);
      setSuccessMessage(`✅ Đã Check-out và giải phóng vị trí "${selectedCheckoutItem.workspace?.name}" thành công!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setSelectedCheckoutItem(null);
      setCheckoutNote('');
      await fetchActiveCheckins();
    } catch (error: any) {
      console.error('Failed to checkout', error);
      alert(error.response?.data?.message || 'Lỗi khi thực hiện Check-out');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Hàm format phút thành chuỗi đọc được (ví dụ: 1h 25p hoặc 45 phút)
  const formatMinutes = (totalMinutes: number): string => {
    if (totalMinutes < 60) return `${totalMinutes} phút`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  // Tính toán trạng thái thời gian thực cho từng khách đang ngồi
  const checkinsWithMeta = useMemo(() => {
    return activeCheckins.map(ci => {
      const checkinTime = new Date(ci.activeCheckin?.checkinAt || ci.booking?.startAt).getTime();
      const checkinDate = new Date(checkinTime);
      const currDate = new Date(currentTime);
      const isCheckedInToday = checkinDate.toDateString() === currDate.toDateString();
      const endAtTime = new Date(ci.booking?.endAt).getTime();
      const pkg = getBookingPackageDisplay(ci.booking || {});

      const durationMinutes = Math.max(0, Math.floor((currentTime - checkinTime) / 60000));
      const remainingMinutes = Math.floor((endAtTime - currentTime) / 60000);

      let timeStatus: 'valid' | 'near_expiry' | 'overdue' = 'valid';
      let overdueMinutes = 0;
      let remainingFormatted = '';

      let durationFormatted = '';
      if (isCheckedInToday) {
        durationFormatted = formatMinutes(durationMinutes);
      } else {
        const daysAgo = Math.floor(durationMinutes / 1440);
        durationFormatted = daysAgo > 0 
          ? `${daysAgo} ngày trước (${formatTime(ci.activeCheckin?.checkinAt || '')})` 
          : `${formatMinutes(durationMinutes)} (từ hôm trước)`;
      }

      if (pkg.isMultiDay) {
        // Hết hạn toàn bộ gói
        if (remainingMinutes < 0) {
          timeStatus = 'overdue';
          overdueMinutes = Math.abs(remainingMinutes);
          remainingFormatted = `Hết hạn gói ${formatMinutes(overdueMinutes)}`;
        } else {
          // Kiểm tra ca hôm nay (giờ kết thúc trong ngày)
          const endAtDate = new Date(ci.booking?.endAt);
          const dailyEndMinutes = (endAtDate.getHours() || 20) * 60 + (endAtDate.getMinutes() || 0);
          const currentMinutesOfDay = currDate.getHours() * 60 + currDate.getMinutes();
          const todayRemainingMinutes = dailyEndMinutes - currentMinutesOfDay;

          const daysLeft = Math.ceil(remainingMinutes / (24 * 60));
          const daysText = daysLeft > 1 ? `Gói còn ${daysLeft} ngày` : 'Ngày cuối gói';

          if (todayRemainingMinutes < 0) {
            timeStatus = 'overdue';
            overdueMinutes = Math.abs(todayRemainingMinutes);
            remainingFormatted = `Quá ca ${formatMinutes(overdueMinutes)} · ${daysText}`;
          } else if (todayRemainingMinutes <= 15) {
            timeStatus = 'near_expiry';
            remainingFormatted = `Còn ${formatMinutes(todayRemainingMinutes)} ca hôm nay · ${daysText}`;
          } else {
            timeStatus = 'valid';
            remainingFormatted = `${daysText} · Ca đến ${formatTime(ci.booking?.endAt)}`;
          }
        }
      } else {
        if (remainingMinutes < 0) {
          timeStatus = 'overdue';
          overdueMinutes = Math.abs(remainingMinutes);
          remainingFormatted = `Quá ${formatMinutes(overdueMinutes)}`;
        } else if (remainingMinutes <= 15) {
          timeStatus = 'near_expiry';
          remainingFormatted = `Còn ${formatMinutes(remainingMinutes)}`;
        } else {
          timeStatus = 'valid';
          remainingFormatted = `Còn ${formatMinutes(remainingMinutes)}`;
        }
      }

      return {
        ...ci,
        meta: {
          durationMinutes,
          remainingMinutes,
          timeStatus,
          overdueMinutes,
          durationFormatted,
          remainingFormatted,
          isCheckedInToday,
          pkg,
        }
      };
    });
  }, [activeCheckins, currentTime]);

  // Bộ đếm theo từng nhóm trạng thái
  const counts = useMemo(() => {
    return {
      all: checkinsWithMeta.length,
      valid: checkinsWithMeta.filter(c => c.meta.timeStatus === 'valid').length,
      near_expiry: checkinsWithMeta.filter(c => c.meta.timeStatus === 'near_expiry').length,
      overdue: checkinsWithMeta.filter(c => c.meta.timeStatus === 'overdue').length,
    };
  }, [checkinsWithMeta]);

  // Lọc danh sách hiển thị theo Tab & Từ khóa tìm kiếm
  const filteredActiveCheckins = useMemo(() => {
    return checkinsWithMeta.filter(ci => {
      // Lọc theo Tab
      if (activeTab === 'valid' && ci.meta.timeStatus !== 'valid') return false;
      if (activeTab === 'near_expiry' && ci.meta.timeStatus !== 'near_expiry') return false;
      if (activeTab === 'overdue' && ci.meta.timeStatus !== 'overdue') return false;

      // Lọc theo từ khóa tìm kiếm
      if (!filterText.trim()) return true;
      const query = filterText.toLowerCase().trim();
      const matchName = ci.customer?.fullName?.toLowerCase().includes(query);
      const matchPhone = ci.customer?.phone?.toLowerCase().includes(query);
      const matchCode = ci.booking?.bookingCode?.toLowerCase().includes(query);
      const matchWs = ci.workspace?.name?.toLowerCase().includes(query);
      const matchType = ci.meta.pkg?.packageType?.toLowerCase().includes(query);
      return matchName || matchPhone || matchCode || matchWs || matchType;
    });
  }, [checkinsWithMeta, activeTab, filterText]);

  // Format giờ hiện tại cho đồng hồ live
  const currentClockStr = useMemo(() => {
    const d = new Date(currentTime);
    return d.toLocaleTimeString('vi-VN', { hour12: false });
  }, [currentTime]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 lg:pb-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading">Kiểm tra & Xác nhận Check-in</h1>
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold border border-primary/20 flex items-center gap-1.5">
              <FiMapPin className="h-3.5 w-3.5" /> {branchName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Theo dõi khách hàng đang có mặt tại không gian và quản lý ra vào theo thời gian thực</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/60 border border-border px-3.5 py-2 rounded-xl text-xs font-mono font-bold shadow-inner">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
            <FiClock className="h-4 w-4 text-primary" />
            <span>{currentClockStr}</span>
          </div>
          <button 
            onClick={() => fetchActiveCheckins()} 
            disabled={refreshing}
            title="Làm mới danh sách"
            className="btn btn-outline !p-2.5 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <FiRefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Thông báo thành công */}
      {successMessage && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3 shadow-sm animate-slide-in-up">
          <FiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">{successMessage}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Khu vực Nhập mã Code (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col">
            <div className="space-y-4 py-2">
              <div className="text-center mb-6">
                <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <FiHash className="h-8 w-8" />
                </div>
                <h2 className="font-bold text-lg">Nhập mã đặt chỗ (Booking Code)</h2>
                <p className="text-xs text-muted-foreground mt-1">Quét QR hoặc nhập mã 6 ký tự trên vé của khách</p>
              </div>
              
              <div className="relative">
                <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => {
                    let val = e.target.value.toUpperCase();
                    // Auto-detect CHECKIN_ prefix (from gun scanner pasting QR data)
                    if (val.startsWith('CHECKIN_')) {
                      val = val.substring('CHECKIN_'.length);
                    }
                    setCode(val);
                  }} 
                  placeholder="VD: WH-76PDE8"
                  className="input-field !pl-12 !h-14 font-mono text-xl tracking-widest uppercase bg-muted/50 focus:bg-background text-center font-bold shadow-inner" 
                  onKeyDown={e => e.key === 'Enter' && handleSearchTicket(code)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowQrScanner(true)} 
                  className="btn btn-secondary justify-center !h-13 text-base font-bold transition-all border-2 border-dashed hover:border-primary hover:text-primary"
                >
                  <FiCamera className="mr-2 h-5 w-5" /> Quét QR
                </button>
                <button 
                  onClick={() => handleSearchTicket(code)} 
                  disabled={!code.trim() || loading} 
                  className="btn btn-primary justify-center !h-13 shadow-lg shadow-primary/20 text-base font-bold transition-all"
                >
                  {loading && !searchedBooking ? (
                    <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiSearch className="mr-2 h-5 w-5" /> Kiểm tra
                    </>
                  )}
                </button>
              </div>
            </div>

            {searchError && (
              <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3 animate-fade-in">
                <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-800 dark:text-red-400 leading-relaxed">{searchError}</p>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FiInfo className="text-primary" /> Hướng dẫn quy trình Check-in
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                Khách chỉ được Check-in sớm tối đa <strong>30 phút</strong> trước giờ bắt đầu.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                Vé phải ở trạng thái <strong>Đã xác nhận (CONFIRMED)</strong> mới được check-in.
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                Hợp đồng dài hạn (tuần/tháng) cho phép quét mã check-in mỗi ngày.
              </li>
            </ul>
          </div>
        </div>

        {/* Khu vực Thẻ thông tin vé & Khách đang ngồi (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Thẻ thông tin vé tìm thấy (Ticket Preview) */}
          {searchedBooking && (() => {
            const pkg = getBookingPackageDisplay(searchedBooking.booking);
            const isMultiDay = pkg.isMultiDay;
            const canCheckin = !searchedBooking.alreadyCheckedIn && 
              (searchedBooking.booking.status === 'CONFIRMED' || (isMultiDay && searchedBooking.booking.status === 'CHECKED_IN'));

            return (
              <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-xl animate-scale-up relative overflow-hidden">
                <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${pkg.badgeClass}`}>
                  <FiTag /> {pkg.packageType}
                </div>
                <h2 className="font-bold text-lg mb-5 flex items-center gap-2 text-primary">
                  <FiCheckCircle /> Xác nhận thông tin Check-in
                </h2>

                <div className="grid sm:grid-cols-2 gap-4 bg-muted/40 p-5 rounded-2xl border border-border mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiUser /> Khách hàng</p>
                    <p className="font-bold text-base">{searchedBooking.customer?.fullName || 'Khách vãng lai'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <FiPhone className="h-3 w-3" /> {searchedBooking.customer?.phone || 'Chưa cập nhật SĐT'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiMapPin /> Vị trí không gian</p>
                    <p className="font-bold text-base text-primary">{searchedBooking.workspace?.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">Mã vé: {searchedBooking.booking?.bookingCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiCalendar /> Khung giờ đăng ký</p>
                    <p className="font-bold text-sm">
                      {isMultiDay 
                        ? `${pkg.timeSlotText} (Hạn: ${pkg.dateRangeText} · ${pkg.progressText})` 
                        : `${formatTime(searchedBooking.booking?.startAt)} - ${formatTime(searchedBooking.booking?.endAt)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiDollarSign /> Trạng thái vé</p>
                    <span className={`badge ${bookingStatusColor[searchedBooking.booking?.status?.toLowerCase()] || 'bg-gray-100 text-gray-700'} text-xs font-semibold`}>
                      {bookingStatusLabel[searchedBooking.booking?.status?.toLowerCase()] || searchedBooking.booking?.status}
                    </span>
                  </div>
                </div>

                {canCheckin ? (
                  <button 
                    onClick={handleConfirmCheckin} 
                    disabled={loading}
                    className="btn btn-primary w-full justify-center !h-14 text-lg font-bold shadow-lg shadow-primary/30 transition-all hover:scale-[1.01]"
                  >
                    {loading ? (
                      <span className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiCheck className="h-6 w-6 mr-2" /> 
                        {isMultiDay ? 'Xác nhận Check-in ca hôm nay' : 'Xác nhận Cho Khách Vào (Check-in)'}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
                    <p className="text-sm font-semibold text-destructive">
                      {searchedBooking.alreadyCheckedIn 
                        ? '⚠️ Khách hàng này đang sử dụng không gian, không thể Check-in thêm.' 
                        : '⚠️ Vé chưa được thanh toán hoặc không ở trạng thái hợp lệ để Check-in.'}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bảng quản lý khách đang ngồi & Lịch trình khách hôm nay */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col space-y-5">
            {/* View Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setActiveView('seated')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeView === 'seated'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FiUsers className="h-3.5 w-3.5 text-primary" />
                  <span>Khách đang ngồi</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-mono font-bold">{counts.all}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('today_schedule')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeView === 'today_schedule'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FiClock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Lịch trình khách hôm nay</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">{todayCounts.all}</span>
                </button>
              </div>

              <button
                onClick={fetchDashboardData}
                disabled={refreshing}
                className="p-1.5 px-3 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs flex items-center gap-1.5 font-medium"
                title="Làm mới dữ liệu"
              >
                <FiRefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </div>

            {activeView === 'seated' ? (
              <>
                {/* Stats Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3 border border-border/60">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase">Tổng đang ngồi</p>
                    <p className="text-xl font-bold mt-0.5 text-foreground">{counts.all}</p>
                  </div>
                  <div className="rounded-xl bg-green-500/10 p-3 border border-green-500/20">
                    <p className="text-[11px] font-medium text-green-700 dark:text-green-400 uppercase">Trong giờ</p>
                    <p className="text-xl font-bold mt-0.5 text-green-700 dark:text-green-400">{counts.valid}</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20">
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase">Sắp hết (&le;15p)</p>
                    <p className="text-xl font-bold mt-0.5 text-amber-700 dark:text-amber-400">{counts.near_expiry}</p>
                  </div>
                  <div className={`rounded-xl p-3 border transition-colors ${counts.overdue > 0 ? 'bg-red-500/15 border-red-500/30' : 'bg-muted/50 border-border/60'}`}>
                    <p className={`text-[11px] font-medium uppercase ${counts.overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>Quá giờ</p>
                    <p className={`text-xl font-bold mt-0.5 ${counts.overdue > 0 ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>{counts.overdue}</p>
                  </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
                  <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                    <button 
                      onClick={() => setActiveTab('all')} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Tất cả ({counts.all})
                    </button>
                    <button 
                      onClick={() => setActiveTab('valid')} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'valid' ? 'bg-background text-green-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Trong giờ ({counts.valid})
                    </button>
                    <button 
                      onClick={() => setActiveTab('near_expiry')} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'near_expiry' ? 'bg-background text-amber-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Sắp hết ({counts.near_expiry})
                    </button>
                    <button 
                      onClick={() => setActiveTab('overdue')} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'overdue' ? 'bg-background text-red-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Quá giờ ({counts.overdue})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-56">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                    <input 
                      type="text" 
                      value={filterText} 
                      onChange={e => setFilterText(e.target.value)} 
                      placeholder="Tìm tên, SĐT, mã, phòng..." 
                      className="input-field !pl-8 !h-9 text-xs bg-muted/50 focus:bg-background"
                    />
                  </div>
                </div>

                {/* Bảng danh sách khách */}
                {filteredActiveCheckins.length === 0 ? (
                  <EmptyState 
                    icon={FiInbox} 
                    title={counts.all === 0 ? "Hiện không có khách nào đang ngồi" : "Không tìm thấy khách phù hợp"} 
                    description={counts.all === 0 ? "Tất cả các không gian tại chi nhánh hiện đang trống." : "Vui lòng kiểm tra lại bộ lọc hoặc từ khóa tìm kiếm."} 
                    className="py-12" 
                  />
                ) : (
                  <div className="overflow-x-auto pr-1">
                    <table className="data-table w-full text-left">
                      <thead>
                        <tr className="text-xs uppercase text-muted-foreground border-b border-border">
                          <th className="pb-3 font-bold">Khách hàng</th>
                          <th className="pb-3 font-bold">Mã Vé / Vị trí</th>
                          <th className="pb-3 font-bold">Thời gian ngồi</th>
                          <th className="pb-3 font-bold">Trạng thái</th>
                          <th className="pb-3 text-right font-bold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm">
                        {filteredActiveCheckins.map(ci => (
                          <tr 
                            key={ci.activeCheckin?.id} 
                            className={`group transition-colors ${
                              ci.meta.timeStatus === 'overdue' 
                                ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/70' 
                                : ci.meta.timeStatus === 'near_expiry' 
                                  ? 'bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/60' 
                                  : 'hover:bg-muted/30'
                            }`}
                          >
                            {/* Khách hàng */}
                            <td className="py-4 font-medium">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                {ci.customer?.fullName || 'Khách vãng lai'}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <FiPhone className="h-3 w-3" /> {ci.customer?.phone || 'Chưa cập nhật SĐT'}
                              </div>
                            </td>

                            {/* Mã Vé & Vị trí */}
                            <td className="py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-primary text-sm">{ci.workspace?.name}</span>
                                <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${ci.meta.pkg?.badgeClass}`}>
                                  {ci.meta.pkg?.packageType}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 inline-block">
                                  #{ci.booking?.bookingCode}
                                </span>
                                {ci.meta.pkg?.isMultiDay && (
                                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                    {ci.meta.pkg.progressText}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Thời gian ngồi */}
                            <td className="py-4">
                              <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                                <FiClock className="h-3.5 w-3.5 text-primary shrink-0" /> 
                                <span>{ci.meta.isCheckedInToday ? `Đã ngồi: ${ci.meta.durationFormatted}` : ci.meta.durationFormatted}</span>
                              </div>
                              {!ci.meta.isCheckedInToday && (
                                <div className="mt-1">
                                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md inline-block">
                                    Chưa check-out hôm trước
                                  </span>
                                </div>
                              )}
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {ci.meta.pkg?.isMultiDay ? (
                                  <span>Hôm nay: {ci.meta.pkg.timeSlotText} · {ci.meta.pkg.dateRangeText}</span>
                                ) : (
                                  <span>Khung giờ: {formatTime(ci.booking?.startAt)} - {formatTime(ci.booking?.endAt)}</span>
                                )}
                              </div>
                            </td>

                            {/* Trạng thái & Còn lại */}
                            <td className="py-4">
                              {ci.meta.timeStatus === 'overdue' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/50 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 animate-pulse">
                                  <FiAlertTriangle className="h-3.5 w-3.5" /> {ci.meta.remainingFormatted}
                                </span>
                              ) : ci.meta.timeStatus === 'near_expiry' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                  <FiClock className="h-3.5 w-3.5 animate-spin-slow" /> {ci.meta.remainingFormatted}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                  <FiCheck className="h-3.5 w-3.5" /> {ci.meta.remainingFormatted}
                                </span>
                              )}
                            </td>

                            {/* Thao tác Check-out */}
                            <td className="py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => setTabItem(ci)}
                                className="btn btn-sm btn-outline border-border text-xs mr-2 shadow-sm"
                                title="Gọi thêm dịch vụ / thu tiền dịch vụ"
                              >
                                <FiCoffee className="h-3.5 w-3.5 mr-1" /> Dịch vụ
                              </button>
                              <button 
                                onClick={() => openCheckoutModal(ci)} 
                                className={`btn btn-sm transition-all shadow-sm ${
                                  ci.meta.timeStatus === 'overdue'
                                    ? 'btn-destructive text-xs font-bold shadow-red-500/20'
                                    : 'btn-outline border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-xs'
                                }`}
                                title={ci.meta.pkg?.isMultiDay ? "Check-out ca hôm nay (giữ hiệu lực các ngày sau)" : "Check-out giải phóng vị trí"}
                              >
                                <FiLogOut className="h-3.5 w-3.5 mr-1" />
                                {ci.meta.pkg?.isMultiDay ? 'Check-out hôm nay' : 'Ra về (Check-out)'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              /* Lịch trình khách hôm nay Section */
              <div className="space-y-4">
                {/* Header Tabs & Search */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-full sm:w-auto border border-border/50">
                    <button 
                      onClick={() => setScheduleTab('all')} 
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        scheduleTab === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>Tất cả</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15 font-mono">{todayCounts.all}</span>
                    </button>
                    <button 
                      onClick={() => setScheduleTab('incoming')} 
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        scheduleTab === 'incoming' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>Sắp đến</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">{todayCounts.incoming}</span>
                    </button>
                    <button 
                      onClick={() => setScheduleTab('seated')} 
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        scheduleTab === 'seated' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>Đang ngồi</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">{todayCounts.seated}</span>
                    </button>
                    <button 
                      onClick={() => setScheduleTab('completed')} 
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        scheduleTab === 'completed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>Hoàn tất</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15 font-mono">{todayCounts.completed}</span>
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                    <input 
                      type="text"
                      placeholder="Tìm tên, SĐT, mã vé, bàn..."
                      value={scheduleSearch}
                      onChange={(e) => setScheduleSearch(e.target.value)}
                      className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
                    />
                    {scheduleSearch && (
                      <button 
                        onClick={() => setScheduleSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách thẻ đặt chỗ hôm nay */}
                {filteredTodayBookings.length === 0 ? (
                  <EmptyState 
                    icon={FiClock} 
                    title={branchBookingsToday.length === 0 ? "Hôm nay chưa có lượt đặt nào" : "Không tìm thấy khách phù hợp"} 
                    description="Các lượt đặt chỗ trực tuyến và tại quầy trong ngày sẽ hiển thị tại đây." 
                    className="py-12" 
                  />
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {filteredTodayBookings.map((b) => {
                      const pkg = getBookingPackageDisplay(b);
                      return (
                        <div 
                          key={b.id} 
                          className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 ${
                            b.status === 'CONFIRMED' 
                              ? 'bg-card border-border/80 hover:border-primary/50 shadow-xs' 
                              : b.status === 'CHECKED_IN' 
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-500/20' 
                                : 'bg-muted/30 border-border/40 opacity-75'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {/* Cột trái: Thông tin gói hoặc Avatar */}
                            {pkg.isMultiDay ? (
                              <div className="text-center shrink-0 w-20 bg-amber-500/10 py-1.5 px-1 rounded-xl border border-amber-500/20">
                                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 leading-tight">{pkg.progressText}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-mono">{pkg.dateRangeText}</p>
                                <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.2 rounded border ${pkg.badgeClass}`}>
                                  {pkg.packageType}
                                </span>
                              </div>
                            ) : (
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                                b.status === 'CONFIRMED' 
                                  ? 'bg-primary/10 text-primary border border-primary/20' 
                                  : b.status === 'CHECKED_IN' 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-muted text-muted-foreground'
                              }`}>
                                {b.customerName ? b.customerName.trim().charAt(0).toUpperCase() : 'K'}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm text-foreground truncate">{b.customerName || 'Khách vãng lai'}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  b.status === 'CONFIRMED'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                    : b.status === 'CHECKED_IN'
                                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-muted text-muted-foreground'
                                }`}>
                                  {bookingStatusLabel[b.status?.toLowerCase()] || b.status}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pkg.badgeClass}`}>
                                  {pkg.packageType}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span className="font-mono text-primary font-medium">#{b.bookingCode}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3 text-primary shrink-0" /> {b.workspaceName || 'Không gian'}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <FiClock className="w-3 h-3 text-muted-foreground shrink-0" /> {pkg.timeSlotText}
                                </span>
                                {pkg.isMultiDay && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                      <FiCalendar className="w-3 h-3 shrink-0" /> {pkg.dateRangeText} ({pkg.progressText})
                                    </span>
                                  </>
                                )}
                                {b.customerPhone && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><FiPhone className="w-3 h-3 shrink-0" /> {b.customerPhone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            {b.status === 'CONFIRMED' ? (
                              <button
                                onClick={() => handleSelectBookingForCheckin(b.bookingCode)}
                                className="btn btn-primary btn-sm rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5 hover:scale-[1.02] transition-transform"
                                title="Điền mã và chuẩn bị Check-in"
                              >
                                <FiCheckCircle className="w-3.5 h-3.5" />
                                <span>{pkg.isMultiDay ? 'Check-in hôm nay' : 'Check-in ngay'}</span>
                              </button>
                            ) : b.status === 'CHECKED_IN' ? (
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Đang ngồi
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-xl">
                                Đã hoàn tất
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL XÁC NHẬN CHECK-OUT */}
      {selectedCheckoutItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scale-up space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${selectedCheckoutItem.meta?.timeStatus === 'overdue' ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'}`}>
                  <FiLogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {selectedCheckoutItem.meta?.pkg?.isMultiDay ? 'Xác nhận Check-out ca hôm nay' : 'Xác nhận Check-out'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedCheckoutItem.meta?.pkg?.isMultiDay 
                      ? `Giải phóng vị trí hôm nay. Khách vẫn còn ${selectedCheckoutItem.meta.pkg.progressText || 'ngày tiếp theo'} trong gói và có thể check-in tiếp các ngày sau.` 
                      : 'Giải phóng vị trí và hoàn tất phiên sử dụng không gian'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCheckoutItem(null)} 
                disabled={checkoutSubmitting}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Overdue Warning Alert */}
            {selectedCheckoutItem.meta?.timeStatus === 'overdue' && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3">
                <FiAlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">Khách hàng ngồi quá giờ dự kiến!</p>
                  <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 leading-relaxed">
                    Khách đã sử dụng quá thời gian đăng ký <strong>{formatMinutes(selectedCheckoutItem.meta.overdueMinutes)}</strong>. Vui lòng kiểm tra và thu phụ phí nếu có trước khi giải phóng bàn.
                  </p>
                </div>
              </div>
            )}

            {/* Session Summary Card */}
            <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Khách hàng:</span>
                <span className="font-bold text-foreground text-sm">{selectedCheckoutItem.customer?.fullName || 'Khách vãng lai'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Vị trí không gian:</span>
                <span className="font-bold text-primary">{selectedCheckoutItem.workspace?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Mã đặt chỗ:</span>
                <span className="font-mono font-bold">#{selectedCheckoutItem.booking?.bookingCode}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Gói dịch vụ:</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className={`px-2 py-0.2 rounded-full text-[10px] border ${selectedCheckoutItem.meta?.pkg?.badgeClass}`}>
                    {selectedCheckoutItem.meta?.pkg?.packageType}
                  </span>
                  {selectedCheckoutItem.meta?.pkg?.progressText && (
                    <span className="text-amber-600 font-bold text-xs">{selectedCheckoutItem.meta.pkg.progressText}</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Giờ vào thực tế:</span>
                <span className="font-medium">
                  {formatTime(selectedCheckoutItem.activeCheckin?.checkinAt || '')}
                  {!selectedCheckoutItem.meta?.isCheckedInToday && (
                    <span className="text-amber-600 font-semibold ml-1.5">
                      ({formatDate(selectedCheckoutItem.activeCheckin?.checkinAt || '')})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-muted-foreground">Khung giờ sử dụng:</span>
                <span className="font-medium">
                  {selectedCheckoutItem.meta?.pkg?.isMultiDay 
                    ? `Hôm nay: ${selectedCheckoutItem.meta.pkg.timeSlotText} (Hạn: ${selectedCheckoutItem.meta.pkg.dateRangeText})`
                    : `${formatTime(selectedCheckoutItem.booking?.startAt)} - ${formatTime(selectedCheckoutItem.booking?.endAt)}`
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground font-semibold">
                  {selectedCheckoutItem.meta?.isCheckedInToday ? 'Thời gian ngồi hôm nay:' : 'Thời gian phiên chưa đóng:'}
                </span>
                <span className="font-bold text-primary text-sm">{selectedCheckoutItem.meta?.durationFormatted}</span>
              </div>
            </div>

            {/* Dịch vụ gọi thêm: phải thu hết trước khi check-out */}
            <BookingTabPanel
              bookingId={selectedCheckoutItem.booking?.id}
              branchId={selectedCheckoutItem.booking?.branchId || branchId}
              onTabChange={setCheckoutTab}
              compact
            />

            {/* Ghi chú Check-out */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                Ghi chú khi Check-out (Tùy chọn)
              </label>
              <textarea 
                value={checkoutNote}
                onChange={e => setCheckoutNote(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Khách trả trễ 15p, bàn giao thiết bị đầy đủ, đã thu phụ phí..."
                className="input-field text-xs resize-none w-full !h-auto py-2.5"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setSelectedCheckoutItem(null)} 
                disabled={checkoutSubmitting}
                className="btn btn-secondary btn-sm text-xs font-semibold px-4 py-2"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={handleConfirmCheckout} 
                disabled={checkoutSubmitting || (checkoutTab?.unpaidAmount ?? 0) > 0}
                title={(checkoutTab?.unpaidAmount ?? 0) > 0 ? 'Thu tiền dịch vụ gọi thêm trước khi check-out' : undefined}
                className="btn btn-primary btn-sm text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"
              >
                {checkoutSubmitting ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheck className="h-4 w-4" />
                    <span>
                      {selectedCheckoutItem.meta?.pkg?.isMultiDay 
                        ? 'Xác nhận Check-out ca hôm nay' 
                        : 'Xác nhận Check-out'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DỊCH VỤ GỌI THÊM */}
      {tabItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setTabItem(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scale-up space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">Dịch vụ của {tabItem.customer?.fullName || 'khách'}</h3>
                <p className="text-xs text-muted-foreground">
                  {tabItem.workspace?.name} · #{tabItem.booking?.bookingCode}
                </p>
              </div>
              <button onClick={() => setTabItem(null)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Đóng">
                <FiX className="h-4 w-4" />
              </button>
            </div>
            <BookingTabPanel bookingId={tabItem.booking?.id} branchId={tabItem.booking?.branchId || branchId} />
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScanSuccess={(scannedCode) => {
          setShowQrScanner(false);
          setCode(scannedCode);
          handleSearchTicket(scannedCode);
        }}
      />
    </div>
  );
};

export default CheckInPage;
