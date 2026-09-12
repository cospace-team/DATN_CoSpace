import React, { useState, useEffect, useMemo } from 'react';
import {
  FiGrid, FiActivity, FiCalendar,
  FiArrowUpRight, FiMapPin, FiAlertCircle, FiTrendingUp, FiPieChart, FiDownload,
  FiDollarSign, FiLayers
} from 'react-icons/fi';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { formatVND } from '../../utils/formatters';
import { API_BASE_URL } from '../../config/api';
import { staffApi, type ReportOverviewDto } from '../../api/staffApi';

const TYPE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
];

const BADashboardPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user?.branchId || '';

  const [dbBranchName, setDbBranchName] = useState<string | null>(null);
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
  const [report, setReport] = useState<ReportOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const [chartMetric, setChartMetric] = useState<'revenue' | 'bookings'>('revenue');

  // Shared by the report fetch and the CSV export below
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
      // Đúng toàn bộ các ngày của tháng được chọn trong năm được chọn
      const startOfMonth = new Date(selectedYear, month, 1);
      const endOfMonth = new Date(selectedYear, month + 1, 0);
      dateFrom = formatLocalDate(startOfMonth);
      dateTo = formatLocalDate(endOfMonth);
    } else if (timeRange === 'quarter') {
      // Đúng quý hiện tại theo lịch trong năm được chọn
      const qIndex = Math.floor(month / 3);
      const qStartMonth = qIndex * 3;
      const startOfQuarter = new Date(selectedYear, qStartMonth, 1);
      const endOfQuarter = new Date(selectedYear, qStartMonth + 3, 0);
      dateFrom = formatLocalDate(startOfQuarter);
      dateTo = formatLocalDate(endOfQuarter);
    } else if (timeRange === 'year') {
      // Đầy đủ cả 12 tháng từ 01/01 đến 31/12 của năm được chọn
      dateFrom = `${selectedYear}-01-01`;
      dateTo = `${selectedYear}-12-31`;
    }
    return { dateFrom, dateTo };
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setReportError('');
    try {
      const { dateFrom, dateTo } = getDateRange();
      const blob = await staffApi.exportReportCsv(branchId, dateFrom, dateTo);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cospace_branch_bookings_${dateFrom ?? 'all'}_${dateTo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setReportError(e.message || 'Không thể xuất dữ liệu.');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!branchId) return;
    const fetchBranchName = async () => {
      try {
        const token = localStorage.getItem('workhub_access_token');
        const response = await fetch(`${API_BASE_URL}/api/branch-admin/branches/${branchId}/name`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setDbBranchName(data.name);
        }
      } catch (error) {
        console.error('Failed to fetch branch name', error);
      }
    };
    fetchBranchName();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    const fetchReport = async () => {
      setIsLoading(true);
      setReportError('');
      try {
        const { dateFrom, dateTo } = getDateRange();
        const effectiveGroupBy = granularity === 'auto' ? undefined : granularity;
        const data = await staffApi.getReportOverview(branchId, dateFrom, dateTo, effectiveGroupBy);
        setReport(data);
      } catch (e: any) {
        setReportError(e.message || 'Không thể tải dữ liệu báo cáo chi nhánh.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [branchId, timeRange, selectedYear, granularity]);

  const statCards = useMemo(() => {
    if (!report) return [];
    return [
      {
        icon: FiCalendar,
        label: 'Tổng đặt chỗ',
        value: String(report.totalBookings),
        sub: `${report.completedBookings} hoàn tất · ${report.canceledBookings} đã hủy`,
        gradient: 'from-violet-500 to-purple-600',
        glow: 'bg-violet-500/15',
      },
      {
        icon: FiActivity,
        label: 'Hoàn thành',
        value: String(report.completedBookings),
        sub: `${report.totalBookings > 0 ? Math.round((report.completedBookings / report.totalBookings) * 100) : 0}% tỷ lệ chuyển đổi`,
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'bg-emerald-500/15',
      },
      {
        icon: FiGrid,
        label: 'Đã hủy',
        value: String(report.canceledBookings),
        sub: `${report.totalBookings > 0 ? Math.round((report.canceledBookings / report.totalBookings) * 100) : 0}% tỷ lệ hủy phòng`,
        gradient: 'from-rose-500 to-pink-600',
        glow: 'bg-rose-500/15',
      },
      {
        icon: FiDollarSign,
        label: 'Doanh thu',
        value: formatVND(report.totalRevenue),
        sub: 'Thực nhận sau chiết khấu & dịch vụ',
        gradient: 'from-blue-500 to-indigo-600',
        glow: 'bg-blue-500/15',
      },
    ];
  }, [report]);

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
                Báo cáo & Phân tích Chi Nhánh
              </h1>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
                <FiMapPin className="h-3.5 w-3.5" />
                {dbBranchName ?? user?.branchName ?? 'Chi nhánh'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Số liệu thống kê doanh thu, lưu lượng đặt chỗ và tỷ lệ sử dụng không gian theo thời gian thực.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
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
                aria-label="Chọn năm báo cáo chi nhánh"
                className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-1"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-card text-foreground">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Time Range */}
            <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'week', label: '7 ngày' },
                { id: 'month', label: 'Tháng này' },
                { id: 'quarter', label: 'Quý này' },
                { id: 'year', label: `Cả năm ${selectedYear}` },
              ].map((t) => (
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

            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="btn btn-secondary btn-sm flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm"
              title="Xuất báo cáo định dạng CSV"
            >
              <FiDownload className="h-4 w-4" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {reportError && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm">
          <FiAlertCircle className="h-4 w-4 shrink-0" />
          <span>{reportError}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-3xl border border-border p-5 animate-pulse space-y-3">
              <div className="h-10 w-10 rounded-xl bg-muted" />
              <div className="h-7 w-28 bg-muted rounded" />
              <div className="h-4 w-36 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
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
        {/* Recharts Revenue & Traffic Bar Chart */}
        <div className="lg:col-span-7 bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
                <FiTrendingUp className="h-4 w-4 text-primary" />
                {chartMetric === 'revenue' ? 'Doanh Thu Định Kỳ' : 'Lưu Lượng Khách Hàng'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {chartMetric === 'revenue' ? 'Biến động dòng tiền theo thời gian' : 'Tổng số lượt khách và đơn đặt chỗ'}
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
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs animate-pulse">
              Đang vẽ biểu đồ phân tích...
            </div>
          ) : revenueChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
              Chưa có dữ liệu giao dịch trong khoảng thời gian này.
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
                    allowDecimals={chartMetric === 'bookings' ? false : undefined}
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
                              <p className="text-primary font-semibold flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                                  Doanh thu:
                                </span>
                                <span>{formatVND(item.revenue)}</span>
                              </p>
                              <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                  Lượt khách:
                                </span>
                                <span>{item.bookings || 0} lượt</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={chartMetric}
                    name={chartMetric === 'revenue' ? 'Doanh thu' : 'Lượt khách'}
                    fill={chartMetric === 'revenue' ? '#3b82f6' : '#10b981'}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Doanh thu thuần
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Lượt khách
              </span>
            </span>
            <span>Tổng: {formatVND(report?.totalRevenue || 0)} ({report?.totalBookings || 0} đơn)</span>
          </div>
        </div>

        {/* Workspace Type Breakdown with Donut and Progress */}
        <div className="lg:col-span-5 bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
              <FiPieChart className="h-4 w-4 text-primary" /> Cơ Cấu Theo Không Gian
            </h2>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {typeData.reduce((s, x) => s + x.count, 0)} lượt đặt
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
              {/* Donut Chart */}
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
                              <p className="text-muted-foreground">{data.count} đơn ({formatVND(data.revenue)})</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              {/* Progress bars list */}
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
    </div>
  );
};

export default BADashboardPage;
