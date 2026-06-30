import React, { useState, useMemo } from 'react';
import {
  FiGrid, FiUsers, FiTool, FiActivity, FiCalendar,
  FiArrowUpRight, FiMapPin, FiAlertCircle, FiTrendingUp, FiPieChart, FiBarChart2, FiSearch, FiFilter, FiCode, FiDownload
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import {
  branches, workspaces, floors, users, bookings, payments,
  workspaceMaintenances, auditLogs
} from '../../data/mockData';
import { formatVND, formatDateTime } from '../../utils/formatters';

const BADashboardPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [activeTab, setActiveTab] = useState<'overview' | 'audit'>('overview');

  // Overview Filters
  const [reportType, setReportType] = useState('revenue'); // revenue, occupancy
  const [timeRange, setTimeRange] = useState('month');

  // Audit Filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditExpandedId, setAuditExpandedId] = useState<string | null>(null);

  const branch = branches.find((b) => b.id === branchId);
  const branchFloors = floors.filter((f) => f.branch_id === branchId);
  const floorIds = branchFloors.map((f) => f.id);
  const branchWorkspaces = workspaces.filter((w) => floorIds.includes(w.floor_id));
  const branchStaff = users.filter((u) => u.role === 'staff' && u.branch_id === branchId);
  const branchBookings = bookings.filter((b) => b.branch_id === branchId);
  
  const todayBookings = branchBookings.filter((b) => {
    const d = new Date(b.start_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  
  const activeMaintenances = workspaceMaintenances.filter(
    (m) => branchWorkspaces.some((w) => w.id === m.workspace_id) && m.status === 'active'
  );
  
  const branchRevenue = payments
    .filter((p) => p.status === 'paid' && branchBookings.some((b) => b.id === p.booking_id))
    .reduce((s, p) => s + p.amount, 0);

  const activeWs = branchWorkspaces.filter((w) => w.status === 'active').length;
  const maintenanceWs = branchWorkspaces.filter((w) => w.status === 'maintenance').length;

  const completedBookings = branchBookings.filter(b => b.status === 'completed').length;
  const canceledBookings = branchBookings.filter(b => b.status === 'canceled').length;

  const statCards = useMemo(() => [
    {
      icon: FiGrid, label: 'Tổng workspace', value: String(branchWorkspaces.length),
      sub: `${activeWs} hoạt động`, gradient: 'from-blue-500 to-indigo-500', glow: 'bg-blue-500/10',
    },
    {
      icon: FiActivity, label: 'Đặt chỗ hôm nay', value: String(todayBookings.length),
      sub: `${branchBookings.filter(b => b.status === 'checked_in').length} đang check-in`,
      gradient: 'from-violet-500 to-purple-500', glow: 'bg-violet-500/10',
    },
    {
      icon: FiUsers, label: 'Nhân viên', value: String(branchStaff.length),
      sub: `${branchStaff.filter(u => u.status === 'active').length} đang làm việc`,
      gradient: 'from-emerald-500 to-teal-500', glow: 'bg-emerald-500/10',
    },
    {
      icon: FiCalendar, label: 'Doanh thu', value: formatVND(branchRevenue),
      sub: `${completedBookings} booking hoàn thành`,
      gradient: 'from-rose-500 to-pink-500', glow: 'bg-rose-500/10',
    },
  ], [branchWorkspaces, activeWs, todayBookings, branchBookings, branchStaff, branchRevenue, completedBookings]);

  // Chart Mocks
  const months = ['T1', 'T2', 'T3', 'T4'];
  const monthlyRevenue = [1800000, 2500000, 3200000, branchRevenue];
  const maxRev = Math.max(...monthlyRevenue);
  
  const monthlyOccupancy = [45, 52, 68, 75]; // mock data %
  const maxOcc = 100;

  // Workspace Type Distribution Mock
  const byType = [
    { type: 'Bàn làm việc', count: branchBookings.filter(b => workspaces.find(w => w.id === b.workspace_id)?.workspace_type_id === 'wst-desk').length, revenue: branchRevenue * 0.4 },
    { type: 'Phòng họp', count: branchBookings.filter(b => workspaces.find(w => w.id === b.workspace_id)?.workspace_type_id === 'wst-meeting').length, revenue: branchRevenue * 0.4 },
    { type: 'Văn phòng riêng', count: branchBookings.filter(b => workspaces.find(w => w.id === b.workspace_id)?.workspace_type_id === 'wst-private').length, revenue: branchRevenue * 0.2 },
  ];

  // Audit Logs filtered by branch staff/admin actions or related to branch bookings
  const branchAuditLogs = useMemo(() => {
    // In a real app, backend would filter this. For mock, we check if actor is in our branch or target is our branch
    const staffIds = branchStaff.map(s => s.id);
    return auditLogs.filter(l => {
      // Very basic mock filter for branch context
      const isBranchContext = staffIds.includes(l.actor_user_id) || l.actor_role === 'admin';
      
      if (!isBranchContext) return false;

      const matchSearch = !auditSearch || 
        l.action.toLowerCase().includes(auditSearch.toLowerCase()) || 
        l.target_table.toLowerCase().includes(auditSearch.toLowerCase()) ||
        users.find(u => u.id === l.actor_user_id)?.full_name.toLowerCase().includes(auditSearch.toLowerCase());
      
      const matchAction = !auditActionFilter || l.action === auditActionFilter;
      
      return matchSearch && matchAction;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [branchStaff, auditSearch, auditActionFilter]);

  const actionColor: Record<string, string> = {
    CREATE_BOOKING: 'badge-success', CHECKIN: 'badge-info', UPDATE_PRICE: 'badge-warning',
    CONFIRM_PAYMENT: 'badge-success', CANCEL_BOOKING: 'badge-danger',
  };

  const allActions = Array.from(new Set(auditLogs.map(l => l.action)));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quản lý chi nhánh
            </p>
            <h1 className="text-xl font-bold font-heading mt-1">Báo cáo & Lịch sử hoạt động</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <FiMapPin className="h-3.5 w-3.5" />
              {branch?.name ?? branchId} — {branch?.address}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {branch?.status === 'inactive' && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                <FiAlertCircle className="h-4 w-4 shrink-0" />
                Đang tạm ngưng hoạt động
              </div>
            )}
            <button className="btn btn-secondary btn-sm"><FiDownload className="h-4 w-4" /> Xuất dữ liệu</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-6 border-b border-border">
          <button
            className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'overview' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('overview')}
          >
            Tổng quan hiệu quả
            {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>
          <button
            className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'audit' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('audit')}
          >
            Lịch sử hoạt động (Audit Logs)
            {activeTab === 'audit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Loại biểu đồ:</span>
              <select className="input-field py-1.5 text-sm" value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="revenue">Doanh thu</option>
                <option value="occupancy">Tỷ lệ lấp đầy</option>
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

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((s) => (
              <div key={s.label} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
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

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold flex items-center gap-2">
                <FiTrendingUp className="h-4 w-4 text-primary" /> 
                {reportType === 'revenue' ? 'Doanh thu theo tháng' : 'Tỷ lệ lấp đầy theo tháng'}
              </h2>
              <div className="mt-6 flex items-end gap-4 h-48">
                {months.map((m, i) => {
                  const val = reportType === 'revenue' ? monthlyRevenue[i] : monthlyOccupancy[i];
                  const max = reportType === 'revenue' ? maxRev : maxOcc;
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-2 group">
                      <span className="text-xs font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {reportType === 'revenue' ? formatVND(val) : `${val}%`}
                      </span>
                      <div className={`w-full rounded-t-lg bg-gradient-to-t transition-all duration-500 group-hover:opacity-90 ${reportType === 'revenue' ? 'from-blue-500 to-indigo-500' : 'from-emerald-400 to-teal-500'}`}
                        style={{ height: `${(val / max) * 100}%` }} />
                      <span className="text-xs text-muted-foreground">{m}/2026</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold flex items-center gap-2"><FiPieChart className="h-4 w-4 text-primary" /> Doanh thu theo loại Workspace</h2>
              <div className="mt-6 space-y-4">
                {byType.map(t => (
                  <div key={t.type} className="rounded-xl bg-muted p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{t.type}</span>
                      <span className="text-sm font-semibold text-primary">{formatVND(t.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{t.count} booking</span></div>
                    <div className="mt-2 h-2 rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${branchBookings.length > 0 ? (t.count / branchBookings.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-6 animate-fade-in">
          {/* Audit Filters */}
          <div className="flex items-center gap-4 flex-wrap bg-muted/50 p-4 rounded-xl border border-border">
            <div className="relative flex-1 min-w-[250px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input 
                type="text" 
                value={auditSearch} 
                onChange={e => setAuditSearch(e.target.value)} 
                placeholder="Tìm theo người thực hiện, hành động, bảng..." 
                className="input-field !pl-10" 
              />
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="text-muted-foreground h-4 w-4" />
              <select 
                className="input-field py-2 text-sm" 
                value={auditActionFilter} 
                onChange={e => setAuditActionFilter(e.target.value)}
              >
                <option value="">Tất cả hành động</option>
                {allActions.map(act => <option key={act} value={act}>{act}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <FiCalendar className="text-muted-foreground h-4 w-4" />
              <input type="date" className="input-field py-2 text-sm text-muted-foreground" />
            </div>
          </div>

          {/* Audit Table */}
          <div className="rounded-xl border border-border bg-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="bg-muted/50">
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>ID Đối tượng</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {branchAuditLogs.length > 0 ? branchAuditLogs.map(l => {
                    const actor = users.find(u => u.id === l.actor_user_id);
                    const isExpanded = auditExpandedId === l.id;
                    return (
                      <React.Fragment key={l.id}>
                        <tr 
                          className="cursor-pointer hover:bg-muted/30 transition-colors" 
                          onClick={() => setAuditExpandedId(isExpanded ? null : l.id)}
                        >
                          <td className="text-sm whitespace-nowrap text-muted-foreground">{formatDateTime(l.created_at)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                {actor?.full_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{actor?.full_name || l.actor_user_id}</p>
                                <p className="text-xs text-muted-foreground capitalize">{l.actor_role}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${actionColor[l.action] || 'badge-neutral'} shadow-sm`}>
                              <FiActivity className="mr-1 h-3 w-3 inline" />
                              {l.action}
                            </span>
                          </td>
                          <td className="font-mono text-xs text-muted-foreground">{l.target_table}</td>
                          <td className="font-mono text-xs">{l.target_id}</td>
                          <td>
                            <button className="p-2 hover:bg-muted rounded-full transition-colors">
                              <FiCode className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-90 text-primary' : ''}`} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="!p-0 !bg-muted/30 border-b border-border">
                              <div className="p-4 border-l-2 border-primary ml-4 my-2 rounded-r-lg bg-card shadow-sm">
                                <p className="text-xs font-semibold mb-2 text-muted-foreground">JSON METADATA</p>
                                <pre className="text-xs font-mono overflow-x-auto text-foreground">
                                  {JSON.stringify(l.metadata, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        Không tìm thấy nhật ký hoạt động nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BADashboardPage;
