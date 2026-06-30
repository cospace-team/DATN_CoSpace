import React, { useMemo } from 'react';
import { FiCreditCard, FiDollarSign, FiArrowUpRight } from 'react-icons/fi';
import { payments, bookings, getWorkspace } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { formatVND, formatDateTime, paymentStatusLabel, paymentStatusColor } from '../../utils/formatters';

const PaymentHistoryPage: React.FC = () => {
  const { user } = useAuth();

  const myPayments = useMemo(() => {
    const myBookingIds = new Set(bookings.filter(b => b.user_id === user?.id).map(b => b.id));
    return payments.filter(p => myBookingIds.has(p.booking_id)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [user]);

  const totalPaid = myPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = myPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thanh toán</p>
        <h1 className="text-xl font-bold font-heading mt-1">Lịch sử thanh toán</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-success"><FiArrowUpRight className="h-4 w-4" /><span className="stat-label !mt-0 !text-success">Đã thanh toán</span></div>
          <p className="stat-value mt-2">{formatVND(totalPaid)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-warning"><FiCreditCard className="h-4 w-4" /><span className="stat-label !mt-0 !text-warning">Đang chờ</span></div>
          <p className="stat-value mt-2">{formatVND(totalPending)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground"><FiDollarSign className="h-4 w-4" /><span className="stat-label !mt-0">Tổng giao dịch</span></div>
          <p className="stat-value mt-2">{myPayments.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Mã đơn</th><th>Workspace</th><th>Phương thức</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th></tr></thead>
          <tbody>
            {myPayments.map(p => {
              const bk = bookings.find(b => b.id === p.booking_id);
              const ws = bk ? getWorkspace(bk.workspace_id) : null;
              return (
                <tr key={p.id}>
                  <td className="font-mono text-sm">{p.order_id}</td>
                  <td>{ws?.name || '—'}</td>
                  <td className="capitalize">{p.provider} · {p.method}</td>
                  <td className="font-semibold">{formatVND(p.amount)}</td>
                  <td><span className={`badge ${paymentStatusColor[p.status]}`}>{paymentStatusLabel[p.status]}</span></td>
                  <td className="text-sm text-muted-foreground">{formatDateTime(p.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {myPayments.length === 0 && <div className="text-center py-12 text-muted-foreground">Chưa có giao dịch nào</div>}
      </div>
    </div>
  );
};

export default PaymentHistoryPage;
