import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiX, FiRotateCcw, FiLogOut } from 'react-icons/fi';
import {
  staffBookingActionsApi,
  type EndEarlyRefundMode,
  type StaffRefundPreview,
} from '../../api/staffBookingActionsApi';
import { formatVND } from '../../utils/formatters';
import { useToast } from '../Toast';
import { Spinner } from '../ui/Spinner';

interface StaffBookingActionModalProps {
  bookingId: string;
  customerName?: string;
  workspaceName?: string;
  onClose: () => void;
  /** Called after the booking was cancelled or ended. */
  onDone: () => void;
}

const QUICK_REASONS_IN_USE = ['Bảo trì đột xuất', 'Mất điện / mất mạng', 'Sự cố thiết bị trong phòng', 'Khách vi phạm nội quy', 'Khách yêu cầu về sớm'];
const QUICK_REASONS_CANCEL = ['Phòng không sử dụng được', 'Trùng lịch do cơ sở', 'Khách yêu cầu hủy tại quầy', 'Cơ sở đóng cửa đột xuất'];

const time = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/**
 * Lets staff or an admin stop a customer's booking and refund them: a booking not started yet is
 * cancelled (full refund when the branch is at fault, otherwise the cancellation policy); a booking
 * in use is ended now with the unused time, everything, or a chosen amount refunded. Refunds land on
 * the Refunds page to be paid out.
 */
