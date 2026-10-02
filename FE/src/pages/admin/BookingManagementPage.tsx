import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { customerSpaceApi, type BranchResponse } from '../../lib/spaceApi';
import { staffBookingActionsApi } from '../../api/staffBookingActionsApi';
import type { BookingResponse } from '../../lib/bookingApi';
import { StaffBookingActionModal } from '../../components/staff/StaffBookingActionModal';
import { formatVND } from '../../utils/formatters';

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  CONFIRMED: { label: 'Đã xác nhận', cls: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  CHECKED_IN: { label: 'Đang sử dụng', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-muted text-muted-foreground' },
  NO_SHOW: { label: 'Không đến', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  EXPIRED: { label: 'Hết hạn thanh toán', cls: 'bg-muted text-muted-foreground' },
};
const FILTERS = [
  { id: 'active', label: 'Đang hiệu lực', statuses: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'] },
  { id: 'in_use', label: 'Đang sử dụng', statuses: ['CHECKED_IN'] },
  { id: 'all', label: 'Tất cả', statuses: [] as string[] },
] as const;

const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const toInputDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const hm = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Bookings of a branch for a day, where an admin can cancel one — or end one in use early — and
 * refund the customer (e.g. an unplanned outage, a room that turned out unusable).
 */
const BookingManagementPage: React.FC<{ scope: 'admin' | 'branch' }> = ({ scope }) => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [branchId, setBranchId] = useState<string>(scope === 'branch' ? (user?.branchId ?? '') : '');
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('active');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [target, setTarget] = useState<BookingResponse | null>(null);

  useEffect(() => {
    if (scope !== 'admin') return;
    customerSpaceApi.listBranches()
      .then((list) => { setBranches(list); setBranchId((prev) => prev || list[0]?.id || ''); })
      .catch(() => setBranches([]));
  }, [scope]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError('');
    try {
      const to = new Date(day);
      to.setDate(to.getDate() + 1);
      setRows(await staffBookingActionsApi.list(branchId, day, to));
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, day]);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const statuses = FILTERS.find((f) => f.id === filter)?.statuses ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      const status = String(b.status).toUpperCase();
      if (statuses.length && !(statuses as readonly string[]).includes(status)) return false;
      if (!q) return true;
      return [b.bookingCode, b.customerName, b.customerPhone, b.workspaceName]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [rows, filter, search]);

  const shift = (days: number) => setDay((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n; });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Đơn đặt chỗ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xem đơn theo ngày. Khi có sự cố, hủy đơn hoặc kết thúc sớm đơn đang sử dụng và hoàn tiền cho khách.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-2xl p-3">
        {scope === 'admin' && (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input-field text-sm !w-auto max-w-xs" aria-label="Chi nhánh">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="btn btn-ghost btn-sm !px-2" aria-label="Ngày trước"><FiChevronLeft className="h-4 w-4" /></button>
          <label className="flex items-center gap-1.5">
            <FiCalendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={toInputDate(day)}
              onChange={(e) => { const d = new Date(e.target.value + 'T00:00:00'); if (!isNaN(d.getTime())) setDay(d); }}
              className="input-field text-sm !w-auto"
              aria-label="Ngày"
            />
          </label>
          <button type="button" onClick={() => shift(1)} className="btn btn-ghost btn-sm !px-2" aria-label="Ngày sau"><FiChevronRight className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDay(startOfDay(new Date()))} className="btn btn-ghost btn-sm text-xs">Hôm nay</button>
        </div>
        <div className="flex gap-1 bg-muted/60 p-1 rounded-xl">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer ${filter === f.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative flex-1 min-w-[12rem]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mã đơn, tên khách, SĐT, chỗ ngồi"
            className="input-field text-sm w-full !pl-9"
            aria-label="Tìm đơn"
          />
        </label>
        <button type="button" onClick={() => void load()} className="btn btn-ghost btn-sm" aria-label="Làm mới">
          <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-4 py-3 font-semibold">Đơn</th>
              <th className="px-4 py-3 font-semibold">Khách hàng</th>
              <th className="px-4 py-3 font-semibold">Chỗ ngồi</th>
              <th className="px-4 py-3 font-semibold">Thời gian</th>
              <th className="px-4 py-3 font-semibold text-right">Tổng tiền</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {error && <tr><td colSpan={6} className="px-4 py-6 text-destructive">{error}</td></tr>}
            {!error && loading && rows.length === 0 && [1, 2, 3].map((i) => (
              <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-6 rounded bg-muted animate-pulse" /></td></tr>
            ))}
            {!error && !loading && visible.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Không có đơn nào trong ngày này.</td></tr>
            )}
            {visible.map((b) => {
              const status = String(b.status).toUpperCase();
              const st = STATUS[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
              const actionable = ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'].includes(status);
              return (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-foreground">{b.bookingCode}</p>
                    <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{b.customerName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{b.customerPhone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{b.workspaceName}</td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">
                    {hm(b.startAt)} → {hm(b.endAt)}
                    {dm(b.startAt) !== dm(b.endAt) && <span className="block text-xs text-muted-foreground">{dm(b.startAt)} → {dm(b.endAt)}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatVND(b.totalAmount)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {actionable && (
                      <button
                        type="button"
                        onClick={() => setTarget(b)}
                        className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs"
                      >
                        {status === 'CHECKED_IN' || (status === 'CONFIRMED' && new Date(b.startAt).getTime() <= Date.now())
                          ? 'Kết thúc sớm & hoàn tiền'
                          : 'Hủy & hoàn tiền'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {target && (
        <StaffBookingActionModal
          bookingId={target.id}
          customerName={target.customerName ?? undefined}
          workspaceName={target.workspaceName}
          onClose={() => setTarget(null)}
          onDone={() => void load()}
        />
      )}
    </div>
  );
};

export default BookingManagementPage;
