import React, { useEffect, useState } from 'react';
import { FiRotateCcw, FiShield, FiX } from 'react-icons/fi';
import { reputationApi, type MyReputationDto, type ReputationEventDto } from '../../api/loyaltyApi';
import { useToast } from '../Toast';
import { Spinner } from '../ui/Spinner';
import { reputationTone } from './ReputationBadge';

const REASON_LABEL: Record<string, string> = {
  missed_checkin: 'Không check-in đúng hạn',
  on_time_checkin: 'Check-in đúng giờ',
  penalty_reverted: 'Hoàn điểm phạt',
};

const RESTRICTION_LABEL: Record<MyReputationDto['restriction'], string> = {
  none: 'Đặt chỗ online bình thường',
  limited: 'Chỉ được giữ 1 đơn chưa sử dụng khi đặt online',
  blocked: 'Không thể đặt online, chỉ đặt tại quầy',
};

interface CustomerReputationModalProps {
  userId: string;
  onClose: () => void;
  /** Called with the new score after a penalty is reverted. */
  onChanged?: (score: number) => void;
}

/**
 * Staff / admin view of a customer's reputation: score, booking restriction and history, with a
 * way to give back a missed check-in penalty when the guest did come (e.g. was never scanned in).
 */
export const CustomerReputationModal: React.FC<CustomerReputationModalProps> = ({ userId, onClose, onChanged }) => {
  const { showToast } = useToast();
  const [data, setData] = useState<MyReputationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reverting, setReverting] = useState<ReputationEventDto | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reputationApi.ofCustomer(userId).then(setData).catch((e: Error) => setError(e.message));
  }, [userId]);

  const submitRevert = async () => {
    if (!reverting?.bookingId || !reason.trim()) return;
    setSaving(true);
    try {
      const updated = await reputationApi.revertPenalty(reverting.bookingId, reason.trim());
      setData(updated);
      onChanged?.(updated.score);
      setReverting(null);
      setReason('');
      showToast('Đã hoàn điểm uy tín cho khách.', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in space-y-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reputation-modal-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600"><FiShield className="h-5 w-5" /></div>
            <div>
              <h3 id="reputation-modal-title" className="font-bold text-foreground">Điểm uy tín</h3>
              {data && <p className="text-xs text-muted-foreground">{data.fullName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer" aria-label="Đóng">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {!data && !error && <div className="flex justify-center py-8"><Spinner /></div>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {data && (
          <>
            <div className={`rounded-xl border p-4 ${reputationTone(data.score)}`}>
              <p className="text-3xl font-bold">
                {data.score}<span className="text-base font-semibold opacity-70">/{data.maxScore}</span>
              </p>
              <p className="text-sm font-medium mt-1">{RESTRICTION_LABEL[data.restriction]}</p>
              <p className="text-xs mt-1 opacity-80">
                {data.missedCheckinCount} lần không check-in đúng hạn · trừ {data.missedCheckinPenalty} điểm/lần,
                check-in đúng giờ được cộng {data.onTimeCheckinReward} điểm
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Lịch sử gần đây</h4>
              {data.recentEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có thay đổi nào.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {data.recentEvents.map((e) => (
                    <li key={e.id} className="p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">{REASON_LABEL[e.reason] ?? e.reason}</span>
                        <span className={`font-bold tabular-nums ${e.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {e.delta > 0 ? `+${e.delta}` : e.delta}
                        </span>
                      </div>
                      {e.note && <p className="text-xs text-muted-foreground">{e.note}</p>}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString('vi-VN')} · còn {e.scoreAfter} điểm
                        </span>
                        {e.reason === 'missed_checkin' && e.bookingId && (
                          e.reverted ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Đã hoàn điểm</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setReverting(e); setReason(''); }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                            >
                              <FiRotateCcw className="h-3 w-3" /> Hoàn điểm
                            </button>
                          )
                        )}
                      </div>
                      {reverting?.id === e.id && (
                        <div className="pt-2 space-y-2">
                          <textarea
                            value={reason}
                            onChange={(ev) => setReason(ev.target.value)}
                            rows={2}
                            maxLength={200}
                            placeholder="Lý do hoàn điểm (vd: khách đã đến nhưng chưa được quét mã)"
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setReverting(null)} className="btn btn-ghost !h-8 text-xs">Hủy</button>
                            <button
                              type="button"
                              onClick={submitRevert}
                              disabled={saving || !reason.trim()}
                              className="btn btn-primary !h-8 text-xs"
                            >
                              {saving ? 'Đang lưu…' : 'Xác nhận hoàn điểm'}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
