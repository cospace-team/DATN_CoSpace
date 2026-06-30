import React, { useState, useMemo } from 'react';
import { FiSearch, FiCode, FiChevronDown, FiFilter, FiX, FiEye, FiShield, FiCalendar, FiGlobe } from 'react-icons/fi';
import { auditLogs, getUser, users } from '../../data/mockData';
import { formatDateTime } from '../../utils/formatters';

const AuditLogPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uniqueActions = useMemo(() => [...new Set(auditLogs.map(l => l.action))], []);
  const actorUsers = useMemo(() => {
    const ids = [...new Set(auditLogs.map(l => l.actor_user_id))];
    return ids.map(id => ({ id, name: getUser(id)?.full_name || id }));
  }, []);

  const filtered = useMemo(() =>
    auditLogs.filter(l => {
      if (userFilter !== 'all' && l.actor_user_id !== userFilter) return false;
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (search && !l.action.toLowerCase().includes(search.toLowerCase()) && !l.target_table.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom) {
        const logDate = new Date(l.created_at).toISOString().slice(0, 10);
        if (logDate < dateFrom) return false;
      }
      if (dateTo) {
        const logDate = new Date(l.created_at).toISOString().slice(0, 10);
        if (logDate > dateTo) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [search, userFilter, actionFilter, dateFrom, dateTo]
  );

  const actionColor: Record<string, string> = {
    CREATE_BOOKING: 'badge-success',
    CHECKIN: 'badge-info',
    UPDATE_PRICE: 'badge-warning',
    CONFIRM_PAYMENT: 'badge-success',
    CANCEL_BOOKING: 'badge-danger',
  };

  const actionLabel: Record<string, string> = {
    CREATE_BOOKING: 'Tạo booking',
    CHECKIN: 'Check-in',
    UPDATE_PRICE: 'Cập nhật giá',
    CONFIRM_PAYMENT: 'Xác nhận thanh toán',
    CANCEL_BOOKING: 'Hủy booking',
  };

  const hasActiveFilters = search !== '' || userFilter !== 'all' || actionFilter !== 'all' || dateFrom !== '' || dateTo !== '';
  const clearFilters = () => { setSearch(''); setUserFilter('all'); setActionFilter('all'); setDateFrom(''); setDateTo(''); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kiểm toán</p>
            <h1 className="text-xl font-bold font-heading mt-1">Nhật ký hệ thống</h1>
            <p className="text-sm text-muted-foreground mt-1">Theo dõi mọi hành động trong hệ thống — chế độ chỉ đọc, không thể sửa hoặc xóa</p>
          </div>
          <span className="badge badge-neutral flex items-center gap-1.5">
            <FiEye className="h-3.5 w-3.5" /> Chỉ đọc
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo hành động hoặc bảng..."
              className="input-field !pl-10 !min-h-[40px]" />
          </div>

          {/* User Filter */}
          <div className="relative">
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[160px]">
              <option value="all">Tất cả người dùng</option>
              {actorUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[160px]">
              <option value="all">Tất cả hành động</option>
              {uniqueActions.map(a => <option key={a} value={a}>{actionLabel[a] || a}</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn btn-ghost btn-sm text-destructive hover:!text-destructive">
              <FiX className="h-3.5 w-3.5" /> Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap gap-3 items-center mt-3 pt-3 border-t border-border">
          <FiCalendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Khoảng thời gian</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="input-field !min-h-[36px] !py-1 !px-3 text-sm w-auto" />
          <span className="text-muted-foreground text-sm">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="input-field !min-h-[36px] !py-1 !px-3 text-sm w-auto" />
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FiFilter className="h-3.5 w-3.5" />
            <span>{filtered.length} bản ghi từ {auditLogs.length} tổng</span>
          </div>
        )}
      </div>

      {/* Audit Table */}
      <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th><FiCalendar className="inline h-3 w-3 mr-1" />Thời gian</th>
              <th>Người thực hiện</th>
              <th>Vai trò</th>
              <th>Hành động</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  <FiShield className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">Không có bản ghi nào</p>
                  <p className="text-sm mt-1">Thử thay đổi bộ lọc để xem kết quả khác</p>
                </td>
              </tr>
            ) : (
              filtered.map(l => {
                const actor = getUser(l.actor_user_id);
                const isExpanded = expandedId === l.id;
                return (
                  <React.Fragment key={l.id}>
                    <tr className="cursor-pointer group" onClick={() => setExpandedId(isExpanded ? null : l.id)}>
                      <td className="text-sm font-mono whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(actor?.full_name || '?').charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{actor?.full_name || l.actor_user_id}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral capitalize text-xs">{l.actor_role}</span>
                      </td>
                      <td>
                        <span className={`badge ${actionColor[l.action] || 'badge-neutral'}`}>
                          {actionLabel[l.action] || l.action}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="!bg-muted/50 !p-0">
                          <div className="px-6 py-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Metadata chi tiết</p>
                            <pre className="text-xs font-mono bg-card rounded-lg border border-border p-4 overflow-x-auto">
                              {JSON.stringify(l.metadata, null, 2)}
                            </pre>
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
      </div>
    </div>
  );
};

export default AuditLogPage;
