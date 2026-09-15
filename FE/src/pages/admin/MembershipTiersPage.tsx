import React, { useEffect, useState } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiAward, FiCheck, FiEdit2, FiInfo, FiPlus, FiRefreshCw, FiTrash2, FiUsers, FiX } from 'react-icons/fi';
import { membershipApi, type MembershipTierDto } from '../../api/loyaltyApi';
import { formatVND } from '../../utils/formatters';

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

type ModalMode = { type: 'add' } | { type: 'edit'; tier: MembershipTierDto } | null;

const emptyForm = {
  code: '', name: '', description: '', minTotalSpent: '0', minBookings: '0', discountPercent: '0',
  benefits: '', color: '#64748b', sortOrder: '0', isActive: true,
};

const describeCondition = (t: MembershipTierDto) => {
  const parts: string[] = [];
  if (t.minTotalSpent > 0) parts.push(`chi tiêu từ ${formatVND(t.minTotalSpent)}`);
  if (t.minBookings > 0) parts.push(`${t.minBookings} đơn đã thanh toán`);
  return parts.length === 0 ? 'Hạng mặc định' : parts.join(' hoặc ');
};

const MembershipTiersPage: React.FC = () => {
  const [tiers, setTiers] = useState<MembershipTierDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<MembershipTierDto | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      setTiers(await membershipApi.list());
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

  const openAdd = () => {
    const nextOrder = tiers.length ? Math.max(...tiers.map((t) => t.sortOrder)) + 1 : 0;
    setForm({ ...emptyForm, sortOrder: String(nextOrder) });
    setFormError('');
    setModal({ type: 'add' });
  };

  const openEdit = (t: MembershipTierDto) => {
    setForm({
      code: t.code, name: t.name, description: t.description || '',
      minTotalSpent: String(t.minTotalSpent), minBookings: String(t.minBookings), discountPercent: String(t.discountPercent),
      benefits: t.benefits || '', color: t.color, sortOrder: String(t.sortOrder), isActive: t.isActive,
    });
    setFormError('');
    setModal({ type: 'edit', tier: t });
  };

  const save = async () => {
    const discount = parseInt(form.discountPercent) || 0;
    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Mã hạng và tên hạng không được để trống');
      return;
    }
    if (discount < 0 || discount > 100) {
      setFormError('Phần trăm giảm giá phải từ 0 đến 100');
      return;
    }
    const payload = {
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description,
      minTotalSpent: Math.max(0, parseInt(form.minTotalSpent) || 0),
      minBookings: Math.max(0, parseInt(form.minBookings) || 0),
      discountPercent: discount,
      benefits: form.benefits,
      color: form.color,
      sortOrder: parseInt(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (modal?.type === 'edit') {
        await membershipApi.update(modal.tier.id, payload);
        showSuccess('Đã cập nhật hạng. Bấm "Tính lại hạng" để áp dụng điều kiện mới cho khách hàng.');
      } else {
        await membershipApi.create(payload);
        showSuccess('Đã thêm hạng thành viên');
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
      const res = await membershipApi.remove(deleteConfirm.id);
      showSuccess(res.message);
      await load();
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const recalculate = async () => {
    setIsRecalculating(true);
    setApiError('');
    try {
      const res = await membershipApi.recalculate();
      showSuccess(`Đã tính lại hạng cho ${res.processedUsers} khách hàng (${res.changedUsers} thay đổi)`);
      await load();
    } catch (e: any) {
      setApiError(e.message);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl max-w-sm">
          <FiCheck className="h-5 w-5 shrink-0" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chương trình khách hàng thân thiết</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Hạng thành viên</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Khách hàng tự động lên hạng theo tổng chi tiêu hoặc số đơn đã thanh toán, và được giảm giá theo hạng cho mọi đơn đặt chỗ.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={recalculate} disabled={isRecalculating} className="btn btn-secondary btn-sm">
              <FiRefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} /> Tính lại hạng
            </button>
            <button onClick={openAdd} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm hạng</button>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <FiInfo className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-semibold">Cách xét hạng</p>
          <p className="text-blue-700 dark:text-blue-400">
            Khách đạt một hạng khi <strong>tổng chi tiêu</strong> hoặc <strong>số đơn đã thanh toán</strong> chạm ngưỡng (ngưỡng bằng 0 được bỏ qua). Hạng cao nhất đạt được theo thứ tự sẽ được áp dụng. Hạng không có ngưỡng nào là hạng mặc định.
            Giảm giá theo hạng được trừ trước, sau đó mới áp dụng mã khuyến mãi.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-muted rounded-3xl h-48 animate-pulse" />)}
        </div>
      ) : tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Chưa có hạng thành viên nào.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {tiers.map((t) => (
            <div key={t.id} className={`bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col ${t.isActive ? '' : 'opacity-60'}`}>
              <div className="h-2" style={{ backgroundColor: t.color }} />
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: t.color }}>
                      <FiAward className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg leading-tight">{t.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{t.code} · thứ tự {t.sortOrder}</p>
                    </div>
                  </div>
                  {!t.isActive && <span className="badge badge-neutral">Tắt</span>}
                </div>

                <div className="rounded-2xl bg-muted/50 p-3">
                  <p className="text-3xl font-semibold" style={{ color: t.color }}>
                    {t.discountPercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">giảm giá mỗi đơn</p>
                </div>

                <p className="text-sm"><span className="text-muted-foreground">Điều kiện: </span>{describeCondition(t)}</p>
                {t.benefits && (
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                    {t.benefits.split('\n').filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                )}

                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <FiUsers className="h-4 w-4" /> {t.memberCount ?? 0} khách
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(t)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5" title="Chỉnh sửa">
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(t)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive" title="Xóa">
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Chỉnh sửa hạng thành viên' : 'Thêm hạng thành viên'}>
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              <FiAlertCircle className="h-4 w-4 shrink-0" />{formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Mã hạng *</label>
              <input className="input-field font-mono" placeholder="gold" value={form.code} disabled={modal?.type === 'edit'}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toLowerCase() }))} />
              {modal?.type === 'edit' && <p className="text-xs text-muted-foreground mt-1">Không thể đổi mã sau khi tạo</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Tên hạng *</label>
              <input className="input-field" placeholder="Gold" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Chi tiêu tối thiểu (VND)</label>
              <input type="number" min={0} step={100000} className="input-field" value={form.minTotalSpent}
                onChange={(e) => setForm((p) => ({ ...p, minTotalSpent: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Hoặc số đơn tối thiểu</label>
              <input type="number" min={0} className="input-field" value={form.minBookings}
                onChange={(e) => setForm((p) => ({ ...p, minBookings: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1.5">Giảm giá (%)</label>
              <input type="number" min={0} max={100} className="input-field" value={form.discountPercent}
                onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Thứ tự</label>
              <input type="number" className="input-field" value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Màu</label>
              <input type="color" className="input-field !p-1 h-[42px]" value={form.color}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Mô tả</label>
            <input className="input-field" value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Quyền lợi (mỗi dòng một quyền lợi)</label>
            <textarea className="input-field min-h-[80px]" value={form.benefits}
              onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="tier-active" checked={form.isActive} className="h-4 w-4 rounded"
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            <label htmlFor="tier-active" className="text-sm font-medium">Kích hoạt hạng</label>
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
              <h3 className="font-bold text-lg">Xóa hạng "{deleteConfirm.name}"?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {deleteConfirm.memberCount ?? 0} khách hàng đang ở hạng này sẽ được xếp lại vào hạng phù hợp khi tính lại hạng.
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

export default MembershipTiersPage;
