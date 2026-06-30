import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiMapPin, FiCalendar, FiClock, FiCreditCard, FiCheckCircle, FiCoffee, FiMonitor, FiPrinter } from 'react-icons/fi';
import { formatVND, durationUnitLabel } from '../../utils/formatters';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';

const MOCK_SERVICES = [
  { id: 'coffee', name: 'Cà phê rang xay', price: 35000, icon: <FiCoffee /> },
  { id: 'monitor', name: 'Màn hình phụ 24"', price: 50000, icon: <FiMonitor /> },
  { id: 'printing', name: 'In ấn (50 trang)', price: 20000, icon: <FiPrinter /> },
];

const BookingCheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const state = location.state as any;
  const workspace = state?.workspace;
  const workspaceType = state?.workspaceType;
  const date = state?.date as Date;
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

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Không tìm thấy thông tin chỗ ngồi.</p>
        <Button onClick={() => navigate('/customer/explore')}>Quay lại Khám phá</Button>
      </div>
    );
  }

  const duration = endHour - startHour;

  const handleCheckout = () => {
    setIsProcessing(true);
    // Simulate API call to MoMo
    setTimeout(() => {
      setIsProcessing(false);
      // Navigate to history with a success message
      navigate('/customer/history', { 
        state: { message: 'Đặt chỗ thành công! Mã đơn của bạn là WH-8823.' } 
      });
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <FiChevronLeft /> Quay lại
      </button>

      <h1 className="text-2xl font-bold font-heading mb-6">Thanh toán & Đặt chỗ</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Add-ons */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workspace Info */}
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/30">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FiMapPin className="text-primary" /> {workspace.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {workspaceType?.name} · Sức chứa: {workspace.capacity} người
              </p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Ngày</p>
                <p className="flex items-center gap-2 font-medium">
                  <FiCalendar className="text-muted-foreground" />
                  {date.toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Thời gian</p>
                <div className="flex items-center gap-2">
                  <FiClock className="text-muted-foreground" />
                  <span className="font-medium">{String(startHour).padStart(2, '0')}:00 → {String(endHour).padStart(2, '0')}:00</span>
                </div>
              </div>
            </div>
          </section>

          {/* Add-ons */}
          {Object.keys(services).length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-4">Dịch vụ bổ sung đã chọn</h3>
              <div className="space-y-4">
                {Object.keys(services).map(id => {
                  const service = MOCK_SERVICES.find(s => s.id === id);
                  if (!service) return null;
                  return (
                    <div key={service.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          {service.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{formatVND(service.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">x1</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Payment Method */}
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Phương thức thanh toán</h3>
            <div className="space-y-3">
              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'momo' ? 'border-[#A50064] bg-[#A50064]/5' : 'border-border hover:border-[#A50064]/50'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="payment" value="momo" checked={paymentMethod === 'momo'} onChange={() => setPaymentMethod('momo')} className="w-4 h-4 accent-[#A50064]" />
                  <div className="h-8 w-8 rounded bg-[#A50064] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">MoMo</span>
                  </div>
                  <span className="font-medium">Thanh toán qua ví MoMo</span>
                </div>
                <FiCheckCircle className={`h-5 w-5 ${paymentMethod === 'momo' ? 'text-[#A50064]' : 'text-transparent'}`} />
              </label>
              
              <div className="p-3 text-sm text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                <p className="flex gap-2">
                  <span className="font-bold">Lưu ý:</span> Khách hàng chỉ có thể thanh toán trực tuyến qua MoMo. Nếu bạn muốn thanh toán bằng tiền mặt, vui lòng liên hệ nhân viên tại quầy để được hỗ trợ đặt chỗ.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary */}
        <div>
          <div className="rounded-xl border border-border bg-card sticky top-24">
            <div className="p-5 border-b border-border bg-muted/30">
              <h3 className="font-semibold">Tóm tắt đơn hàng</h3>
            </div>
            
            <div className="p-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giá thuê ({formatVND(basePrice)}/{durationUnitLabel[durationUnit]?.toLowerCase()}) x {duration}</span>
                <span className="font-medium">{formatVND(subtotal)}</span>
              </div>
              
              {addonTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dịch vụ bổ sung</span>
                  <span className="font-medium">{formatVND(addonTotal)}</span>
                </div>
              )}
              
              <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="font-semibold text-base">Tổng cộng</span>
                <span className="font-bold text-xl text-primary">{formatVND(total)}</span>
              </div>
            </div>

            <div className="p-5 bg-muted/30 rounded-b-xl">
              <Button 
                onClick={handleCheckout} 
                disabled={isProcessing}
                className="w-full bg-[#A50064] hover:bg-[#8A0053] text-white py-6"
              >
                {isProcessing ? 'Đang chuyển hướng...' : 'Thanh toán MoMo'}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Bằng việc thanh toán, bạn đồng ý với Điều khoản và Chính sách hủy của chúng tôi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCheckoutPage;
