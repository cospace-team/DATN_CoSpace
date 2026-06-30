import React, { useState, useMemo } from 'react';
import { FiBarChart2, FiDownload, FiPieChart, FiTrendingUp, FiDollarSign, FiCalendar, FiCheckCircle, FiXCircle, FiArrowUpRight, FiChevronDown, FiFilter, FiMapPin } from 'react-icons/fi';
import { branches, bookings, payments } from '../../data/mockData';
import { formatVND } from '../../utils/formatters';

const ReportsPage: React.FC = () => {
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-04-30');

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const canceledBookings = bookings.filter(b => b.status === 'canceled').length;

  const statCards = [
    { icon: FiDollarSign, label: 'Tổng doanh thu', value: formatVND(totalRevenue), delta: '+12.5%', gradient: 'from-emerald-500 to-teal-500', bgGlow: 'bg-emerald-500/10', color: 'text-emerald-600 dark:text-emerald-400' },
    { icon: FiCalendar, label: 'Tổng booking', value: String(totalBookings), delta: '+8.2%', gradient: 'from-blue-500 to-indigo-500', bgGlow: 'bg-blue-500/10', color: 'text-blue-600 dark:text-blue-400' },
    { icon: FiCheckCircle, label: 'Hoàn thành', value: String(completedBookings), delta: '+15%', gradient: 'from-violet-500 to-purple-500', bgGlow: 'bg-violet-500/10', color: 'text-violet-600 dark:text-violet-400' },
    { icon: FiXCircle, label: 'Đã hủy', value: String(canceledBookings), delta: '-2.1%', gradient: 'from-rose-500 to-pink-500', bgGlow: 'bg-rose-500/10', color: 'text-rose-600 dark:text-rose-400' },
  ];

  const byType = [
    { type: 'Bàn làm việc', count: 5, revenue: 450000, color: 'from-blue-500 to-indigo-500' },
    { type: 'Phòng họp', count: 2, revenue: 800000, color: 'from-violet-500 to-purple-500' },
    { type: 'Văn phòng riêng', count: 1, revenue: 1450000, color: 'from-emerald-500 to-teal-500' },
  ];
  const maxRevType = Math.max(...byType.map(t => t.revenue));

  const months = ['T1', 'T2', 'T3', 'T4'];
  const monthlyRevenue = [2800000, 3500000, 4200000, totalRevenue];
  const maxRev = Math.max(...monthlyRevenue);

  const branchComparison = useMemo(() =>
    branches.map(b => {
      const bBookings = bookings.filter(bk => bk.branch_id === b.id);
      const bRevenue = bBookings.filter(bk => ['completed', 'checked_in'].includes(bk.status)).reduce((s, bk) => s + bk.total_amount, 0);
      const rate = bBookings.length > 0 ? Math.round((bBookings.filter(bk => bk.status === 'completed').length / bBookings.length) * 100) : 0;
      return { ...b, bookingCount: bBookings.length, revenue: bRevenue, rate };
    }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Filters */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Báo cáo</p>
            <h1 className="text-xl font-bold font-heading mt-1">Phân tích & Thống kê</h1>
          </div>
          <button className="btn btn-secondary btn-sm"><FiDownload className="h-4 w-4" /> Xuất CSV</button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-border">
          <FiFilter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Từ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="input-field !min-h-[36px] !py-1 !px-3 text-sm w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Đến</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="input-field !min-h-[36px] !py-1 !px-3 text-sm w-auto" />
          </div>
          <div className="relative">
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              className="input-field !min-h-[36px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[160px]">
              <option value="all">Tất cả chi nhánh</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(s => (
          <div key={s.label} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
            <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${s.bgGlow} blur-2xl transition-opacity group-hover:opacity-100 opacity-50`} />
            <div className="relative">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-extrabold tracking-tight">{s.value}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${s.color}`}>
                  <FiArrowUpRight className="h-3 w-3" />{s.delta}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Line Chart (Monthly Revenue) */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-6">
            <FiTrendingUp className="h-4 w-4 text-primary" /> Doanh thu theo tháng
          </h2>
          <div className="flex items-end gap-4 h-52">
            {months.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <span className="text-xs font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatVND(monthlyRevenue[i])}
                </span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-indigo-500 transition-all duration-500 group-hover:from-blue-400 group-hover:to-indigo-400 relative"
                  style={{ height: `${(monthlyRevenue[i] / maxRev) * 100}%` }}>
                  {/* Tooltip dot */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{m}/2026</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart (By Workspace Type) */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-6">
            <FiPieChart className="h-4 w-4 text-primary" /> Doanh thu theo loại workspace
          </h2>
          <div className="space-y-5">
            {byType.map(t => (
              <div key={t.type} className="group">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{t.type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{t.count} booking</span>
                    <span className="text-sm font-bold text-primary">{formatVND(t.revenue)}</span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${t.color} transition-all duration-700 group-hover:opacity-90`}
                    style={{ width: `${(t.revenue / maxRevType) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Comparison Table */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <FiBarChart2 className="h-4 w-4 text-primary" /> So sánh chi nhánh
        </h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Chi nhánh</th><th>Tổng booking</th><th>Doanh thu</th><th>Tỷ lệ hoàn thành</th></tr></thead>
            <tbody>
              {branchComparison.map(b => (
                <tr key={b.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><FiMapPin className="h-3.5 w-3.5 text-primary" /></div>
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold">{b.bookingCount}</td>
                  <td className="font-semibold text-emerald-600 dark:text-emerald-400">{formatVND(b.revenue)}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${b.rate}%` }} />
                      </div>
                      <span className="text-sm font-semibold min-w-[40px]">{b.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
