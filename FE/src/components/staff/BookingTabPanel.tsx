import React, { useEffect, useState } from 'react';
import { FiCoffee, FiPlus, FiTrash2, FiDollarSign } from 'react-icons/fi';
import { addonApi, ADDON_STATUS_LABEL, type BookingTabDto, type ExtraServiceDto } from '../../api/addonApi';
import { formatVND } from '../../utils/formatters';

interface Props {
  bookingId: string;
  branchId: string;
  /** Called whenever the tab is (re)loaded, so the parent can e.g. block checkout while money is owed. */
  onTabChange?: (tab: BookingTabDto | null) => void;
  compact?: boolean;
}

const statusBadge: Record<string, string> = {
  unpaid: 'badge badge-warning',
  paid: 'badge badge-success',
  void: 'badge badge-neutral',
};

/**
 * Running tab of a booking at the counter: order a service for the guest, cancel a wrong line,
 * and collect what is owed (cash or bank transfer) before the guest checks out.
 */
const BookingTabPanel: React.FC<Props> = ({ bookingId, branchId, onTabChange, compact }) => {
  const [tab, setTab] = useState<BookingTabDto | null>(null);
  const [services, setServices] = useState<ExtraServiceDto[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
  }, [bookingId, branchId]);

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

  const canOrder = tab && ['CONFIRMED', 'CHECKED_IN'].includes(tab.bookingStatus);
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
                {item.serviceName} × {item.quantity}
              </span>
              <span className={statusBadge[item.status]}>{ADDON_STATUS_LABEL[item.status]}</span>
              <span className="font-mono font-semibold w-20 text-right">{formatVND(item.subtotal)}</span>
              {item.status === 'unpaid' && tab?.bookingStatus !== 'PENDING_PAYMENT' ? (
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
          <input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="input-field text-xs w-16 !h-8"
            aria-label="Số lượng"
            disabled={busy}
          />
          <button type="button" onClick={addService} disabled={busy || !serviceId} className="btn btn-outline btn-sm text-xs">
            <FiPlus className="h-3.5 w-3.5" /> Thêm
          </button>
        </div>
      )}

      {tab && tab.unpaidAmount > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => settle('cash')} disabled={busy} className="btn btn-primary btn-sm text-xs">
            <FiDollarSign className="h-3.5 w-3.5" /> Thu tiền mặt {formatVND(tab.unpaidAmount)}
          </button>
          <button type="button" onClick={() => settle('bank_transfer')} disabled={busy} className="btn btn-secondary btn-sm text-xs">
            Đã nhận chuyển khoản
          </button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default BookingTabPanel;
