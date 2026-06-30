import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiCalendar, FiClock, FiMapPin, FiX, FiCheckCircle, FiAlertCircle, FiMaximize } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { formatVND } from '../../utils/formatters';

// MOCK DATA for history
const MOCK_BOOKINGS = [
  {
    id: 'b1',
    code: 'WH-8823',
    workspaceName: 'Hot Desk HD-01',
    branchName: 'WorkHub Quận 1',
    date: new Date(),
    startTime: '09:00',
    endTime: '11:00',
    status: 'confirmed', // confirmed, canceled, checked_in, completed
    totalAmount: 100000,
    paymentMethod: 'momo'
  },
  {
    id: 'b2',
    code: 'WH-5512',
    workspaceName: 'Meeting Room Lotus',
    branchName: 'WorkHub Quận 3',
    date: new Date(Date.now() - 86400000 * 2),
    startTime: '14:00',
    endTime: '16:00',
    status: 'completed',
    totalAmount: 450000,
    paymentMethod: 'momo'
  },
  {
    id: 'b3',
    code: 'WH-9911',
    workspaceName: 'Private Office Bamboo',
    branchName: 'WorkHub Quận 1',
    date: new Date(Date.now() + 86400000 * 5),
    startTime: '08:00',
    endTime: '18:00',
    status: 'confirmed',
    totalAmount: 1200000,
    paymentMethod: 'momo'
  }
];

const BookingHistoryPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'canceled'>('upcoming');
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null); // holds booking ID
  const [successMessage, setSuccessMessage] = useState<string | null>(state?.message || null);
  const [bookings, setBookings] = useState(MOCK_BOOKINGS);

  const getFilteredBookings = () => {
    return bookings.filter(b => {
      if (activeTab === 'canceled') return b.status === 'canceled';
      if (activeTab === 'upcoming') return b.status === 'confirmed';
      return b.status === 'completed';
    });
  };

  const handleCancel = () => {
    if (!showCancelModal) return;

    // Update local state to reflect cancellation
    setBookings(prev => prev.map(b =>
      b.id === showCancelModal ? { ...b, status: 'canceled' } : b
    ));

    setShowCancelModal(null);
    setSuccessMessage('Hủy đặt chỗ thành công.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const selectedCancelBooking = bookings.find(b => b.id === showCancelModal);

  return (
    <div className="max-w-5xl mx-auto py-6">
      <h1 className="text-2xl font-bold font-heading mb-6">Lịch sử Đặt chỗ</h1>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 flex items-center gap-3 animate-scale-in">
          <FiCheckCircle className="h-5 w-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {[
          { id: 'upcoming', label: 'Sắp tới' },
          { id: 'past', label: 'Đã hoàn thành' },
          { id: 'canceled', label: 'Đã hủy' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {getFilteredBookings().length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
            <FiCalendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Không có đơn đặt chỗ nào trong danh mục này.</p>
          </div>
        ) : (
          getFilteredBookings().map(booking => (
            <div key={booking.id} className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-6 transition-all hover:shadow-sm">
              {/* Left Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold rounded bg-primary/10 text-primary tracking-wider font-mono">
                    {booking.code}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${booking.status === 'confirmed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {booking.status === 'confirmed' ? 'Đã xác nhận' :
                      booking.status === 'completed' ? 'Đã hoàn thành' : 'Đã hủy'}
                  </span>
                </div>

                <h3 className="text-lg font-bold mb-1">{booking.workspaceName}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-4">
                  <FiMapPin className="h-3.5 w-3.5" /> {booking.branchName}
                </p>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-muted-foreground" />
                    <span className="font-medium">{booking.date.toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="text-muted-foreground" />
                    <span className="font-medium">{booking.startTime} - {booking.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Tổng:</span>
                    <span className="font-bold text-primary">{formatVND(booking.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Right Action */}
              <div className="flex flex-row md:flex-col items-center justify-center gap-3 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                {booking.status === 'confirmed' && (
                  <>
                    <Button variant="outline" className="w-full flex gap-2">
                      <FiMaximize /> Mã QR
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowCancelModal(booking.id)}
                    >
                      <FiX /> Hủy đơn
                    </Button>
                  </>
                )}
                {booking.status === 'completed' && (
                  <Button variant="outline" className="w-full">Đánh giá</Button>
                )}
                {booking.status === 'canceled' && (
                  <span className="text-sm text-muted-foreground text-center">Đã hoàn tiền theo chính sách</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && selectedCancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                <FiAlertCircle className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold mb-2">Xác nhận hủy đặt chỗ</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Bạn đang yêu cầu hủy đơn đặt chỗ <span className="font-mono font-bold">{selectedCancelBooking.code}</span>.
              </p>

              <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border">
                <h3 className="text-sm font-semibold mb-2">Chính sách hủy áp dụng:</h3>
                <ul className="text-sm space-y-2 mb-3">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Tổng tiền đơn hàng:</span>
                    <span>{formatVND(selectedCancelBooking.totalAmount)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Phí hủy (20%):</span>
                    <span className="text-red-500">-{formatVND(selectedCancelBooking.totalAmount * 0.2)}</span>
                  </li>
                  <li className="flex justify-between font-bold pt-2 border-t border-border">
                    <span>Số tiền hoàn lại:</span>
                    <span className="text-green-600">{formatVND(selectedCancelBooking.totalAmount * 0.8)}</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  * Số tiền hoàn lại sẽ được thông báo và ghi nhận vào hệ thống. Vui lòng liên hệ quầy lễ tân hoặc chờ từ 1-3 ngày làm việc đối với cổng thanh toán MoMo.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCancelModal(null)}
                >
                  Quay lại
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleCancel}
                >
                  Đồng ý hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistoryPage;
