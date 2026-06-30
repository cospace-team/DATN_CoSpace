import React, { useMemo } from 'react';
import { FiTrendingUp, FiUsers, FiMapPin, FiDollarSign, FiCalendar, FiActivity, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { branches, bookings, payments, users, workspaces } from '../../data/mockData';
import { formatVND } from '../../utils/formatters';

const AdminDashboardPage: React.FC = () => {
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => ['confirmed', 'checked_in', 'pending_payment'].includes(b.status)).length;
  const totalUsers = users.filter(u => u.role === 'customer').length;
  const totalSpaces = workspaces.length;

  const revenueByBranch = useMemo(() =>
    branches.map(b => {
      const branchBookings = bookings.filter(bk => bk.branch_id === b.id);
      const revenue = branchBookings.filter(bk => bk.status === 'completed' || bk.status === 'checked_in')
        .reduce((s, bk) => s + bk.total_amount, 0);
      const active = branchBookings.filter(bk => ['confirmed', 'checked_in'].includes(bk.status)).length;
      return { ...b, revenue, bookingCount: branchBookings.length, activeBookings: active };
    }), []);

  const chartData = [
    { label: 'T2', value: 85 }, { label: 'T3', value: 72 }, { label: 'T4', value: 90 },
    { label: 'T5', value: 65 }, { label: 'T6', value: 78 }, { label: 'T7', value: 55 }, { label: 'CN', value: 40 },
  ];
  const maxChart = Math.max(...chartData.map(d => d.value));

  const statCards = [
    { icon: FiDollarSign, label: 'Tổng doanh thu', value: formatVND(totalRevenue), delta: '+12.5%', positive: true, gradient: 'from-emerald-500 to-teal-500', bgGlow: 'bg-emerald-500/10' },
    { icon: FiCalendar, label: 'Tổng booking', value: String(totalBookings), delta: '+8.2%', positive: true, gradient: 'from-blue-500 to-indigo-500', bgGlow: 'bg-blue-500/10' },
    { icon: FiActivity, label: 'Đang hoạt động', value: String(activeBookings), delta: '+3.1%', positive: true, gradient: 'from-violet-500 to-purple-500', bgGlow: 'bg-violet-500/10' },
    { icon: FiUsers, label: 'Khách hàng', value: String(totalUsers), delta: '+15.3%', positive: true, gradient: 'from-rose-500 to-pink-500', bgGlow: 'bg-rose-500/10' },
    { icon: FiMapPin, label: 'Workspace', value: String(totalSpaces), delta: '0%', positive: true, gradient: 'from-amber-500 to-orange-500', bgGlow: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản trị hệ thống</p>
        <h1 className="text-xl font-bold font-heading mt-1">Tổng quan hệ thống</h1>
        <p className="text-sm text-muted-foreground mt-1">Dashboard quản trị toàn bộ chi nhánh</p>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(s => (
          <div key={s.label} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
            {/* Background glow */}
            <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${s.bgGlow} blur-2xl transition-opacity group-hover:opacity-100 opacity-50`} />

            <div className="relative">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-extrabold tracking-tight">{s.value}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${s.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {s.positive ? <FiArrowUpRight className="h-3 w-3" /> : <FiArrowDownRight className="h-3 w-3" />}
                  {s.delta}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Occupancy Chart */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold flex items-center gap-2">
            <FiTrendingUp className="h-4 w-4 text-primary" /> Tỷ lệ sử dụng (tuần này)
          </h2>
          <div className="mt-6 flex items-end gap-3 h-48">
            {chartData.map(d => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-xs font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{d.value}%</span>
                <div
                  className="w-full rounded-t-lg transition-all duration-500 group-hover:opacity-90"
                  style={{
                    height: `${(d.value / maxChart) * 100}%`,
                    background: d.value > 80
                      ? 'linear-gradient(to top, hsl(var(--success)), hsl(142 71% 55%))'
                      : d.value > 60
                        ? 'linear-gradient(to top, hsl(var(--primary)), hsl(221 83% 63%))'
                        : 'linear-gradient(to top, hsl(var(--warning)), hsl(38 92% 60%))',
                    borderRadius: '6px 6px 0 0'
                  }}
                />
                <span className="text-xs text-muted-foreground font-medium">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Branch Overview */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold flex items-center gap-2">
            <FiMapPin className="h-4 w-4 text-primary" /> Theo chi nhánh
          </h2>
          <div className="mt-4 space-y-4">
            {revenueByBranch.map(b => (
              <div key={b.id} className="group rounded-xl border border-border bg-muted/50 p-4 transition-all hover:border-primary/30 hover:bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-sm text-muted-foreground">{b.address}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    b.status === 'active'
                      ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}>
                    {b.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-glow" />}
                    {b.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Doanh thu</p>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatVND(b.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tổng booking</p>
                    <p className="text-sm font-semibold">{b.bookingCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Đang hoạt động</p>
                    <p className="text-sm font-semibold text-primary">{b.activeBookings}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
