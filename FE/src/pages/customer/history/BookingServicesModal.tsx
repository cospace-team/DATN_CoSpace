import React, { useEffect, useState } from 'react';
import { FiCoffee, FiCreditCard, FiDollarSign, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import {
  addonApi, ADDON_LINE_TYPE_LABEL, ADDON_STATUS_LABEL,
  type BookingTabDto, type ExtraServiceDto,
} from '../../../api/addonApi';
import { formatVND } from '../../../utils/formatters';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import ExtendBookingPanel from '../../../components/ExtendBookingPanel';

interface Props {
  bookingId: string;
  bookingCode: string;
  branchId: string;
  currentUserId: string;
  onClose: () => void;
  /** The booking's total changed (services, extension); the list should reload. */
  onChanged: () => void;
}

const statusClass: Record<string, string> = {
  unpaid: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  void: 'bg-muted text-muted-foreground border-border',
};

/**
 * Customer's running tab for a confirmed or in-use booking: order more services (with quantity),
 * change or remove the unpaid ones they ordered, extend the booking, and pay what is owed by
 * VietQR — or choose to pay in cash at the counter.
 */
const BookingServicesModal: React.FC<Props> = ({ bookingId, bookingCode, branchId, currentUserId, onClose, onChanged }) => {
  const [tab, setTab] = useState<BookingTabDto | null>(null);
  const [catalogue, setCatalogue] = useState<ExtraServiceDto[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cashChosen, setCashChosen] = useState(false);

  useEffect(() => {
    let active = true;
    addonApi.getTab(bookingId)
      .then((t) => { if (active) setTab(t); })
      .catch((e: Error) => { if (active) setError(e.message); });
    if (branchId) {
      addonApi.listServices(branchId)
        .then((list) => { if (active) setCatalogue(list.filter((s) => (s.isActive ?? s.active) !== false)); })
        .catch(() => { if (active) setCatalogue([]); });
    }
    return () => { active = false; };
  }, [bookingId, branchId]);

  const run = async (action: () => Promise<BookingTabDto>) => {
    setBusy(true);
    setError('');
    try {
      setTab(await action());
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Thao tác không thành công');
    } finally {
      setBusy(false);
    }
  };

  const addService = async () => {
    if (!serviceId) return;
    await run(() => addonApi.add(bookingId, { serviceId, quantity }));
    setServiceId('');
    setQuantity(1);
  };

  const payByQr = async () => {
    setBusy(true);
    setError('');
    try {
      const payment = await addonApi.payByQr(bookingId);
      if (payment.checkoutUrl.startsWith('http')) {
        window.location.href = payment.checkoutUrl;
        return;
      }
      setError('Không mở được trang thanh toán VietQR.');
    } catch (e: any) {
      setError(e.message || 'Không thể tạo mã QR');
    } finally {
      setBusy(false);
    }
  };

  const canOrder = !!tab && ['CONFIRMED', 'CHECKED_IN'].includes(tab.bookingStatus);
  const items = (tab?.items || []).filter((i) => i.status !== 'void');
  const selected = catalogue.find((s) => s.id === serviceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-scale-in">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-sm p-6 space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 h-9 w-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
          aria-label="Đóng"
        >
          <FiX className="h-5 w-5" />
        </button>
        <div>
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FiCoffee className="h-5 w-5" /> Dịch vụ & gia hạn
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Đơn {bookingCode}</p>
        </div>

        {/* Lines */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa gọi dịch vụ nào.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const editable = item.status === 'unpaid' && item.lineType === 'service'
                && item.createdBy === currentUserId && tab?.bookingStatus !== 'PENDING_PAYMENT';
              return (
                <li key={item.id} className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {item.lineType !== 'service' && (
                        <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {ADDON_LINE_TYPE_LABEL[item.lineType]}
                        </span>
                      )}
                      {item.serviceName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatVND(item.unitPrice)}{item.lineType === 'service' ? ` × ${item.quantity}` : ''}
                    </p>
                  </div>
                  {editable && (
                    <QuantityStepper
                      value={item.quantity}
                      disabled={busy}
                      onChange={(q) => run(() => addonApi.updateQuantity(bookingId, item.id, q))}
                      label={`Số lượng ${item.serviceName}`}
                    />
                  )}
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass[item.status]}`}>
                    {ADDON_STATUS_LABEL[item.status]}
                  </span>
                  <span className="w-20 shrink-0 text-right font-mono text-xs font-semibold">{formatVND(item.subtotal)}</span>
                  {editable ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => window.confirm(`Bỏ "${item.serviceName}"?`) && run(() => addonApi.voidItem(bookingId, item.id))}
                      className="p-1 rounded text-muted-foreground hover:text-destructive"
                      aria-label={`Bỏ ${item.serviceName}`}
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="w-6" />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Order more */}
        {canOrder && (
          <div className="rounded-xl border border-border p-3 space-y-2">
            <p className="text-xs font-bold text-foreground">Gọi thêm dịch vụ</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="input-field text-sm flex-1 min-w-[12rem]"
                disabled={busy}
              >
                <option value="">Chọn dịch vụ…</option>
                {catalogue.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatVND(s.price)}/{s.unit}
                  </option>
                ))}
              </select>
              <QuantityStepper value={quantity} onChange={setQuantity} disabled={busy} size="md" />
              <button type="button" onClick={addService} disabled={busy || !serviceId} className="btn btn-primary btn-sm text-xs">
                <FiPlus className="h-4 w-4" /> Thêm{selected ? ` · ${formatVND(selected.price * quantity)}` : ''}
              </button>
            </div>
          </div>
        )}

        {canOrder && <ExtendBookingPanel bookingId={bookingId} onExtended={(t) => { setTab(t); onChanged(); }} />}

        {/* Pay */}
        {tab && tab.unpaidAmount > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Cần thanh toán</span>
              <span className="font-mono font-bold text-foreground">{formatVND(tab.unpaidAmount)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={payByQr} disabled={busy} className="btn btn-primary btn-sm text-xs">
                <FiCreditCard className="h-4 w-4" /> Thanh toán VietQR
              </button>
              <button type="button" onClick={() => setCashChosen(true)} disabled={busy} className="btn btn-outline btn-sm text-xs">
                <FiDollarSign className="h-4 w-4" /> Trả tiền mặt tại quầy
              </button>
            </div>
            {cashChosen && (
              <p className="text-xs text-muted-foreground">
                Vui lòng thanh toán {formatVND(tab.unpaidAmount)} tại quầy lễ tân trước khi check-out. Nhân viên sẽ xác nhận trên hệ thống.
              </p>
            )}
          </div>
        )}
        {tab && tab.unpaidAmount === 0 && tab.paidAmount > 0 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Bạn đã thanh toán đủ các dịch vụ.</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
};

export default BookingServicesModal;
