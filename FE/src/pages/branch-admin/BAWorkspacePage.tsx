import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiLayers, FiPlus, FiEdit2, FiAlertCircle,
  FiTrash2, FiUploadCloud, FiCheckCircle, FiLayout, FiMap, FiMapPin, FiX,
} from 'react-icons/fi';
import FloorPlanEditor from '../../components/floor-plan/FloorPlanEditor';
import FloorPlanViewer from '../../components/floor-plan/FloorPlanViewer';
import {
  floorApi, workspaceApi, workspaceTypeApi, adminWorkspaceTypeApi, adminBranchApi,
  type FloorResponse, type WorkspaceResponse, type WorkspaceTypeResponse, type AdminBranchDto,
} from '../../lib/spaceApi';
import type { FloorLayout } from '../../types/floorPlan';
import { createDefaultLayout } from '../../data/elementCatalog';
import { FloorModal } from './workspaces/FloorModal';
import { WorkspaceModal } from './workspaces/WorkspaceModal';
import { AssignWorkspaceModal } from './workspaces/AssignWorkspaceModal';
import { DeleteConfirmModal } from './workspaces/DeleteConfirmModal';
import { WorkspaceTable } from './workspaces/WorkspaceTable';

export interface BAWorkspacePageProps {
  isSuperAdminView?: boolean;
}

type ModalMode =
  | { type: 'add-floor' }
  | { type: 'edit-floor'; floor: FloorResponse }
  | { type: 'add-ws'; floorId: string; svgElementId?: string }
  | { type: 'edit-ws'; ws: WorkspaceResponse }
  | { type: 'confirm-delete-floor'; floorId: string; floorName: string }
  | { type: 'confirm-delete-ws'; wsId: string; wsCode: string }
  | { type: 'assign-ws-layout'; element: any }
  | null;

