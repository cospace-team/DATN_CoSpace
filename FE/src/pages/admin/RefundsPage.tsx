import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheck, FiCheckCircle, FiInfo, FiRefreshCw, FiRotateCcw, FiX, FiXCircle } from 'react-icons/fi';
import { REFUND_REASON_LABEL, refundApi, type RefundDto, type RefundStatus } from '../../api/refundApi';
import { adminBranchApi, type AdminBranchDto } from '../../lib/spaceApi';
import { formatDateTime, formatVND } from '../../utils/formatters';

type Filter = RefundStatus | 'all';
type Action = { type: 'process' | 'reject'; refund: RefundDto } | null;

const STATUS_META: Record<RefundStatus, { label: string; badge: string }> = {
  pending: { label: 'Chờ hoàn', badge: 'badge-warning' },
  processed: { label: 'Đã hoàn', badge: 'badge-success' },
  rejected: { label: 'Từ chối', badge: 'badge-neutral' },
};

const PROVIDER_LABEL: Record<string, string> = { momo: 'MoMo', payos: 'VietQR', cash: 'Tiền mặt' };

/**
 * Refund queue. Admins see every branch (with a branch filter); branch admins only ever get their
 * own branch back from the API, so the same page serves both consoles.
 */
const RefundsPage: React.FC<{ scope: 'admin' | 'branch' }> = ({ scope }) => {
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [branches, setBranches] = useState<AdminBranchDto[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [branchId, setBranchId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [action, setAction] = useState<Action>(null);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      setRefunds(await refundApi.list({ status: filter, branchId: scope === 'admin' ? branchId || undefined : undefined }));
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter, branchId]);

  useEffect(() => {
    if (scope === 'admin') adminBranchApi.list().then(setBranches).catch(() => setBranches([]));
  }, [scope]);

  const pendingTotal = useMemo(
    () => refunds.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
    [refunds],
  );

  const openAction = (type: 'process' | 'reject', refund: RefundDto) => {
    setAction({ type, refund });
    setNote('');
    setActionError('');
  };

  const submit = async () => {
    if (!action) return;
    if (action.type === 'reject' && !note.trim()) {
      setActionError('Vui lòng nhập lý do từ chối để thông báo cho khách hàng.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = action.type === 'process'
        ? await refundApi.process(action.refund.id, note)
        : await refundApi.reject(action.refund.id, note);
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(''), 3000);
      setAction(null);
      await load();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {successMsg && (
        <div className="fixed top-4 right-4 z-[70] animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheck className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tài chính</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Hoàn tiền cho khách hàng</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Các khoản hệ thống ghi nhận cần hoàn: khách hủy đơn, bảo trì đột xuất, thanh toán về muộn hoặc bị trùng.
            </p>
          </div>
          <button onClick={load} className="btn btn-secondary btn-sm"><FiRefreshCw className="h-4 w-4" /> Làm mới</button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <FiInfo className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Hãy chuyển khoản hoặc trả tiền mặt cho khách <strong>trước</strong>, sau đó bấm "Đã hoàn tiền" và ghi chú mã giao dịch.
          Khách hàng sẽ nhận được thông báo ngay khi bạn xác nhận hoặc từ chối.
        </p>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['pending', 'processed', 'rejected', 'all'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                {f === 'all' ? 'Tất cả' : STATUS_META[f].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {filter === 'pending' && refunds.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Tổng chờ hoàn: <strong className="text-foreground">{formatVND(pendingTotal)}</strong>
              </span>
            )}
            {scope === 'admin' && (
              <select className="input-field !w-auto" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">Tất cả chi nhánh</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-muted rounded-2xl h-14 animate-pulse" />)}</div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FiRotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{filter === 'pending' ? 'Không có khoản nào đang chờ hoàn.' : 'Không có dữ liệu.'}</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Đơn / Khách hàng</th>
                  <th>Lý do</th>
                  <th>Số tiền</th>
                  <th>Ngày ghi nhận</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <p className="font-mono font-semibold">{r.bookingCode || '—'}</p>
                      <p className="text-sm">{r.customerName || 'Khách hàng'}</p>
                      <p className="text-xs text-muted-foreground">
                        {[r.customerPhone, r.customerEmail].filter(Boolean).join(' · ')}
                      </p>
                      {scope === 'admin' && r.branchName && <p className="text-xs text-muted-foreground">{r.branchName}</p>}
                    </td>
                    <td className="text-sm max-w-xs">
                      <p className="font-medium">{REFUND_REASON_LABEL[r.reasonType] || r.reasonType}</p>
                      {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
                      {r.paymentProvider && (
                        <p className="text-xs text-muted-foreground">Giao dịch: {PROVIDER_LABEL[r.paymentProvider] || r.paymentProvider}</p>
                      )}
                    </td>
                    <td className="font-semibold text-primary whitespace-nowrap">{formatVND(r.amount)}</td>
                    <td className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td>
                      <span className={`badge ${STATUS_META[r.status].badge}`}>{STATUS_META[r.status].label}</span>
                      {r.status !== 'pending' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {r.processedByName ? `${r.processedByName} · ` : ''}{r.processedAt ? formatDateTime(r.processedAt) : ''}
                        </p>
                      )}
                      {r.resolutionNote && <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">"{r.resolutionNote}"</p>}
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => openAction('process', r)} className="btn btn-primary btn-sm whitespace-nowrap">
                            <FiCheckCircle className="h-3.5 w-3.5" /> Đã hoàn tiền
                          </button>
                          <button onClick={() => openAction('reject', r)} className="btn btn-ghost btn-sm text-destructive hover:!text-destructive" title="Từ chối">
                            <FiXCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {action && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setAction(null)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-card rounded-3xl border border-border shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold font-heading">
                {action.type === 'process' ? 'Xác nhận đã hoàn tiền' : 'Từ chối hoàn tiền'}
              </h3>
              <button onClick={() => setAction(null)} className="btn btn-ghost btn-sm !min-h-[32px] !p-2"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-muted/50 p-4 text-sm space-y-1">
                <p>Đơn <strong className="font-mono">{action.refund.bookingCode}</strong> · {action.refund.customerName}</p>
                <p>Số tiền: <strong className="text-primary">{formatVND(action.refund.amount)}</strong></p>
              </div>
              {actionError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <FiAlertCircle className="h-4 w-4 shrink-0" />{actionError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  {action.type === 'process' ? 'Ghi chú (mã giao dịch, hình thức hoàn...)' : 'Lý do từ chối *'}
                </label>
                <textarea className="input-field min-h-[90px]" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={action.type === 'process' ? 'VD: CK Vietcombank, mã GD 123456' : 'VD: Khách đã nhận hoàn tiền tại quầy trước đó'} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={submit} disabled={isSubmitting}
                  className={`btn btn-sm flex-1 ${action.type === 'process' ? 'btn-primary' : 'btn-danger'}`}>
                  {isSubmitting ? 'Đang lưu...' : action.type === 'process' ? 'Xác nhận đã hoàn' : 'Từ chối'}
                </button>
                <button onClick={() => setAction(null)} className="btn btn-secondary btn-sm">Hủy</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RefundsPage;
