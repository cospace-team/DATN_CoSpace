import React, { useState, useEffect } from 'react';
import { FiMapPin, FiGrid, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertTriangle, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import {
  adminBranchApi, adminWorkspaceTypeApi,
  type AdminBranchDto, type WorkspaceTypeResponse,
  type CreateBranchRequest, type UpdateBranchRequest, type WorkspaceTypeRequest,
} from '../../lib/spaceApi';

/* ── Slide-over Panel ── */
const SlideOver: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 h-16 border-b border-border shrink-0">
          <h3 className="text-lg font-bold font-heading">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm !min-h-[32px] !p-2" aria-label="Đóng"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  );
};

/* ── Confirm Dialog ── */
const ConfirmDialog: React.FC<{ open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <FiAlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h3 className="font-bold text-lg">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn btn-secondary btn-sm">Hủy bỏ</button>
          <button onClick={onConfirm} className="btn btn-danger btn-sm">Xác nhận xóa</button>
        </div>
      </div>
    </>
  );
};

/* ── Tab Button ── */
const TabBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick}
    className={`relative px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${active ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
    {children}
  </button>
);

const emptyBranchForm = { name: '', code: '', address: '', city: '', timezone: 'Asia/Ho_Chi_Minh', status: 'active' as 'active' | 'inactive' };
const emptyTypeForm = { code: '', name: '', capacityDefault: '1' };

const BranchManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branches' | 'types'>('branches');
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'branch' | 'type'>('branch');
  const [editItem, setEditItem] = useState<AdminBranchDto | WorkspaceTypeResponse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'branch' | 'type'; name: string; id: string } | null>(null);
  const [apiError, setApiError] = useState('');

  const [branchList, setBranchList] = useState<AdminBranchDto[]>([]);
  const [branchLoading, setBranchLoading] = useState(true);
  const [typeList, setTypeList] = useState<WorkspaceTypeResponse[]>([]);
  const [typeLoading, setTypeLoading] = useState(true);

  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  const [typeForm, setTypeForm] = useState(emptyTypeForm);

  const loadBranches = async () => {
    setBranchLoading(true);
    try {
      setBranchList(await adminBranchApi.list());
    } catch (e: any) {
      setApiError(e.message || 'Không thể tải danh sách chi nhánh.');
    } finally {
      setBranchLoading(false);
    }
  };

  const loadTypes = async () => {
    setTypeLoading(true);
    try {
      setTypeList(await adminWorkspaceTypeApi.list());
    } catch (e: any) {
      setApiError(e.message || 'Không thể tải loại không gian.');
    } finally {
      setTypeLoading(false);
    }
  };

  useEffect(() => { loadBranches(); loadTypes(); }, []);

  const openAdd = (mode: 'branch' | 'type') => {
    setSlideMode(mode);
    setEditItem(null);
    setApiError('');
    if (mode === 'branch') setBranchForm(emptyBranchForm);
    else setTypeForm(emptyTypeForm);
    setSlideOpen(true);
  };

  const openEdit = (mode: 'branch' | 'type', item: AdminBranchDto | WorkspaceTypeResponse) => {
    setSlideMode(mode);
    setEditItem(item);
    setApiError('');
    if (mode === 'branch') {
      const b = item as AdminBranchDto;
      setBranchForm({ name: b.name, code: b.code, address: b.address, city: b.city || '', timezone: b.timezone || 'Asia/Ho_Chi_Minh', status: b.status });
    } else {
      const t = item as WorkspaceTypeResponse;
      setTypeForm({ code: t.code, name: t.name, capacityDefault: String(t.capacityDefault) });
    }
    setSlideOpen(true);
  };

  const submitBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    try {
      if (editItem) {
        const req: UpdateBranchRequest = {
          name: branchForm.name, address: branchForm.address, city: branchForm.city,
          timezone: branchForm.timezone, status: branchForm.status,
        };
        const updated = await adminBranchApi.update((editItem as AdminBranchDto).id, req);
        setBranchList(prev => prev.map(b => b.id === updated.id ? updated : b));
      } else {
        const req: CreateBranchRequest = {
          code: branchForm.code, name: branchForm.name, address: branchForm.address,
          city: branchForm.city, timezone: branchForm.timezone,
        };
        const created = await adminBranchApi.create(req);
        setBranchList(prev => [...prev, created]);
      }
      setSlideOpen(false);
    } catch (e: any) {
      setApiError(e.message || 'Không thể lưu chi nhánh.');
    }
  };

  const submitType = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    const req: WorkspaceTypeRequest = {
      code: typeForm.code, name: typeForm.name, capacityDefault: parseInt(typeForm.capacityDefault) || 1,
    };
    try {
      if (editItem) {
        const updated = await adminWorkspaceTypeApi.update((editItem as WorkspaceTypeResponse).id, req);
        setTypeList(prev => prev.map(t => t.id === updated.id ? updated : t));
      } else {
        const created = await adminWorkspaceTypeApi.create(req);
        setTypeList(prev => [...prev, created]);
      }
      setSlideOpen(false);
    } catch (e: any) {
      setApiError(e.message || 'Không thể lưu loại không gian.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setApiError('');
    try {
      if (deleteConfirm.type === 'branch') {
        await adminBranchApi.deactivate(deleteConfirm.id);
        setBranchList(prev => prev.filter(b => b.id !== deleteConfirm.id));
      } else {
        await adminWorkspaceTypeApi.delete(deleteConfirm.id);
        setTypeList(prev => prev.filter(t => t.id !== deleteConfirm.id));
      }
      setDeleteConfirm(null);
    } catch (e: any) {
      setApiError(e.message || 'Không thể xóa.');
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chi nhánh & Loại không gian</h1>
          <div className="flex gap-2">
            <TabBtn active={activeTab === 'branches'} onClick={() => setActiveTab('branches')}>
              <FiMapPin className="inline h-3.5 w-3.5 mr-1.5" />Chi nhánh
            </TabBtn>
            <TabBtn active={activeTab === 'types'} onClick={() => setActiveTab('types')}>
              <FiGrid className="inline h-3.5 w-3.5 mr-1.5" />Loại không gian
            </TabBtn>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      {/* ── Tab: Branches ── */}
      {activeTab === 'branches' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Danh sách chi nhánh trong hệ thống</p>
            <button onClick={() => openAdd('branch')} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm chi nhánh</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branchLoading ? (
              <div className="col-span-full flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <FiRefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">Đang tải chi nhánh...</span>
              </div>
            ) : branchList.map(b => (
              <div key={b.id}
                className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow card-interactive group">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary transition-colors">
                    <FiMapPin className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                      {b.status === 'active' ? 'Hoạt động' : 'Ngưng'}
                    </span>
                  </div>
                </div>
                <h3 className="mt-3 font-semibold">{b.name}</h3>
                <p className="text-sm font-medium text-muted-foreground mt-2">{b.address}</p>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{b.code}</span>
                  <span>{b.city}</span>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                  <button onClick={() => openEdit('branch', b)} className="btn btn-secondary btn-sm flex-1"><FiEdit2 className="h-3.5 w-3.5" /> Chỉnh sửa</button>
                  <button onClick={() => setDeleteConfirm({ type: 'branch', name: b.name, id: b.id })} className="btn btn-ghost btn-sm !min-h-[36px] !p-2 text-destructive hover:!text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Tab: Workspace Types ── */}
      {activeTab === 'types' && (
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold">Loại không gian</h2>
              <p className="text-sm font-medium text-muted-foreground mt-2">Các loại hình không gian làm việc toàn hệ thống (VD: Chỗ ngồi cá nhân, Phòng họp)</p>
            </div>
            <button onClick={() => openAdd('type')} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm loại</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Mã</th><th>Tên loại</th><th>Sức chứa mặc định</th><th></th></tr></thead>
              <tbody>
                {typeLoading ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Đang tải...</td></tr>
                ) : typeList.map(t => (
                  <tr key={t.id}>
                    <td className="font-mono">{t.code}</td>
                    <td className="font-medium">{t.name}</td>
                    <td>{t.capacityDefault} người</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit('type', t)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5"><FiEdit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteConfirm({ type: 'type', name: t.name, id: t.id })} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive"><FiTrash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Slide-over: Branch Form ── */}
      <SlideOver open={slideOpen && slideMode === 'branch'} onClose={() => setSlideOpen(false)} title={editItem ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}>
        <form className="space-y-5" onSubmit={submitBranch}>
          <div><label className="text-sm font-medium block mb-1.5">Tên chi nhánh *</label><input required className="input-field" placeholder="VD: WorkHub Quận 3" value={branchForm.name} onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Mã chi nhánh *</label><input required disabled={!!editItem} className="input-field font-mono uppercase disabled:opacity-60" placeholder="VD: WH-Q3" value={branchForm.code} onChange={e => setBranchForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Địa chỉ *</label><textarea required className="input-field !min-h-[80px]" placeholder="Nhập địa chỉ đầy đủ..." value={branchForm.address} onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1.5">Thành phố</label><input className="input-field" placeholder="TP.HCM" value={branchForm.city} onChange={e => setBranchForm(p => ({ ...p, city: e.target.value }))} /></div>
            <div><label className="text-sm font-medium block mb-1.5">Múi giờ</label>
              <select className="input-field" value={branchForm.timezone} onChange={e => setBranchForm(p => ({ ...p, timezone: e.target.value }))}>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                <option value="Asia/Bangkok">Asia/Bangkok</option>
              </select>
            </div>
          </div>
          {editItem && (
            <div className="flex items-center gap-3 pt-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={branchForm.status === 'active'}
                  onChange={e => setBranchForm(p => ({ ...p, status: e.target.checked ? 'active' : 'inactive' }))} />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="submit" className="btn btn-primary btn-sm flex-1"><FiCheck className="h-4 w-4" /> {editItem ? 'Cập nhật' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setSlideOpen(false)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </form>
      </SlideOver>

      {/* ── Slide-over: Workspace Type Form ── */}
      <SlideOver open={slideOpen && slideMode === 'type'} onClose={() => setSlideOpen(false)} title={editItem ? 'Chỉnh sửa loại không gian' : 'Thêm loại không gian'}>
        <form className="space-y-5" onSubmit={submitType}>
          <div><label className="text-sm font-medium block mb-1.5">Mã loại *</label><input required disabled={!!editItem} className="input-field font-mono disabled:opacity-60" placeholder="VD: phone_booth" value={typeForm.code} onChange={e => setTypeForm(p => ({ ...p, code: e.target.value }))} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Tên loại *</label><input required className="input-field" placeholder="VD: Chỗ ngồi cá nhân, Phòng họp" value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Sức chứa mặc định</label><input type="number" min={1} className="input-field" placeholder="1" value={typeForm.capacityDefault} onChange={e => setTypeForm(p => ({ ...p, capacityDefault: e.target.value }))} /></div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="submit" className="btn btn-primary btn-sm flex-1"><FiCheck className="h-4 w-4" /> {editItem ? 'Cập nhật' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setSlideOpen(false)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </form>
      </SlideOver>

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <ConfirmDialog
          open={true}
          title={`Xóa ${deleteConfirm.type === 'branch' ? 'chi nhánh' : 'loại không gian'}?`}
          message={`Bạn có chắc chắn muốn xóa "${deleteConfirm.name}"? Hành động này không thể hoàn tác nếu không còn dữ liệu liên quan.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

export default BranchManagementPage;
