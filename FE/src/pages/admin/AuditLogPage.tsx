import React, { useState, useMemo, useEffect } from 'react';
import { FiSearch, FiCode, FiX, FiShield, FiCalendar, FiGlobe, FiAlertCircle, FiRefreshCw, FiFilter } from 'react-icons/fi';
import { formatDateTime } from '../../utils/formatters';
import { Skeleton } from '../../components/ui/Skeleton';
import { API_BASE_URL } from '../../config/api';

interface AuditLogItem {
  id: string;
  userId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const actionLabel: Record<string, string> = {
  CREATE_BOOKING: 'Đặt chỗ',
  CANCEL_BOOKING: 'Hủy đặt chỗ',
  CHECKIN: 'Check-in',
  CHECKOUT: 'Check-out',
  PAYMENT: 'Thanh toán',
  CREATE: 'Thêm mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  CREATE_BRANCH: 'Tạo chi nhánh',
  UPDATE_WORKSPACE: 'Cập nhật phòng',
  TOGGLE_SERVICE: 'Bật/Tắt dịch vụ',
};

const actionColor: Record<string, string> = {
  CREATE_BOOKING: 'badge-info',
  CANCEL_BOOKING: 'badge-error',
  CHECKIN: 'badge-success',
  CHECKOUT: 'badge-neutral',
  PAYMENT: 'badge-warning',
  CREATE: 'badge-info',
  UPDATE: 'badge-warning',
  DELETE: 'badge-error',
  LOGIN: 'badge-neutral',
  LOGOUT: 'badge-neutral',
  CREATE_BRANCH: 'badge-info',
  UPDATE_WORKSPACE: 'badge-warning',
  TOGGLE_SERVICE: 'badge-neutral',
};

const entityLabel: Record<string, string> = {
  bookings: 'Đặt chỗ',
  users: 'Người dùng',
  branches: 'Chi nhánh',
  workspaces: 'Không gian',
  workspace_types: 'Loại không gian',
  extra_services: 'Dịch vụ gia tăng',
  payments: 'Thanh toán',
  cancellation_policies: 'Chính sách hủy',
  price_policies: 'Chính sách giá',
};

const roleLabel: Record<string, string> = {
  super_admin: 'Quản trị viên cấp cao',
  admin: 'Quản trị viên',
  branch_admin: 'Quản lý chi nhánh',
  staff: 'Nhân viên',
  customer: 'Khách hàng',
  system: 'Hệ thống',
};

const roleBadge: Record<string, string> = {
  super_admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  admin: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  branch_admin: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  staff: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  customer: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  system: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
};

const AuditLogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  const fetchAuditLogs = async (page = 0) => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('workhub_access_token');
      if (!token) {
        setError('Chưa đăng nhập. Vui lòng đăng nhập lại.');
        return;
      }
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Lỗi ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.content && Array.isArray(json.content)) {
        setLogs(json.content);
        setTotalElements(json.totalElements || 0);
        setCurrentPage(json.page || 0);
      }
    } catch (err: any) {
      console.error('Cannot fetch audit logs:', err);
      setError(err.message || 'Không thể tải nhật ký. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        (l.actorName && l.actorName.toLowerCase().includes(s)) ||
        (l.entityName && l.entityName.toLowerCase().includes(s)) ||
        (l.action && l.action.toLowerCase().includes(s)) ||
        (l.ipAddress && l.ipAddress.includes(s));

      const matchAction = actionFilter === 'all' || l.action === actionFilter;
      const matchRole = roleFilter === 'all' || l.actorRole === roleFilter;

      let matchDate = true;
      if (dateFrom) {
        matchDate = matchDate && new Date(l.createdAt) >= new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        matchDate = matchDate && new Date(l.createdAt) <= to;
      }

      return matchSearch && matchAction && matchRole && matchDate;
    });
  }, [logs, search, actionFilter, roleFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(totalElements / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nhật ký hệ thống</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi và kiểm toán toàn bộ hoạt động trong hệ thống
          </p>
        </div>
        <button
          onClick={() => fetchAuditLogs(currentPage)}
          disabled={isLoading}
          className="btn btn-outline btn-sm self-start sm:self-auto gap-2"
        >
          <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchAuditLogs(currentPage)} className="btn btn-ghost btn-xs underline">
            Thử lại
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo người thực hiện, đối tượng, IP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="input w-full sm:w-44 text-sm"
            >
              <option value="all">Tất cả hành động</option>
              {Object.keys(actionLabel).map(k => (
                <option key={k} value={k}>
                  {actionLabel[k]}
                </option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="input w-full sm:w-44 text-sm"
            >
              <option value="all">Tất cả vai trò</option>
              {Object.keys(roleLabel).map(k => (
                <option key={k} value={k}>
                  {roleLabel[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range & Reset */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <FiCalendar className="h-3.5 w-3.5" />
          <span>Từ:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="input input-sm h-7 text-xs w-32"
          />
          <span>Đến:</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="input input-sm h-7 text-xs w-32"
          />
          {(search || actionFilter !== 'all' || roleFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch('');
                setActionFilter('all');
                setRoleFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="btn btn-ghost btn-xs text-xs gap-1 ml-auto"
            >
              <FiX className="h-3 w-3" /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {/* Logs Table */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người thực hiện</th>
              <th>Vai trò</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td><Skeleton className="h-4 w-36" /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-7 w-7 rounded-lg" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </td>
                  <td><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td><Skeleton className="h-5 w-24 rounded-full" /></td>
                  <td><Skeleton className="h-4 w-20" /></td>
                  <td />
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <FiShield className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">{logs.length === 0 ? 'Chưa có nhật ký nào' : 'Không có bản ghi phù hợp'}</p>
                  <p className="text-sm mt-1">{logs.length === 0 ? 'Các hành động trong hệ thống sẽ tự động được ghi nhận tại đây' : 'Thử thay đổi bộ lọc để xem kết quả khác'}</p>
                </td>
              </tr>
            ) : (
              filtered.map(l => {
                const isExpanded = expandedId === l.id;
                const initials = l.actorName ? l.actorName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'HT';
                return (
                  <React.Fragment key={l.id}>
                    <tr className="cursor-pointer group hover:bg-muted/30" onClick={() => setExpandedId(isExpanded ? null : l.id)}>
                      <td className="text-sm font-mono whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <span className="font-medium text-sm">{l.actorName || (l as any).actor_name || 'Hệ thống'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleBadge[l.actorRole] || roleBadge.system}`}>
                          {roleLabel[l.actorRole] || l.actorRole}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${actionColor[l.action] || 'badge-neutral'}`}>
                          {actionLabel[l.action] || l.action}
                        </span>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {entityLabel[l.entityName] || l.entityName}
                        {l.entityId && (
                          <span className="ml-1 text-xs font-mono opacity-60" title={l.entityId}>
                            #{l.entityId.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <FiCode className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="!bg-muted/50 !p-0">
                          <div className="px-6 py-4 space-y-3">
                            {l.oldValues && Object.keys(l.oldValues).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Giá trị cũ</p>
                                <pre className="text-xs font-mono bg-card rounded-lg border border-border p-3 overflow-x-auto">
                                  {JSON.stringify(l.oldValues, null, 2)}
                                </pre>
                              </div>
                            )}
                            {l.newValues && Object.keys(l.newValues).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Giá trị mới</p>
                                <pre className="text-xs font-mono bg-card rounded-lg border border-border p-3 overflow-x-auto">
                                  {JSON.stringify(l.newValues, null, 2)}
                                </pre>
                              </div>
                            )}
                            {l.ipAddress && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <FiGlobe className="h-3 w-3" /> IP: <span className="font-mono">{l.ipAddress}</span>
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Trang {currentPage + 1} / {totalPages} ({totalElements} bản ghi)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchAuditLogs(currentPage - 1)}
                disabled={currentPage <= 0}
                className="btn btn-ghost btn-sm disabled:opacity-40"
              >
                ← Trước
              </button>
              <button
                onClick={() => fetchAuditLogs(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="btn btn-ghost btn-sm disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
