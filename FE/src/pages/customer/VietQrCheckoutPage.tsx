import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FiClock, 
  FiCopy, 
  FiCheck, 
  FiArrowLeft, 
  FiShield, 
  FiCheckCircle, 
  FiInfo,
} from 'react-icons/fi';
import { useToast } from '../../components/Toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const POPULAR_BANKS = [
  'Vietcombank', 'MB Bank', 'Techcombank', 'BIDV', 
  'VietinBank', 'TPBank', 'VPBank', 'ACB', 'MoMo', 'ZaloPay'
];

const VietQrCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const orderCode = searchParams.get('orderCode') || '';
  const amountStr = searchParams.get('amount') || '0';
  const amount = parseInt(amountStr, 10) || 0;
  const description = searchParams.get('description') || `BK ${orderCode}`;

  const bankName = "MB Bank (Ngân hàng TMCP Quân Đội)";
  const bankBin = "970422";
  const accountNumber = "0386868888";
  const accountName = "COSPACE COWORKING VIETNAM";

  // VietQR standard dynamic image URL
  const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

  // 15-Minute Countdown Timer
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'WAITING' | 'DETECTING' | 'CONFIRMED'>('WAITING');

  // Audio tone on payment success (Web Audio API)
  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  // Navigate to history upon payment confirmation
  const handlePaymentConfirmed = useCallback(() => {
    if (isPaidSuccess) return;
    setPaymentStep('CONFIRMED');
    setIsPaidSuccess(true);
    playSuccessChime();
    showToast('Thanh toán đơn hàng thành công qua VietQR!', 'success');

    setTimeout(() => {
      navigate(`/customer/history?orderId=PAYOS-${orderCode}&status=PAID&message=${encodeURIComponent('Thanh toán VietQR thành công!')}`);
    }, 1800);
  }, [isPaidSuccess, orderCode, navigate, showToast]);

  // Secret trigger function for presentation/demo
  const triggerSecretPayment = useCallback(async () => {
    if (isPaidSuccess || !orderCode) return;
    try {
      const token = localStorage.getItem('workhub_access_token');
      const res = await fetch(`${API_BASE_URL}/api/payments/payos/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderCode }),
      });
      if (!res.ok) {
        // Never show "paid" unless the backend actually recorded the payment.
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Không thể xác nhận thanh toán.');
      }
      handlePaymentConfirmed();
    } catch (err: any) {
      setPaymentStep('WAITING');
      showToast(err.message || 'Không thể xác nhận thanh toán.', 'error');
    }
  }, [isPaidSuccess, orderCode, handlePaymentConfirmed, showToast]);

  // Manual Trigger: Trigger only when clicking logo or pressing F2
  const handleTriggerPayment = useCallback(() => {
    if (isPaidSuccess || paymentStep === 'DETECTING') return;
    setPaymentStep('DETECTING');
    setTimeout(() => {
      triggerSecretPayment();
    }, 1200);
  }, [isPaidSuccess, paymentStep, triggerSecretPayment]);

  // Real-time Polling: Check backend every 2.5s if status becomes PAID
  useEffect(() => {
    if (!orderCode || isPaidSuccess) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/payos/status/${orderCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'PAID') {
            clearInterval(pollInterval);
            handlePaymentConfirmed();
          }
        }
      } catch (e) {
        // Silently retry on polling error
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [orderCode, isPaidSuccess, handlePaymentConfirmed]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Secret Demo Hotkey: F2 or Ctrl+Shift+P for keyboard convenience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p'))) {
        e.preventDefault();
        handleTriggerPayment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerPayment]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Đã sao chép ${fieldName}`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancel = () => {
    navigate(`/customer/history?orderId=PAYOS-${orderCode}&status=CANCELLED&message=${encodeURIComponent('Đã hủy giao dịch thanh toán VietQR')}`);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 font-sans animate-fade-in space-y-6">
      
      {/* Success Modal Overlay */}
      {isPaidSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border p-8 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 animate-bounce">
              <FiCheckCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Thanh toán thành công!</h2>
              <p className="text-sm text-muted-foreground">
                Hệ thống đã nhận diện giao dịch chuyển khoản VietQR cho đơn hàng <span className="font-mono font-semibold text-foreground">#{orderCode}</span>.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-2xl border border-border text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></span>
              <span>Đang tự động chuyển đến trang Lịch sử đặt chỗ...</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar Navigation & Timer */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-2xl border border-border bg-card text-foreground shadow-sm hover:bg-muted transition-all"
        >
          <FiArrowLeft className="h-4 w-4" /> Quay lại
        </button>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold font-mono border border-border shadow-sm transition-all ${
            timeLeft < 180 ? 'bg-rose-500 text-white animate-pulse' : 'bg-card text-foreground'
          }`}>
            <FiClock className="h-4 w-4 text-emerald-500" />
            <span>Thời gian giữ mã: {formatCountdown(timeLeft)}</span>
          </div>

          <button
            onClick={handleCancel}
            className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-rose-500 border border-transparent hover:border-border rounded-2xl transition-all"
          >
            Hủy đơn
          </button>
        </div>
      </div>

      {/* Main Payment Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Official VietQR Box */}
        <div className="lg:col-span-5 bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center text-center space-y-4 relative">
          
          {/* Official VietQR Header Badge */}
          <div 
            onClick={handleTriggerPayment}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border select-none cursor-pointer hover:border-blue-400/60 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-blue-600 dark:text-blue-400 text-sm">
                VietQR
              </span>
              <span className="text-muted-foreground/40 text-xs">|</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wider">
                NAPAS 247
              </span>
            </div>
            <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Trực tiếp
            </span>
          </div>

          {/* QR Code Canvas Frame */}
          <div className="p-3.5 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block transition-transform hover:scale-[1.01]">
            <img 
              src={qrImageUrl} 
              alt="Mã QR Chuyển khoản VietQR" 
              className="w-64 h-64 md:w-72 md:h-72 object-contain rounded-lg"
            />
          </div>

          {/* Live Scanning Telemetry */}
          <div className="space-y-2 w-full pt-1">
            <div className={`flex items-center justify-center gap-2 text-xs font-medium py-2.5 px-3 rounded-xl border transition-all ${
              paymentStep === 'DETECTING'
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 animate-pulse'
                : paymentStep === 'CONFIRMED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                : 'bg-muted/40 text-foreground border-border'
            }`}>
              {paymentStep === 'DETECTING' ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></span>
                  <span className="font-semibold">Đã nhận diện giao dịch! Đang gạch nợ tự động...</span>
                </>
              ) : paymentStep === 'CONFIRMED' ? (
                <>
                  <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold">Thanh toán hoàn tất!</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                  </span>
                  <span>Đang chờ bạn quét mã & chuyển khoản...</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {paymentStep === 'DETECTING'
                ? 'Vui lòng giữ nguyên màn hình, đang liên kết trạng thái ngân hàng...'
                : 'Mã QR đã nhúng chính xác số tài khoản, số tiền và mã đơn.'}
            </p>
          </div>

          {/* Supported Banks Chips */}
          <div className="w-full pt-3 border-t border-border/80">
            <p className="text-[11px] text-muted-foreground mb-2 text-left">
              Hỗ trợ quét qua ứng dụng của mọi ngân hàng:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-start">
              {POPULAR_BANKS.map((b) => (
                <span 
                  key={b} 
                  className="text-[10px] font-medium bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md border border-border/50"
                >
                  {b}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground font-medium px-1 py-0.5">
                +40 ngân hàng khác
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Transfer Info & Payment Instructions */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Amount Overview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-blue-200/80 uppercase tracking-wider block font-medium">
                  Số tiền cần thanh toán
                </span>
                <div className="text-3xl sm:text-4xl font-bold font-mono text-emerald-400 tracking-tight mt-1">
                  {formatVND(amount)}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-300 block">Mã đơn hàng</span>
                <span className="text-sm font-mono font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg inline-block mt-1">
                  #{orderCode}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Transfer Credentials */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FiInfo className="text-blue-500" /> Thông tin chuyển khoản thủ công
              </h3>
              <span className="text-xs text-muted-foreground">Nếu không quét được mã</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Ngân hàng thụ hưởng</span>
                  <span className="font-semibold text-foreground">{bankName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Chủ tài khoản</span>
                  <span className="font-semibold text-foreground uppercase tracking-wide">{accountName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Số tài khoản</span>
                  <span className="font-mono font-bold text-base sm:text-lg text-foreground">{accountNumber}</span>
                </div>
                <button
                  onClick={() => handleCopy(accountNumber, 'Số tài khoản')}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {copiedField === 'Số tài khoản' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  <span>{copiedField === 'Số tài khoản' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Số tiền chính xác</span>
                  <span className="font-mono font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">{formatVND(amount)}</span>
                </div>
                <button
                  onClick={() => handleCopy(String(amount), 'Số tiền')}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {copiedField === 'Số tiền' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  <span>{copiedField === 'Số tiền' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Mandatory Content Warning */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                <div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold block">
                    Nội dung chuyển khoản (Bắt buộc giữ nguyên)
                  </span>
                  <span className="font-mono font-bold text-base sm:text-lg text-blue-700 dark:text-blue-300">
                    {description}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(description, 'Nội dung chuyển khoản')}
                  className="px-3 py-1.5 rounded-xl border border-blue-300 bg-white dark:bg-card hover:bg-blue-50 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {copiedField === 'Nội dung chuyển khoản' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  <span>{copiedField === 'Nội dung chuyển khoản' ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <FiShield className="text-emerald-500 h-3.5 w-3.5 shrink-0" />
              <span>Giao dịch được bảo mật và tự động ghi nhận ngay sau khi tài khoản nhận được tiền.</span>
            </p>
          </div>

          {/* 3-Step Simple User Guide */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Hướng dẫn thanh toán 3 bước
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center text-[11px]">
                  1
                </span>
                <span className="font-semibold text-foreground">Mở App Ngân Hàng</span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Đăng nhập vào app ngân hàng hoặc ví điện tử bất kỳ trên điện thoại của bạn.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center text-[11px]">
                  2
                </span>
                <span className="font-semibold text-foreground">Quét mã VietQR</span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Chọn chức năng Quét mã QR và hướng camera vào mã QR hiển thị ở bên trái.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center text-[11px]">
                  3
                </span>
                <span className="font-semibold text-foreground">Xác nhận chuyển tiền</span>
                <span className="text-muted-foreground text-[11px] leading-relaxed">
                  Kiểm tra số tiền và nội dung đã điền sẵn, sau đó bấm Xác nhận thanh toán.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VietQrCheckoutPage;
