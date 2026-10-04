import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Modal } from './ui/Modal';
import type { MaintenanceImpact } from '../api/staffApi';

interface Props {
  workspaceName: string;
  bookings: MaintenanceImpact[];
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const time = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/**
 * Shown when locking a workspace would cancel or cut short customers' bookings: the server lists
 * them and nothing happens until the person confirms having seen what it does to each one.
 */
const AffectedBookingsDialog: React.FC<Props> = ({ workspaceName, bookings, submitting, onConfirm, onCancel }) => (
  <Modal title={`Khóa "${workspaceName}" sẽ ảnh hưởng ${bookings.length} đơn`} onClose={onCancel} className="max-w-lg">
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <FiAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        Khách sẽ nhận thông báo và được hoàn tiền tự động. Nếu có chỗ trống tương đương, hãy cân nhắc
        liên hệ khách để chuyển chỗ trước khi khóa.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {bookings.map((b) => (
          <li key={b.bookingCode} className="p-3 text-sm space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{b.customerName || 'Khách vãng lai'}</span>
              <span className="font-mono text-xs text-muted-foreground">{b.bookingCode}</span>
            </div>
            <p className="text-xs text-muted-foreground">{time(b.startAt)} → {time(b.endAt)}</p>
            <p className="text-xs font-medium text-destructive">{b.outcome}</p>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn btn-outline btn-sm" disabled={submitting}>
          Không khóa nữa
        </button>
        <button type="button" onClick={onConfirm} className="btn btn-danger btn-sm" disabled={submitting}>
          {submitting ? 'Đang xử lý…' : `Khóa và xử lý ${bookings.length} đơn`}
        </button>
      </div>
    </div>
  </Modal>
);

export default AffectedBookingsDialog;
