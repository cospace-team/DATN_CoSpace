import React, { useState, useEffect } from 'react';
import {
  FiGrid, FiTool, FiActivity, FiCalendar,
  FiArrowUpRight, FiMapPin, FiAlertCircle, FiTrendingUp, FiPieChart, FiDownload
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { formatVND } from '../../utils/formatters';
import { API_BASE_URL } from '../../config/api';
import { staffApi, type ReportOverviewDto } from '../../api/staffApi';

const BADashboardPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [dbBranchName, setDbBranchName] = useState<string | null>(null);
  const [reportType, setReportType] = useState('revenue');
  const [timeRange, setTimeRange] = useState('month');
  const [report, setReport] = useState<ReportOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Shared by the report fetch and the CSV export below, so "Xuất dữ liệu" always exports
  // exactly the period currently shown on screen.
  const getDateRange = (): { dateFrom?: string; dateTo?: string } => {
    const now = new Date();
    let dateFrom: string | undefined;
    const dateTo = now.toISOString().split('T')[0];
    if (timeRange === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      dateFrom = d.toISOString().split('T')[0];
    } else if (timeRange === 'month') {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (timeRange === 'quarter') {
      const d = new Date(now); d.setMonth(d.getMonth() - 3);
      dateFrom = d.toISOString().split('T')[0];
    } else if (timeRange === 'year') {
      dateFrom = `${now.getFullYear()}-01-01`;
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
      a.download = `cospace_bookings_${dateFrom ?? 'all'}_${dateTo}.csv`;
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
        const data = await staffApi.getReportOverview(branchId, dateFrom, dateTo);
        setReport(data);
      } catch (e: any) {
        setReportError(e.message || 'Không thể tải dữ liệu báo cáo.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [branchId, timeRange]);

  const statCards = report ? [
    {
      icon: FiCalendar, label: 'Tổng đặt chỗ', value: String(report.totalBookings),
      sub: `${report.completedBookings} hoàn thành · ${report.canceledBookings} đã hủy`,
      gradient: 'from-violet-500 to-purple-500', glow: 'bg-violet-500/10',
    },
    {
      icon: FiActivity, label: 'Hoàn thành', value: String(report.completedBookings),
      sub: `${report.totalBookings > 0 ? Math.round((report.completedBookings / report.totalBookings) * 100) : 0}% tỷ lệ hoàn thành`,
      gradient: 'from-emerald-500 to-teal-500', glow: 'bg-emerald-500/10',
    },
    {
      icon: FiGrid, label: 'Đã hủy', value: String(report.canceledBookings),
      sub: `${report.totalBookings > 0 ? Math.round((report.canceledBookings / report.totalBookings) * 100) : 0}% tỷ lệ hủy`,
      gradient: 'from-rose-500 to-pink-500', glow: 'bg-rose-500/10',
    },
    {
      icon: FiTool, label: 'Doanh thu', value: formatVND(report.totalRevenue),
      sub: 'Tổng doanh thu kỳ này',
      gradient: 'from-blue-500 to-indigo-500', glow: 'bg-blue-500/10',
    },
  ] : [];

  const months = report?.months ?? [];
  const monthlyRevenue = report?.monthlyRevenue ?? [];
  const maxRev = monthlyRevenue.length > 0 ? Math.max(...monthlyRevenue, 1) : 1;
  const byType = report?.byType ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Báo cáo & Phân tích</h1>
            <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              <FiMapPin className="h-3.5 w-3.5" />
              {dbBranchName ?? user?.branchName ?? branchId}
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} disabled={isExporting}>
            <FiDownload className="h-4 w-4" /> {isExporting ? 'Đang xuất...' : 'Xuất dữ liệu'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Loại biểu đồ:</span>
          <select className="input-field py-1.5 text-sm" value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="revenue">Doanh thu</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Khoảng thời gian:</span>
          <select className="input-field py-1.5 text-sm" value={timeRange} onChange={e => setTimeRange(e.target.value)}>
            <option value="week">7 ngày qua</option>
            <option value="month">Tháng này</option>
            <option value="quarter">Quý này</option>
            <option value="year">Năm nay</option>
          </select>
        </div>
      </div>

      {reportError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{reportError}
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card rounded-3xl border border-border p-5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-muted mb-4" />
              <div className="h-7 w-24 bg-muted rounded mb-2" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.label} className="group relative overflow-hidden bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
              <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${s.glow} blur-2xl opacity-50 transition-opacity group-hover:opacity-100`} />
              <div className="relative">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-2xl font-extrabold tracking-tight">{s.value}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground truncate">{s.label}</p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FiArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-semibold flex items-center gap-2">
            <FiTrendingUp className="h-4 w-4 text-primary" /> Doanh thu theo tháng
          </h2>
          {isLoading ? (
            <div className="mt-6 h-48 flex items-end gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 bg-muted rounded-t-lg animate-pulse" style={{ height: `${25 * i}%` }} />
              ))}
            </div>
          ) : months.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-6 flex items-end gap-4 h-48">
              {months.map((m, i) => {
                const val = monthlyRevenue[i] ?? 0;
                return (
                  <div key={m} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group">
                    <span className="text-xs font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatVND(val)}
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-indigo-500 transition-all duration-500 group-hover:opacity-90"
                        style={{ height: `${maxRev > 0 ? (val / maxRev) * 100 : 0}%`, minHeight: val > 0 ? '4px' : '2px' }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{m}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-semibold flex items-center gap-2"><FiPieChart className="h-4 w-4 text-primary" /> Doanh thu theo loại Workspace</h2>
          {isLoading ? (
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="rounded-xl bg-muted p-4 h-16 animate-pulse" />)}
            </div>
          ) : byType.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {byType.map(t => {
                const total = byType.reduce((s, x) => s + x.count, 0);
                return (
                  <div key={t.type} className="rounded-xl bg-muted p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{t.type}</span>
                      <span className="text-sm font-semibold text-primary">{formatVND(t.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{t.count} booking</span></div>
                    <div className="mt-2 h-2 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${total > 0 ? (t.count / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BADashboardPage;
