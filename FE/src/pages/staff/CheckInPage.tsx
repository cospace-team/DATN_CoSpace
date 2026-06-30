import React, { useState, useMemo, useEffect } from 'react';
import { FiHash, FiCheckCircle, FiAlertCircle, FiLogOut, FiClock, FiInbox, FiSearch, FiUser, FiMapPin, FiCalendar, FiDollarSign, FiCheck } from 'react-icons/fi';
import { bookings, checkinLogs, getWorkspace, getUser } from '../../data/mockData';
import { formatTime, bookingStatusLabel, bookingStatusColor } from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLocation } from 'react-router-dom';

const CheckInPage: React.FC = () => {
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedBooking, setSearchedBooking] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Local state mô phỏng dữ liệu check-in/out trực tiếp
  const [localCheckins, setLocalCheckins] = useState(checkinLogs);
  const [localBookings, setLocalBookings] = useState(bookings);
  const [filterText, setFilterText] = useState('');

  // Tự động nhận mã code nếu được điều hướng từ Dashboard sang
  useEffect(() => {
    const state = location.state as { bookingCode?: string };
    if (state?.bookingCode) {
      setCode(state.bookingCode);
      handleSearchTicket(state.bookingCode);
    }
  }, [location]);

  // Tìm kiếm & kiểm tra vé trước khi Check-in (Chuẩn luồng)
  const handleSearchTicket = (inputCode: string) => {
    if (!inputCode.trim()) return;
    setLoading(true);
    setSearchError(null);
    setSuccessMessage(null);
    setSearchedBooking(null);

    setTimeout(() => {
      const bk = localBookings.find(b => b.booking_code.toUpperCase() === inputCode.toUpperCase().trim());
      if (!bk) {
        setSearchError('Mã đặt chỗ không tồn tại. Vui lòng kiểm tra lại!');
      } else {
        const ws = getWorkspace(bk.workspace_id);
        const customer = getUser(bk.user_id);
        const alreadyCheckedIn = localCheckins.some(ci => ci.booking_id === bk.id && !ci.checkout_at);

        setSearchedBooking({
          ...bk,
          workspace: ws,
          customer: customer,
          alreadyCheckedIn
        });

        if (alreadyCheckedIn) {
          setSearchError('Khách hàng này đã được Check-in và đang sử dụng không gian!');
        } else if (bk.status !== 'confirmed') {
          setSearchError(`Vé này đang ở trạng thái "${bookingStatusLabel[bk.status]}", không thể Check-in.`);
        }
      }
      setLoading(false);
    }, 400);
  };

  // Xác nhận Check-in cho khách vào
  const handleConfirmCheckin = () => {
    if (!searchedBooking || searchedBooking.alreadyCheckedIn || searchedBooking.status !== 'confirmed') return;
    setLoading(true);

    setTimeout(() => {
      const newCi = {
        id: `ci-${Date.now()}`,
        booking_id: searchedBooking.id,
        staff_user_id: 'user-0003',
        checkin_at: new Date().toISOString(),
        checkout_at: null,
        note: 'Check-in bằng mã Code tại quầy'
      };

      // Cập nhật state local
      setLocalCheckins(prev => [newCi as any, ...prev]);
      setLocalBookings(prev => prev.map(b => b.id === searchedBooking.id ? { ...b, status: 'checked_in' } : b));
      
      setSuccessMessage(`✅ Check-in thành công! Mời khách hàng ${searchedBooking.customer?.full_name} vào ${searchedBooking.workspace?.name}.`);
      setSearchedBooking(null);
      setCode('');
      setLoading(false);
    }, 500);
  };

  // Check-out giải phóng bàn
  const handleCheckout = (ciId: string, bookingId: string) => {
    setLocalCheckins(prev => prev.map(c => c.id === ciId ? { ...c, checkout_at: new Date().toISOString() } : c));
    setLocalBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b));
    setSuccessMessage('Đã Check-out và giải phóng bàn thành công!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Danh sách khách đang ngồi (có filter)
  const activeCheckins = useMemo(() => {
    return localCheckins
      .filter(ci => !ci.checkout_at)
      .map(ci => {
        const bk = localBookings.find(b => b.id === ci.booking_id);
        const ws = bk ? getWorkspace(bk.workspace_id) : null;
        const customer = bk ? getUser(bk.user_id) : null;
        return { ...ci, booking: bk, workspace: ws, customer };
      })
      .filter(ci => {
        if (!filterText) return true;
        const matchName = ci.customer?.full_name.toLowerCase().includes(filterText.toLowerCase());
        const matchCode = ci.booking?.booking_code.toLowerCase().includes(filterText.toLowerCase());
        const matchWs = ci.workspace?.name.toLowerCase().includes(filterText.toLowerCase());
        return matchName || matchCode || matchWs;
      });
  }, [localCheckins, localBookings, filterText]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 lg:pb-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Vận hành & Lễ tân</p>
          <h1 className="text-2xl font-bold font-heading mt-1">Kiểm tra & Xác nhận Check-in</h1>
          <p className="text-sm text-muted-foreground mt-1">Xác thực vé và cho khách vào không gian thông qua mã đặt chỗ (Booking Code)</p>
        </div>
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
                {loading ? <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Kiểm tra vé'}
              </button>
            </div>

            {searchError && (
              <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3 animate-fade-in">
                <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-sm font-medium text-red-800 dark:text-red-300">{searchError}</p>
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
                  <p className="font-bold text-base">{searchedBooking.customer?.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{searchedBooking.customer?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiMapPin /> Không gian</p>
                  <p className="font-bold text-base text-primary">{searchedBooking.workspace?.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">Mã vé: {searchedBooking.booking_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiCalendar /> Thời gian đặt</p>
                  <p className="font-bold text-sm">{formatTime(searchedBooking.start_at)} - {formatTime(searchedBooking.end_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><FiDollarSign /> Thanh toán</p>
                  <span className={`badge ${bookingStatusColor[searchedBooking.status]} text-xs mt-0.5`}>
                    {bookingStatusLabel[searchedBooking.status]}
                  </span>
                </div>
              </div>

              {!searchedBooking.alreadyCheckedIn && searchedBooking.status === 'confirmed' ? (
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
                <FiClock className="text-primary animate-spin-slow" /> Khách đang ngồi tại không gian ({activeCheckins.length})
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

            {activeCheckins.length === 0 ? (
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
                    {activeCheckins.map(ci => (
                      <tr key={ci.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-4 font-medium">
                          <div className="font-bold text-sm text-foreground">{ci.customer?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{ci.customer?.phone}</div>
                        </td>
                        <td className="py-4 font-mono text-xs text-muted-foreground bg-background/50 px-2 rounded border border-border/50 my-auto inline-block mt-3">
                          {ci.booking?.booking_code}
                        </td>
                        <td className="py-4 font-bold text-sm text-primary">{ci.workspace?.name}</td>
                        <td className="py-4 text-xs text-muted-foreground font-medium">{formatTime(ci.checkin_at)}</td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => handleCheckout(ci.id, ci.booking_id)} 
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


