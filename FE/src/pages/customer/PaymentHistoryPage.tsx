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
    <div className="max-w-6xl mx-auto py-8 px-4 font-sans animate-fade-in space-y-8">
      {/* Header Banner */}
      <div className="bg-muted rounded-3xl p-8 border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3"></div>
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold  text-white tracking-tight ">
              Lịch sử Thanh toán
            </h1>
            <p className="text-sm font-medium bg-muted text-foreground px-3 py-1.5 rounded-lg border border-border inline-block mt-3 shadow-sm">
              Quản lý chi tiêu, giao dịch và hóa đơn của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="bg-muted rounded-2xl p-6 border border-border shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-card/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-3 text-foreground mb-4 relative z-10">
            <div className="p-2 bg-card border border-border rounded-lg shadow-sm">
              <FiArrowUpRight className="h-5 w-5 font-semibold" />
            </div>
            <span className="text-xs font-semibold tracking-tight">Đã thanh toán</span>
          </div>
          <p className="text-3xl font-semibold font-mono text-foreground relative z-10">{formatVND(totalPaid)}</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-border shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-card/20 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-3 text-foreground mb-4 relative z-10">
            <div className="p-2 bg-card border border-border rounded-lg shadow-sm">
              <FiCreditCard className="h-5 w-5 font-semibold" />
            </div>
            <span className="text-xs font-semibold tracking-tight">Đang chờ xử lý</span>
          </div>
          <p className="text-3xl font-semibold font-mono text-foreground relative z-10">{formatVND(totalPending)}</p>
        </div>

        <div className="bg-muted/50 rounded-2xl p-6 border border-border shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-muted/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-3 text-foreground mb-4 relative z-10">
            <div className="p-2 bg-slate-900 text-white border border-border rounded-lg shadow-sm">
              <FiDollarSign className="h-5 w-5 font-semibold" />
            </div>
            <span className="text-xs font-semibold tracking-tight">Tổng số GD</span>
          </div>
          <p className="text-3xl font-semibold font-mono text-foreground relative z-10">{myPayments.length} <span className="text-lg">lần</span></p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-border">
          <h2 className="text-white font-semibold   text-lg flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded-full border border-white"></div>
            Danh sách giao dịch
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="p-4 text-xs font-semibold text-foreground tracking-tight border-r border-border/20">Mã đơn</th>
                <th className="p-4 text-xs font-semibold text-foreground tracking-tight border-r border-border/20">Workspace</th>
                <th className="p-4 text-xs font-semibold text-foreground tracking-tight border-r border-border/20">Phương thức</th>
                <th className="p-4 text-xs font-semibold text-foreground tracking-tight border-r border-border/20">Số tiền</th>
                <th className="p-4 text-xs font-semibold text-foreground tracking-tight border-r border-border/20">Trạng thái</th>
                <th className="p-4 text-xs font-semibold text-foreground tracking-tight">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#0F172A]/10">
              {myPayments.map(p => {
                const bk = bookings.find(b => b.id === p.booking_id);
                const ws = bk ? getWorkspace(bk.workspace_id) : null;
                
                // Determine status badge style
                let badgeStyle = "bg-muted text-foreground";
                let badgeText = paymentStatusLabel[p.status] || p.status;
                if (p.status === 'paid') badgeStyle = "bg-muted text-foreground";
                if (p.status === 'pending') badgeStyle = "bg-muted text-foreground";
                if (p.status === "failed") badgeStyle = "bg-rose-500 text-white";

                return (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="p-4 border-r border-border/10">
                      <span className="font-mono text-sm font-semibold text-foreground bg-muted/10 px-2 py-1 rounded border border-[#2563EB]/20">{p.order_id}</span>
                    </td>
                    <td className="p-4 border-r border-border/10 font-medium text-foreground">{ws?.name || '—'}</td>
                    <td className="p-4 border-r border-border/10">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground capitalize">{p.provider}</span>
                        <span className="text-foreground/40 font-semibold">·</span>
                        <span className="text-xs font-medium text-foreground/70 tracking-tight">{p.method}</span>
                      </div>
                    </td>
                    <td className="p-4 border-r border-border/10">
                      <span className="font-semibold text-lg font-mono text-foreground">{formatVND(p.amount)}</span>
                    </td>
                    <td className="p-4 border-r border-border/10">
                      <span className={`px-3 py-1 rounded-lg border border-border shadow-sm text-xs font-semibold tracking-tight ${badgeStyle}`}>
                        {badgeText}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium text-foreground/60 flex flex-col">
                        <span>{new Date(p.created_at).toLocaleDateString('vi-VN')}</span>
                        <span>{new Date(p.created_at).toLocaleTimeString('vi-VN')}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {myPayments.length === 0 && (
            <div className="text-center py-16 bg-muted/50">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mx-auto text-foreground/50 mb-4 ">
                <FiDollarSign className="h-8 w-8 font-semibold" />
              </div>
              <p className="text-lg font-semibold  text-foreground mb-1">Chưa có giao dịch</p>
              <p className="text-sm font-medium text-foreground/60">Bạn chưa có lịch sử thanh toán nào trên hệ thống.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryPage;
