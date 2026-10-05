import React, { useEffect, useMemo, useState } from 'react';
import { FiX, FiArrowRight, FiAlertTriangle } from 'react-icons/fi';
import { staffApi, type WorkspaceMaintenanceStatusDto } from '../../api/staffApi';
import { staffBookingActionsApi } from '../../api/staffBookingActionsApi';
import { staffOpsApi } from '../../api/staffOpsApi';
import type { BookingResponse } from '../../lib/bookingApi';
import { useToast } from '../Toast';
import { Spinner } from '../ui/Spinner';

export interface MoveTarget {
  id: string;
  bookingCode: string;
  customerName?: string | null;
  workspaceId: string;
  workspaceName?: string | null;
  startAt: string;
  endAt: string;
  status: string;
  /** Week / month / contract passes keep their dates; only the seat can change. */
  isMultiDay?: boolean;
}

interface StaffMoveModalProps {
  booking: MoveTarget;
  branchId: string;
  onClose: () => void;
  onDone: () => void;
}

const QUICK_REASONS = ['Chỗ cũ hỏng / sự cố thiết bị', 'Khách yêu cầu đổi chỗ', 'Khách xin dời giờ', 'Cần nhường chỗ cho đơn khác'];
const ACTIVE = ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'];

const hhmm = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dayMonth = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Moves a paid booking to another seat of the same kind and/or another start time, keeping its
 * length and price. For a seat that broke down mid-session, or a guest who asks to come later.
 */
