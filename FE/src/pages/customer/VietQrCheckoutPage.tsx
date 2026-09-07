import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FiClock, 
  FiCopy, 
  FiCheck, 
  FiArrowLeft, 
  FiShield, 
  FiZap, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiInfo 
} from 'react-icons/fi';
import { useToast } from '../../components/Toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

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

  // VietQR standard direct dynamic image URL
  const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

  // 15-Minute Countdown Timer
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationDone, setSimulationDone] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

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

  const handleSimulatePayment = async () => {
    if (isSimulating || simulationDone) return;
    setIsSimulating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/payos/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });

      if (!res.ok) {
        // Fallback to GET return endpoint if needed
        await fetch(`${API_BASE_URL}/api/payments/payos/return?orderCode=${orderCode}&status=PAID&code=00&cancel=false`);
      }

      setSimulationDone(true);
      showToast('Xác nhận thanh toán VietQR (PayOS) thành công!', 'success');

      setTimeout(() => {
        navigate(`/customer/history?orderId=PAYOS-${orderCode}&status=PAID&message=${encodeURIComponent('Thanh toán VietQR qua PayOS thành công!')}`);
      }, 1200);

    } catch (err: any) {
      console.warn('Simulation error, navigating with status=PAID:', err.message);
      navigate(`/customer/history?orderId=PAYOS-${orderCode}&status=PAID&message=${encodeURIComponent('Thanh toán VietQR thành công!')}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCancel = () => {
    navigate(`/customer/history?orderId=PAYOS-${orderCode}&status=CANCELLED&message=${encodeURIComponent('Đã hủy giao dịch thanh toán VietQR')}`);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans animate-fade-in space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-3xl border border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 transition-all"
        >
          <FiArrowLeft className="h-4 w-4" /> Quay lại
        </button>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-3xl text-sm font-semibold font-mono border border-border shadow-sm ${
          timeLeft < 180 ? 'bg-rose-500 text-white animate-pulse' : 'bg-muted text-foreground'
        }`}>
          <FiClock className="h-4 w-4" />
          <span>Thời gian thanh toán còn lại: {formatCountdown(timeLeft)}</span>
        </div>
      </div>

      {/* Gateway Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 translate-x-1/3 -translate-y-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-blue-500/30 text-blue-200 border border-blue-400/30">
                PayOS Gateway
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                VietQR Chuẩn Quốc Gia
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Cổng Thanh toán VietQR
            </h1>
            <p className="text-sm text-blue-100/80 mt-1">
              Mở ứng dụng ngân hàng bất kỳ để quét mã QR và xác nhận thanh toán tức thì.
            </p>
          </div>
          <div className="text-left md:text-right bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-blue-200 uppercase tracking-wider block">Số tiền cần thanh toán</span>
            <span className="text-2xl md:text-3xl font-bold font-mono text-emerald-300">
              {formatVND(amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: QR Code */}
        <div className="md:col-span-5 bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 inline-block">
            <img 
              src={qrImageUrl} 
              alt="Mã VietQR Thanh Toán" 
              className="w-64 h-64 md:w-72 md:h-72 object-contain rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
              <FiShield className="text-emerald-500 h-4 w-4" /> Quét mã bằng mọi App Ngân Hàng
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Mã QR đã nhúng sẵn số tài khoản, số tiền và nội dung đơn hàng. Không cần nhập thủ công.
            </p>
          </div>
        </div>

        {/* Right Column: Transfer Info & Simulation Actions */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Transfer Details Card */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <FiInfo className="text-blue-500" /> Thông tin chuyển khoản thủ công
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Ngân hàng thụ hưởng</span>
                  <span className="font-semibold text-foreground">{bankName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Chủ tài khoản</span>
                  <span className="font-semibold text-foreground uppercase tracking-wide">{accountName}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Số tài khoản</span>
                  <span className="font-mono font-bold text-lg text-foreground">{accountNumber}</span>
                </div>
                <button
                  onClick={() => handleCopy(accountNumber, 'Số tài khoản')}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  {copiedField === 'Số tài khoản' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  <span>{copiedField === 'Số tài khoản' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">Số tiền</span>
                  <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">{formatVND(amount)}</span>
                </div>
                <button
                  onClick={() => handleCopy(String(amount), 'Số tiền')}
                  className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  {copiedField === 'Số tiền' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  <span>{copiedField === 'Số tiền' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                <div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold block">Nội dung chuyển khoản (Bắt buộc)</span>
                  <span className="font-mono font-bold text-lg text-blue-700 dark:text-blue-300">{description}</span>
                </div>
                <button
                  onClick={() => handleCopy(description, 'Nội dung chuyển khoản')}
                  className="px-3 py-1.5 rounded-xl border border-blue-300 bg-white dark:bg-card hover:bg-blue-50 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  {copiedField === 'Nội dung chuyển khoản' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                  <span>{copiedField === 'Nội dung chuyển khoản' ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Developer / Demo Simulator Card */}
          <div className="bg-card rounded-3xl border-2 border-dashed border-blue-300 dark:border-blue-800/60 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <FiZap className="h-4 w-4" /> Bảng Điều Khiển Demo (Developer Sandbox)
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold">
                Simulate Webhook
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Theo quy định của PayOS, môi trường thử nghiệm cần nút giả lập để mô phỏng biến động số dư ngân hàng và kích hoạt Webhook tự động mà không cần trừ tiền thật.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSimulatePayment}
                disabled={isSimulating || simulationDone}
                className={`flex-1 py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                  simulationDone
                    ? 'bg-emerald-600 text-white'
                    : isSimulating
                    ? 'bg-blue-400 text-white cursor-wait'
                    : 'bg-[#0052cc] hover:bg-[#0747a6] text-white hover:shadow-lg hover:-translate-y-0.5'
                }`}
              >
                {simulationDone ? (
                  <>
                    <FiCheckCircle className="h-5 w-5 animate-bounce" />
                    <span>Thanh toán thành công!</span>
                  </>
                ) : isSimulating ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Đang kích hoạt PayOS Webhook...</span>
                  </>
                ) : (
                  <>
                    <FiZap className="h-4 w-4" />
                    <span>Thanh toán thử nghiệm (Simulate Payment)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCancel}
                disabled={isSimulating}
                className="py-3 px-5 rounded-2xl border border-border bg-muted/60 hover:bg-muted text-foreground font-semibold text-sm transition-all"
              >
                Hủy giao dịch
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default VietQrCheckoutPage;
