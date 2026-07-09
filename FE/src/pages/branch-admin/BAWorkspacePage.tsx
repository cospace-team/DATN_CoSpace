import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiLayers, FiGrid, FiPlus, FiEdit2, FiX, FiCheck, FiAlertCircle,
  FiTrash2, FiUploadCloud, FiCheckCircle, FiLayout, FiMap,
} from 'react-icons/fi';
import FloorPlanEditor from '../../components/floor-plan/FloorPlanEditor';
import FloorPlanViewer from '../../components/floor-plan/FloorPlanViewer';
import {
  floorApi, workspaceApi, workspaceTypeApi,
  type FloorResponse, type WorkspaceResponse, type WorkspaceTypeResponse,
} from '../../lib/spaceApi';
import type { FloorLayout } from '../../types/floorPlan';
import { createDefaultLayout } from '../../data/elementCatalog';

/* ── Modal shell ── */
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <h2 className="text-lg font-bold font-heading">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground" aria-label="Đóng">
          <FiX className="h-5 w-5" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto">{children}</div>
    </div>
  </div>
);

type ModalMode =
  | { type: 'add-floor' }
  | { type: 'edit-floor'; floor: FloorResponse }
  | { type: 'add-ws'; floorId: string; svgElementId?: string }
  | { type: 'edit-ws'; ws: WorkspaceResponse }
  | { type: 'confirm-delete-floor'; floorId: string; floorName: string }
  | { type: 'confirm-delete-ws'; wsId: string; wsCode: string }
  | { type: 'assign-ws-layout'; element: any }
  | null;

