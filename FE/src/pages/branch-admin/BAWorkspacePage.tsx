import React, { useState, useEffect, useCallback } from 'react';
import {
  FiLayers, FiGrid, FiPlus, FiEdit2, FiX, FiCheck, FiAlertCircle,
  FiTrash2, FiUploadCloud, FiCheckCircle,
} from 'react-icons/fi';
import SVGFloorPlanEditor from '../../components/branch-admin/SVGFloorPlanEditor';
import {
  floorApi, workspaceApi, workspaceTypeApi,
  type FloorResponse, type WorkspaceResponse, type WorkspaceTypeResponse,
} from '../../lib/spaceApi';

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
  | null;

const BAWorkspacePage: React.FC = () => {
  /* ── State ── */
  const [floors, setFloors] = useState<FloorResponse[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [wsTypes, setWsTypes] = useState<WorkspaceTypeResponse[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedSvgElement, setSelectedSvgElement] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  /* ── SVG element click → open assign modal ── */
  const handleSelectSvgElement = (elementId: string | null) => {
    setSelectedSvgElement(elementId);
    if (!elementId || !selectedFloorId) return;

    const existingWs = workspaces.find((w) => w.svgElementId === elementId);
    if (existingWs) {
      openWsModal('edit', existingWs);
    } else {
      openWsModal('add', undefined, elementId);
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
    if (!wsForm.code.trim() || !wsForm.name.trim() || !wsForm.svg_element_id.trim()) {
      setErrorMsg('Vui lòng điền các trường bắt buộc (*).'); return;
    }
    try {
      if (modal?.type === 'add-ws') {
        const newWs = await workspaceApi.create({
          floorId: modal.floorId,
          workspaceTypeId: wsForm.workspace_type_id,
          code: wsForm.code,
          name: wsForm.name,
          capacity: parseInt(wsForm.capacity) || 1,
          svgElementId: wsForm.svg_element_id,
        });
        setWorkspaces((prev) => [...prev, newWs]);
        showSuccess('Thêm không gian thành công!');
      } else if (modal?.type === 'edit-ws') {
        const updated = await workspaceApi.update(modal.ws.id, {
          code: wsForm.code, name: wsForm.name,
          workspaceTypeId: wsForm.workspace_type_id,
          capacity: parseInt(wsForm.capacity) || 1,
          svgElementId: wsForm.svg_element_id,
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
      showSuccess(`Đã xóa không gian ${wsCode}`);
      setModal(null);
    } catch (e: any) {
      showError(e.message);
      setModal(null);
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
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheckCircle className="h-5 w-5" /><p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}
      {errorMsg && !modal && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiAlertCircle className="h-5 w-5" /><p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-xl font-bold font-heading mt-1">Sơ đồ & Không gian</h1>
            <p className="text-sm text-muted-foreground mt-1">Upload bản đồ SVG, click để gán workspace tương tác.</p>
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

      {/* SVG Floor Plan Editor */}
      {currentFloor && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm" style={{ height: '500px' }}>
          <div className="px-6 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Bản đồ tương tác — {currentFloor.name}</h2>
              <p className="text-xs text-muted-foreground">Click vào element trên SVG để gán hoặc chỉnh sửa workspace</p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">v{currentFloor.mapVersion}</span>
          </div>
          <div style={{ height: 'calc(100% - 52px)' }}>
            <SVGFloorPlanEditor
              svgContent={currentFloor.svgContent}
              workspaces={workspaces}
              selectedElementId={selectedSvgElement}
              onSelectElement={handleSelectSvgElement}
            />
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
                  <th>Mã</th><th>Tên không gian</th><th>Loại</th><th>Sức chứa</th><th>SVG ID</th><th className="text-center">Trạng thái</th><th className="text-right">Thao tác</th>
                </tr></thead>
                <tbody>
                  {workspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-muted/30 transition-colors">
                      <td className="font-mono font-semibold text-sm">{ws.code}</td>
                      <td className="font-medium">{ws.name}</td>
                      <td className="text-muted-foreground text-sm">{ws.workspaceTypeName}</td>
                      <td className="text-sm">{ws.capacity} người</td>
                      <td className="font-mono text-xs text-muted-foreground">#{ws.svgElementId}</td>
                      <td className="text-center">
                        <span className={`badge ${statusBadge(ws.status)} shadow-sm`}>{statusLabel(ws.status)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openWsModal('edit', ws)} className="btn btn-ghost btn-sm text-muted-foreground hover:text-primary p-2" title="Chỉnh sửa">
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteWorkspace(ws.id, ws.code)} className="btn btn-ghost btn-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2" title="Xóa">
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
            <div className="p-4 bg-muted/40 border border-border rounded-xl">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                SVG Element ID <span className="text-destructive">*</span>
                {modal?.type === 'add-ws' && modal.svgElementId && (
                  <span className="ml-2 text-xs text-primary font-normal">(tự động từ SVG click)</span>
                )}
              </label>
              <p className="text-xs text-muted-foreground mb-2">ID của element trên file SVG — click element trên bản đồ để tự động điền.</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">#</span>
                <input className="input-field pl-7 font-mono text-sm" placeholder="desk_01" required
                  value={wsForm.svg_element_id} onChange={(e) => setWsForm((p) => ({ ...p, svg_element_id: e.target.value }))} />
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
    </div>
  );
};

export default BAWorkspacePage;
