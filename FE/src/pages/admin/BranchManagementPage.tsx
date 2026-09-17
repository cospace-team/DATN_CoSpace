import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiMapPin, FiGrid, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, 
  FiAlertTriangle, FiRefreshCw, FiAlertCircle, FiZap, FiArrowRight, FiSliders
} from 'react-icons/fi';
import {
  adminBranchApi, adminWorkspaceTypeApi,
  type AdminBranchDto, type WorkspaceTypeResponse,
  type CreateBranchRequest, type UpdateBranchRequest, type WorkspaceTypeRequest,
} from '../../lib/spaceApi';

/* ── Space Archetypes (Hình mẫu không gian chuẩn) ── */
interface SpaceArchetype {
  id: string;
  name: string;
  suggestedCode: string;
  defaultCapacity: number;
  icon: string;
  description: string;
}

const SPACE_ARCHETYPES: SpaceArchetype[] = [
  {
    id: 'desk',
    name: 'Bàn làm việc linh hoạt (Hot Desk)',
    suggestedCode: 'hot_desk',
    defaultCapacity: 1,
    icon: '💻',
    description: 'Chỗ ngồi cá nhân tại không gian mở, nguồn điện & wifi tốc độ cao.',
  },
  {
    id: 'standing_desk',
    name: 'Bàn đứng công thái học (Standing Desk)',
    suggestedCode: 'standing_desk',
    defaultCapacity: 1,
    icon: '🧍',
    description: 'Bàn nâng hạ tự động phục vụ làm việc linh hoạt bảo vệ cột sống.',
  },
  {
    id: 'meeting_room',
    name: 'Phòng họp tiêu chuẩn (Meeting Room)',
    suggestedCode: 'meeting_room',
    defaultCapacity: 8,
    icon: '🚪',
    description: 'Phòng họp cách âm, màn chiếu/TV, bảng viết và thiết bị họp online.',
  },
  {
    id: 'private_office',
    name: 'Văn phòng riêng tư (Private Office)',
    suggestedCode: 'private_office',
    defaultCapacity: 4,
    icon: '🏢',
    description: 'Không gian làm việc khép kín bảo mật cao cho nhóm & doanh nghiệp.',
  },
  {
    id: 'phone_booth',
    name: 'Cabin cách âm (Phone Booth)',
    suggestedCode: 'phone_booth',
    defaultCapacity: 1,
    icon: '📞',
    description: 'Bốt điện thoại cách âm tuyệt đối cho cuộc gọi 1-1 riêng tư.',
  },
  {
    id: 'event_space',
    name: 'Khu vực sự kiện / Hội thảo (Event Space)',
    suggestedCode: 'event_space',
    defaultCapacity: 30,
    icon: '🎤',
    description: 'Không gian đa năng sức chứa lớn dành cho workshop và networking.',
  },
];

/* ── Slide-over Panel ── */
const SlideOver: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-card border-l border-border shadow-xl flex flex-col animate-slide-in-right">
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
      <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-3xl border border-border p-6 shadow-xl">
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
const emptyTypeForm = { code: '', name: '', capacityDefault: '1', selectedArchetype: '' };

const BranchManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'branches' | 'types'>('branches');
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'branch' | 'type'>('branch');
  const [editItem, setEditItem] = useState<AdminBranchDto | WorkspaceTypeResponse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'branch' | 'type'; name: string; id: string } | null>(null);
  const [apiError, setApiError] = useState('');

  // Loophole closure prompt
  const [pricingPromptType, setPricingPromptType] = useState<{ id: string; name: string } | null>(null);

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
      setTypeForm({ code: t.code, name: t.name, capacityDefault: String(t.capacityDefault), selectedArchetype: '' });
    }
    setSlideOpen(true);
  };

  const handleSelectArchetype = (archetype: SpaceArchetype) => {
    setTypeForm({
      code: archetype.suggestedCode,
      name: archetype.name.split(' (')[0],
      capacityDefault: String(archetype.defaultCapacity),
      selectedArchetype: archetype.id,
    });
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
        setSlideOpen(false);
      } else {
        const created = await adminWorkspaceTypeApi.create(req);
        setTypeList(prev => [...prev, created]);
        setSlideOpen(false);
        // Prompt loophole closure: Configure pricing immediately!
        setPricingPromptType({ id: created.id, name: created.name });
      }
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Chi nhánh & Loại không gian</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Quản lý các cơ sở chi nhánh và chuẩn hóa các hình mẫu không gian (Archetypes) trên hệ thống.
            </p>
          </div>
          <div className="flex gap-2">
            <TabBtn active={activeTab === 'branches'} onClick={() => setActiveTab('branches')}>
              <FiMapPin className="inline h-3.5 w-3.5 mr-1.5" />Chi nhánh ({branchList.length})
            </TabBtn>
            <TabBtn active={activeTab === 'types'} onClick={() => setActiveTab('types')}>
              <FiGrid className="inline h-3.5 w-3.5 mr-1.5" />Loại không gian ({typeList.length})
            </TabBtn>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      {/* ── Tab: Branches ── */}
      {activeTab === 'branches' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Danh sách cơ sở chi nhánh phục vụ khách hàng</p>
            <button onClick={() => openAdd('branch')} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm chi nhánh</button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branchLoading ? (
              <div className="col-span-full flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <FiRefreshCw className="h-5 w-5 animate-spin" /> Đang tải danh sách chi nhánh...
              </div>
            ) : branchList.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
                Chưa có chi nhánh nào trong hệ thống.
              </div>
            ) : branchList.map(b => (
              <div key={b.id} className="bg-card rounded-2xl border border-border p-5 hover:border-primary/50 transition-all flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">{b.code}</span>
                    <span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {b.status === 'active' ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground text-base">{b.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.address}</p>
                </div>
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">{b.city || 'Việt Nam'}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit('branch', b)} className="btn btn-ghost btn-sm !p-1.5" title="Chỉnh sửa"><FiEdit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteConfirm({ type: 'branch', name: b.name, id: b.id })} className="btn btn-ghost btn-sm !p-1.5 text-destructive hover:!text-destructive" title="Xóa"><FiTrash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Tab: Types ── */}
      {activeTab === 'types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Loại không gian & Hình mẫu (Archetypes)</p>
              <p className="text-xs text-muted-foreground">Mỗi loại không gian định hình sơ đồ mặt bằng và chính sách giá tương ứng.</p>
            </div>
            <button onClick={() => openAdd('type')} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm loại không gian</button>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold">Mã loại</th>
                  <th className="px-6 py-4 font-semibold">Tên loại không gian</th>
                  <th className="px-6 py-4 font-semibold">Sức chứa mặc định</th>
                  <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {typeLoading ? (
                  <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">Đang tải loại không gian...</td></tr>
                ) : typeList.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">Chưa có loại không gian nào.</td></tr>
                ) : typeList.map(t => {
                  const matchedArchetype = SPACE_ARCHETYPES.find(a => 
                    t.code.toLowerCase().includes(a.suggestedCode.toLowerCase()) || 
                    t.name.toLowerCase().includes(a.name.toLowerCase().split(' ')[0])
                  );

                  return (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold">
                        <span className="bg-muted px-2 py-1 rounded text-foreground">{t.code}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{matchedArchetype?.icon || '🏢'}</span>
                          <span>{t.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{t.capacityDefault} người</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit('type', t)} className="btn btn-ghost btn-sm !p-1.5" title="Chỉnh sửa"><FiEdit2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteConfirm({ type: 'type', name: t.name, id: t.id })} className="btn btn-ghost btn-sm !p-1.5 text-destructive hover:!text-destructive" title="Xóa"><FiTrash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Slide-over: Branch Form ── */}
      <SlideOver open={slideOpen && slideMode === 'branch'} onClose={() => setSlideOpen(false)} title={editItem ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}>
        <form className="space-y-5" onSubmit={submitBranch}>
          <div><label className="text-sm font-medium block mb-1.5">Tên chi nhánh *</label><input required className="input-field" placeholder="VD: CoSpace Cầu Giấy" value={branchForm.name} onChange={e => setBranchForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Mã chi nhánh *</label><input required disabled={!!editItem} className="input-field font-mono uppercase disabled:opacity-60" placeholder="VD: CS-CG" value={branchForm.code} onChange={e => setBranchForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Địa chỉ *</label><textarea required className="input-field !min-h-[80px]" placeholder="Nhập địa chỉ đầy đủ..." value={branchForm.address} onChange={e => setBranchForm(p => ({ ...p, address: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1.5">Thành phố</label><input className="input-field" placeholder="Hà Nội" value={branchForm.city} onChange={e => setBranchForm(p => ({ ...p, city: e.target.value }))} /></div>
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

      {/* ── Slide-over: Workspace Type Form with Archetype Selector ── */}
      <SlideOver open={slideOpen && slideMode === 'type'} onClose={() => setSlideOpen(false)} title={editItem ? 'Chỉnh sửa loại không gian' : 'Thêm loại không gian'}>
        <form className="space-y-5" onSubmit={submitType}>
          {!editItem && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2 flex items-center gap-1.5">
                <FiSliders className="h-3.5 w-3.5 text-primary" /> Chọn hình mẫu đại diện (Archetype)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SPACE_ARCHETYPES.map((arc) => {
                  const isSelected = typeForm.selectedArchetype === arc.id;
                  return (
                    <button
                      key={arc.id}
                      type="button"
                      onClick={() => handleSelectArchetype(arc)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-primary bg-primary/10 shadow-xs' 
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{arc.icon}</span>
                        <span className="font-semibold text-xs text-foreground line-clamp-1">{arc.name.split(' (')[0]}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Sức chứa: {arc.defaultCapacity} người</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1.5">Mã loại (Code) *</label>
            <input required disabled={!!editItem} className="input-field font-mono disabled:opacity-60" placeholder="VD: phone_booth" value={typeForm.code} onChange={e => setTypeForm(p => ({ ...p, code: e.target.value.toLowerCase() }))} />
            <p className="text-[11px] text-muted-foreground mt-1">Dùng để định danh kỹ thuật trong sơ đồ mặt bằng và API.</p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Tên hiển thị *</label>
            <input required className="input-field" placeholder="VD: Chỗ ngồi cá nhân, Phòng họp" value={typeForm.name} onChange={e => setTypeForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Sức chứa mặc định</label>
            <input type="number" min={1} className="input-field" placeholder="1" value={typeForm.capacityDefault} onChange={e => setTypeForm(p => ({ ...p, capacityDefault: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="submit" className="btn btn-primary btn-sm flex-1"><FiCheck className="h-4 w-4" /> {editItem ? 'Cập nhật' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setSlideOpen(false)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </form>
      </SlideOver>

      {/* ── MODAL: LOOPHOLE CLOSURE PROMPT (THIẾT LẬP BẢNG GIÁ NGAY) ── */}
      {pricingPromptType && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm animate-fade-in" />
          <div className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-3xl border border-primary/40 p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <FiZap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground font-heading">Đóng lỗ hổng đặt chỗ 0đ</h3>
                <p className="text-xs text-muted-foreground">Loại không gian "{pricingPromptType.name}" đã được tạo!</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 mb-5">
              ⚠️ <strong>Lưu ý quan trọng:</strong> Nếu không cấu hình mức giá, khách hàng sẽ không thể tra cứu giá hoặc hệ thống có nguy cơ cho đặt chỗ với giá 0đ. Hãy thiết lập ngay 4 mốc giá cơ bản.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPricingPromptType(null)}
                className="btn btn-ghost btn-sm text-muted-foreground"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = pricingPromptType.id;
                  setPricingPromptType(null);
                  navigate(`/admin/pricing?createForType=${id}`);
                }}
                className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-md shadow-primary/25"
              >
                Cấu hình bảng giá ngay <FiArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

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
