import React, { useState } from 'react';
import { FiMapPin, FiGrid, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { branches as branchData, workspaceTypes as wsTypeData, getFloorsByBranch } from '../../data/mockData';
import type { Branch, WorkspaceType } from '../../data/mockData';

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
      <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
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

const BranchManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branches' | 'types'>('branches');
  const [slideOpen, setSlideOpen] = useState(false);
  const [slideMode, setSlideMode] = useState<'branch' | 'type'>('branch');
  const [editItem, setEditItem] = useState<Branch | WorkspaceType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; name: string; id: string } | null>(null);

  const openAdd = (mode: 'branch' | 'type') => { setSlideMode(mode); setEditItem(null); setSlideOpen(true); };
  const openEdit = (mode: 'branch' | 'type', item: Branch | WorkspaceType) => { setSlideMode(mode); setEditItem(item); setSlideOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý không gian</p>
            <h1 className="text-xl font-bold font-heading mt-1">Chi nhánh & Loại không gian</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý cấu trúc vĩ mô toàn hệ thống. Tầng và workspace được cấu hình bởi Quản lý chi nhánh.</p>
          </div>
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

      {/* ── Tab: Branches ── */}
      {activeTab === 'branches' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Danh sách chi nhánh trong hệ thống</p>
            <button onClick={() => openAdd('branch')} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm chi nhánh</button>
          </div>

          {/* Branch Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branchData.map(b => (
              <div key={b.id}
                className="rounded-xl border border-border bg-card p-6 card-interactive group">
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
                <p className="text-sm text-muted-foreground mt-1">{b.address}</p>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="font-mono">{b.code}</span>
                  <span>{b.city}</span>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                  <button onClick={() => openEdit('branch', b)} className="btn btn-secondary btn-sm flex-1"><FiEdit2 className="h-3.5 w-3.5" /> Chỉnh sửa</button>
                  <button onClick={() => setDeleteConfirm({ type: 'chi nhánh', name: b.name, id: b.id })} className="btn btn-ghost btn-sm !min-h-[36px] !p-2 text-destructive hover:!text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold">Loại không gian</h2>
              <p className="text-sm text-muted-foreground mt-1">Các loại hình không gian làm việc toàn hệ thống (VD: Chỗ ngồi cá nhân, Phòng họp)</p>
            </div>
            <button onClick={() => openAdd('type')} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm loại</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Mã</th><th>Tên loại</th><th>Sức chứa mặc định</th><th></th></tr></thead>
              <tbody>
                {wsTypeData.map(t => (
                  <tr key={t.id}>
                    <td className="font-mono">{t.code}</td>
                    <td className="font-medium">{t.name}</td>
                    <td>{t.capacity_default} người</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit('type', t)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5"><FiEdit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setDeleteConfirm({ type: 'loại không gian', name: t.name, id: t.id })} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive"><FiTrash2 className="h-3.5 w-3.5" /></button>
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
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); setSlideOpen(false); }}>
          <div><label className="text-sm font-medium block mb-1.5">Tên chi nhánh *</label><input className="input-field" placeholder="VD: WorkHub Quận 3" defaultValue={(editItem as Branch)?.name || ''} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Mã chi nhánh *</label><input className="input-field font-mono uppercase" placeholder="VD: WH-Q3" defaultValue={(editItem as Branch)?.code || ''} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Địa chỉ *</label><textarea className="input-field !min-h-[80px]" placeholder="Nhập địa chỉ đầy đủ..." defaultValue={(editItem as Branch)?.address || ''} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1.5">Thành phố</label><input className="input-field" placeholder="TP.HCM" defaultValue={(editItem as Branch)?.city || ''} /></div>
            <div><label className="text-sm font-medium block mb-1.5">Múi giờ</label>
              <select className="input-field" defaultValue={(editItem as Branch)?.timezone || 'Asia/Ho_Chi_Minh'}>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                <option value="Asia/Bangkok">Asia/Bangkok</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="text-sm font-medium">Trạng thái</label>
            <div className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked={(editItem as Branch)?.status === 'active'} />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="submit" className="btn btn-primary btn-sm flex-1"><FiCheck className="h-4 w-4" /> {editItem ? 'Cập nhật' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setSlideOpen(false)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </form>
      </SlideOver>

      {/* ── Slide-over: Workspace Type Form ── */}
      <SlideOver open={slideOpen && slideMode === 'type'} onClose={() => setSlideOpen(false)} title={editItem ? 'Chỉnh sửa loại không gian' : 'Thêm loại không gian'}>
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); setSlideOpen(false); }}>
          <div><label className="text-sm font-medium block mb-1.5">Mã loại *</label><input className="input-field font-mono" placeholder="VD: phone_booth" defaultValue={(editItem as WorkspaceType)?.code || ''} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Tên loại *</label><input className="input-field" placeholder="VD: Chỗ ngồi cá nhân, Phòng họp" defaultValue={(editItem as WorkspaceType)?.name || ''} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Sức chứa mặc định</label><input type="number" className="input-field" placeholder="1" defaultValue={(editItem as WorkspaceType)?.capacity_default || ''} /></div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <button type="submit" className="btn btn-primary btn-sm flex-1"><FiCheck className="h-4 w-4" /> {editItem ? 'Cập nhật' : 'Tạo mới'}</button>
            <button type="button" onClick={() => setSlideOpen(false)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </form>
      </SlideOver>

      {/* ── Delete Confirmation with constraint check ── */}
      {deleteConfirm && (() => {
        const hasRelatedData = deleteConfirm.type === 'chi nhánh' &&
          (getFloorsByBranch(deleteConfirm.id).length > 0);
        return hasRelatedData ? (
          <>
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center"><FiAlertTriangle className="h-5 w-5 text-destructive" /></div>
                <h3 className="font-bold text-lg">Không thể xóa</h3>
              </div>
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-4">
                <p className="text-sm text-destructive font-semibold">Ràng buộc dữ liệu!</p>
                <p className="text-sm text-destructive/80 mt-1">Chi nhánh "{deleteConfirm.name}" vẫn còn tầng, workspace hoặc booking liên quan. Vui lòng xóa dữ liệu liên quan trước.</p>
              </div>
              <div className="flex justify-end"><button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Đóng</button></div>
            </div>
          </>
        ) : (
          <ConfirmDialog
            open={true}
            title={`Xóa ${deleteConfirm.type}?`}
            message={`Bạn có chắc chắn muốn xóa "${deleteConfirm.name}"? Hành động này không thể hoàn tác.`}
            onConfirm={() => setDeleteConfirm(null)}
            onCancel={() => setDeleteConfirm(null)}
          />
        );
      })()}
    </div>
  );
};

export default BranchManagementPage;
