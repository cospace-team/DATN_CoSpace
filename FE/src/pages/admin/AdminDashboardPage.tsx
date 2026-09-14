import React, { useState, useEffect, useMemo } from 'react';
import {
  FiTrendingUp, FiMapPin, FiDollarSign, FiCalendar,
  FiActivity, FiArrowUpRight, FiPieChart,
  FiAlertCircle, FiDownload, FiLayers
} from 'react-icons/fi';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { formatVND } from '../../utils/formatters';
import { staffApi, type ReportOverviewDto } from '../../api/staffApi';
import { API_BASE_URL } from '../../config/api';

/* ── Branch summary for comparison table ── */
interface BranchSummary {
  id: string;
  name: string;
  code: string;
  status: string;
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
}

const TYPE_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
];

const AdminDashboardPage: React.FC = () => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const availableYears = useMemo(() => {
    const years: number[] = [];
    const maxYear = Math.max(currentYear + 4, 2030);
    for (let y = maxYear; y >= 2022; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const [timeRange, setTimeRange] = useState('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [granularity, setGranularity] = useState<string>('auto');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'bookings'>('revenue');
  const [report, setReport] = useState<ReportOverviewDto | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const getDateRange = (): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    const month = now.getMonth(); // 0 - 11

    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    if (timeRange === 'today') {
      dateFrom = formatLocalDate(now);
      dateTo = dateFrom;
    } else if (timeRange === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      dateFrom = formatLocalDate(d);
      dateTo = formatLocalDate(now);
    } else if (timeRange === 'month') {
      const startOfMonth = new Date(selectedYear, month, 1);
      const endOfMonth = new Date(selectedYear, month + 1, 0);
      dateFrom = formatLocalDate(startOfMonth);
      dateTo = formatLocalDate(endOfMonth);
    } else if (timeRange === 'quarter') {
      const qIndex = Math.floor(month / 3);
      const qStartMonth = qIndex * 3;
      const startOfQuarter = new Date(selectedYear, qStartMonth, 1);
      const endOfQuarter = new Date(selectedYear, qStartMonth + 3, 0);
      dateFrom = formatLocalDate(startOfQuarter);
      dateTo = formatLocalDate(endOfQuarter);
    } else if (timeRange === 'year') {
      dateFrom = `${selectedYear}-01-01`;
      dateTo = `${selectedYear}-12-31`;
    }
    return { dateFrom, dateTo };
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { dateFrom, dateTo } = getDateRange();
        const effectiveGroupBy = granularity === 'auto' ? undefined : granularity;

        // 1. Fetch system-wide overview report
        const overview = await staffApi.getReportOverview(undefined, dateFrom, dateTo, effectiveGroupBy);
        setReport(overview);

        // 2. Fetch branches list to query per-branch metrics
        const token = localStorage.getItem('workhub_access_token');
        const branchRes = await fetch(`${API_BASE_URL}/api/admin/branches`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (branchRes.ok) {
          const branchList: Array<{ id: string; name: string; code: string; status: string }> = await branchRes.json();
          // Fetch report for each branch in parallel
          const branchSummaries = await Promise.all(
            branchList.map(async (b) => {
              try {
                const bReport = await staffApi.getReportOverview(b.id, dateFrom, dateTo);
                return {
                  id: b.id,
                  name: b.name,
                  code: b.code,
                  status: b.status,
                  totalBookings: bReport.totalBookings,
                  totalRevenue: bReport.totalRevenue,
                  completedBookings: bReport.completedBookings,
                };
              } catch {
                return {
                  id: b.id,
                  name: b.name,
                  code: b.code,
                  status: b.status,
                  totalBookings: 0,
                  totalRevenue: 0,
                  completedBookings: 0,
                };
              }
            })
          );
          setBranches(branchSummaries);
        }
      } catch (err: any) {
        console.error('Failed to load admin dashboard data:', err);
        setError(err.message || 'Không thể tải dữ liệu báo cáo hệ thống.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, [timeRange, selectedYear, granularity]);

  const timeLabel = useMemo(() => {
    switch (timeRange) {
      case 'week': return '7 ngày qua';
      case 'month': return 'Tháng này';
      case 'quarter': return 'Quý này';
      case 'year': return 'Năm nay';
      default: return 'Tháng này';
    }
  }, [timeRange]);

  const kpis = useMemo(() => {
    if (!report) return [];
    return [
      {
        icon: FiDollarSign,
        label: 'Tổng doanh thu',
        value: formatVND(report.totalRevenue),
        sub: 'Toàn hệ thống ' + timeLabel.toLowerCase(),
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'bg-emerald-500/15',
      },
      {
        icon: FiCalendar,
        label: 'Tổng đơn đặt chỗ',
        value: String(report.totalBookings),
        sub: `${report.completedBookings} hoàn thành · ${report.canceledBookings} hủy`,
        gradient: 'from-blue-500 to-indigo-600',
        glow: 'bg-blue-500/15',
      },
      {
        icon: FiActivity,
        label: 'Tỷ lệ hoàn thành',
        value: `${report.totalBookings > 0 ? Math.round((report.completedBookings / report.totalBookings) * 100) : 0}%`,
        sub: `${report.completedBookings} / ${report.totalBookings} đơn thành công`,
        gradient: 'from-violet-500 to-purple-600',
        glow: 'bg-violet-500/15',
      },
      {
        icon: FiMapPin,
        label: 'Chi nhánh hoạt động',
        value: `${branches.filter(b => b.status === 'active').length} / ${branches.length}`,
        sub: 'Trung tâm đang phục vụ khách',
        gradient: 'from-amber-500 to-orange-600',
        glow: 'bg-amber-500/15',
      },
    ];
  }, [report, branches, timeLabel]);

  const revenueChartData = useMemo(() => {
    if (!report?.months) return [];
    return report.months.map((m, i) => ({
      name: m,
      revenue: report.monthlyRevenue[i] || 0,
      bookings: report.monthlyBookings?.[i] || 0,
    }));
  }, [report]);

  const typeData = useMemo(() => {
    if (!report?.byType) return [];
    return report.byType.map((t, index) => ({
      name: t.type === 'desk' ? 'Bàn làm việc' : t.type === 'meeting_room' ? 'Phòng họp' : t.type === 'private_office' ? 'Văn phòng riêng' : t.type,
      count: t.count,
      revenue: t.revenue,
      color: TYPE_COLORS[index % TYPE_COLORS.length],
    }));
  }, [report]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Tổng Quan Toàn Hệ Thống
              </h1>
              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Database
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Báo cáo hiệu suất kinh doanh, doanh thu hợp nhất và lưu lượng booking trên toàn bộ chi nhánh CoSpace.
            </p>
          </div>

          {/* Time Filter & Year Switcher Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Year Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-2xl border border-border">
              <FiCalendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setTimeRange('year');
                  setGranularity('month');
                }}
                aria-label="Chọn năm báo cáo"
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-1"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-card text-foreground">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'week', label: '7 ngày' },
                { id: 'month', label: 'Tháng này' },
                { id: 'quarter', label: 'Quý này' },
                { id: 'year', label: `Cả năm ${selectedYear}` },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTimeRange(t.id);
                    setGranularity('auto');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    timeRange === t.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
          <FiAlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-3xl border border-border p-5 animate-pulse space-y-3">
              <div className="h-10 w-10 rounded-xl bg-muted" />
              <div className="h-7 w-28 bg-muted rounded" />
              <div className="h-4 w-36 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((s) => (
            <div
              key={s.label}
              className="group relative overflow-hidden bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5"
            >
              <div className={`absolute -top-10 -right-10 h-28 w-28 rounded-full ${s.glow} blur-2xl opacity-60 transition-opacity group-hover:opacity-100`} />
              <div className="relative z-10">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-md`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-2xl font-bold tracking-tight text-foreground truncate">
                  {s.value}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FiArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 truncate">
                  {s.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Analytics Row */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recharts Revenue Bar Chart */}
        <div className="lg:col-span-7 bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
                <FiTrendingUp className="h-4 w-4 text-primary" />
                {chartMetric === 'revenue' ? 'Doanh Thu Hợp Nhất Hệ Thống' : 'Lưu Lượng Khách Hàng Hệ Thống'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {chartMetric === 'revenue' ? 'Biến động dòng tiền theo thời gian trên toàn bộ chi nhánh' : 'Tổng số lượt khách và đơn đặt chỗ trên toàn bộ chi nhánh'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Metric Switcher: Doanh thu vs Lượt khách */}
              <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setChartMetric('revenue')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    chartMetric === 'revenue'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Doanh thu
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('bookings')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    chartMetric === 'bookings'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Lượt khách
                </button>
              </div>
              {/* Granularity Sub-Switcher */}
              {timeRange === 'month' && (
                <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setGranularity('week')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      granularity === 'week' || granularity === 'auto'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Theo tuần
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('day')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      granularity === 'day'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Theo ngày
                  </button>
                </div>
              )}

              {timeRange === 'quarter' && (
                <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setGranularity('month')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      granularity === 'month' || granularity === 'auto'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Theo tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('week')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      granularity === 'week'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Theo tuần
                  </button>
                </div>
              )}

              {timeRange === 'year' && (
                <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setGranularity('month')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      granularity === 'month' || granularity === 'auto'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    12 Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('quarter')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      granularity === 'quarter'
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    4 Quý
                  </button>
                </div>
              )}

              {timeRange === 'today' && (
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border/60">
                  Theo giờ
                </span>
              )}

              {timeRange === 'week' && (
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-lg border border-border/60">
                  Theo ngày
                </span>
              )}

              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-xl">
                VND
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
              Đang tải biểu đồ hợp nhất...
            </div>
          ) : revenueChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
              Chưa có dữ liệu doanh thu.
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => chartMetric === 'revenue' ? `${(v / 1000000).toFixed(0)}Tr` : `${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-2xl border border-border bg-popover p-3 shadow-xl text-xs space-y-1.5 min-w-[160px]">
                            <p className="font-bold text-foreground">{label}</p>
                            <div className="space-y-1 pt-1 border-t border-border/50">
                              <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                  Doanh thu:
                                </span>
                                <span>{formatVND(item.revenue)}</span>
                              </p>
                              <p className="text-muted-foreground font-medium flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                  Lượt khách:
                                </span>
                                <span className="text-foreground font-semibold">{item.bookings || 0} lượt</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {chartMetric === 'revenue' ? (
                    <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" radius={[6, 6, 0, 0]} />
                  ) : (
                    <Bar dataKey="bookings" name="Lượt khách" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Tổng tiền đã thanh toán
            </span>
            <span>Khoảng thời gian: {timeLabel}</span>
          </div>
        </div>

        {/* Workspace Type Breakdown */}
        <div className="lg:col-span-5 bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
              <FiPieChart className="h-4 w-4 text-primary" /> Cơ Cấu Theo Loại Không Gian
            </h2>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {typeData.reduce((s, x) => s + x.count, 0)} đơn
            </span>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
              Đang tải cơ cấu...
            </div>
          ) : typeData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
              Chưa có dữ liệu phân loại.
            </div>
          ) : (
            <div className="space-y-4 my-auto">
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={typeData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-border bg-popover p-2.5 shadow-lg text-xs space-y-0.5">
                              <p className="font-bold text-foreground">{data.name}</p>
                              <p className="text-muted-foreground">{data.count} booking ({formatVND(data.revenue)})</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {typeData.map((t) => {
                  const total = typeData.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                  return (
                    <div key={t.name} className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="font-semibold text-foreground">{t.name}</span>
                        </div>
                        <span className="font-bold text-primary">{formatVND(t.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span>{t.count} đơn</span>
                        <span className="font-mono font-medium">{pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: t.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Branch Comparison Cards */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
            <FiMapPin className="h-4 w-4 text-primary" /> So Sánh Hiệu Suất Theo Chi Nhánh ({timeLabel})
          </h2>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {branches.length} chi nhánh
          </span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu chi nhánh.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map(b => (
              <div
                key={b.id}
                className="group rounded-2xl bg-muted/40 border border-border/70 p-4.5 transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3.5">
                  <div>
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {b.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{b.code}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    b.status === 'active'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}>
                    {b.status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {b.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border/50 text-xs">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Doanh thu</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                      {formatVND(b.totalRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Lượt đặt</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">
                      {b.totalBookings}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Hoàn tất</p>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      {b.completedBookings}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
