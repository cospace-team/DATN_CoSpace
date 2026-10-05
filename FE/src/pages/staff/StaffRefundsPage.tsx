import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiInfo, FiRefreshCw, FiRotateCcw, FiSearch } from 'react-icons/fi';
import { REFUND_METHOD_LABEL, REFUND_REASON_LABEL, refundApi, type RefundDto, type RefundStatus } from '../../api/refundApi';
import { formatDateTime, formatVND } from '../../utils/formatters';

type Filter = RefundStatus | 'all';

const STATUS_META: Record<RefundStatus, { label: string; badge: string; hint: (r: RefundDto) => string }> = {
  pending: {
    label: 'Chờ hoàn',
    badge: 'badge-warning',
    hint: () => 'Quản lý chi nhánh chưa xử lý. Khách sẽ nhận thông báo khi khoản này được hoàn.',
  },
  processed: {
    label: 'Đã hoàn',
    badge: 'badge-success',
    hint: (r) =>
      r.refundMethod === 'voucher'
        ? 'Đã phát hành voucher vào tài khoản khách, dùng cho lần đặt tiếp theo.'
        : r.refundMethod === 'cash'
          ? 'Đã trả tiền mặt cho khách.'
          : 'Đã chuyển khoản cho khách; tiền về tài khoản theo thời gian của ngân hàng.',
  },
  rejected: { label: 'Từ chối', badge: 'badge-neutral', hint: () => 'Yêu cầu hoàn tiền bị từ chối.' },
};

/**
 * Read-only: lets the counter answer "has my refund been paid?". Refunds are processed by branch
 * admins; the bank account a refund goes to is deliberately not part of what staff receive.
 */
const StaffRefundsPage: React.FC = () => {
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      setRefunds(await refundApi.listForStaff(filter));
    } catch (e: any) {
      setError(e.message);
      setRefunds([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { void load(); }, [filter]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return refunds;
    return refunds.filter((r) =>
      [r.bookingCode, r.customerName, r.customerPhone].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [refunds, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hoàn tiền</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tra cứu khoản hoàn của khách chi nhánh này trong 60 ngày gần đây (chỉ xem).
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary btn-sm"><FiRefreshCw className="h-4 w-4" /> Làm mới</button>
      </div>

      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <FiInfo className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Khoản hoàn do quản lý chi nhánh xử lý. Nếu khách hỏi lâu chưa nhận, hãy cho khách biết trạng thái bên dưới và chuyển yêu cầu cho quản lý.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['pending', 'processed', 'rejected', 'all'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                {f === 'all' ? 'Tất cả' : STATUS_META[f].label}
              </button>
            ))}
          </div>
          <label className="relative min-w-[14rem] flex-1 max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mã đơn, tên khách, SĐT"
              className="input-field text-sm w-full !pl-9"
              aria-label="Tìm khoản hoàn"
            />
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-muted rounded-2xl h-14 animate-pulse" />)}</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <FiRotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{search ? 'Không có khoản nào khớp.' : 'Không có khoản hoàn nào.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <li key={r.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold">{r.bookingCode || '—'}</span>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </p>
                    <p className="text-sm mt-1">
                      {r.customerName || 'Khách hàng'}
                      {r.customerPhone && <span className="text-muted-foreground"> · {r.customerPhone}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {REFUND_REASON_LABEL[r.reasonType] || r.reasonType}
                      {r.reason ? ` — ${r.reason}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{meta.hint(r)}</p>
                    {r.status !== 'pending' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.processedAt ? `Xử lý ${formatDateTime(r.processedAt)}` : ''}
                        {r.status === 'processed' && r.refundMethod ? ` · ${REFUND_METHOD_LABEL[r.refundMethod]}` : ''}
                      </p>
                    )}
                    {r.status === 'rejected' && r.resolutionNote && (
                      <p className="text-xs mt-1">Lý do từ chối: "{r.resolutionNote}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-primary">{formatVND(r.amount)}</p>
                    <p className="text-xs text-muted-foreground">Ghi nhận {formatDateTime(r.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StaffRefundsPage;
