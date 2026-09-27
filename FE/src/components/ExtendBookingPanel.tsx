import React, { useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { addonApi, type BookingTabDto, type ExtensionQuoteDto } from '../api/addonApi';
import { formatVND } from '../utils/formatters';
import { QuantityStepper } from './ui/QuantityStepper';

interface Props {
  bookingId: string;
  onExtended: (tab: BookingTabDto) => void;
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/**
 * Buys extra hours on a booking before it ends. The server checks the slot after the booking is
 * free and within opening hours, and prices the hours at the workspace's hourly rate; the fee goes
 * on the tab and is paid like any add-on (QR or cash).
 */
const ExtendBookingPanel: React.FC<Props> = ({ bookingId, onExtended }) => {
  const [hours, setHours] = useState(1);
  const [quote, setQuote] = useState<ExtensionQuoteDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    addonApi.extensionQuote(bookingId, hours)
      .then((q) => { if (active) setQuote(q); })
      .catch((e: Error) => { if (active) { setQuote(null); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bookingId, hours]);

  const extend = async () => {
    if (!quote?.available) return;
    if (!window.confirm(`Gia hạn thêm ${hours} giờ (đến ${timeLabel(quote.newEndAt)}) với phí ${formatVND(quote.amount)}?`)) return;
    setBusy(true);
    setError('');
    try {
      onExtended(await addonApi.extend(bookingId, hours));
      setHours(1);
    } catch (e: any) {
      setError(e.message || 'Không thể gia hạn');
    } finally {
      setBusy(false);
    }
  };

  const maxHours = Math.max(1, quote?.maxHours ?? 8);

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <FiClock className="h-3.5 w-3.5" /> Gia hạn thêm giờ
      </span>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <QuantityStepper value={hours} onChange={setHours} max={maxHours} disabled={busy} label="Số giờ gia hạn" />
        <span className="text-muted-foreground">giờ</span>
        {quote && (
          <span className="text-muted-foreground">
            {timeLabel(quote.currentEndAt)} → <strong className="text-foreground">{timeLabel(quote.newEndAt)}</strong>
            {' · '}{formatVND(quote.pricePerHour)}/giờ
          </span>
        )}
      </div>
      {quote && !quote.available && quote.reason && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{quote.reason}</p>
      )}
      <button
        type="button"
        onClick={extend}
        disabled={busy || loading || !quote?.available}
        className="btn btn-outline btn-sm text-xs"
      >
        {loading ? 'Đang tính phí…' : quote ? `Gia hạn · ${formatVND(quote.amount)}` : 'Gia hạn'}
      </button>
      <p className="text-[11px] text-muted-foreground">
        Nếu không gia hạn mà trả chỗ muộn quá 15 phút, phụ phí được tính theo giờ (làm tròn lên) × giá giờ × 1,5.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default ExtendBookingPanel;
