import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiCheck, FiTool, FiAlertTriangle, FiTrash2,
  FiSearch, FiMap, FiList, FiRefreshCw, FiMapPin,
  FiChevronDown, FiAlertCircle, FiInfo
} from 'react-icons/fi';
import { formatDateTime } from '../../utils/formatters';
import { staffApi, WorkspaceMaintenanceStatusDto } from '../../api/staffApi';
import { customerSpaceApi, BranchResponse, FloorResponse } from '../../lib/spaceApi';
import FloorPlanViewer, { WorkspaceMapInfo } from '../../components/floor-plan/FloorPlanViewer';
import type { FloorLayout, LayoutElement } from '../../types/floorPlan';
import { useStableCallback } from '../../hooks/useStableCallback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Spinner } from '../../components/ui/Spinner';

const MaintenancePage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();

  // Multi-branch handling
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');

  const activeBranchId = user?.branchId || selectedBranchId;
  const isSuperAdminOrAdmin = user?.role === 'super_admin' || (user?.role as string) === 'admin';

  // Core Data State
  const [workspaces, setWorkspaces] = useState<WorkspaceMaintenanceStatusDto[]>([]);
  const [floors, setFloors] = useState<FloorResponse[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [listFloorFilter, setListFloorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'maintenance' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWs, setSelectedWs] = useState<WorkspaceMaintenanceStatusDto | null>(null);
  const [reason, setReason] = useState('');
  const [unlockModalWs, setUnlockModalWs] = useState<WorkspaceMaintenanceStatusDto | null>(null);

  // 1. Fetch branches on mount
  useEffect(() => {
    let isMounted = true;
    const loadBranches = async () => {
      try {
        const bList = await customerSpaceApi.listBranches();
        if (isMounted) {
          setBranches(bList);
          if (!selectedBranchId && bList.length > 0) {
            setSelectedBranchId(user?.branchId || bList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      }
    };
    loadBranches();
    return () => { isMounted = false; };
  }, [user?.branchId]);

  // 2. Fetch data whenever activeBranchId changes
  const fetchData = useCallback(async () => {
    if (!activeBranchId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [floorList, wsList] = await Promise.all([
        staffApi.getFloors(activeBranchId),
        staffApi.getWorkspaceMaintenances(activeBranchId),
      ]);
      setFloors(floorList);
      setWorkspaces(wsList);

      if (floorList.length > 0) {
        setSelectedFloorId((prev) => {
          const exists = floorList.some((f) => f.id === prev);
          return exists ? prev : floorList[0].id;
        });
      } else {
        setSelectedFloorId('');
      }
    } catch (err: any) {
      console.error('Failed to load maintenance data:', err);
      const msg = err.message || 'Không thể tải dữ liệu bảo trì từ máy chủ.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeBranchId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Active Floor & Layout
  const currentFloor = useMemo(() => {
    return floors.find((f) => f.id === selectedFloorId) || (floors.length > 0 ? floors[0] : null);
  }, [floors, selectedFloorId]);

  const currentLayout = useMemo<FloorLayout | null>(() => {
    if (!currentFloor?.layoutJson) return null;
    try {
      return JSON.parse(currentFloor.layoutJson) as FloorLayout;
    } catch {
      return null;
    }
  }, [currentFloor?.layoutJson]);

  // Map Availability callback
  const getAvailability = useCallback(
    (wsId: string): 'available' | 'booked' | 'maintenance' | 'unassigned' => {
      const ws = workspaces.find((w) => w.workspaceId === wsId);
      if (!ws) return isLoading ? 'available' : 'unassigned';
      if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) return 'maintenance';
      if (ws.workspaceStatus === 'inactive') return 'unassigned';
      return 'available';
    },
    [workspaces, isLoading]
  );

  const getWorkspaceInfo = useCallback(
    (wsId: string): WorkspaceMapInfo | null => {
      const ws = workspaces.find((w) => w.workspaceId === wsId);
      if (!ws) return null;
      return {
        code: ws.code,
        capacity: ws.capacity,
        typeName: ws.name,
      };
    },
    [workspaces]
  );

  // Map Click Interactions
  const handleSelectWorkspaceFromMap = useCallback(
    (wsId: string | null) => {
      if (!wsId) return;
      const ws = workspaces.find((w) => w.workspaceId === wsId);
      if (!ws) return;

      if (ws.activeMaintenance) {
        setUnlockModalWs(ws);
      } else if (ws.workspaceStatus !== 'inactive') {
        setSelectedWs(ws);
        setReason('');
        setIsModalOpen(true);
      }
    },
    [workspaces]
  );

  const onMapSelectWorkspace = useStableCallback(handleSelectWorkspaceFromMap);
  const onMapElementClick = useStableCallback((el: LayoutElement) => {
    handleSelectWorkspaceFromMap(el.workspaceId || null);
  });

  const handleOpenLockModal = (ws: WorkspaceMaintenanceStatusDto) => {
    setSelectedWs(ws);
    setReason('');
    setIsModalOpen(true);
  };

  // Submit Lock / Maintenance Report
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWs || !reason.trim()) return;

    const now = new Date();
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours window default

    try {
      setIsSubmitting(true);
      await staffApi.createMaintenance(selectedWs.workspaceId, {
        startAt: now.toISOString(),
        endAt: end.toISOString(),
        reason: reason.trim(),
      });
      setIsModalOpen(false);
      setSelectedWs(null);
      setReason('');
      showToast(`Đã khóa và tạo lịch bảo trì cho "${selectedWs.name}"!`, 'success');
      fetchData();
    } catch (error: any) {
      showToast('Lỗi tạo bảo trì: ' + (error.message || 'Không thể tạo bảo trì'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Maintenance (Unlock)
  const handleComplete = async (maintenanceId: string) => {
    try {
      await staffApi.completeMaintenance(maintenanceId);
      setUnlockModalWs(null);
      showToast('Đã hoàn tất bảo trì và mở khóa không gian thành công!', 'success');
      fetchData();
    } catch (error: any) {
      showToast('Lỗi khi hoàn tất bảo trì: ' + (error.message || 'Thao tác thất bại'), 'error');
    }
  };

  // Cancel / Delete Maintenance
  const handleDelete = async (maintenanceId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy bảo trì này và mở khóa lại không gian?')) return;
    try {
      await staffApi.deleteMaintenance(maintenanceId);
      setUnlockModalWs(null);
      showToast('Đã hủy bảo trì và mở khóa không gian!', 'info');
      fetchData();
    } catch (error: any) {
      showToast('Lỗi khi hủy bảo trì: ' + (error.message || 'Thao tác thất bại'), 'error');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = workspaces.length;
    const maintenance = workspaces.filter(
      (w) => w.workspaceStatus === 'maintenance' || w.activeMaintenance != null
    ).length;
    const inactive = workspaces.filter(
      (w) => w.workspaceStatus === 'inactive' && !w.activeMaintenance
    ).length;
    const available = total - maintenance - inactive;
    return { total, available: Math.max(0, available), maintenance, inactive };
  }, [workspaces]);

  // List view filtered data
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((ws) => {
      // Search match
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        ws.name.toLowerCase().includes(query) || ws.code.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      // Floor filter
      if (listFloorFilter !== 'all' && ws.floorId && ws.floorId !== listFloorFilter) {
        return false;
      }

      // Status filter
      const isMaint = ws.workspaceStatus === 'maintenance' || ws.activeMaintenance != null;
      if (statusFilter === 'available' && (isMaint || ws.workspaceStatus === 'inactive')) return false;
      if (statusFilter === 'maintenance' && !isMaint) return false;
      if (statusFilter === 'inactive' && ws.workspaceStatus !== 'inactive') return false;

      return true;
    });
  }, [workspaces, searchTerm, listFloorFilter, statusFilter]);

  // Find floor name helper
  const getFloorName = (floorId?: string) => {
    if (!floorId) return 'Chưa gán tầng';
    const fl = floors.find((f) => f.id === floorId);
    return fl ? `Tầng ${fl.floorNo}` : '—';
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      {/* ─── Top Bar: Title & Branch Selector & View Mode ─── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FiTool className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading text-foreground">
                Quản lý Không gian & Bảo trì
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kiểm tra tình trạng kỹ thuật, khóa bàn hỏng và mở khóa không gian sau sửa chữa
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Branch Switcher (for Super Admin / Admin or if multiple branches) */}
          {isSuperAdminOrAdmin && branches.length > 0 && (
            <div className="relative">
              <select
                aria-label="Chọn chi nhánh làm việc"
                value={activeBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="input-field !pr-9 text-xs font-semibold bg-muted/60 text-foreground cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className="btn btn-outline btn-sm gap-2"
            title="Làm mới dữ liệu"
          >
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-background shadow text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FiMap className="h-4 w-4" /> Bản đồ
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-background shadow text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FiList className="h-4 w-4" /> Danh sách
            </button>
          </div>
        </div>
      </div>

      {/* ─── Error Notification Banner (if any) ─── */}
      {errorMsg && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive flex items-start gap-3">
          <FiAlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Lỗi tải dữ liệu bảo trì</p>
            <p className="mt-0.5 text-xs opacity-90">{errorMsg}</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="btn btn-outline btn-sm border-destructive/40 text-destructive hover:bg-destructive hover:text-white"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ─── Metric Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Tổng chỗ ngồi</p>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">{stats.total}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold">
            <FiMapPin className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Sẵn sàng / Khả dụng</p>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {stats.available}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold">
            <FiCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Đang bảo trì / Khóa</p>
            <p className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
              {stats.maintenance}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold">
            <FiTool className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Ngưng hoạt động</p>
            <p className="text-2xl font-bold font-mono mt-1 text-muted-foreground">{stats.inactive}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold">
            <FiInfo className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ─── Mode: MAP VIEW ─── */}
      {viewMode === 'map' ? (
        <div className="space-y-4">
          {/* Floor Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setSelectedFloorId(floor.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  (currentFloor?.id === floor.id)
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Tầng {floor.floorNo}: {floor.name}
              </button>
            ))}
          </div>

          {/* Interactive Map Canvas */}
          <div className="rounded-2xl border border-border bg-card h-[640px] overflow-hidden relative shadow-sm">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <Spinner size="lg" />
                <p className="text-xs text-muted-foreground">Đang tải sơ đồ và trạng thái chỗ ngồi...</p>
              </div>
            ) : currentLayout ? (
              <FloorPlanViewer
                layout={currentLayout}
                selectedWsId={null}
                onSelectWorkspace={onMapSelectWorkspace}
                onElementClick={onMapElementClick}
                getAvailability={getAvailability}
                getWorkspaceInfo={getWorkspaceInfo}
                isAdmin={true}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <FiMap className="h-10 w-10 opacity-30" />
                <p className="text-sm">Tầng này chưa có bản đồ sơ đồ không gian.</p>
              </div>
            )}
          </div>

          {/* Guide Legend */}
          <div className="rounded-xl border border-border bg-card p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm"></span>
                <span className="text-muted-foreground">Khả dụng (Nhấp để báo hỏng / Khóa)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm"></span>
                <span className="text-muted-foreground font-semibold text-amber-700 dark:text-amber-400">
                  Đang bảo trì (Nhấp để mở khóa / sửa xong)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-400"></span>
                <span className="text-muted-foreground">Chưa cấu hình / Ngưng HĐ</span>
              </div>
            </div>
            <p className="text-muted-foreground italic">
              * Nhấp trực tiếp vào bàn/phòng trên sơ đồ để kích hoạt thao tác
            </p>
          </div>
        </div>
      ) : (
        /* ─── Mode: LIST VIEW ─── */
        <div className="space-y-4">
          {/* List View Filter Controls */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-card p-4 rounded-xl border border-border">
            <div className="relative w-full md:w-80">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mã chỗ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field !pl-10 w-full text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Floor Filter */}
              <div className="relative">
                <select
                  aria-label="Lọc theo tầng"
                  value={listFloorFilter}
                  onChange={(e) => setListFloorFilter(e.target.value)}
                  className="input-field !pr-8 text-xs bg-muted/60"
                >
                  <option value="all">Tất cả các tầng</option>
                  {floors.map((fl) => (
                    <option key={fl.id} value={fl.id}>
                      Tầng {fl.floorNo}: {fl.name}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  aria-label="Lọc theo trạng thái"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="input-field !pr-8 text-xs bg-muted/60"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="available">Đang hoạt động</option>
                  <option value="maintenance">Đang bảo trì</option>
                  <option value="inactive">Ngưng hoạt động</option>
                </select>
                <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Workspaces Table */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-2">
                <Spinner size="default" />
                <span className="text-xs">Đang tải danh sách không gian...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Không gian</th>
                      <th className="py-3 px-4">Vị trí tầng</th>
                      <th className="py-3 px-4">Sức chứa</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4">Thông tin Bảo trì</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredWorkspaces.map((ws) => {
                      const isMaintenance =
                        ws.workspaceStatus === 'maintenance' || ws.activeMaintenance != null;
                      return (
                        <tr
                          key={ws.workspaceId}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div>{ws.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground font-normal">
                              {ws.code}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            <span className="badge badge-outline text-[11px]">
                              {getFloorName(ws.floorId)}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {ws.capacity ? `${ws.capacity} người` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {isMaintenance ? (
                              <span className="badge badge-warning inline-flex items-center gap-1">
                                <FiTool className="h-3 w-3" /> Bảo trì (Đang khóa)
                              </span>
                            ) : ws.workspaceStatus === 'active' ? (
                              <span className="badge badge-success inline-flex items-center gap-1">
                                <FiCheck className="h-3 w-3" /> Hoạt động
                              </span>
                            ) : (
                              <span className="badge badge-neutral">Ngưng HĐ</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isMaintenance && ws.activeMaintenance ? (
                              <div className="max-w-[260px]">
                                <p
                                  className="font-medium text-destructive truncate"
                                  title={ws.activeMaintenance.reason}
                                >
                                  Lý do: {ws.activeMaintenance.reason}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Khóa: {formatDateTime(ws.activeMaintenance.startAt)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isMaintenance ? (
                                <button
                                  onClick={() => handleOpenLockModal(ws)}
                                  className="btn btn-outline btn-sm text-xs hover:text-destructive hover:border-destructive gap-1.5"
                                >
                                  <FiAlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Khóa bàn
                                </button>
                              ) : ws.activeMaintenance ? (
                                <>
                                  <button
                                    onClick={() => handleComplete(ws.activeMaintenance!.id)}
                                    className="btn btn-primary btn-sm text-xs gap-1"
                                  >
                                    <FiCheck className="h-3.5 w-3.5" /> Sửa xong
                                  </button>
                                  <button
                                    onClick={() => handleDelete(ws.activeMaintenance!.id)}
                                    className="btn btn-ghost btn-sm text-destructive hover:bg-destructive/10 p-1.5"
                                    title="Hủy lịch bảo trì"
                                  >
                                    <FiTrash2 className="h-4 w-4" />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredWorkspaces.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          <FiTool className="h-8 w-8 mx-auto opacity-30 mb-2" />
                          <p className="font-medium text-sm">Không tìm thấy không gian nào phù hợp.</p>
                          {searchTerm && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Thử tìm kiếm với từ khóa khác hoặc bỏ bộ lọc.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal Báo Hỏng & Khóa Bàn ─── */}
      {isModalOpen && selectedWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up">
            <div className="flex items-center gap-3 p-5 border-b border-border bg-destructive/10 text-destructive">
              <div className="h-10 w-10 bg-destructive/20 rounded-xl flex items-center justify-center font-bold">
                <FiTool className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">Báo cáo Hư hỏng & Khóa bàn</h2>
                <p className="text-xs text-muted-foreground">
                  Khách hàng sẽ không thể đặt vị trí này cho đến khi mở khóa
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Không gian được chọn
                </label>
                <div className="p-3 bg-muted/60 rounded-xl border border-border font-medium flex justify-between items-center">
                  <span className="font-bold text-foreground">{selectedWs.name}</span>
                  <span className="font-mono text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">
                    {selectedWs.code}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Chi tiết sự cố / Lý do bảo trì <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  placeholder="Ví dụ: Ổ cắm âm bàn mất điện, Đèn chiếu bị chớp, Chân ghế gãy..."
                  rows={3}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-outline flex-1 text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-destructive flex-1 text-xs gap-1.5"
                  disabled={isSubmitting || !reason.trim()}
                >
                  <FiAlertTriangle className="h-4 w-4" />
                  {isSubmitting ? 'Đang khóa...' : 'Xác nhận Khóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Mở Khóa / Hoàn Tất Bảo Trì ─── */}
      {unlockModalWs && unlockModalWs.activeMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-in-up">
            <div className="flex items-center gap-3 p-5 border-b border-border bg-primary/10 text-primary">
              <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center font-bold">
                <FiCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-foreground">Xử lý Trạng thái Bảo trì</h2>
                <p className="text-xs text-muted-foreground">Không gian: {unlockModalWs.name}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-muted/60 rounded-xl border border-border">
                <p className="text-xs font-semibold text-muted-foreground">Sự cố ghi nhận:</p>
                <p className="text-sm font-medium text-destructive mt-1">
                  {unlockModalWs.activeMaintenance.reason}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 border-t border-border pt-1.5">
                  Thời gian khóa: {formatDateTime(unlockModalWs.activeMaintenance.startAt)}
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={() => handleComplete(unlockModalWs.activeMaintenance!.id)}
                  className="btn btn-primary w-full text-xs gap-2 py-2.5"
                >
                  <FiCheck className="h-4 w-4" /> Đã sửa xong — Mở khóa ngay
                </button>
                <button
                  onClick={() => handleDelete(unlockModalWs.activeMaintenance!.id)}
                  className="btn btn-outline text-destructive w-full hover:bg-destructive hover:text-white text-xs gap-2"
                >
                  <FiTrash2 className="h-4 w-4" /> Hủy lịch / Báo cáo nhầm
                </button>
                <button
                  onClick={() => setUnlockModalWs(null)}
                  className="btn btn-ghost w-full text-xs text-muted-foreground"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
