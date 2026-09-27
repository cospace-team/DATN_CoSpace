import React, { useCallback, useEffect, useState } from 'react';
import { FiCoffee, FiPlus, FiTrash2, FiDollarSign, FiCreditCard } from 'react-icons/fi';
import {
  addonApi, ADDON_LINE_TYPE_LABEL, ADDON_STATUS_LABEL,
  type BookingTabDto, type ExtraServiceDto, type TabPaymentDto,
} from '../../api/addonApi';
import { formatVND } from '../../utils/formatters';
import { QuantityStepper } from '../ui/QuantityStepper';
import TabQrPayment from '../TabQrPayment';

interface Props {
  bookingId: string;
  branchId: string;
  /** Called whenever the tab is (re)loaded, so the parent can e.g. block checkout while money is owed. */
  onTabChange?: (tab: BookingTabDto | null) => void;
  compact?: boolean;
  /** Bump to reload the tab after it was changed elsewhere (late fee, extension). */
  refreshKey?: number;
}

const statusBadge: Record<string, string> = {
  unpaid: 'badge badge-warning',
  paid: 'badge badge-success',
  void: 'badge badge-neutral',
};

/**
 * Running tab of a booking at the counter: order a service for the guest, change quantities,
 * cancel a wrong line, and collect what is owed (cash or VietQR) before the guest checks out.
 */
const BookingTabPanel: React.FC<Props> = ({ bookingId, branchId, onTabChange, compact, refreshKey = 0 }) => {
  const [tab, setTab] = useState<BookingTabDto | null>(null);
  const [services, setServices] = useState<ExtraServiceDto[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [qrPayment, setQrPayment] = useState<TabPaymentDto | null>(null);

  const applyTab = (next: BookingTabDto | null) => {
    setTab(next);
    onTabChange?.(next);
  };

  useEffect(() => {
    let active = true;
    setError('');
    addonApi.getTab(bookingId)
      .then((t) => { if (active) applyTab(t); })
      .catch((e: Error) => { if (active) { applyTab(null); setError(e.message); } });
    if (branchId) {
      addonApi.listServices(branchId)
        .then((list) => { if (active) setServices(list); })
        .catch(() => { if (active) setServices([]); });
    }
    return () => { active = false; };
  }, [bookingId, branchId, refreshKey]);

  const run = async (action: () => Promise<BookingTabDto>) => {
    setBusy(true);
    setError('');
    try {
      applyTab(await action());
    } catch (e: any) {
      setError(e.message || 'Thao tác không thành công');
    } finally {
      setBusy(false);
    }
  };

  const addService = () => {
    if (!serviceId) return;
    run(() => addonApi.add(bookingId, { serviceId, quantity })).then(() => {
      setServiceId('');
      setQuantity(1);
    });
  };

  const settle = (method: 'cash' | 'bank_transfer') => {
    if (!tab || tab.unpaidAmount <= 0) return;
    const label = method === 'cash' ? 'tiền mặt' : 'chuyển khoản';
    if (!window.confirm(`Xác nhận đã thu ${formatVND(tab.unpaidAmount)} bằng ${label}?`)) return;
    run(() => addonApi.settle(bookingId, method));
  };

  const showQr = async () => {
    setBusy(true);
    setError('');
    try {
      setQrPayment(await addonApi.payByQr(bookingId));
    } catch (e: any) {
      setError(e.message || 'Không thể tạo mã QR');
    } finally {
      setBusy(false);
    }
  };

  const handleQrPaid = useCallback(() => {
    addonApi.getTab(bookingId).then((t) => {
      setTab(t);
      onTabChange?.(t);
    }).catch(() => undefined);
    window.setTimeout(() => setQrPayment(null), 1500);
  }, [bookingId, onTabChange]);

  const canOrder = tab && ['CONFIRMED', 'CHECKED_IN'].includes(tab.bookingStatus);
  const canEdit = !!tab && tab.bookingStatus !== 'PENDING_PAYMENT';
  const visibleItems = (tab?.items || []).filter((i) => i.status !== 'void');

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <FiCoffee className="h-3.5 w-3.5" /> Dịch vụ gọi thêm
        </span>
        {tab && (
          <span className={`text-xs font-bold ${tab.unpaidAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {tab.unpaidAmount > 0 ? `Còn nợ ${formatVND(tab.unpaidAmount)}` : 'Không còn nợ'}
          </span>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có dịch vụ nào.</p>
      ) : (
        <ul className={`space-y-1.5 ${compact ? 'max-h-40' : 'max-h-56'} overflow-y-auto`}>
          {visibleItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 min-w-0 truncate text-foreground">
                {item.lineType !== 'service' && (
                  <span className="mr-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {ADDON_LINE_TYPE_LABEL[item.lineType]}
                  </span>
                )}
                {item.serviceName}
                {item.lineType === 'service' && !(item.status === 'unpaid' && canEdit) && ` × ${item.quantity}`}
              </span>
              {item.lineType === 'service' && item.status === 'unpaid' && canEdit && (
                <QuantityStepper
                  value={item.quantity}
                  disabled={busy}
                  onChange={(q) => run(() => addonApi.updateQuantity(bookingId, item.id, q))}
                  label={`Số lượng ${item.serviceName}`}
                />
              )}
              <span className={statusBadge[item.status]}>{ADDON_STATUS_LABEL[item.status]}</span>
              <span className="font-mono font-semibold w-20 text-right">{formatVND(item.subtotal)}</span>
              {item.status === 'unpaid' && canEdit ? (
                <button
                  type="button"
                  onClick={() => window.confirm(`Hủy "${item.serviceName}"?`) && run(() => addonApi.voidItem(bookingId, item.id))}
                  disabled={busy}
                  className="p-1 rounded text-muted-foreground hover:text-destructive"
                  aria-label={`Hủy ${item.serviceName}`}
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="w-[22px]" />
              )}
            </li>
          ))}
        </ul>
      )}

      {canOrder && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="input-field text-xs flex-1 min-w-[10rem] !h-8"
            disabled={busy}
          >
            <option value="">Chọn dịch vụ…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatVND(s.price)}/{s.unit}
              </option>
            ))}
          </select>
          <QuantityStepper value={quantity} onChange={setQuantity} disabled={busy} />
          <button type="button" onClick={addService} disabled={busy || !serviceId} className="btn btn-outline btn-sm text-xs">
            <FiPlus className="h-3.5 w-3.5" /> Thêm
          </button>
        </div>
      )}

      {tab && tab.unpaidAmount > 0 && !qrPayment && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => settle('cash')} disabled={busy} className="btn btn-primary btn-sm text-xs">
            <FiDollarSign className="h-3.5 w-3.5" /> Thu tiền mặt {formatVND(tab.unpaidAmount)}
          </button>
          <button type="button" onClick={showQr} disabled={busy} className="btn btn-secondary btn-sm text-xs">
            <FiCreditCard className="h-3.5 w-3.5" /> Thu bằng QR
          </button>
          <button type="button" onClick={() => settle('bank_transfer')} disabled={busy} className="btn btn-outline btn-sm text-xs">
            Đã nhận chuyển khoản
          </button>
        </div>
      )}

      {qrPayment && (
        <TabQrPayment payment={qrPayment} onPaid={handleQrPaid} onClose={() => setQrPayment(null)} />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default BookingTabPanel;
