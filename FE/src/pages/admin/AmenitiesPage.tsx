import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiCheck, FiEdit2, FiGrid, FiList, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import {
  amenityApi,
  type AmenityDto,
  type WorkspaceTypeAmenitiesDto,
} from '../../api/loyaltyApi';
import { AMENITY_ICONS, AmenityIcon } from '../../components/AmenityIcon';

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-3xl border border-border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold font-heading">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm !min-h-[32px] !p-2"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </>
  );
};

type Tab = 'catalog' | 'assignment';
type ModalMode = { type: 'add' } | { type: 'edit'; amenity: AmenityDto } | null;
const emptyForm = { name: '', iconName: 'wifi', description: '', isActive: true };

const AmenitiesPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('catalog');
  const [amenities, setAmenities] = useState<AmenityDto[]>([]);
  const [typeAmenities, setTypeAmenities] = useState<WorkspaceTypeAmenitiesDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<AmenityDto | null>(null);

  // Assignment tab: selected type and its draft amenity → quantity map.
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      const [list, byType] = await Promise.all([amenityApi.list(), amenityApi.listByWorkspaceType()]);
      setAmenities(list);
      setTypeAmenities(byType);
      setSelectedTypeId((prev) => prev || byType[0]?.workspaceTypeId || '');
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedType = useMemo(
    () => typeAmenities.find((t) => t.workspaceTypeId === selectedTypeId),
    [typeAmenities, selectedTypeId],
  );

  // Reset the draft whenever the selected type (or its saved data) changes.
  useEffect(() => {
    if (!selectedType) return;
    setDraft(Object.fromEntries(selectedType.amenities.map((a) => [a.amenityId, a.quantity])));
  }, [selectedType]);

  const isDraftDirty = useMemo(() => {
    if (!selectedType) return false;
    const saved = Object.fromEntries(selectedType.amenities.map((a) => [a.amenityId, a.quantity]));
    const keys = new Set([...Object.keys(saved), ...Object.keys(draft)]);
    return [...keys].some((k) => saved[k] !== draft[k]);
  }, [selectedType, draft]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAdd = () => { setForm(emptyForm); setFormError(''); setModal({ type: 'add' }); };
  const openEdit = (a: AmenityDto) => {
    setForm({ name: a.name, iconName: a.iconName || 'star', description: a.description || '', isActive: a.isActive });
    setFormError('');
    setModal({ type: 'edit', amenity: a });
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError('Tên tiện ích không được để trống');
      return;
    }
    const payload = { name: form.name.trim(), iconName: form.iconName, description: form.description, isActive: form.isActive };
    try {
      if (modal?.type === 'edit') {
        await amenityApi.update(modal.amenity.id, payload);
        showSuccess('Đã cập nhật tiện ích');
      } else {
        await amenityApi.create(payload);
        showSuccess('Đã thêm tiện ích');
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await amenityApi.remove(deleteConfirm.id);
      showSuccess('Đã xóa tiện ích');
      await load();
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const toggleDraft = (amenityId: string, checked: boolean) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (checked) next[amenityId] = next[amenityId] || 1;
      else delete next[amenityId];
      return next;
    });
  };

  const saveAssignment = async () => {
    if (!selectedType) return;
    setIsSavingAssignment(true);
    try {
      await amenityApi.assign(
        selectedType.workspaceTypeId,
        Object.entries(draft).map(([amenityId, quantity]) => ({ amenityId, quantity: Math.max(1, quantity || 1) })),
      );
      showSuccess(`Đã lưu tiện ích cho "${selectedType.workspaceTypeName}"`);
      await load();
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setIsSavingAssignment(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheck className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quản lý tiện ích</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Tiện ích không gian</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Định nghĩa tiện ích dùng chung và gán cho từng loại không gian — mọi chỗ ngồi thuộc loại đó tự động có các tiện ích này.
            </p>
          </div>
          {tab === 'catalog' && (
            <button onClick={openAdd} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm tiện ích</button>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => setTab('catalog')} className={`btn btn-sm ${tab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}>
            <FiList className="h-4 w-4" /> Danh mục ({amenities.length})
          </button>
          <button onClick={() => setTab('assignment')} className={`btn btn-sm ${tab === 'assignment' ? 'btn-primary' : 'btn-secondary'}`}>
            <FiGrid className="h-4 w-4" /> Gán theo loại không gian
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-muted rounded-2xl h-32 animate-pulse" />)}
        </div>
      ) : tab === 'catalog' ? (
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm overflow-x-auto">
          {amenities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có tiện ích nào.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tiện ích</th>
                  <th>Mô tả</th>
                  <th>Số loại không gian</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {amenities.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <AmenityIcon name={a.iconName} className="h-5 w-5" />
                        </div>
                        <span className="font-semibold">{a.name}</span>
                      </div>
                    </td>
                    <td className="text-sm text-muted-foreground max-w-xs">{a.description || '—'}</td>
                    <td>{a.workspaceTypeCount}</td>
                    <td>
                      <span className={`badge ${a.isActive ? 'badge-success' : 'badge-neutral'}`}>
                        {a.isActive ? 'Hiển thị' : 'Ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(a)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5" title="Chỉnh sửa">
                          <FiEdit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(a)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive" title="Xóa">
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="bg-card rounded-3xl border border-border p-4 shadow-sm space-y-1 h-fit">
            {typeAmenities.map((t) => (
              <button
                key={t.workspaceTypeId}
                onClick={() => setSelectedTypeId(t.workspaceTypeId)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-colors ${
                  t.workspaceTypeId === selectedTypeId ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                }`}
              >
                <p className="font-semibold text-sm">{t.workspaceTypeName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.amenities.length} tiện ích · {t.workspaceTypeCode}</p>
              </button>
            ))}
          </div>

          {selectedType ? (
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selectedType.workspaceTypeName}</h2>
                  <p className="text-sm text-muted-foreground">Chọn tiện ích có sẵn cho loại không gian này.</p>
                </div>
                <button onClick={saveAssignment} disabled={!isDraftDirty || isSavingAssignment} className="btn btn-primary btn-sm">
                  <FiSave className="h-4 w-4" /> {isSavingAssignment ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
              {amenities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có tiện ích nào trong danh mục.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {amenities.map((a) => {
                    const checked = draft[a.id] !== undefined;
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                          checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <label className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer">
                          <input type="checkbox" className="h-4 w-4 rounded" checked={checked}
                            onChange={(e) => toggleDraft(a.id, e.target.checked)} />
                          <AmenityIcon name={a.iconName} className="h-5 w-5 text-primary shrink-0" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{a.name}</span>
                            {!a.isActive && <span className="text-xs text-muted-foreground">Đang ẩn với khách hàng</span>}
                          </span>
                        </label>
                        {checked && (
                          <input
                            type="number"
                            min={1}
                            title="Số lượng"
                            aria-label={`Số lượng ${a.name}`}
                            className="input-field !w-16 !py-1 text-sm"
                            value={draft[a.id]}
                            onChange={(e) => setDraft((prev) => ({ ...prev, [a.id]: parseInt(e.target.value) || 1 }))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có loại không gian nào.</p>
          )}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Chỉnh sửa tiện ích' : 'Thêm tiện ích'}>
        <div className="space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              <FiAlertCircle className="h-4 w-4 shrink-0" />{formError}
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1.5">Tên tiện ích *</label>
            <input className="input-field" placeholder="VD: Wi-Fi tốc độ cao" value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Biểu tượng</label>
            <div className="grid grid-cols-5 gap-2">
              {AMENITY_ICONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setForm((p) => ({ ...p, iconName: key }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] transition-colors ${
                    form.iconName === key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate w-full text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Mô tả</label>
            <textarea className="input-field min-h-[72px]" value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="amenity-active" checked={form.isActive} className="h-4 w-4 rounded"
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="amenity-active" className="text-sm font-medium">Hiển thị với khách hàng</label>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <button onClick={save} className="btn btn-primary btn-sm flex-1">
              <FiCheck className="h-4 w-4" /> {modal?.type === 'edit' ? 'Cập nhật' : 'Tạo mới'}
            </button>
            <button onClick={() => setModal(null)} className="btn btn-secondary btn-sm">Hủy</button>
          </div>
        </div>
      </Modal>

      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm bg-card rounded-3xl border border-border p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <FiAlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-bold text-lg">Xóa tiện ích?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              "{deleteConfirm.name}" sẽ bị gỡ khỏi {deleteConfirm.workspaceTypeCount} loại không gian đang dùng. Muốn tạm ẩn thay vì xóa, hãy tắt "Hiển thị với khách hàng".
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Hủy bỏ</button>
              <button onClick={confirmDelete} className="btn btn-danger btn-sm">Xác nhận xóa</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AmenitiesPage;
