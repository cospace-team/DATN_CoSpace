import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useToast } from '../Toast';

interface StaffReasonModalProps {
  title: string;
  /** What the action does, shown under the title. */
  description: string;
  confirmLabel: string;
  /** Ready-made reasons the counter can tap. */
  quickReasons?: string[];
  danger?: boolean;
  onClose: () => void;
  /** Runs the action; throw to keep the dialog open and show the message. */
  onSubmit: (reason: string) => Promise<void>;
}

/** A small "give a reason, then confirm" dialog for audited counter actions. */
export const StaffReasonModal: React.FC<StaffReasonModalProps> = ({
  title, description, confirmLabel, quickReasons = [], danger, onClose, onSubmit,
}) => {
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-base text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5" aria-label="Đóng"><FiX className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {quickReasons.length > 0 && (
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
          )}
          <label htmlFor="staff-reason" className="text-sm font-semibold text-foreground block">Lý do <span className="text-destructive">*</span></label>
          <textarea
            id="staff-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={255}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Mô tả ngắn, được ghi vào nhật ký"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button type="button" onClick={onClose} className="btn btn-ghost">Đóng</button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !reason.trim()}
            className={`btn disabled:opacity-50 ${danger ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'}`}
          >
            {saving ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
