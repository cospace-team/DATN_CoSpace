import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiCheck, FiCopy, FiEdit2, FiGift, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import {
  describePromotion,
  membershipApi,
  promotionApi,
  type MembershipTierDto,
  type PromotionDto,
  type PromotionPayload,
  type PromotionState,
} from '../../api/loyaltyApi';
import { adminBranchApi, adminWorkspaceTypeApi, type AdminBranchDto, type WorkspaceTypeResponse } from '../../lib/spaceApi';
import { formatDateTime, formatDateTimeLocal, formatVND } from '../../utils/formatters';

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl border border-border shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold font-heading">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm !min-h-[32px] !p-2"><FiX className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </>
  );
};

const STATE_META: Record<PromotionState, { label: string; badge: string }> = {
  running: { label: 'Đang chạy', badge: 'badge-success' },
  scheduled: { label: 'Sắp diễn ra', badge: 'badge-info' },
  exhausted: { label: 'Hết lượt', badge: 'badge-warning' },
  ended: { label: 'Đã kết thúc', badge: 'badge-neutral' },
  inactive: { label: 'Ngưng áp dụng', badge: 'badge-neutral' },
};

type ModalMode = { type: 'add' } | { type: 'edit'; promotion: PromotionDto } | null;
type Filter = 'all' | PromotionState;

const buildEmptyForm = () => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 30 * 86_400_000);
  return {
    code: '', name: '', description: '',
    discountType: 'percent' as 'percent' | 'fixed', discountValue: '10', maxDiscountAmount: '', minOrderAmount: '0',
    startAt: formatDateTimeLocal(start), endAt: formatDateTimeLocal(end),
    usageLimit: '', perUserLimit: '1', branchId: '', workspaceTypeId: '', minTierCode: '',
    isPublic: true, isActive: true,
  };
};

