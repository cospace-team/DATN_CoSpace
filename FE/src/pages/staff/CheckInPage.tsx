import React, { useState, useMemo, useEffect } from 'react';
import { FiHash, FiCheckCircle, FiAlertCircle, FiLogOut, FiClock, FiInbox, FiSearch, FiUser, FiMapPin, FiCalendar, FiDollarSign, FiCheck } from 'react-icons/fi';
import { formatTime, bookingStatusLabel, bookingStatusColor } from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLocation } from 'react-router-dom';
import { staffApi, BookingWithDetailsDto } from '../../api/staffApi';
import { useAuth } from '../../context/AuthContext';

const CheckInPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const branchId = user?.branchId || '33333333-3333-3333-3333-333333333333';
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedBooking, setSearchedBooking] = useState<BookingWithDetailsDto | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeCheckins, setActiveCheckins] = useState<BookingWithDetailsDto[]>([]);
  const [filterText, setFilterText] = useState('');

  // Tự động nhận mã code nếu được điều hướng từ Dashboard sang
  useEffect(() => {
    fetchActiveCheckins();
    
    const state = location.state as { bookingCode?: string };
    if (state?.bookingCode) {
      setCode(state.bookingCode);
      handleSearchTicket(state.bookingCode);
    }
  }, [location]);

  const fetchActiveCheckins = async () => {
    try {
      const data = await staffApi.getActiveCheckins(branchId);
      setActiveCheckins(data);
    } catch (error) {
      console.error('Failed to fetch active checkins', error);
    }
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

      if (bkDetails.alreadyCheckedIn) {
        setSearchError('Khách hàng này đã được Check-in và đang sử dụng không gian!');
      } else if (bkDetails.booking.status !== 'CONFIRMED') {
        setSearchError(`Vé này đang ở trạng thái "${bookingStatusLabel[bkDetails.booking.status] || bkDetails.booking.status}", không thể Check-in.`);
      }
    } catch (error: any) {
      setSearchError('Mã đặt chỗ không tồn tại hoặc không thuộc chi nhánh này. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận Check-in cho khách vào
  const handleConfirmCheckin = async () => {
    if (!searchedBooking || searchedBooking.alreadyCheckedIn || searchedBooking.booking.status !== 'CONFIRMED') return;
    setLoading(true);

    try {
      await staffApi.checkin(searchedBooking.booking.id, 'Check-in bằng mã Code tại quầy');
      setSuccessMessage(`✅ Check-in thành công! Mời khách hàng ${searchedBooking.customer?.fullName || ''} vào ${searchedBooking.workspace?.name || ''}.`);
      setSearchedBooking(null);
      setCode('');
      await fetchActiveCheckins();
    } catch (error: any) {
      setSearchError(error.response?.data?.message || 'Có lỗi xảy ra khi Check-in');
    } finally {
      setLoading(false);
    }
  };

  // Check-out giải phóng bàn
  const handleCheckout = async (checkinId: string) => {
    try {
      await staffApi.checkout(checkinId);
      setSuccessMessage('Đã Check-out và giải phóng bàn thành công!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchActiveCheckins();
    } catch (error: any) {
      console.error('Failed to checkout', error);
      alert('Lỗi khi Check-out');
    }
  };

  // Danh sách khách đang ngồi (có filter)
  const filteredActiveCheckins = useMemo(() => {
    return activeCheckins.filter(ci => {
      if (!filterText) return true;
      const matchName = ci.customer?.fullName?.toLowerCase().includes(filterText.toLowerCase());
      const matchCode = ci.booking?.bookingCode?.toLowerCase().includes(filterText.toLowerCase());
      const matchWs = ci.workspace?.name?.toLowerCase().includes(filterText.toLowerCase());
      return matchName || matchCode || matchWs;
    });
  }, [activeCheckins, filterText]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 lg:pb-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <h1 className="text-2xl font-bold font-heading">Kiểm tra & Xác nhận Check-in</h1>
      </div>

      {successMessage && (
        <div className="rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 p-4 flex items-center gap-3 shadow-sm animate-slide-in-up">
          <FiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-base font-medium text-green-800 dark:text-green-300">{successMessage}</p>
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
                <p className="text-xs text-muted-foreground mt-1">Vui lòng nhập chính xác mã trên vé của khách hàng</p>
              </div>
              
              <div className="relative">
                <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  placeholder="VD: WH-A3K7P2"
                  className="input-field !pl-12 !h-14 font-mono text-xl tracking-widest uppercase bg-muted/50 focus:bg-background text-center font-bold shadow-inner" 
                  onKeyDown={e => e.key === 'Enter' && handleSearchTicket(code)} 
                />
              </div>
              <button 
                onClick={() => handleSearchTicket(code)} 
                disabled={!code.trim() || loading} 
                className="btn btn-primary w-full justify-center !h-13 shadow-lg shadow-primary/20 text-base font-bold"
              >
                {loading && !searchedBooking ? <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Kiểm tra vé'}
              </button>
            </div>

            {searchError && (
              <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 flex items-center gap-3 animate-fade-in">
                <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-sm font-medium text-red-800 dark:text-red-400">{searchError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Khu vực Thẻ thông tin vé & Khách đang ngồi (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Thẻ thông tin vé (Ticket Preview) */}
          {searchedBooking && (
            <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-xl animate-scale-up relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider shadow-sm">
                Thông tin vé tìm thấy
              </div>
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2 text-primary">
                <FiCheckCircle /> Xác nhận thông tin Check-in
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 bg-muted/40 p-5 rounded-2xl border border-border mb-6">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiUser /> Khách hàng</p>
                  <p className="font-bold text-base">{searchedBooking.customer?.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{searchedBooking.customer?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiMapPin /> Không gian</p>
                  <p className="font-bold text-base text-primary">{searchedBooking.workspace?.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">Mã vé: {searchedBooking.booking?.bookingCode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiCalendar /> Thời gian đặt</p>
                  <p className="font-bold text-sm">{formatTime(searchedBooking.booking?.startAt)} - {formatTime(searchedBooking.booking?.endAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiDollarSign /> Thanh toán</p>
                  <span className={`badge ${bookingStatusColor[searchedBooking.booking?.status?.toLowerCase()] || 'bg-gray-100 text-gray-700'} text-xs mt-0.5`}>
                    {bookingStatusLabel[searchedBooking.booking?.status?.toLowerCase()] || searchedBooking.booking?.status}
                  </span>
                </div>
              </div>

              {!searchedBooking.alreadyCheckedIn && searchedBooking.booking.status === 'CONFIRMED' ? (
                <button 
                  onClick={handleConfirmCheckin} 
                  disabled={loading}
                  className="btn btn-primary w-full justify-center !h-14 text-lg font-bold shadow-lg shadow-primary/30 animate-pulse hover:animate-none"
                >
                  {loading ? <span className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <> <FiCheck className="h-6 w-6 mr-2" /> Xác nhận Cho Khách Vào (Check-in) </>}
                </button>
              ) : (
                <div className="rounded-xl bg-muted p-4 text-center border border-border">
                  <p className="text-sm font-medium text-destructive">
                    {searchedBooking.alreadyCheckedIn ? '⚠️ Khách hàng này đang sử dụng không gian, không thể Check-in thêm.' : '⚠️ Vé chưa được thanh toán hoặc đã quá hạn.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bảng quản lý khách đang ngồi */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FiClock className="text-primary animate-spin-slow" /> Khách đang ngồi tại không gian ({filteredActiveCheckins.length})
              </h2>
              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input 
                  type="text" 
                  value={filterText} 
                  onChange={e => setFilterText(e.target.value)} 
                  placeholder="Tìm tên, mã vé, phòng..." 
                  className="input-field !pl-9 !h-10 text-xs bg-muted/50 focus:bg-background"
                />
              </div>
            </div>

            {filteredActiveCheckins.length === 0 ? (
              <EmptyState 
                icon={FiInbox} 
                title="Không có khách nào đang ngồi" 
                description={filterText ? "Không tìm thấy khách hàng nào phù hợp với từ khóa tìm kiếm." : "Hiện tại tất cả các không gian đều đang trống."} 
                className="py-16" 
              />
            ) : (
              <div className="overflow-x-auto pr-1">
                <table className="data-table w-full">
                  <thead>
                    <tr className="text-xs uppercase text-muted-foreground border-b border-border">
                      <th className="pb-3 text-left font-bold">Khách hàng</th>
                      <th className="pb-3 text-left font-bold">Mã Vé</th>
                      <th className="pb-3 text-left font-bold">Không gian</th>
                      <th className="pb-3 text-left font-bold">Giờ vào</th>
                      <th className="pb-3 text-right font-bold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredActiveCheckins.map(ci => (
                      <tr key={ci.activeCheckin?.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-4 font-medium">
                          <div className="font-bold text-sm text-foreground">{ci.customer?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{ci.customer?.phone}</div>
                        </td>
                        <td className="py-4 font-mono text-xs text-muted-foreground bg-background/50 px-2 rounded border border-border/50 my-auto inline-block mt-3">
                          {ci.booking?.bookingCode}
                        </td>
                        <td className="py-4 font-bold text-sm text-primary">{ci.workspace?.name}</td>
                        <td className="py-4 text-xs text-muted-foreground font-medium">{formatTime(ci.activeCheckin?.checkinAt || '')}</td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => handleCheckout(ci.activeCheckin?.id || '')} 
                            className="btn btn-sm btn-outline border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all shadow-sm"
                          >
                            <FiLogOut className="h-3.5 w-3.5 mr-1" /> Ra về (Check-out)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;
