import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiSearch, FiEdit2, FiShield, FiUsers, FiMoreVertical,
  FiLock, FiUnlock, FiMapPin, FiChevronDown, FiFilter, FiX,
  FiUserPlus, FiAlertCircle, FiCheckCircle, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { adminApi, type AdminUserDto } from '../../api/adminApi';
import { customerSpaceApi, type BranchResponse } from '../../lib/spaceApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

/* ── Dropdown Menu ── */
const ActionDropdown: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm !min-h-[32px] !p-1.5"
        title="Thao tác"
      >
        <FiMoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-52 bg-card rounded-2xl border border-border shadow-xl py-1.5 animate-fade-in">
          {React.Children.map(children, child => (
            <div onClick={() => setOpen(false)}>{child}</div>
          ))}
        </div>
      )}
    </div>
  );
};

const DropdownItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick?: () => void;
}> = ({ icon, label, destructive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
      destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted'
    }`}
  >
    {icon}
    {label}
  </button>
);

/* ── Modal Đổi Vai Trò & Gán Chi Nhánh ── */
interface RoleModalProps {
  user: AdminUserDto | null;
  branches: BranchResponse[];
  onClose: () => void;
  onSave: (userId: string, role: string, branchId?: string) => Promise<void>;
}

const EditRoleModal: React.FC<RoleModalProps> = ({ user, branches, onClose, onSave }) => {
  const [selectedRole, setSelectedRole] = useState(user?.role || 'customer');
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await onSave(user.id, selectedRole, selectedBranch || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật quyền người dùng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold font-heading text-foreground">Phân quyền & Chi nhánh</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{user.fullName} ({user.email})</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm !p-1.5"><FiX className="h-4 w-4" /></button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-xl flex items-center gap-2">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Vai trò hệ thống
            </label>
            <select
              value={selectedRole}
              onChange={e => {
                const r = e.target.value as any;
                setSelectedRole(r);
                if (r === 'super_admin' || r === 'customer') {
                  setSelectedBranch('');
                }
              }}
              className="input-field w-full text-sm"
            >
              <option value="customer">Khách hàng (Customer)</option>
              <option value="staff">Nhân viên chi nhánh (Staff)</option>
              <option value="branch_admin">Quản lý chi nhánh (Branch Admin)</option>
              <option value="super_admin">Quản trị viên tổng (Super Admin)</option>
            </select>
          </div>

          {(selectedRole === 'staff' || selectedRole === 'branch_admin') && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Chi nhánh phụ trách
              </label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="input-field w-full text-sm"
                required
              >
                <option value="">-- Chọn chi nhánh --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn btn-ghost btn-sm">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Trang Quản Lý Người Dùng ── */
const UserManagementPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();

  const [usersList, setUsersList] = useState<AdminUserDto[]>([]);
  const [branchesList, setBranchesList] = useState<BranchResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Editing User
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null);

  // Load branches
  useEffect(() => {
    customerSpaceApi.listBranches()
      .then(data => setBranchesList(data))
      .catch(err => console.error('Error fetching branches:', err));
  }, []);

  // Fetch users from real BE with debounce on search
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getUsers({
        role: roleFilter,
        branchId: branchFilter,
        status: statusFilter,
        search: search,
        page,
        size: PAGE_SIZE,
      });
      setUsersList(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, branchFilter, statusFilter, search, page, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Any filter/search change jumps back to page 1 — staying on a stale page could otherwise
  // land past the end of the newly filtered, smaller result set.
  useEffect(() => {
    setPage(0);
  }, [roleFilter, branchFilter, statusFilter, search]);

  // Lock / Unlock toggle
  const toggleLock = async (targetUser: AdminUserDto) => {
    if (targetUser.id === authUser?.id) {
      showToast('Bạn không thể tự khóa tài khoản quản trị của chính mình!', 'info');
      return;
    }

    const nextStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    const actionLabel = nextStatus === 'active' ? 'mở khóa' : 'khóa';

    // Optimistic update
    setUsersList(prev =>
      prev.map(u => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
    );

    try {
      await adminApi.updateUserStatus(targetUser.id, nextStatus);
      showToast(`Đã ${actionLabel} tài khoản ${targetUser.fullName} thành công`, 'success');
    } catch (err: any) {
      // Revert on error
      setUsersList(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, status: targetUser.status } : u))
      );
      showToast(err.message || `Lỗi khi ${actionLabel} tài khoản`, 'error');
    }
  };

  // Save role & branch
  const handleSaveRole = async (userId: string, role: string, branchId?: string) => {
    const updated = await adminApi.updateUserRole(userId, role, branchId);
    setUsersList(prev => prev.map(u => (u.id === userId ? { ...u, ...updated } : u)));
    showToast('Cập nhật quyền thành công', 'success');
  };

  const clearFilters = () => {
    setRoleFilter('all');
    setBranchFilter('all');
    setStatusFilter('all');
    setSearch('');
  };

  const hasActiveFilters =
    roleFilter !== 'all' || branchFilter !== 'all' || statusFilter !== 'all' || search !== '';

  const roleLabel: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Quản trị viên',
    branch_admin: 'Quản lý CN',
    staff: 'Nhân viên',
    customer: 'Khách hàng',
  };

  const roleBadge: Record<string, string> = {
    super_admin: 'badge-danger',
    admin: 'badge-danger',
    branch_admin: 'badge-warning',
    staff: 'badge-info',
    customer: 'badge-neutral',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground font-heading">
              Quản lý tài khoản người dùng
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Phân quyền, kiểm soát trạng thái hoạt động và gán chi nhánh vận hành cho toàn bộ nhân sự & khách hàng.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              Tổng số: {totalElements} tài khoản
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              className="input-field !pl-10 !min-h-[40px] w-full"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[140px]"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="customer">Khách hàng</option>
              <option value="staff">Nhân viên</option>
              <option value="branch_admin">Quản lý CN</option>
              <option value="admin">Quản trị viên</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Branch Filter */}
          <div className="relative">
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[160px]"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branchesList.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field !min-h-[40px] !py-1 !pr-8 text-sm appearance-none cursor-pointer w-auto min-w-[140px]"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="suspended">Đã khóa</option>
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn btn-ghost btn-sm text-destructive hover:!text-destructive"
            >
              <FiX className="h-3.5 w-3.5" /> Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FiFilter className="h-3.5 w-3.5" />
            <span>Tìm thấy {totalElements} kết quả lọc</span>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Vai trò</th>
              <th>Chi nhánh</th>
              <th>Trạng thái</th>
              <th className="text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </td>
                  <td><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td><Skeleton className="h-4 w-20" /></td>
                  <td><Skeleton className="h-6 w-24 rounded-full" /></td>
                  <td className="text-right"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></td>
                </tr>
              ))
            ) : usersList.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <EmptyState
                    icon={FiUsers}
                    title="Không tìm thấy người dùng"
                    description={
                      search
                        ? `Không có kết quả nào cho "${search}"`
                        : 'Thử thay đổi bộ lọc để xem kết quả khác.'
                    }
                  />
                </td>
              </tr>
            ) : (
              usersList.map(u => {
                const isCurrentAdmin = u.id === authUser?.id;
                const status = u.status;
                const branchDisplay = u.branchName || (
                  branchesList.find(b => b.id === u.branchId)?.name
                );

                return (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="max-w-[260px]">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.fullName}
                            className="h-9 w-9 rounded-xl object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                            {u.fullName ? u.fullName.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate text-foreground" title={u.fullName}>
                            {u.fullName || 'Chưa đặt tên'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" title={u.email}>
                            {u.email} {u.phone ? `· ${u.phone}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadge[u.role] || 'badge-neutral'}`}>
                        <FiShield className="h-3 w-3" /> {roleLabel[u.role] || u.role}
                      </span>
                      {u.role === 'customer' && u.membershipTier && u.membershipTier !== 'standard' && (
                        <span className="block text-xs text-muted-foreground mt-1 capitalize">Hạng {u.membershipTier}</span>
                      )}
                    </td>
                    <td className="max-w-[180px]">
                      {branchDisplay ? (
                        <span className="flex items-center gap-1.5 text-sm text-foreground">
                          <FiMapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate" title={branchDisplay}>{branchDisplay}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Toàn hệ thống</span>
                      )}
                    </td>
                    <td>
                      {/* Toggle Lock Switch */}
                      {isCurrentAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 border border-blue-200 dark:border-blue-900/50">
                          <FiShield className="h-3 w-3" /> Bạn (Đang đăng nhập)
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleLock(u)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100'
                              : 'bg-red-50 dark:bg-red-950/30 text-red-700 border border-red-200 dark:border-red-900/50 hover:bg-red-100'
                          }`}
                          title={status === 'active' ? 'Nhấn để khóa tài khoản' : 'Nhấn để mở khóa'}
                        >
                          {status === 'active' ? <FiUnlock className="h-3 w-3" /> : <FiLock className="h-3 w-3" />}
                          {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                        </button>
                      )}
                    </td>
                    <td className="text-right">
                      <ActionDropdown>
                        <DropdownItem
                          icon={<FiShield className="h-3.5 w-3.5" />}
                          label="Phân quyền & Chi nhánh"
                          onClick={() => setEditingUser(u)}
                        />
                        <div className="my-1 border-t border-border" />
                        {!isCurrentAdmin && (
                          <DropdownItem
                            icon={status === 'active' ? <FiLock className="h-3.5 w-3.5" /> : <FiUnlock className="h-3.5 w-3.5" />}
                            label={status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            destructive={status === 'active'}
                            onClick={() => toggleLock(u)}
                          />
                        )}
                      </ActionDropdown>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalElements > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 px-1">
          <p className="text-xs text-muted-foreground">
            Trang {page + 1} / {totalPages} · {usersList.length} / {totalElements} tài khoản
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-secondary btn-sm !min-h-[32px] !px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="h-3.5 w-3.5" /> Trước
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn btn-secondary btn-sm !min-h-[32px] !px-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau <FiChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Edit Role & Branch */}
      {editingUser && (
        <EditRoleModal
          user={editingUser}
          branches={branchesList}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveRole}
        />
      )}
    </div>
  );
};

export default UserManagementPage;
