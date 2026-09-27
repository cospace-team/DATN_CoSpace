import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { FiExternalLink, FiLoader, FiX } from 'react-icons/fi';
import { addonApi, type TabPaymentDto } from '../api/addonApi';
import { formatVND } from '../utils/formatters';

interface Props {
  payment: TabPaymentDto;
  /** Called once PayOS reports the payment as paid. */
  onPaid: () => void;
  onClose: () => void;
}

/**
 * VietQR for what is owed on a booking's tab, shown at the counter for the guest to scan. The
 * status is polled from the backend (which only reports PAID after PayOS confirmed it).
 */
const TabQrPayment: React.FC<Props> = ({ payment, onPaid, onClose }) => {
  const [qrSrc, setQrSrc] = useState('');
  const [status, setStatus] = useState(payment.status);

  useEffect(() => {
    let active = true;
    // Demo mode hands back a ready image; live PayOS hands back the VietQR payload to encode.
    if (payment.qrCode.startsWith('http')) {
      setQrSrc(payment.qrCode);
    } else if (payment.qrCode) {
      QRCode.toDataURL(payment.qrCode, { width: 240, margin: 1 })
        .then((url) => { if (active) setQrSrc(url); })
        .catch(() => { if (active) setQrSrc(''); });
    }
    return () => { active = false; };
  }, [payment.qrCode]);

  useEffect(() => {
    // Stop asking once the payment is settled one way or the other.
    if (status === 'PAID' || status === 'CANCELLED' || status === 'FAILED') return;
    const timer = window.setInterval(async () => {
      try {
        const res = await addonApi.paymentStatus(payment.orderCode);
        setStatus(res.status);
        if (res.status === 'PAID') onPaid();
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment.orderCode, status, onPaid]);

  const closed = status === 'CANCELLED' || status === 'FAILED';

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-3 space-y-2 text-center">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Quét mã VietQR để thanh toán</span>
        <button type="button" onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground" aria-label="Đóng mã QR">
          <FiX className="h-4 w-4" />
        </button>
      </div>
      {qrSrc ? (
        <img src={qrSrc} alt={`Mã VietQR thanh toán ${formatVND(payment.amount)}`} className="mx-auto h-48 w-48 rounded-lg bg-white p-1" />
      ) : (
        <div className="mx-auto h-48 w-48 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
          Không tạo được ảnh QR
        </div>
      )}
      <p className="text-sm font-bold text-foreground">{formatVND(payment.amount)}</p>
      {status === 'PAID' ? (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Đã nhận thanh toán</p>
      ) : closed ? (
        <p className="text-xs font-semibold text-destructive">Mã QR đã hết hiệu lực, vui lòng tạo mã mới.</p>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <FiLoader className="h-3.5 w-3.5 animate-spin" /> Đang chờ khách chuyển khoản…
        </p>
      )}
      {payment.checkoutUrl && !closed && status !== 'PAID' && (
        <a
          href={payment.checkoutUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <FiExternalLink className="h-3.5 w-3.5" /> Mở trang thanh toán
        </a>
      )}
    </div>
  );
};

export default TabQrPayment;