export const StaffMoveModal: React.FC<StaffMoveModalProps> = ({ booking, branchId, onClose, onDone }) => {
  const { showToast } = useToast();
  const start = useMemo(() => new Date(booking.startAt), [booking.startAt]);
  const end = useMemo(() => new Date(booking.endAt), [booking.endAt]);
  const lengthMs = end.getTime() - start.getTime();
  const canChangeTime = booking.status === 'CONFIRMED' && !booking.isMultiDay;

  const [spaces, setSpaces] = useState<WorkspaceMaintenanceStatusDto[]>([]);
  const [others, setOthers] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [wsId, setWsId] = useState(booking.workspaceId);
  // Minutes since midnight of the new start. Starts are normally on the hour, but a booking that is not
  // keeps its exact start as one of the choices, so "no change" stays possible.
  const [startMinutes, setStartMinutes] = useState(start.getHours() * 60 + start.getMinutes());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(end); dayEnd.setHours(0, 0, 0, 0); dayEnd.setDate(dayEnd.getDate() + 2);
    Promise.all([
      staffApi.getWorkspaceMaintenances(branchId),
      staffBookingActionsApi.list(branchId, dayStart, dayEnd),
    ])
      .then(([ws, bookings]) => { setSpaces(ws); setOthers(bookings); })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [branchId, start, end]);

  const newStart = useMemo(() => {
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(startMinutes);
    return d;
  }, [start, startMinutes]);
  const startChoices = useMemo(() => {
    const hours = Array.from({ length: 17 }, (_, i) => (i + 6) * 60);
    const current = start.getHours() * 60 + start.getMinutes();
    return hours.includes(current) ? hours : [...hours, current].sort((a, b) => a - b);
  }, [start]);
  const newEnd = useMemo(() => new Date(newStart.getTime() + lengthMs), [newStart, lengthMs]);
  // Compared by the minute: the stored start may carry seconds the picker cannot express.
  const changesTime = canChangeTime && Math.floor(newStart.getTime() / 60000) !== Math.floor(start.getTime() / 60000);

  const current = spaces.find((s) => s.workspaceId === booking.workspaceId);
  const takenAt = (id: string) => {
    const a = (canChangeTime ? newStart : start).getTime();
    const b = (canChangeTime ? newEnd : end).getTime();
    return others.some((o) =>
      o.id !== booking.id && o.workspaceId === id && ACTIVE.includes(String(o.status).toUpperCase())
      && new Date(o.startAt).getTime() < b && new Date(o.endAt).getTime() > a);
  };
  const underRepair = (s: WorkspaceMaintenanceStatusDto) => {
    const m = s.activeMaintenance;
    if (!m) return false;
    const a = (canChangeTime ? newStart : start).getTime();
    const b = (canChangeTime ? newEnd : end).getTime();
    return new Date(m.startAt).getTime() < b && new Date(m.endAt).getTime() > a;
  };

  // Only seats this booking can really move to: same kind (so the price is the same), big enough, in service.
  const choices = useMemo(() => spaces
    .filter((s) => !current || (s.workspaceTypeId === current.workspaceTypeId && (s.capacity ?? 1) >= (current.capacity ?? 1)))
    .filter((s) => s.workspaceStatus === 'active' || s.workspaceId === booking.workspaceId)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true })), [spaces, current, booking.workspaceId]);

  const changesSeat = wsId !== booking.workspaceId;
  const targetBlocked = changesSeat
    ? (() => { const s = spaces.find((x) => x.workspaceId === wsId); return !s || takenAt(wsId) || underRepair(s); })()
    : changesTime && takenAt(booking.workspaceId);
  const nothingChanged = !changesSeat && !changesTime;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await staffOpsApi.moveBooking(booking.id, {
        workspaceId: changesSeat ? wsId : undefined,
        startAt: changesTime ? newStart.toISOString() : undefined,
        reason: reason.trim(),
      });
      showToast(`Đã cập nhật đơn ${booking.bookingCode}`, 'success');
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Đổi chỗ hoặc đổi giờ">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-base text-foreground">Đổi chỗ / đổi giờ</h2>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-mono">{booking.bookingCode}</span> · {booking.customerName || 'Khách'} · giữ nguyên thời lượng và giá
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5" aria-label="Đóng"><FiX className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : (
            <>
              <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Hiện tại:</span>
                  <strong>{booking.workspaceName || current?.name}</strong>
                  <span>{dayMonth(start)} {hhmm(start)}–{hhmm(end)}</span>
                </p>
                {(changesSeat || changesTime) && (
                  <p className="flex flex-wrap items-center gap-2 text-primary">
                    <FiArrowRight className="h-4 w-4" />
                    <strong>{spaces.find((s) => s.workspaceId === wsId)?.name}</strong>
                    <span>{dayMonth(newStart)} {hhmm(newStart)}–{hhmm(newEnd)}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="move-seat" className="text-sm font-semibold text-foreground block mb-1">Chỗ mới</label>
                <select id="move-seat" value={wsId} onChange={(e) => setWsId(e.target.value)} className="input-field w-full text-sm">
                  {choices.map((s) => {
                    const mine = s.workspaceId === booking.workspaceId;
                    const note = mine ? '(chỗ hiện tại)' : takenAt(s.workspaceId) ? '— đã có người đặt' : underRepair(s) ? '— đang bảo trì' : '— trống';
                    const blocked = !mine && (takenAt(s.workspaceId) || underRepair(s));
                    return (
                      <option key={s.workspaceId} value={s.workspaceId} disabled={blocked}>
                        {s.name} · {s.capacity ?? 1} chỗ {note}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Chỉ hiện chỗ cùng loại và đủ sức chứa, để giá không đổi.</p>
              </div>

              <div>
                <label htmlFor="move-hour" className="text-sm font-semibold text-foreground block mb-1">Giờ bắt đầu mới</label>
                {canChangeTime ? (
                  <select id="move-hour" value={startMinutes} onChange={(e) => setStartMinutes(Number(e.target.value))} className="input-field w-full text-sm">
                    {startChoices.map((m) => {
                      const from = new Date(start); from.setHours(0, 0, 0, 0); from.setMinutes(m);
                      return <option key={m} value={m}>{hhmm(from)} – {hhmm(new Date(from.getTime() + lengthMs))}</option>;
                    })}
                  </select>
                ) : (
                  <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                    {booking.status === 'CHECKED_IN'
                      ? 'Khách đã check-in nên chỉ đổi được chỗ, không đổi giờ.'
                      : 'Gói nhiều ngày giữ nguyên ngày; chỉ đổi được chỗ.'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="move-reason" className="text-sm font-semibold text-foreground block">Lý do (khách sẽ nhận được) <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REASONS.map((r) => (
                    <button key={r} type="button" onClick={() => setReason(r)}
                      className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer ${reason === r ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <textarea id="move-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={255}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Mô tả ngắn lý do" />
              </div>

              {targetBlocked && (
                <p className="text-xs text-amber-700 dark:text-amber-400 flex gap-1.5">
                  <FiAlertTriangle className="h-4 w-4 shrink-0" /> Khung giờ này đã có người đặt hoặc đang bảo trì. Hãy chọn chỗ hoặc giờ khác.
                </p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button type="button" onClick={onClose} className="btn btn-ghost">Đóng</button>
          <button type="button" onClick={submit} disabled={saving || loading || !!loadError || nothingChanged || !!targetBlocked || !reason.trim()} className="btn btn-primary disabled:opacity-50">
            {saving ? 'Đang cập nhật…' : 'Xác nhận đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};