const BAWorkspacePage: React.FC = () => {
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

  // Form state
  const [floorForm, setFloorForm] = useState({ floor_no: '', name: '', svgContent: '' });
  const [wsForm, setWsForm] = useState({ code: '', name: '', workspace_type_id: '', capacity: '1', svg_element_id: '', status: 'active' });

  const currentFloor = floors.find((f) => f.id === selectedFloorId);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 5000); };

  /* ── Data fetching ── */
  const fetchFloors = useCallback(async () => {
    try {
      const data = await floorApi.list();
      setFloors(data);
      if (data.length > 0 && !selectedFloorId) setSelectedFloorId(data[0].id);
    } catch (e: any) { showError(e.message); }
  }, [selectedFloorId]);

  const fetchWorkspaces = useCallback(async (floorId: string) => {
    try {
      const data = await workspaceApi.listByFloor(floorId);
      setWorkspaces(data);
    } catch (e: any) { showError(e.message); }
  }, []);

  const fetchWsTypes = useCallback(async () => {
    try {
      const data = await workspaceTypeApi.list();
      setWsTypes(data);
    } catch (e: any) { console.error('Failed to load workspace types', e); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchFloors(), fetchWsTypes()]);
      setLoading(false);
    })();
  }, [fetchFloors, fetchWsTypes]);

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
    try { return JSON.parse(currentFloor.layoutJson) as FloorLayout; }
    catch { return null; }
  }, [currentFloor?.layoutJson]);

  const assignedWorkspaceIds = useMemo<string[]>(() => {
    if (!currentLayout) return [];
    return currentLayout.elements
      .map((el) => el.workspaceId)
      .filter((id): id is string => !!id);
  }, [currentLayout]);

  const [syncing, setSyncing] = useState(false);

  const orphanWorkspaceElements = useMemo(() => {
    if (!currentLayout || workspaces.length === 0) return [];
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
        .filter(({ el }) => 
          ['desk', 'chair', 'standing_desk', 'meeting_room', 'private_office'].includes(el.type) &&
          el.workspaceId &&
          !workspaces.some(w => w.id === el.workspaceId)
        );

      for (const { el, idx } of orphans) {
        let typeId = wsTypes[0]?.id;
        let capacity = el.seatCount || 1;

        if (wsTypes.length > 0) {
          const lowercaseType = el.type.toLowerCase();
          let matched = null;
          if (lowercaseType.includes('desk')) {
            matched = wsTypes.find(t => t.code.toLowerCase().includes('desk') || t.name.toLowerCase().includes('bàn') || t.name.toLowerCase().includes('desk'));
          } else if (lowercaseType.includes('meeting')) {
            matched = wsTypes.find(t => t.code.toLowerCase().includes('meeting') || t.name.toLowerCase().includes('họp') || t.name.toLowerCase().includes('meeting'));
          } else if (lowercaseType.includes('office') || lowercaseType.includes('private')) {
            matched = wsTypes.find(t => t.code.toLowerCase().includes('office') || t.name.toLowerCase().includes('phòng riêng') || t.name.toLowerCase().includes('office'));
          }
          if (matched) {
            typeId = matched.id;
            capacity = el.seatCount || matched.capacityDefault || 1;
          }
        }

        let baseCode = '';
        if (el.label) {
          baseCode = el.label.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
        }
        if (!baseCode) {
          const typePrefix = el.type === 'desk' || el.type === 'standing_desk' ? 'DESK'
            : el.type === 'meeting_room' ? 'MEET'
            : el.type === 'private_office' ? 'OFFICE' : 'WS';
          baseCode = `${typePrefix}-${Math.floor(100 + Math.random() * 900)}`;
        }

        let finalCode = baseCode;
        let counter = 1;
        while (tempWorkspaces.some(w => w.code.toUpperCase() === finalCode.toUpperCase())) {
          finalCode = `${baseCode}-${counter}`;
          counter++;
        }

        const newWs = await workspaceApi.create({
          floorId: currentFloor.id,
          workspaceTypeId: typeId,
          code: finalCode,
          name: el.label || (el.type === 'meeting_room' ? 'Phòng họp' : el.type === 'private_office' ? 'Phòng riêng' : 'Bàn làm việc'),
          capacity: capacity,
          svgElementId: el.id,
        });

        updatedElements[idx] = {
          ...el,
          workspaceId: newWs.id,
          label: el.label || finalCode,
        };

        tempWorkspaces.push(newWs);
        autoCreatedCount++;
      }

      const finalLayout = { ...currentLayout, elements: updatedElements };
      const updated = await floorApi.update(currentFloor.id, {
        layoutJson: JSON.stringify(finalLayout),
      });

      setFloors((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );
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
      setFloorForm({ floor_no: String(floors.length + 1), name: '', svgContent: '' });
      setModal({ type: 'add-floor' });
    } else if (floor) {
      setFloorForm({ floor_no: String(floor.floorNo), name: floor.name, svgContent: floor.svgContent || '' });
      setModal({ type: 'edit-floor', floor });
    }
  };

  const saveFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorForm.name.trim()) { setErrorMsg('Vui lòng nhập tên tầng.'); return; }
    try {
      if (modal?.type === 'add-floor') {
        const newFloor = await floorApi.create({
          floorNo: parseInt(floorForm.floor_no) || floors.length + 1,
          name: floorForm.name,
          svgContent: floorForm.svgContent || undefined,
        });
        setFloors((prev) => [...prev, newFloor]);
        setSelectedFloorId(newFloor.id);
        showSuccess('Thêm tầng mới thành công!');
      } else if (modal?.type === 'edit-floor') {
        const updated = await floorApi.update(modal.floor.id, {
          name: floorForm.name,
          floorNo: parseInt(floorForm.floor_no) || undefined,
          svgContent: floorForm.svgContent || undefined,
        });
        setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
        showSuccess('Cập nhật thông tin tầng thành công!');
      }
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const deleteFloor = (floorId: string, floorName: string) => {
    setModal({ type: 'confirm-delete-floor', floorId, floorName });
  };

  const handleConfirmDeleteFloor = async (floorId: string, floorName: string) => {
    try {
      await floorApi.delete(floorId);
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
        code: '', name: '',
        workspace_type_id: wsTypes[0]?.id ?? '',
        capacity: '1',
        svg_element_id: svgElementId || '',
        status: 'active',
      });
      setModal({ type: 'add-ws', floorId: selectedFloorId, svgElementId });
    } else if (ws) {
      setWsForm({
        code: ws.code, name: ws.name,
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
      setErrorMsg('Vui lòng điền các trường bắt buộc (*).'); return;
    }
    try {
      const finalSvgElementId = wsForm.svg_element_id || wsForm.code;
      if (modal?.type === 'add-ws') {
        const newWs = await workspaceApi.create({
          floorId: modal.floorId,
          workspaceTypeId: wsForm.workspace_type_id,
          code: wsForm.code,
          name: wsForm.name,
          capacity: parseInt(wsForm.capacity) || 1,
          svgElementId: finalSvgElementId,
        });
        setWorkspaces((prev) => [...prev, newWs]);
        showSuccess('Thêm không gian thành công!');
      } else if (modal?.type === 'edit-ws') {
        const updated = await workspaceApi.update(modal.ws.id, {
          code: wsForm.code, name: wsForm.name,
          workspaceTypeId: wsForm.workspace_type_id,
          capacity: parseInt(wsForm.capacity) || 1,
          svgElementId: finalSvgElementId,
          status: wsForm.status,
        });
        setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        showSuccess('Cập nhật không gian thành công!');
      }
      setModal(null);
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const deleteWorkspace = (wsId: string, wsCode: string) => {
    setModal({ type: 'confirm-delete-ws', wsId, wsCode });
  };

  const handleConfirmDeleteWorkspace = async (wsId: string, wsCode: string) => {
    try {
      await workspaceApi.delete(wsId);
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
            const updated = await floorApi.update(currentFloor.id, {
              layoutJson: JSON.stringify(cleaned),
            });
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
      const updated = await floorApi.update(currentFloor.id, {
        layoutJson: JSON.stringify(updatedLayout),
      });

      setFloors((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      // Refetch workspaces so the table display and svgElementIds are in sync
      await fetchWorkspaces(currentFloor.id);
      showSuccess(wsId ? 'Gán workspace thành công!' : 'Đã gỡ gán workspace!');
    } catch (e: any) {
      showError(e.message || 'Lỗi khi gán workspace');
    }
  };

  const handleFloorPlanElementClick = (el: any) => {
    const LINKABLE_TYPES = ['desk', 'chair', 'standing_desk', 'meeting_room', 'private_office'];
    if (!LINKABLE_TYPES.includes(el.type)) return;

    if (assigningWsId) {
      saveLayoutWithAssignedWorkspace(el.id, assigningWsId);
      setAssigningWsId(null);
      setAssigningWsCode(null);
    } else {
      setModal({ type: 'assign-ws-layout', element: el });
    }
  };

  const statusBadge = (status: string) =>
    status === 'active' ? 'badge-success' : status === 'maintenance' ? 'badge-warning' : 'badge-danger';
  const statusLabel = (status: string) =>
    status === 'active' ? 'Hoạt động' : status === 'maintenance' ? 'Bảo trì' : 'Ngưng';

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
          <FiCheckCircle className="h-5 w-5" /><p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}
      {errorMsg && !modal && (
        <div className="fixed top-4 right-4 z-[70] animate-slide-up flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiAlertCircle className="h-5 w-5" /><p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-xl font-bold font-heading mt-1">Sơ đồ & Không gian</h1>
            <p className="text-sm text-muted-foreground mt-1">Thiết kế layout tầng bằng kéo thả hoặc upload SVG, gán workspace tương tác.</p>
          </div>
          <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => openFloorModal('add')}>
            <FiPlus className="h-4 w-4" /> Thêm Tầng Mới
          </button>
        </div>
      </div>

      {/* Floors tab bar */}
      <div className="rounded-xl border border-border bg-card p-6">
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
                    <button onClick={() => openFloorModal('edit', f)} className="btn btn-ghost btn-sm p-1.5 text-muted-foreground hover:text-primary" title="Sửa tầng">
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteFloor(f.id, f.name)} className="btn btn-ghost btn-sm p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Xóa tầng">
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
                Phát hiện {orphanWorkspaceElements.length} phần tử (bàn, phòng...) trên sơ đồ mang ID chưa tồn tại trong Database (do mới thêm hoặc import mẫu).
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
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
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
                    "Click vào element để gán hoặc thay đổi workspace liên kết"
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
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <FiLayout className="h-12 w-12 opacity-30" />
                <p className="font-medium">Chưa có layout cho tầng này</p>
                <button
                  onClick={() => setShowEditorPopup(true)}
                  className="btn btn-primary btn-sm flex items-center gap-2 mt-1"
                >
                  <FiEdit2 className="h-3.5 w-3.5" /> Tạo Layout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workspaces table */}
      {currentFloor && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex items-center justify-between flex-wrap gap-3 bg-muted/20">
            <h2 className="font-semibold flex items-center gap-2 text-lg">
              <FiGrid className="h-5 w-5 text-primary" /> Workspace tại {currentFloor.name}
            </h2>
            <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => openWsModal('add')}>
              <FiPlus className="h-4 w-4" /> Thêm không gian
            </button>
          </div>
          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
              <FiGrid className="h-12 w-12 opacity-30" />
              <p className="font-medium">Chưa có không gian nào.</p>
              <p className="text-sm">Click element trên SVG hoặc nhấn "Thêm không gian".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr className="bg-muted/50">
                  <th>Mã</th><th>Tên không gian</th><th>Loại</th><th>Sức chứa</th><th>Vị trí sơ đồ</th><th className="text-center">Trạng thái</th><th className="text-right">Thao tác</th>
                </tr></thead>
                <tbody>
                  {workspaces.map((ws) => {
                    const linkedEl = currentLayout?.elements.find((el) => el.workspaceId === ws.id);
                    return (
                      <tr key={ws.id} className="hover:bg-muted/30 transition-colors">
                        <td className="font-mono font-semibold text-sm">{ws.code}</td>
                        <td className="font-medium">{ws.name}</td>
                        <td className="text-muted-foreground text-sm">{ws.workspaceTypeName}</td>
                        <td className="text-sm">{ws.capacity} người</td>
                        <td className="text-sm">
                          {linkedEl ? (
                            <button
                              onClick={() => {
                                setSelectedWsId(selectedWsId === ws.id ? null : ws.id);
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                                selectedWsId === ws.id
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                              }`}
                              title="Click để định vị trên sơ đồ"
                            >
                            {linkedEl.label || 'Đã gán'} 
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (assigningWsId === ws.id) {
                                  setAssigningWsId(null);
                                  setAssigningWsCode(null);
                                } else {
                                  setAssigningWsId(ws.id);
                                  setAssigningWsCode(ws.code);
                                }
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                                assigningWsId === ws.id
                                  ? 'bg-warning text-warning-foreground animate-pulse'
                                  : 'bg-muted hover:bg-muted-foreground/20 text-muted-foreground'
                              }`}
                              title="Click để chọn vị trí trên sơ đồ"
                            >
                              {assigningWsId === ws.id ? 'Đang gán...' : '➕ Gán sơ đồ'}
                            </button>
                          )}
                        </td>
                        <td className="text-center">
                          <span className={`badge ${statusBadge(ws.status)} shadow-sm`}>{statusLabel(ws.status)}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2 justify-end">
                            {linkedEl && (
                              <button
                                onClick={() => saveLayoutWithAssignedWorkspace(linkedEl.id, null)}
                                className="btn btn-ghost btn-sm text-muted-foreground hover:text-warning p-2"
                                title="Hủy liên kết vị trí"
                              >
                                <FiX className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => openWsModal('edit', ws)} className="btn btn-ghost btn-sm text-muted-foreground hover:text-primary p-2" title="Chỉnh sửa">
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteWorkspace(ws.id, ws.code)} className="btn btn-ghost btn-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2" title="Xóa">
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Floor Modal ── */}
      {(modal?.type === 'add-floor' || modal?.type === 'edit-floor') && (
        <Modal title={modal.type === 'add-floor' ? 'Thêm tầng mới' : 'Chỉnh sửa tầng'} onClose={() => setModal(null)}>
          {errorMsg && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex items-start gap-2 border border-destructive/20">
              <FiAlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><p>{errorMsg}</p>
            </div>
          )}
          <form onSubmit={saveFloor} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-foreground mb-1.5">Số tầng</label>
                <input type="number" className="input-field" value={floorForm.floor_no}
                  onChange={(e) => setFloorForm((p) => ({ ...p, floor_no: e.target.value }))} min={1} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">Tên hiển thị <span className="text-destructive">*</span></label>
                <input className="input-field" placeholder="Tầng 1 - Lobby" required
                  value={floorForm.name} onChange={(e) => setFloorForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">File Bản đồ (SVG)</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/30 hover:bg-muted/50 transition-colors relative cursor-pointer">
                <input type="file" accept=".svg" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSvgFileRead(file, (content) => setFloorForm((p) => ({ ...p, svgContent: content })));
                  }} />
                <FiUploadCloud className="h-8 w-8 text-primary mb-2" />
                {floorForm.svgContent ? (
                  <p className="text-sm font-medium text-primary">✓ SVG đã tải lên</p>
                ) : (
                  <><p className="text-sm font-medium">Nhấn để tải lên file SVG</p>
                  <p className="text-xs text-muted-foreground mt-1">Elements có id sẽ trở thành workspace gán được</p></>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button>
              <button type="submit" className="btn btn-primary flex items-center gap-2">
                <FiCheck className="h-4 w-4" /> Lưu thông tin
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Workspace Modal ── */}
      {(modal?.type === 'add-ws' || modal?.type === 'edit-ws') && (
        <Modal title={modal.type === 'add-ws' ? 'Thêm không gian mới' : 'Chỉnh sửa không gian'} onClose={() => setModal(null)}>
          {errorMsg && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm font-medium rounded-lg flex items-start gap-2 border border-destructive/20">
              <FiAlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><p>{errorMsg}</p>
            </div>
          )}
          <form onSubmit={saveWorkspace} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Mã không gian <span className="text-destructive">*</span></label>
                <input className="input-field font-mono" placeholder="HD-01" required
                  value={wsForm.code} onChange={(e) => setWsForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Loại không gian</label>
                <select className="input-field" value={wsForm.workspace_type_id}
                  onChange={(e) => setWsForm((p) => ({ ...p, workspace_type_id: e.target.value }))}>
                  {wsTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Tên hiển thị <span className="text-destructive">*</span></label>
              <input className="input-field" placeholder="Bàn làm việc số 1" required
                value={wsForm.name} onChange={(e) => setWsForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sức chứa (người)</label>
                <input type="number" className="input-field" min={1} required
                  value={wsForm.capacity} onChange={(e) => setWsForm((p) => ({ ...p, capacity: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Trạng thái</label>
                <select className="input-field" value={wsForm.status}
                  onChange={(e) => setWsForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="active">Đang hoạt động</option>
                  <option value="maintenance">Bảo trì</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button>
              <button type="submit" className="btn btn-primary flex items-center gap-2">
                <FiCheck className="h-4 w-4" /> Lưu thông tin
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirm Delete Floor Modal ── */}
      {modal?.type === 'confirm-delete-floor' && (
        <Modal title="Xác nhận xóa tầng" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
              <FiAlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Hành động này không thể hoàn tác!</p>
                <p className="text-xs opacity-90">Tất cả các không gian làm việc (workspace) thuộc tầng này cũng sẽ bị xóa vĩnh viễn.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn xóa tầng <strong className="text-foreground">"{modal.floorName}"</strong> không?
            </p>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Hủy bỏ</button>
              <button type="button" className="btn bg-destructive hover:bg-destructive/95 text-destructive-foreground flex items-center gap-2"
                onClick={() => handleConfirmDeleteFloor(modal.floorId, modal.floorName)}>
                <FiTrash2 className="h-4 w-4" /> Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Workspace Modal ── */}
      {modal?.type === 'confirm-delete-ws' && (
        <Modal title="Xác nhận xóa không gian" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
              <FiAlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Cảnh báo xóa không gian</p>
                <p className="text-xs opacity-90">Không gian này sẽ bị xóa khỏi bản đồ và hệ thống. Nếu có lịch đặt trong tương lai, hệ thống sẽ chặn hành động này.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn xóa không gian <strong className="text-foreground font-mono">#{modal.wsCode}</strong> không?
            </p>
            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Hủy bỏ</button>
              <button type="button" className="btn bg-destructive hover:bg-destructive/95 text-destructive-foreground flex items-center gap-2"
                onClick={() => handleConfirmDeleteWorkspace(modal.wsId, modal.wsCode)}>
                <FiTrash2 className="h-4 w-4" /> Xóa không gian
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Assign Workspace Layout Modal ── */}
      {modal?.type === 'assign-ws-layout' && (
        <Modal title="Gán không gian làm việc" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="p-4 bg-muted/40 border border-border rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Thông tin phần tử sơ đồ</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Loại phần tử:</span>{' '}
                  <strong className="capitalize">{modal.element.type}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Mã ID phần tử:</span>{' '}
                  <strong className="font-mono text-xs">{modal.element.id.substring(0, 8)}...</strong>
                </div>
                {modal.element.label && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Nhãn hiển thị:</span>{' '}
                    <strong>{modal.element.label}</strong>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Chọn Workspace để liên kết
              </label>
              <select
                className="input-field"
                value={modal.element.workspaceId || ''}
                onChange={async (e) => {
                  const val = e.target.value || null;
                  await saveLayoutWithAssignedWorkspace(modal.element.id, val);
                  setModal(null);
                }}
              >
                <option value="">-- Chưa gán workspace --</option>
                {workspaces.map((ws) => {
                  const isThisElement = modal.element.workspaceId === ws.id;
                  const isAssignedElsewhere = assignedWorkspaceIds.includes(ws.id) && !isThisElement;
                  return (
                    <option key={ws.id} value={ws.id} disabled={isAssignedElsewhere}>
                      {ws.code} - {ws.name} {isAssignedElsewhere ? '(Đã gán phần tử khác)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModal(null)}
              >
                Hủy bỏ
              </button>
              {modal.element.workspaceId && (
                <button
                  type="button"
                  className="btn bg-destructive hover:bg-destructive/90 text-white flex items-center gap-2"
                  onClick={async () => {
                    await saveLayoutWithAssignedWorkspace(modal.element.id, null);
                    setModal(null);
                  }}
                >
                  <FiX className="h-4 w-4" /> Hủy liên kết
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Fullscreen Editor Popup ── */}
      {showEditorPopup && currentFloor && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-in">
          {/* Popup Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <FiLayout className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold font-heading">Chỉnh sửa Layout — {currentFloor.name}</h2>
                <p className="text-xs text-muted-foreground">Kéo thả elements từ panel trái để thiết kế, gán workspace từ panel phải</p>
              </div>
            </div>
            <button
              onClick={() => setShowEditorPopup(false)}
              className="btn btn-ghost btn-sm flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <FiX className="h-4 w-4" /> Đóng
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
                  const LINKABLE_TYPES = ['desk', 'chair', 'standing_desk', 'meeting_room', 'private_office'];
                  const unlinkedIndices = updatedElements
                    .map((el, idx) => ({ el, idx }))
                    .filter(({ el }) => 
                      LINKABLE_TYPES.includes(el.type) && 
                      (!el.workspaceId || !workspaces.some(w => w.id === el.workspaceId))
                    );

                  if (unlinkedIndices.length > 0) {
                    const tempWorkspaces = [...workspaces];
                    for (const { el, idx } of unlinkedIndices) {
                      // 1. Determine workspace type id
                      let typeId = wsTypes[0]?.id; // Default fallback
                      let capacity = el.seatCount || 1;

                      if (wsTypes.length > 0) {
                        const lowercaseType = el.type.toLowerCase();
                        let matched = null;
                        if (lowercaseType.includes('desk')) {
                          matched = wsTypes.find(t => t.code.toLowerCase().includes('desk') || t.name.toLowerCase().includes('bàn') || t.name.toLowerCase().includes('desk'));
                        } else if (lowercaseType.includes('meeting')) {
                          matched = wsTypes.find(t => t.code.toLowerCase().includes('meeting') || t.name.toLowerCase().includes('họp') || t.name.toLowerCase().includes('meeting'));
                        } else if (lowercaseType.includes('office') || lowercaseType.includes('private')) {
                          matched = wsTypes.find(t => t.code.toLowerCase().includes('office') || t.name.toLowerCase().includes('phòng riêng') || t.name.toLowerCase().includes('office'));
                        }
                        if (matched) {
                          typeId = matched.id;
                          capacity = el.seatCount || matched.capacityDefault || 1;
                        }
                      }

                      // 2. Generate clean unique code
                      let baseCode = '';
                      if (el.label) {
                        baseCode = el.label.toUpperCase().trim().replace(/[^A-Z0-9-]/g, '');
                      }
                      if (!baseCode) {
                        const typePrefix = el.type === 'desk' || el.type === 'standing_desk' ? 'DESK'
                          : el.type === 'meeting_room' ? 'MEET'
                          : el.type === 'private_office' ? 'OFFICE' : 'WS';
                        baseCode = `${typePrefix}-${Math.floor(100 + Math.random() * 900)}`;
                      }

                      let finalCode = baseCode;
                      let counter = 1;
                      while (tempWorkspaces.some(w => w.code.toUpperCase() === finalCode.toUpperCase())) {
                        finalCode = `${baseCode}-${counter}`;
                        counter++;
                      }

                      // 3. Call API to create workspace
                      const newWs = await workspaceApi.create({
                        floorId: currentFloor.id,
                        workspaceTypeId: typeId,
                        code: finalCode,
                        name: el.label || (el.type === 'meeting_room' ? 'Phòng họp' : el.type === 'private_office' ? 'Phòng riêng' : 'Bàn làm việc'),
                        capacity: capacity,
                        svgElementId: el.id,
                      });

                      // 4. Update the layout element
                      updatedElements[idx] = {
                        ...el,
                        workspaceId: newWs.id,
                        label: el.label || finalCode,
                      };

                      tempWorkspaces.push(newWs);
                      autoCreatedCount++;
                    }
                  }

                  const finalLayout = { ...layout, elements: updatedElements };
                  const updated = await floorApi.update(currentFloor.id, {
                    layoutJson: JSON.stringify(finalLayout),
                  });

                  setFloors((prev) =>
                    prev.map((f) => (f.id === updated.id ? updated : f))
                  );
                  await fetchWorkspaces(currentFloor.id);

                  if (autoCreatedCount > 0) {
                    showSuccess(`Đã lưu sơ đồ và tự động tạo ${autoCreatedCount} workspace tương ứng!`);
                  } else {
                    showSuccess('Layout đã được lưu thành công!');
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