export const StaffBookingActionModal: React.FC<StaffBookingActionModalProps> = ({
  bookingId, customerName, workspaceName, onClose, onDone,
}) => {
  const { showToast } = useToast();
  const [preview, setPreview] = useState<StaffRefundPreview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reason, setReason] = useState('');
  const [waive, setWaive] = useState(true);
  const [mode, setMode] = useState<EndEarlyRefundMode>('UNUSED');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    staffBookingActionsApi.refundPreview(bookingId).then(setPreview).catch((e: Error) => setLoadError(e.message));
  }, [bookingId]);

  const inUse = !!preview?.inUse;
  const cancellable = !!preview && !inUse && ['CONFIRMED', 'PENDING_PAYMENT'].includes(preview.status);
  const customValue = custom.trim() === '' ? NaN : Number(custom.replace(/\D/g, ''));
  const refundAmount = !preview
    ? 0
    : inUse
      ? mode === 'UNUSED' ? preview.unusedRefund : mode === 'FULL' ? preview.refundable : (isNaN(customValue) ? 0 : customValue)
      : waive ? preview.refundable : preview.policyRefund;
  const customInvalid = inUse && mode === 'CUSTOM' && (isNaN(customValue) || customValue > (preview?.refundable ?? 0));

  const submit = async () => {
    if (!preview || !reason.trim() || customInvalid) return;
    setSaving(true);
    try {
      if (inUse) {
        const res = await staffBookingActionsApi.endEarly(bookingId, reason.trim(), mode, mode === 'CUSTOM' ? customValue : undefined);
        showToast(`Đã kết thúc sớm đơn ${res.bookingCode}${res.refundAmount > 0 ? `, hoàn ${formatVND(res.refundAmount)}` : ''}.`, 'success');
      } else {
        const res = await staffBookingActionsApi.cancel(bookingId, reason.trim(), waive);
        showToast(`Đã hủy đơn ${preview.bookingCode}${res.refundAmount > 0 ? `, hoàn ${formatVND(res.refundAmount)}` : ''}.`, 'success');
      }
      onDone();
      onClose();
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const option = (checked: boolean, onSelect: () => void, title: string, detail: React.ReactNode, amount?: number) => (
    <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
      <input type="radio" checked={checked} onChange={onSelect} className="mt-1 accent-[var(--brand-primary)]" />
      <span className="flex-1 min-w-0">
        <span className="font-medium text-sm text-foreground block">{title}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
      {amount !== undefined && <span className="font-mono text-sm font-semibold text-foreground shrink-0">{formatVND(amount)}</span>}
    </label>
  );

  const quickReasons = inUse ? QUICK_REASONS_IN_USE : QUICK_REASONS_CANCEL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-action-title"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-600">
              {inUse ? <FiLogOut className="h-5 w-5" /> : <FiRotateCcw className="h-5 w-5" />}
            </div>
            <div>
              <h3 id="staff-action-title" className="font-bold text-foreground">
                {inUse ? 'Kết thúc sớm & hoàn tiền' : 'Hủy đơn & hoàn tiền'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {[preview?.bookingCode, customerName, workspaceName].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!preview && !loadError && <div className="flex justify-center py-6"><Spinner /></div>}
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}

          {preview && !inUse && !cancellable && (
            <p className="text-sm text-muted-foreground">Đơn ở trạng thái này không thể hủy hay kết thúc sớm.</p>
          )}

          {preview && (inUse || cancellable) && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Thời gian đặt</p>
                  <p className="font-medium text-foreground">{time(preview.startAt)} → {time(preview.endAt)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Khách đã trả (còn hoàn được)</p>
                  <p className="font-mono font-semibold text-foreground">{formatVND(preview.refundable)}</p>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-foreground mb-2">Số tiền hoàn</legend>
                {inUse ? (
                  <>
                    {option(mode === 'UNUSED', () => setMode('UNUSED'), 'Hoàn phần thời gian chưa dùng', 'Tính theo tỷ lệ thời gian còn lại của đơn', preview.unusedRefund)}
                    {option(mode === 'FULL', () => setMode('FULL'), 'Hoàn toàn bộ', 'Lỗi hoàn toàn do cơ sở', preview.refundable)}
                    {option(mode === 'CUSTOM', () => setMode('CUSTOM'), 'Số tiền khác', (
                      <span className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={custom}
                          onChange={(e) => { setMode('CUSTOM'); setCustom(e.target.value); }}
                          placeholder="0 = không hoàn"
                          className="input-field text-sm w-36"
                          aria-label="Số tiền hoàn"
                        />
                        <span>tối đa {formatVND(preview.refundable)}</span>
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    {option(waive, () => setWaive(true), 'Lỗi do cơ sở, hoàn 100%', 'Bỏ qua chính sách hủy', preview.refundable)}
                    {option(!waive, () => setWaive(false), 'Theo chính sách hủy',
                      `${preview.policyName ?? 'Chính sách hiện hành'} · hoàn ${preview.policyPercent}% tiền thuê`, preview.policyRefund)}
                  </>
                )}
              </fieldset>

              <div className="space-y-2">
                <label htmlFor="staff-action-reason" className="text-sm font-semibold text-foreground">Lý do (khách sẽ nhận được)</label>
                <div className="flex flex-wrap gap-1.5">
                  {quickReasons.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer ${reason === r ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <textarea
                  id="staff-action-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={255}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Mô tả ngắn lý do"
                />
              </div>

              {inUse && preview.unpaidAddons > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 flex gap-1.5">
                  <FiAlertTriangle className="h-4 w-4 shrink-0" />
                  Khách còn {formatVND(preview.unpaidAddons)} dịch vụ gọi thêm chưa thanh toán; khoản này vẫn được giữ trên đơn.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {inUse ? 'Khách sẽ được check-out ngay. ' : ''}Khoản hoàn chuyển vào mục <strong>Hoàn tiền</strong> để chi trả (chuyển khoản, tiền mặt hoặc voucher). Thao tác được ghi vào nhật ký.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button type="button" onClick={onClose} className="btn btn-ghost">Đóng</button>
          {preview && (inUse || cancellable) && (
            <button
              type="button"
              onClick={submit}
              disabled={saving || !reason.trim() || customInvalid}
              className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Đang xử lý…' : `${inUse ? 'Kết thúc sớm' : 'Hủy đơn'} · hoàn ${formatVND(refundAmount)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