const BAWorkspacePage: React.FC<BAWorkspacePageProps> = ({ isSuperAdminView = false }) => {
  /* ── Branches for Super Admin ── */
  const [branches, setBranches] = useState<AdminBranchDto[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  /* ── State ── */
  const [floors, setFloors] = useState<FloorResponse[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [wsTypes, setWsTypes] = useState<WorkspaceTypeResponse[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showEditorPopup, setShowEditorPopup] = useState(false);
  const [assigningWsId, setAssigningWsId] = useState<string | null>(null);
  const [assigningWsCode, setAssigningWsCode] = useState<string | null>(null);
  const [isSubmittingFloor, setIsSubmittingFloor] = useState(false);

  // Form state
  const [floorForm, setFloorForm] = useState({ floor_no: '', name: '', svgContent: '' });
  const [wsForm, setWsForm] = useState({
    code: '',
    name: '',
    workspace_type_id: '',
    capacity: '1',
    svg_element_id: '',
    status: 'active',
  });

  const activeBranchId = isSuperAdminView ? selectedBranchId : undefined;
  const currentFloor = floors.find((f) => f.id === selectedFloorId);

  const currentBranch = useMemo(() => {
    if (!isSuperAdminView) return null;
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [isSuperAdminView, branches, selectedBranchId]);
  const isBranchInactive = currentBranch?.status === 'inactive';

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  /* ── Fetch branches for Super Admin ── */
  useEffect(() => {
    if (!isSuperAdminView) return;
    const loadBranches = async () => {
      try {
        const bList = await adminBranchApi.list();
        setBranches(bList);
        if (bList.length > 0 && !selectedBranchId) {
          setSelectedBranchId(bList[0].id);
        }
      } catch (err: any) {
        showError(err.message || 'Không thể tải danh sách chi nhánh');
      }
    };
    loadBranches();
  }, [isSuperAdminView]);

  /* ── Reset state when switching branch to avoid stale floor crossover ── */
  useEffect(() => {
    if (isSuperAdminView && selectedBranchId) {
      setSelectedFloorId('');
      setFloors([]);
      setWorkspaces([]);
    }
  }, [isSuperAdminView, selectedBranchId]);

  /* ── Data fetching ── */
  const fetchFloors = useCallback(async () => {
    if (isSuperAdminView && !selectedBranchId) return;
    try {
      const data = await floorApi.list(activeBranchId);
      setFloors(data);
      if (data.length > 0) {
        setSelectedFloorId((prev) => (data.some((f) => f.id === prev) ? prev : data[0].id));
      } else {
        setSelectedFloorId('');
        setWorkspaces([]);
      }
    } catch (e: any) {
      showError(e.message);
    }
  }, [activeBranchId, isSuperAdminView, selectedBranchId]);

  const fetchWorkspaces = useCallback(
    async (floorId: string) => {
      try {
        const data = await workspaceApi.listByFloor(floorId, activeBranchId);
        setWorkspaces(data);
      } catch (e: any) {
        showError(e.message);
      }
    },
    [activeBranchId]
  );

  const fetchWsTypes = useCallback(async () => {
    try {
      const data = await workspaceTypeApi.list(activeBranchId);
      if (data && data.length > 0) {
        setWsTypes(data);
        return;
      }
    } catch (e: any) {
      console.warn('Failed to load workspace types via branch-admin API:', e);
    }
    try {
      const adminData = await adminWorkspaceTypeApi.list();
      if (adminData && adminData.length > 0) {
        setWsTypes(adminData);
      }
    } catch (err) {
      console.error('Failed to load admin workspace types fallback:', err);
    }
  }, [activeBranchId]);

  useEffect(() => {
    if (isSuperAdminView && !selectedBranchId) return;
    (async () => {
      setLoading(true);
      await Promise.all([fetchFloors(), fetchWsTypes()]);
      setLoading(false);
    })();
  }, [fetchFloors, fetchWsTypes, isSuperAdminView, selectedBranchId]);

  useEffect(() => {
    if (selectedFloorId) fetchWorkspaces(selectedFloorId);
  }, [selectedFloorId, fetchWorkspaces]);

  /* ── SVG file reader ── */
  const handleSvgFileRead = (file: File, callback: (content: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target?.result as string);
    reader.readAsText(file);
  };

  /* ── Parse layout for viewer (memoized) ── */
  const currentLayout = useMemo<FloorLayout | null>(() => {
    if (!currentFloor?.layoutJson) return null;
    try {
      return JSON.parse(currentFloor.layoutJson) as FloorLayout;
    } catch {
      return null;
    }
  }, [currentFloor?.layoutJson]);

  const assignedWorkspaceIds = useMemo<string[]>(() => {
    if (!currentLayout) return [];
    return currentLayout.elements.map((el) => el.workspaceId).filter((id): id is string => !!id);
  }, [currentLayout]);

  const [syncing, setSyncing] = useState(false);

  const orphanWorkspaceElements = useMemo(() => {
    if (!currentLayout) return [];
    return currentLayout.elements.filter(
      (el) =>
        ['desk', 'chair', 'standing_desk', 'meeting_room', 'private_office'].includes(el.type) &&
        el.workspaceId &&
        !workspaces.some((ws) => ws.id === el.workspaceId)
    );
  }, [currentLayout, workspaces]);

  const handleSyncOrphans = async () => {
    if (!currentFloor || !currentLayout) return;
    setSyncing(true);
    try {
      const updatedElements = [...currentLayout.elements];
      let autoCreatedCount = 0;
      const tempWorkspaces = [...workspaces];

      const orphans = updatedElements
        .map((el, idx) => ({ el, idx }))
        .filter(
          ({ el }) =>
            ['desk', 'chair', 'standing_desk', 'meeting_room', 'private_office'].includes(el.type) &&
            el.workspaceId &&
            !workspaces.some((w) => w.id === el.workspaceId)
        );

      for (const { el, idx } of orphans) {
        let typeId = wsTypes[0]?.id;
        let capacity = el.seatCount || 1;

        if (wsTypes.length > 0) {
          const lowercaseType = el.type.toLowerCase();
          let matched = null;
          if (lowercaseType.includes('desk') || lowercaseType.includes('chair')) {
            matched = wsTypes.find(
              (t) =>
                t.code.toLowerCase().includes('desk') ||
                t.name.toLowerCase().includes('bàn') ||
                t.name.toLowerCase().includes('desk')
            );
          } else if (lowercaseType.includes('meeting')) {
            matched = wsTypes.find(
              (t) =>
                t.code.toLowerCase().includes('meeting') ||
                t.name.toLowerCase().includes('họp') ||
                t.name.toLowerCase().includes('meeting')
            );
          } else if (lowercaseType.includes('office') || lowercaseType.includes('private')) {
            matched = wsTypes.find(
              (t) =>
                t.code.toLowerCase().includes('office') ||
                t.name.toLowerCase().includes('phòng riêng') ||
                t.name.toLowerCase().includes('office')
            );
          } else if (lowercaseType.includes('booth') || lowercaseType.includes('phone')) {
            matched = wsTypes.find(
              (t) => t.code.toLowerCase().includes('booth') || t.name.toLowerCase().includes('cabin')
            );
          } else if (lowercaseType.includes('event')) {
            matched = wsTypes.find(
              (t) => t.code.toLowerCase().includes('event') || t.name.toLowerCase().includes('sự kiện')
            );
          }
          if (matched) {
            typeId = matched.id;
            capacity = el.seatCount || matched.capacityDefault || 1;
          }
        }

        if (!typeId) {
          console.warn(`[handleSyncOrphans] Không thể xác định workspaceTypeId cho element ${el.id} (${el.type})`);
          continue;
        }

        let baseCode = '';
        if (el.label) {
          baseCode = el.label.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
        }
        if (!baseCode) {
          const typePrefix =
            el.type === 'desk' || el.type === 'standing_desk'
              ? 'DESK'
              : el.type === 'meeting_room'
              ? 'MEET'
              : el.type === 'private_office'
              ? 'OFFICE'
              : el.type === 'phone_booth'
              ? 'BOOTH'
              : el.type === 'event_space'
              ? 'EVENT'
              : 'WS';
          baseCode = `${typePrefix}-${Math.floor(100 + Math.random() * 900)}`;
        }

        let finalCode = baseCode;
        let counter = 1;
        while (tempWorkspaces.some((w) => w.code.toUpperCase() === finalCode.toUpperCase())) {
          finalCode = `${baseCode}-${counter}`;
          counter++;
        }

        try {
          const newWs = await workspaceApi.create(
            {
              floorId: currentFloor.id,
              workspaceTypeId: typeId,
              code: finalCode,
              name:
                el.label ||
                (el.type === 'meeting_room'
                  ? 'Phòng họp'
                  : el.type === 'private_office'
                  ? 'Phòng riêng'
                  : 'Bàn làm việc'),
              capacity: capacity,
              svgElementId: el.id,
            },
            activeBranchId
          );

          updatedElements[idx] = {
            ...el,
            workspaceId: newWs.id,
            label: el.label || finalCode,
          };

          tempWorkspaces.push(newWs);
          autoCreatedCount++;
        } catch (createErr) {
          console.warn(`[handleSyncOrphans] Lỗi tạo workspace cho ${el.id}:`, createErr);
        }
      }

      const finalLayout = { ...currentLayout, elements: updatedElements };
      const updated = await floorApi.update(
        currentFloor.id,
        {
          layoutJson: JSON.stringify(finalLayout),
        },
        activeBranchId
      );

      setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      await fetchWorkspaces(currentFloor.id);
      showSuccess(`Đồng bộ thành công! Đã tạo và liên kết ${autoCreatedCount} workspace.`);
    } catch (e: any) {
      showError(e.message || 'Lỗi khi đồng bộ workspace');
    } finally {
      setSyncing(false);
    }
  };

  /* ── Floor modal ── */
  const openFloorModal = (mode: 'add' | 'edit', floor?: FloorResponse) => {
    setErrorMsg('');
    if (mode === 'add') {
      const nextNo = floors.length > 0 ? Math.max(...floors.map((f) => f.floorNo || 0)) + 1 : 1;
      setFloorForm({ floor_no: String(nextNo), name: '', svgContent: '' });
      setModal({ type: 'add-floor' });
    } else if (floor) {
      setFloorForm({ floor_no: String(floor.floorNo), name: floor.name, svgContent: floor.svgContent || '' });
      setModal({ type: 'edit-floor', floor });
    }
  };

  const saveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorForm.name.trim()) {
      setErrorMsg('Vui lòng nhập tên tầng.');
      return;
    }
    if (isSubmittingFloor) return;
    setIsSubmittingFloor(true);
    try {
      if (modal?.type === 'add-floor') {
        const nextNo = floors.length > 0 ? Math.max(...floors.map((f) => f.floorNo || 0)) + 1 : 1;
        const targetFloorNo = parseInt(floorForm.floor_no) || nextNo;
        const newFloor = await floorApi.create(
          {
            floorNo: targetFloorNo,
            name: floorForm.name,
            svgContent: floorForm.svgContent || undefined,
          },
          activeBranchId
        );
        setFloors((prev) => [...prev, newFloor]);
        setSelectedFloorId(newFloor.id);
        showSuccess('Thêm tầng mới thành công!');
      } else if (modal?.type === 'edit-floor') {
        const updated = await floorApi.update(
          modal.floor.id,
          {
            name: floorForm.name,
            floorNo: parseInt(floorForm.floor_no) || undefined,
            svgContent: floorForm.svgContent || undefined,
          },
          activeBranchId
        );
        setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        showSuccess('Cập nhật thông tin tầng thành công!');
      }
      setModal(null);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmittingFloor(false);
    }
  };

  const deleteFloor = (floorId: string, floorName: string) => {
    setModal({ type: 'confirm-delete-floor', floorId, floorName });
  };

  const handleConfirmDeleteFloor = async (floorId: string, floorName: string) => {
    try {
      await floorApi.delete(floorId, activeBranchId);
      setFloors((prev) => prev.filter((f) => f.id !== floorId));
      setWorkspaces([]);
      if (selectedFloorId === floorId) {
        const remaining = floors.filter((f) => f.id !== floorId);
        setSelectedFloorId(remaining[0]?.id ?? '');
      }
      showSuccess(`Đã xóa tầng ${floorName}`);
      setModal(null);
    } catch (e: any) {
      showError(e.message);
      setModal(null);
    }
  };

  /* ── Workspace modal ── */
  const openWsModal = (mode: 'add' | 'edit', ws?: WorkspaceResponse, svgElementId?: string) => {
    setErrorMsg('');
    if (mode === 'add') {
      setWsForm({
        code: '',
        name: '',
        workspace_type_id: wsTypes[0]?.id ?? '',
        capacity: '1',
        svg_element_id: svgElementId || '',
        status: 'active',
      });
      setModal({ type: 'add-ws', floorId: selectedFloorId, svgElementId });
    } else if (ws) {
      setWsForm({
        code: ws.code,
        name: ws.name,
        workspace_type_id: ws.workspaceTypeId,
        capacity: String(ws.capacity),
        svg_element_id: ws.svgElementId || '',
        status: ws.status,
      });
      setModal({ type: 'edit-ws', ws });
    }
  };

  const saveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsForm.code.trim() || !wsForm.name.trim()) {
      setErrorMsg('Vui lòng điền các trường bắt buộc (*).');
      return;
    }
    try {
      const finalSvgElementId = wsForm.svg_element_id || wsForm.code;
      if (modal?.type === 'add-ws') {
        const newWs = await workspaceApi.create(
          {
            floorId: modal.floorId,
            workspaceTypeId: wsForm.workspace_type_id,
            code: wsForm.code,
            name: wsForm.name,
            capacity: parseInt(wsForm.capacity) || 1,
            svgElementId: finalSvgElementId,
          },
          activeBranchId
        );
        setWorkspaces((prev) => [...prev, newWs]);
        showSuccess('Thêm không gian thành công!');
      } else if (modal?.type === 'edit-ws') {
        const updated = await workspaceApi.update(
          modal.ws.id,
          {
            code: wsForm.code,
            name: wsForm.name,
            workspaceTypeId: wsForm.workspace_type_id,
            capacity: parseInt(wsForm.capacity) || 1,
            svgElementId: finalSvgElementId,
            status: wsForm.status,
          },
          activeBranchId
        );
        setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        showSuccess('Cập nhật không gian thành công!');
      }
      setModal(null);
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const deleteWorkspace = (wsId: string, wsCode: string) => {
    setModal({ type: 'confirm-delete-ws', wsId, wsCode });
  };

  const handleConfirmDeleteWorkspace = async (wsId: string, wsCode: string) => {
    try {
      await workspaceApi.delete(wsId, activeBranchId);
      setWorkspaces((prev) => prev.filter((w) => w.id !== wsId));

      // Clean up orphan workspaceId references in the current floor layout
      if (currentFloor?.layoutJson) {
        try {
          const layout = JSON.parse(currentFloor.layoutJson) as import('../../types/floorPlan').FloorLayout;
          const hasOrphan = layout.elements.some((el) => el.workspaceId === wsId);
          if (hasOrphan) {
            const cleaned = {
              ...layout,
              elements: layout.elements.map((el) =>
                el.workspaceId === wsId ? { ...el, workspaceId: null } : el
              ),
            };
            const updated = await floorApi.update(
              currentFloor.id,
              {
                layoutJson: JSON.stringify(cleaned),
              },
              activeBranchId
            );
            setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          }
        } catch {
          // Non-critical: layout cleanup failed, ignore
        }
      }

      showSuccess(`Đã xóa không gian ${wsCode}`);
      setModal(null);
    } catch (e: any) {
      showError(e.message);
      setModal(null);
    }
  };

  const saveLayoutWithAssignedWorkspace = async (elementId: string, wsId: string | null) => {
    if (!currentFloor || !currentLayout) return;
    try {
      const updatedElements = currentLayout.elements.map((el) => {
        if (el.id === elementId) {
          return { ...el, workspaceId: wsId };
        }
        // Avoid duplicate workspace assignments on different elements
        if (wsId && el.workspaceId === wsId) {
          return { ...el, workspaceId: null };
        }
        return el;
      });

      const updatedLayout = { ...currentLayout, elements: updatedElements };
      const updated = await floorApi.update(
        currentFloor.id,
        {
          layoutJson: JSON.stringify(updatedLayout),
        },
        activeBranchId
      );

      setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      // Refetch workspaces so the table display and svgElementIds are in sync
      await fetchWorkspaces(currentFloor.id);
      showSuccess(wsId ? 'Gán workspace thành công!' : 'Đã gỡ gán workspace!');
    } catch (e: any) {
      showError(e.message || 'Lỗi khi gán workspace');
    }
  };

  const handleFloorPlanElementClick = (el: any) => {
    const LINKABLE_TYPES = [
      'desk',
      'chair',
      'standing_desk',
      'meeting_room',
      'private_office',
      'phone_booth',
      'event_space',
      'custom_workspace',
    ];
    if (!LINKABLE_TYPES.includes(el.type)) return;

    if (assigningWsId) {
      saveLayoutWithAssignedWorkspace(el.id, assigningWsId);
      setAssigningWsId(null);
      setAssigningWsCode(null);
    } else {
      setModal({ type: 'assign-ws-layout', element: el });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-[70] animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheckCircle className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}
      {errorMsg && !modal && (
        <div className="fixed top-4 right-4 z-[70] animate-slide-up flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiAlertCircle className="h-5 w-5" />
          <p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground font-heading">
              {isSuperAdminView ? 'Cấu hình Không gian Chi nhánh' : 'Sơ đồ & Không gian'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isSuperAdminView
                ? 'Quản trị sơ đồ mặt bằng, danh sách tầng và cấu hình vị trí làm việc của các chi nhánh'
                : 'Quản lý sơ đồ mặt bằng, danh sách tầng và thiết lập chỗ ngồi tại chi nhánh'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isSuperAdminView && (
              <div className="flex items-center gap-2 bg-muted/50 border border-border px-3.5 py-1.5 rounded-2xl shadow-xs">
                <FiMapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Chi nhánh:
                </span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-card text-foreground">
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              className="btn btn-primary btn-sm flex items-center gap-2 shadow-xs"
              onClick={() => openFloorModal('add')}
              disabled={(isSuperAdminView && !selectedBranchId) || isBranchInactive}
              title={isBranchInactive ? 'Chi nhánh đang tạm ngưng hoạt động' : undefined}
            >
              <FiPlus className="h-4 w-4" /> Thêm Tầng Mới
            </button>
          </div>
        </div>
      </div>

      {/* Inactive Branch Warning Banner */}
      {isBranchInactive && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 px-6 py-4 rounded-2xl flex items-start gap-3 shadow-xs">
          <FiAlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Chi nhánh đang tạm ngưng hoạt động (Inactive)</h3>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Chi nhánh này hiện đã tạm dừng hoạt động. Bạn chỉ có thể xem dữ liệu không gian ở chế độ Đọc (Read-only).
              Vui lòng chuyển trạng thái chi nhánh sang "Hoạt động" tại trang Quản lý Chi nhánh nếu muốn thêm mới hoặc
              cập nhật sơ đồ.
            </p>
          </div>
        </div>
      )}

      {/* Floors tab bar */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <FiLayers className="h-4 w-4 text-primary" /> Tầng hiện tại
        </h2>
        {floors.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
            <FiAlertCircle className="h-8 w-8 opacity-40" />
            <p className="text-sm">Chưa có tầng nào. Nhấn "Thêm Tầng Mới" để bắt đầu.</p>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {floors.map((f) => (
              <div key={f.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => setSelectedFloorId(f.id)}
                  className={`btn px-4 py-2 text-sm font-medium transition-all ${
                    selectedFloorId === f.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/50 text-foreground hover:bg-muted'
                  }`}
                >
                  {f.name}
                  <span className="ml-2 text-xs opacity-70">({f.workspaceCount})</span>
                </button>
                {selectedFloorId === f.id && (
                  <div className="flex gap-1 animate-fade-in">
                    <button
                      onClick={() => openFloorModal('edit', f)}
                      className="btn btn-ghost btn-sm p-1.5 text-muted-foreground hover:text-primary"
                      title="Sửa tầng"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteFloor(f.id, f.name)}
                      className="btn btn-ghost btn-sm p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Xóa tầng"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Orphans Banner */}
      {currentFloor && orphanWorkspaceElements.length > 0 && (
        <div className="p-4 bg-warning/15 border border-warning/30 rounded-xl text-warning flex items-center justify-between flex-wrap gap-4 shadow-sm mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <FiAlertCircle className="h-5 w-5 shrink-0 animate-bounce" />
            <div>
              <p className="font-semibold text-sm">Sơ đồ có các phần tử chưa đồng bộ với Database</p>
              <p className="text-xs opacity-95">
                Phát hiện {orphanWorkspaceElements.length} phần tử (bàn, phòng...) trên sơ đồ mang ID chưa tồn tại trong
                Database (do mới thêm hoặc import mẫu).
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncOrphans}
            className="btn bg-warning hover:bg-warning/90 text-warning-foreground btn-sm font-semibold flex items-center gap-2 shadow-sm"
            disabled={syncing}
          >
            {syncing ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-warning-foreground border-t-transparent"></span>
                Đang đồng bộ...
              </>
            ) : (
              '⚡ Đồng bộ & Tạo ngay'
            )}
          </button>
        </div>
      )}

      {/* Floor Plan Viewer */}
      {currentFloor && (
        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="px-6 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiMap className="h-4 w-4 text-primary" />
              <div>
                <h2 className="font-semibold text-sm">Sơ đồ mặt bằng — {currentFloor.name}</h2>
                <div className="text-xs text-muted-foreground">
                  {assigningWsId ? (
                    <span className="text-warning font-medium animate-pulse flex items-center gap-1.5">
                      👉 Đang gán không gian {assigningWsCode}. Click bàn/phòng trên sơ đồ để gán.
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssigningWsId(null);
                          setAssigningWsCode(null);
                        }}
                        className="underline text-[10px] text-muted-foreground hover:text-foreground ml-1"
                      >
                        (Hủy)
                      </button>
                    </span>
                  ) : (
                    'Click vào element để gán hoặc thay đổi workspace liên kết'
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">v{currentFloor.mapVersion}</span>
              <button
                onClick={() => setShowEditorPopup(true)}
                className="btn btn-primary btn-sm flex items-center gap-2"
              >
                <FiEdit2 className="h-3.5 w-3.5" /> Chỉnh sửa Layout
              </button>
            </div>
          </div>
          <div style={{ height: '400px' }}>
            {currentLayout ? (
              <FloorPlanViewer
                key={`viewer-${currentFloor.id}`}
                layout={currentLayout}
                selectedWsId={selectedWsId}
                onSelectWorkspace={setSelectedWsId}
                isAdmin={true}
                onElementClick={handleFloorPlanElementClick}
                getAvailability={(wsId) => {
                  const ws = workspaces.find((w) => w.id === wsId);
                  if (!ws) return 'unassigned';
                  if (ws.status === 'maintenance') return 'maintenance';
                  if (ws.status === 'inactive') return 'booked';
                  return 'available';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-6 text-center border border-dashed border-border/80 rounded-2xl bg-muted/10">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <FiMap className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Tầng này chưa có sơ đồ mặt bằng</h3>
                  <p className="text-xs text-muted-foreground max-w-md mt-1">
                    Bạn có thể thiết kế trực quan bằng công cụ kéo thả Floor Plan Editor hoặc tải lên file SVG kiến trúc sẵn
                    có để gán không gian.
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => setShowEditorPopup(true)}
                    disabled={isBranchInactive}
                    className="btn btn-primary btn-sm flex items-center gap-2 shadow-md hover:shadow-primary/20"
                  >
                    <FiEdit2 className="h-3.5 w-3.5" /> Mở trình thiết kế sơ đồ
                  </button>
                  <button
                    onClick={() => openFloorModal('edit', currentFloor)}
                    disabled={isBranchInactive}
                    className="btn btn-outline btn-sm flex items-center gap-2"
                  >
                    <FiUploadCloud className="h-3.5 w-3.5" /> Tải file SVG
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workspaces table */}
      {currentFloor && (
        <WorkspaceTable
          workspaces={workspaces}
          currentFloor={currentFloor}
          currentLayout={currentLayout}
          selectedWsId={selectedWsId}
          assigningWsId={assigningWsId}
          isBranchInactive={!!isBranchInactive}
          onSelectWorkspace={setSelectedWsId}
          onToggleAssigning={(wsId, wsCode) => {
            if (assigningWsId === wsId) {
              setAssigningWsId(null);
              setAssigningWsCode(null);
            } else {
              setAssigningWsId(wsId);
              setAssigningWsCode(wsCode);
            }
          }}
          onAddWorkspace={() => openWsModal('add')}
          onEditWorkspace={(ws) => openWsModal('edit', ws)}
          onDeleteWorkspace={deleteWorkspace}
          onUnlinkWorkspace={(elementId) => saveLayoutWithAssignedWorkspace(elementId, null)}
        />
      )}

      {/* ── Floor Modal ── */}
      {(modal?.type === 'add-floor' || modal?.type === 'edit-floor') && (
        <FloorModal
          mode={modal.type}
          floorForm={floorForm}
          errorMsg={errorMsg}
          isSubmitting={isSubmittingFloor}
          onClose={() => setModal(null)}
          onChangeForm={setFloorForm}
          onSubmit={saveFloor}
          onSvgFileRead={handleSvgFileRead}
        />
      )}

      {/* ── Workspace Modal ── */}
      {(modal?.type === 'add-ws' || modal?.type === 'edit-ws') && (
        <WorkspaceModal
          mode={modal.type}
          wsForm={wsForm}
          wsTypes={wsTypes}
          errorMsg={errorMsg}
          onClose={() => setModal(null)}
          onChangeForm={setWsForm}
          onSubmit={saveWorkspace}
        />
      )}

      {/* ── Confirm Delete Floor Modal ── */}
      {modal?.type === 'confirm-delete-floor' && (
        <DeleteConfirmModal
          type="floor"
          title="Xác nhận xóa tầng"
          itemName={modal.floorName}
          onClose={() => setModal(null)}
          onConfirm={() => handleConfirmDeleteFloor(modal.floorId, modal.floorName)}
        />
      )}

      {/* ── Confirm Delete Workspace Modal ── */}
      {modal?.type === 'confirm-delete-ws' && (
        <DeleteConfirmModal
          type="workspace"
          title="Xác nhận xóa không gian"
          itemName={modal.wsCode}
          itemCode={modal.wsCode}
          onClose={() => setModal(null)}
          onConfirm={() => handleConfirmDeleteWorkspace(modal.wsId, modal.wsCode)}
        />
      )}

      {/* ── Assign Workspace Layout Modal ── */}
      {modal?.type === 'assign-ws-layout' && (
        <AssignWorkspaceModal
          element={modal.element}
          workspaces={workspaces}
          assignedWorkspaceIds={assignedWorkspaceIds}
          onClose={() => setModal(null)}
          onAssign={saveLayoutWithAssignedWorkspace}
        />
      )}

      {/* ── Fullscreen Editor Popup ── */}
      {showEditorPopup && currentFloor && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-in">
          {/* Popup Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shadow-sm shrink-0 text-foreground">
            <div className="flex items-center gap-3">
              <FiLayout className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold font-heading text-foreground">
                  Chỉnh sửa Layout — {currentFloor.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Kéo thả elements từ panel trái để thiết kế, gán workspace từ panel phải
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEditorPopup(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted border border-border hover:bg-muted/70 text-foreground flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <FiX className="h-4 w-4" /> Đóng Editor
            </button>
          </div>
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <FloorPlanEditor
              key={`floor-editor-${currentFloor.id}`}
              initialLayout={
                currentFloor.layoutJson
                  ? (JSON.parse(currentFloor.layoutJson) as FloorLayout)
                  : createDefaultLayout()
              }
              floorName={currentFloor.name}
              workspaces={workspaces}
              onSave={async (layout) => {
                try {
                  const updatedElements = [...layout.elements];
                  let autoCreatedCount = 0;
                  const LINKABLE_TYPES = [
                    'desk',
                    'chair',
                    'standing_desk',
                    'meeting_room',
                    'private_office',
                    'phone_booth',
                    'event_space',
                    'custom_workspace',
                  ];
                  const unlinkedIndices = updatedElements
                    .map((el, idx) => ({ el, idx }))
                    .filter(
                      ({ el }) =>
                        LINKABLE_TYPES.includes(el.type) &&
                        (!el.workspaceId || !workspaces.some((w) => w.id === el.workspaceId))
                    );

                  let unassignedCount = 0;
                  if (unlinkedIndices.length > 0) {
                    const tempWorkspaces = [...workspaces];
                    for (const { el, idx } of unlinkedIndices) {
                      // 1. Determine workspace type id
                      let typeId = wsTypes[0]?.id; // Default fallback
                      let matched = null;

                      if (wsTypes.length > 0) {
                        const lowercaseType = el.type.toLowerCase();
                        if (lowercaseType.includes('desk') || lowercaseType.includes('chair')) {
                          matched = wsTypes.find(
                            (t) =>
                              t.code.toLowerCase().includes('desk') || t.name.toLowerCase().includes('bàn')
                          );
                        } else if (lowercaseType.includes('meeting')) {
                          matched = wsTypes.find(
                            (t) =>
                              t.code.toLowerCase().includes('meeting') || t.name.toLowerCase().includes('họp')
                          );
                        } else if (lowercaseType.includes('office') || lowercaseType.includes('private')) {
                          matched = wsTypes.find(
                            (t) =>
                              t.code.toLowerCase().includes('office') ||
                              t.name.toLowerCase().includes('phòng riêng')
                          );
                        } else if (lowercaseType.includes('booth') || lowercaseType.includes('phone')) {
                          matched = wsTypes.find(
                            (t) => t.code.toLowerCase().includes('booth') || t.name.toLowerCase().includes('cabin')
                          );
                        } else if (lowercaseType.includes('event')) {
                          matched = wsTypes.find(
                            (t) => t.code.toLowerCase().includes('event') || t.name.toLowerCase().includes('sự kiện')
                          );
                        }
                        if (matched) {
                          typeId = matched.id;
                        }
                      }

                      // If no workspaceTypeId could be resolved, do not call API with invalid data!
                      if (!typeId) {
                        console.warn(
                          `[FloorPlanEditor onSave] Không thể xác định workspaceTypeId cho phần tử ${el.id} (${el.type}). Bỏ qua tự động tạo.`
                        );
                        unassignedCount++;
                        continue;
                      }

                      // Ensure capacity is always >= 1 to satisfy BE validation
                      const capacity = Math.max(1, el.seatCount || matched?.capacityDefault || 1);

                      // 2. Generate clean unique code
                      let baseCode = '';
                      if (el.label) {
                        baseCode = el.label.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
                      }
                      if (!baseCode) {
                        const typePrefix =
                          el.type === 'desk' || el.type === 'standing_desk'
                            ? 'DESK'
                            : el.type === 'meeting_room'
                            ? 'MEET'
                            : el.type === 'private_office'
                            ? 'OFFICE'
                            : el.type === 'phone_booth'
                            ? 'BOOTH'
                            : el.type === 'event_space'
                            ? 'EVENT'
                            : 'WS';
                        baseCode = `${typePrefix}-${Math.floor(100 + Math.random() * 900)}`;
                      }

                      let finalCode = baseCode;
                      let counter = 1;
                      while (tempWorkspaces.some((w) => w.code.toUpperCase() === finalCode.toUpperCase())) {
                        finalCode = `${baseCode}-${counter}`;
                        counter++;
                      }

                      const finalName =
                        el.label?.trim() ||
                        (el.type === 'meeting_room'
                          ? 'Phòng họp'
                          : el.type === 'private_office'
                          ? 'Phòng riêng'
                          : el.type === 'phone_booth'
                          ? 'Phone Booth'
                          : el.type === 'event_space'
                          ? 'Khu sự kiện'
                          : 'Bàn làm việc');

                      // 3. Call API to create workspace (passing activeBranchId for super_admin support)
                      try {
                        const newWs = await workspaceApi.create(
                          {
                            floorId: currentFloor.id,
                            workspaceTypeId: typeId,
                            code: finalCode,
                            name: finalName,
                            capacity: capacity,
                            svgElementId: el.id,
                          },
                          activeBranchId
                        );

                        // 4. Update the layout element
                        updatedElements[idx] = {
                          ...el,
                          workspaceId: newWs.id,
                          label: el.label || finalCode,
                        };

                        tempWorkspaces.push(newWs);
                        autoCreatedCount++;
                      } catch (wsErr) {
                        console.warn(
                          `[FloorPlanEditor onSave] Không thể tự động tạo workspace cho ${el.id} (${finalCode}):`,
                          wsErr
                        );
                        unassignedCount++;
                      }
                    }
                  }

                  const finalLayout = { ...layout, elements: updatedElements };
                  const updated = await floorApi.update(
                    currentFloor.id,
                    {
                      layoutJson: JSON.stringify(finalLayout),
                    },
                    activeBranchId
                  );

                  setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
                  await fetchWorkspaces(currentFloor.id);

                  if (autoCreatedCount > 0 && unassignedCount === 0) {
                    showSuccess(`Đã lưu sơ đồ và tự động tạo ${autoCreatedCount} workspace tương ứng!`);
                  } else if (unassignedCount > 0) {
                    showSuccess(
                      `Đã lưu sơ đồ! (${autoCreatedCount > 0 ? `Đã tạo ${autoCreatedCount} workspace, ` : ''}có ${unassignedCount} vị trí chưa gán workspace, bạn có thể chọn và gán sau)`
                    );
                  } else {
                    showSuccess('Sơ đồ mặt bằng đã được lưu thành công!');
                  }
                  setShowEditorPopup(false);
                } catch (err: any) {
                  showError(err.message || 'Lỗi khi lưu layout');
                  throw err;
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BAWorkspacePage;
