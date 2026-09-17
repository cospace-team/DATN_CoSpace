import React, { useState, useMemo, useEffect } from 'react';
import { FiBarChart2, FiDownload, FiPieChart, FiTrendingUp, FiDollarSign, FiCalendar, FiCheckCircle, FiXCircle, FiArrowUpRight, FiChevronDown, FiFilter, FiMapPin } from 'react-icons/fi';
import { formatVND } from '../../utils/formatters';
import { Skeleton } from '../../components/ui/Skeleton';
import { Spinner } from '../../components/ui/Spinner';
import { customerSpaceApi, type BranchResponse } from '../../lib/spaceApi';
import { API_BASE_URL } from '../../config/api';

const ReportsPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    customerSpaceApi.listBranches()
      .then(res => setBranches(res))
      .catch(err => console.error('Error fetching branches in ReportsPage:', err));
  }, []);

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('workhub_access_token');
        const branchParam = branchFilter !== 'all' ? `&branchId=${branchFilter}` : '';
        const res = await fetch(`${API_BASE_URL}/api/reports/overview?dateFrom=${dateFrom}&dateTo=${dateTo}${branchParam}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          setOverviewData(await res.json());
          setLoadError('');
        } else {
          const err = await res.json().catch(() => ({}));
          setOverviewData(null);
          setLoadError(err.message || `Không tải được số liệu báo cáo (${res.status}).`);
        }
      } catch (err) {
        console.error('Cannot fetch report data', err);
        setOverviewData(null);
        setLoadError('Không kết nối được máy chủ để tải số liệu báo cáo.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, [branchFilter, dateFrom, dateTo]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('workhub_access_token');
      const branchParam = branchFilter !== 'all' ? `&branchId=${branchFilter}` : '';
      const res = await fetch(`${API_BASE_URL}/api/reports/export/csv?dateFrom=${dateFrom}&dateTo=${dateTo}${branchParam}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cospace_report_${dateFrom}_${dateTo}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Backend export failed, generating local CSV:', e);
    } finally {
      setIsExporting(false);
    }

    // Fallback CSV export from current summary
    const rows = (overviewData?.branchComparison || []).map((b: any) => `${b.code},"${b.name}",${b.bookingCount},${b.revenue},${b.rate}%`).join('\n');
    const csvContent = '\uFEFFMã chi nhánh,Tên chi nhánh,Số booking,Doanh thu (VND),Tỷ lệ hoàn thành\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cospace_report_${dateFrom}_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = overviewData?.totalRevenue ?? 0;
  const totalBookings = overviewData?.totalBookings ?? 0;
  const completedBookings = overviewData?.completedBookings ?? 0;
  const canceledBookings = overviewData?.canceledBookings ?? 0;

  const statCards = [
    { icon: FiDollarSign, label: 'Tổng doanh thu', value: formatVND(totalRevenue), gradient: 'from-emerald-500 to-teal-500', bgGlow: 'bg-emerald-50 dark:bg-emerald-950/300/10', color: 'text-emerald-600 dark:text-emerald-400' },
    { icon: FiCalendar, label: 'Tổng booking', value: String(totalBookings), gradient: 'from-blue-500 to-indigo-500', bgGlow: 'bg-blue-50 dark:bg-blue-950/300/10', color: 'text-blue-600 dark:text-blue-400' },
    { icon: FiCheckCircle, label: 'Hoàn thành', value: String(completedBookings), gradient: 'from-violet-500 to-purple-500', bgGlow: 'bg-violet-500/10', color: 'text-violet-600 dark:text-violet-400' },
    { icon: FiXCircle, label: 'Đã hủy', value: String(canceledBookings), gradient: 'from-rose-500 to-pink-500', bgGlow: 'bg-rose-500/10', color: 'text-rose-600 dark:text-rose-400' },
  ];

  const byType = (overviewData?.byType && overviewData.byType.length > 0) ? overviewData.byType : [];
  const maxRevType = Math.max(1, ...(byType.map((t: any) => t.revenue) || [1]));

  const months = overviewData?.months ?? [];
  const monthlyRevenue = overviewData?.monthlyRevenue ?? [];
  const maxRev = Math.max(1, ...(monthlyRevenue.length > 0 ? monthlyRevenue : [1]));

  const branchComparison = overviewData?.branchComparison || [];


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Filters */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Báo cáo</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Phân tích & Thống kê</h1>
            {isLoading && (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Spinner size="sm" className="text-primary" /> Đang tải số liệu báo cáo...
              </p>
            )}
          </div>
          <button 
            onClick={handleExportCsv} 
            disabled={isExporting}
            className="btn btn-secondary btn-sm">
            <FiDownload className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} /> 
            {isExporting ? 'Đang xuất...' : 'Xuất CSV'}
          </button>
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

      {loadError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{loadError}</div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={`stat-skeleton-${i}`} className="bg-card rounded-3xl border border-border p-5 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-4 h-8 w-2/3" />
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
        {!isLoading && statCards.map(s => (
          <div key={s.label} className="group relative overflow-hidden bg-card rounded-3xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
            <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${s.bgGlow} blur-2xl transition-opacity group-hover:opacity-100 opacity-50`} />
            <div className="relative">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-extrabold tracking-tight">{s.value}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div
        className={`grid gap-6 lg:grid-cols-2 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
        aria-busy={isLoading || undefined}
      >
        {/* Line Chart (Monthly Revenue) */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-semibold flex items-center gap-2 mb-6">
            <FiTrendingUp className="h-4 w-4 text-primary" /> Doanh thu theo tháng
          </h2>
          <div className="flex items-end gap-4 h-52">
            {months.map((m: string, i: number) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <span className="text-xs font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatVND(monthlyRevenue[i])}
                </span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-indigo-500 transition-all duration-500 group-hover:from-blue-400 group-hover:to-indigo-400 relative"
                  style={{ height: `${(monthlyRevenue[i] / maxRev) * 100}%` }}>
                  {/* Tooltip dot */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-card border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{m}/2026</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart (By Workspace Type) */}
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="font-semibold flex items-center gap-2 mb-6">
            <FiPieChart className="h-4 w-4 text-primary" /> Doanh thu theo loại workspace
          </h2>
          <div className="space-y-5">
            {byType.map((t: any) => (
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
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <FiBarChart2 className="h-4 w-4 text-primary" /> So sánh chi nhánh
        </h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Chi nhánh</th><th>Tổng booking</th><th>Doanh thu</th><th>Tỷ lệ hoàn thành</th></tr></thead>
            <tbody>
              {isLoading && [...Array(3)].map((_, i) => (
                <tr key={`branch-skeleton-${i}`}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td><Skeleton className="h-4 w-12" /></td>
                  <td><Skeleton className="h-4 w-24" /></td>
                  <td><Skeleton className="h-4 w-16" /></td>
                </tr>
              ))}
              {!isLoading && branchComparison.map((b: any) => (
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
