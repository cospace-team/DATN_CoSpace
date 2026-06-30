import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiEdit2, FiShield, FiUsers, FiCheckCircle, FiXCircle, FiMoreVertical, FiLock, FiUnlock, FiMapPin, FiChevronDown, FiFilter, FiX, FiPlus, FiUserPlus, FiAlertTriangle } from 'react-icons/fi';
import { users, getBranch, branches } from '../../data/mockData';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

/* ── Dropdown Menu ── */
const ActionDropdown: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm !min-h-[32px] !p-1.5"><FiMoreVertical className="h-4 w-4" /></button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-52 rounded-xl border border-border bg-card shadow-xl py-1.5 animate-fade-in">
          {React.Children.map(children, child => (
            <div onClick={() => setOpen(false)}>{child}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const DropdownItem: React.FC<{ icon: React.ReactNode; label: string; destructive?: boolean; onClick?: () => void }> = ({ icon, label, destructive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted'}`}>
    {icon}{label}
  </button>
);

const UserManagementPage: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userStatuses, setUserStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(users.map(u => [u.id, u.status]))
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (branchFilter !== 'all' && u.branch_id !== branchFilter) return false;
    if (statusFilter !== 'all' && userStatuses[u.id] !== statusFilter) return false;
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleLabel: Record<string, string> = { admin: 'Quản trị viên', staff: 'Nhân viên', customer: 'Khách hàng' };
  const roleBadge: Record<string, string> = { admin: 'badge-danger', staff: 'badge-info', customer: 'badge-neutral' };
  const hasActiveFilters = roleFilter !== 'all' || branchFilter !== 'all' || statusFilter !== 'all' || search !== '';

  const toggleLock = (userId: string) => {
    setUserStatuses(prev => ({
      ...prev,
      [userId]: prev[userId] === 'active' ? 'suspended' : 'active'
    }));
  };

  const clearFilters = () => { setRoleFilter('all'); setBranchFilter('all'); setStatusFilter('all'); setSearch(''); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý người dùng</p>
            <h1 className="text-xl font-bold font-heading mt-1">Người dùng hệ thống</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý tất cả tài khoản: khách hàng, nhân viên và quản trị viên</p>
          </div>
          <button className="btn btn-primary btn-sm"><FiUserPlus className="h-4 w-4" /> Thêm người dùng</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="input-field !pl-10 !min-h-[40px]" />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[140px]">
              <option value="all">Tất cả vai trò</option>
              <option value="customer">Khách hàng</option>
              <option value="staff">Nhân viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[160px]">
              <option value="all">Tất cả chi nhánh</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[140px]">
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="suspended">Đã khóa</option>
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

        {/* Active filter count */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FiFilter className="h-3.5 w-3.5" />
            <span>{filtered.length} kết quả từ {users.length} người dùng</span>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Người dùng</th><th>Vai trò</th><th>Chi nhánh</th><th>Trạng thái</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  <td><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-xl" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></td>
                  <td><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td><Skeleton className="h-4 w-20" /></td>
                  <td><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td><Skeleton className="h-8 w-8 rounded-lg" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <EmptyState icon={FiUsers} title="Không tìm thấy người dùng"
                    description={search ? `Không có kết quả nào cho "${search}"` : "Thử thay đổi bộ lọc để xem kết quả khác."} />
                </td>
              </tr>
            ) : (
              filtered.map(u => {
                const branch = u.branch_id ? getBranch(u.branch_id) : null;
                const status = userStatuses[u.id];
                // UC4 Constraint: cannot lock/downgrade yourself (first admin user)
                const isCurrentAdmin = u.id === users.find(usr => usr.role === 'admin')?.id;
                return (
                  <tr key={u.id}>
                    <td className="max-w-[240px]">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {u.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" title={u.full_name}>{u.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate" title={u.email}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${roleBadge[u.role]}`}><FiShield className="h-3 w-3" /> {roleLabel[u.role]}</span></td>
                    <td className="max-w-[150px]">
                      {branch ? (
                        <span className="flex items-center gap-1 text-sm"><FiMapPin className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate" title={branch.name}>{branch.name}</span></span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td>
                      {/* Toggle Switch — disabled for current admin */}
                      {isCurrentAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
                          <FiShield className="h-3 w-3" /> Tài khoản hiện tại
                        </span>
                      ) : (
                        <button onClick={() => toggleLock(u.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                          }`}>
                          {status === 'active' ? <FiUnlock className="h-3 w-3" /> : <FiLock className="h-3 w-3" />}
                          {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                        </button>
                      )}
                    </td>
                    <td>
                      <ActionDropdown>
                        <DropdownItem icon={<FiShield className="h-3.5 w-3.5" />} label="Đổi vai trò" />
                        <DropdownItem icon={<FiMapPin className="h-3.5 w-3.5" />} label="Gán chi nhánh" />
                        <DropdownItem icon={<FiEdit2 className="h-3.5 w-3.5" />} label="Chỉnh sửa" />
                        <div className="my-1 border-t border-border" />
                        <DropdownItem
                          icon={status === 'active' ? <FiLock className="h-3.5 w-3.5" /> : <FiUnlock className="h-3.5 w-3.5" />}
                          label={status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                          destructive={status === 'active'}
                          onClick={() => toggleLock(u.id)}
                        />
                      </ActionDropdown>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagementPage;