const optionalInt = (v: string): number | null => {
  const n = parseInt(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<PromotionDto[]>([]);
  const [branches, setBranches] = useState<AdminBranchDto[]>([]);
  const [workspaceTypes, setWorkspaceTypes] = useState<WorkspaceTypeResponse[]>([]);
  const [tiers, setTiers] = useState<MembershipTierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState(buildEmptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PromotionDto | null>(null);

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      const [promoList, branchList, typeList, tierList] = await Promise.all([
        promotionApi.list(),
        adminBranchApi.list(),
        adminWorkspaceTypeApi.list(),
        membershipApi.list(),
      ]);
      setPromotions(promoList);
      setBranches(branchList);
      setWorkspaceTypes(typeList);
      setTiers(tierList);
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: promotions.length };
    promotions.forEach((p) => { c[p.state] = (c[p.state] || 0) + 1; });
    return c;
  }, [promotions]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return promotions.filter((p) =>
      (filter === 'all' || p.state === filter)
      && (!q || p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)));
  }, [promotions, filter, search]);

  const openAdd = () => { setForm(buildEmptyForm()); setFormError(''); setModal({ type: 'add' }); };

  const openEdit = (p: PromotionDto) => {
    setForm({
      code: p.code, name: p.name, description: p.description || '',
      discountType: p.discountType, discountValue: String(p.discountValue),
      maxDiscountAmount: p.maxDiscountAmount ? String(p.maxDiscountAmount) : '',
      minOrderAmount: String(p.minOrderAmount),
      startAt: formatDateTimeLocal(new Date(p.startAt)), endAt: formatDateTimeLocal(new Date(p.endAt)),
      usageLimit: p.usageLimit ? String(p.usageLimit) : '', perUserLimit: p.perUserLimit ? String(p.perUserLimit) : '',
      branchId: p.branchId || '', workspaceTypeId: p.workspaceTypeId || '', minTierCode: p.minTierCode || '',
      isPublic: p.isPublic, isActive: p.isActive,
    });
    setFormError('');
    setModal({ type: 'edit', promotion: p });
  };

  const save = async () => {
    const value = parseInt(form.discountValue) || 0;
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.code.trim())) {
      setFormError('Mã khuyến mãi gồm 3-40 ký tự chữ, số, gạch ngang hoặc gạch dưới');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Tên chương trình không được để trống');
      return;
    }
    if (value <= 0 || (form.discountType === 'percent' && value > 100)) {
      setFormError(form.discountType === 'percent' ? 'Phần trăm giảm phải từ 1 đến 100' : 'Số tiền giảm phải lớn hơn 0');
      return;
    }
    if (!form.startAt || !form.endAt || new Date(form.endAt) <= new Date(form.startAt)) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }
    const payload: PromotionPayload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description,
      discountType: form.discountType,
      discountValue: value,
      maxDiscountAmount: form.discountType === 'percent' ? optionalInt(form.maxDiscountAmount) : null,
      minOrderAmount: Math.max(0, parseInt(form.minOrderAmount) || 0),
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      usageLimit: optionalInt(form.usageLimit),
      perUserLimit: optionalInt(form.perUserLimit),
      branchId: form.branchId || null,
      workspaceTypeId: form.workspaceTypeId || null,
      minTierCode: form.minTierCode || null,
      isPublic: form.isPublic,
      isActive: form.isActive,
    };
    setIsSaving(true);
    try {
      if (modal?.type === 'edit') {
        await promotionApi.update(modal.promotion.id, payload);
        showSuccess('Đã cập nhật khuyến mãi');
      } else {
        await promotionApi.create(payload);
        showSuccess('Đã tạo khuyến mãi');
      }
      setModal(null);
      await load();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await promotionApi.remove(deleteConfirm.id);
      showSuccess(res.message);
      await load();
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showSuccess(`Đã sao chép mã ${code}`);
    } catch {
      /* clipboard unavailable — nothing to do */
    }
  };

  const scopeLabel = (p: PromotionDto) =>
    [p.branchName || 'Mọi chi nhánh', p.workspaceTypeName || 'mọi loại không gian'].join(' · ');

  return (
    <div className="space-y-6 animate-fade-in relative">
      {successMsg && (
        <div className="fixed top-4 right-4 z-[70] animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl max-w-sm">
          <FiCheck className="h-5 w-5 shrink-0" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marketing</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Chương trình khuyến mãi</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Tạo mã giảm giá theo phần trăm hoặc số tiền cố định, giới hạn theo thời gian, chi nhánh, loại không gian, hạng thành viên và số lượt dùng.
            </p>
          </div>
          <button onClick={openAdd} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Tạo khuyến mãi</button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'running', 'scheduled', 'exhausted', 'ended', 'inactive'] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                {f === 'all' ? 'Tất cả' : STATE_META[f].label} ({counts[f] || 0})
              </button>
            ))}
          </div>
          <input className="input-field !w-full sm:!w-64" placeholder="Tìm theo mã hoặc tên..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-muted rounded-2xl h-14 animate-pulse" />)}</div>
          ) : visible.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FiGift className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Không có chương trình khuyến mãi nào.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã / Chương trình</th>
                  <th>Ưu đãi</th>
                  <th>Phạm vi</th>
                  <th>Thời gian</th>
                  <th>Đã dùng</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button onClick={() => copyCode(p.code)} className="font-mono font-semibold text-primary inline-flex items-center gap-1.5 hover:underline" title="Sao chép mã">
                        {p.code} <FiCopy className="h-3 w-3" />
                      </button>
                      <p className="text-sm">{p.name}</p>
                      {!p.isPublic && <p className="text-xs text-muted-foreground">Mã ẩn — khách phải tự nhập</p>}
                    </td>
                    <td className="text-sm">
                      <p className="font-semibold">{describePromotion(p, formatVND)}</p>
                      {p.minOrderAmount > 0 && <p className="text-xs text-muted-foreground">Đơn từ {formatVND(p.minOrderAmount)}</p>}
                      {p.minTierName && <p className="text-xs text-muted-foreground">Hạng {p.minTierName} trở lên</p>}
                    </td>
                    <td className="text-sm text-muted-foreground">{scopeLabel(p)}</td>
                    <td className="text-xs whitespace-nowrap">
                      <p>{formatDateTime(p.startAt)}</p>
                      <p className="text-muted-foreground">→ {formatDateTime(p.endAt)}</p>
                    </td>
                    <td className="text-sm whitespace-nowrap">
                      {p.usedCount ?? 0}{p.usageLimit ? ` / ${p.usageLimit}` : ''}
                      {p.perUserLimit && <p className="text-xs text-muted-foreground">{p.perUserLimit} lượt/khách</p>}
                    </td>
                    <td><span className={`badge ${STATE_META[p.state].badge}`}>{STATE_META[p.state].label}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5" title="Chỉnh sửa">
                          <FiEdit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(p)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive" title="Xóa">
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
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi'}>
        <div className="space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              <FiAlertCircle className="h-4 w-4 shrink-0" />{formError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="text-sm font-medium block mb-1.5">Mã khuyến mãi *</label>
              <input className="input-field font-mono uppercase" placeholder="SUMMER10" value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Tên chương trình *</label>
              <input className="input-field" placeholder="Ưu đãi mùa hè" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Mô tả</label>
            <textarea className="input-field min-h-[64px]" value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>

          <fieldset className="rounded-2xl border border-border p-4 space-y-3">
            <legend className="text-sm font-semibold px-1">Mức giảm</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">Loại</label>
                <select className="input-field" value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as 'percent' | 'fixed' }))}>
                  <option value="percent">Phần trăm (%)</option>
                  <option value="fixed">Số tiền (VND)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">{form.discountType === 'percent' ? 'Giảm (%) *' : 'Giảm (VND) *'}</label>
                <input type="number" min={1} max={form.discountType === 'percent' ? 100 : undefined}
                  step={form.discountType === 'percent' ? 1 : 1000} className="input-field" value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))} />
              </div>
              {form.discountType === 'percent' && (
                <div>
                  <label className="text-sm font-medium block mb-1.5">Giảm tối đa (VND)</label>
                  <input type="number" min={0} step={1000} className="input-field" placeholder="Không giới hạn" value={form.maxDiscountAmount}
                    onChange={(e) => setForm((p) => ({ ...p, maxDiscountAmount: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="sm:w-1/2">
              <label className="text-sm font-medium block mb-1.5">Giá trị đơn tối thiểu (VND)</label>
              <input type="number" min={0} step={10000} className="input-field" value={form.minOrderAmount}
                onChange={(e) => setForm((p) => ({ ...p, minOrderAmount: e.target.value }))} />
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-border p-4 space-y-3">
            <legend className="text-sm font-semibold px-1">Điều kiện áp dụng</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1.5">Bắt đầu *</label>
                <input type="datetime-local" className="input-field" value={form.startAt}
                  onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Kết thúc *</label>
                <input type="datetime-local" className="input-field" value={form.endAt}
                  onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Chi nhánh</label>
                <select className="input-field" value={form.branchId} onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}>
                  <option value="">Mọi chi nhánh</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Loại không gian</label>
                <select className="input-field" value={form.workspaceTypeId} onChange={(e) => setForm((p) => ({ ...p, workspaceTypeId: e.target.value }))}>
                  <option value="">Mọi loại không gian</option>
                  {workspaceTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Hạng thành viên tối thiểu</label>
                <select className="input-field" value={form.minTierCode} onChange={(e) => setForm((p) => ({ ...p, minTierCode: e.target.value }))}>
                  <option value="">Mọi khách hàng</option>
                  {tiers.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Tổng lượt</label>
                  <input type="number" min={1} className="input-field" placeholder="∞" value={form.usageLimit}
                    onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Lượt/khách</label>
                  <input type="number" min={1} className="input-field" placeholder="∞" value={form.perUserLimit}
                    onChange={(e) => setForm((p) => ({ ...p, perUserLimit: e.target.value }))} />
                </div>
              </div>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 rounded" checked={form.isPublic}
                onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} />
              Hiển thị cho khách ở trang thanh toán
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 rounded" checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Kích hoạt
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button onClick={save} disabled={isSaving} className="btn btn-primary btn-sm flex-1">
              <FiCheck className="h-4 w-4" /> {isSaving ? 'Đang lưu...' : modal?.type === 'edit' ? 'Cập nhật' : 'Tạo mới'}
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
              <h3 className="font-bold text-lg">Xóa mã {deleteConfirm.code}?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Nếu mã đã được dùng trong đơn đặt chỗ, hệ thống sẽ chỉ ngưng áp dụng để giữ lịch sử đơn hàng.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Hủy bỏ</button>
              <button onClick={confirmDelete} className="btn btn-danger btn-sm">Xác nhận</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PromotionsPage;
