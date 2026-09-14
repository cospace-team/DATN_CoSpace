import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiEdit2, FiPlus, FiX, FiCheck, FiTrash2, FiAlertCircle, FiGlobe, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { staffApi, type PricePolicyDto } from '../../api/staffApi';
import { formatVND, durationUnitLabel } from '../../utils/formatters';

// ─── Modal wrapper ────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold font-heading">{title}</h2>
        <button onClick={onClose} className="btn btn-ghost btn-sm p-1"><FiX className="h-4 w-4" /></button>
      </div>
      <div className="px-6 py-5 overflow-y-auto">{children}</div>
    </div>
  </div>
);

type ModalMode = { type: 'add' } | { type: 'edit'; policy: PricePolicyDto } | null;

const DURATION_LABELS: Record<string, string> = {
  hour: 'Giờ', day: 'Ngày', week: 'Tuần', month: 'Tháng',
};

// ─── Page Component ───────────────────────────────────────────────────────────
const BAPricingPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [isLoading, setIsLoading] = useState(true);
  const [policies, setPolicies] = useState<PricePolicyDto[]>([]);
  const [wsTypes, setWsTypes] = useState<{ id: string; name: string }[]>([]);
  const [modal, setModal] = useState<ModalMode>(null);

  const [form, setForm] = useState({
    workspace_type_id: '',
    duration_unit: 'hour',
    price: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // ─── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [pData, wData] = await Promise.all([
          staffApi.getPricePolicies(),
          staffApi.getWorkspaceTypes()
        ]);
        
        // Map names to policies for display
        const nameMap = new Map<string, string>();
        wData.forEach(w => nameMap.set(w.id, w.name));
        
        const policiesWithNames = pData.map(p => ({
          ...p,
          workspaceTypeName: p.workspaceTypeName || nameMap.get(p.workspaceTypeId) || 'Không xác định'
        }));
        
        setPolicies(policiesWithNames);
        setWsTypes(wData);
      } catch (e) {
        console.error('Failed to load pricing data', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [branchId]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAdd = () => {
    setForm({ workspace_type_id: wsTypes[0]?.id || '', duration_unit: 'hour', price: '', is_active: true });
    setErrors({});
    setModal({ type: 'add' });
  };

  const openEdit = (p: PricePolicyDto) => {
    setForm({
      workspace_type_id: p.workspaceTypeId,
      duration_unit: p.durationUnit,
      price: String(p.price),
      is_active: p.isActive,
    });
    setErrors({});
    setModal({ type: 'edit', policy: p });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.workspace_type_id) newErrors.workspace_type_id = 'Vui lòng chọn loại không gian';
    if (!form.duration_unit) newErrors.duration_unit = 'Vui lòng chọn đơn vị thời gian';
    const priceNum = parseInt(form.price.replace(/\D/g, ''));
    if (isNaN(priceNum) || priceNum < 0) newErrors.price = 'Giá phải là số hợp lệ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    const price = parseInt(form.price.replace(/\D/g, '')) || 0;
    try {
      if (modal?.type === 'add') {
        let created = await staffApi.createPricePolicy({
          workspaceTypeId: form.workspace_type_id,
          durationUnit: form.duration_unit,
          price,
        });
        created.workspaceTypeName = wsTypes.find(w => w.id === created.workspaceTypeId)?.name || 'Không xác định';
        setPolicies((prev) => [created, ...prev]);
        showSuccess('Thêm giá riêng cho chi nhánh thành công');
      } else if (modal?.type === 'edit' && modal.policy.source === 'branch') {
        let updated = await staffApi.updatePricePolicy(modal.policy.id, { price, isActive: form.is_active });
        updated.workspaceTypeName = wsTypes.find(w => w.id === updated.workspaceTypeId)?.name || 'Không xác định';
        setPolicies((prev) => prev.map((p) => p.id === modal.policy.id ? updated : p));
        showSuccess('Cập nhật mức giá thành công');
      } else if (modal?.type === 'edit' && modal.policy.source === 'global') {
        // Override global policy with a new branch-level entry
        let created = await staffApi.createPricePolicy({
          workspaceTypeId: form.workspace_type_id,
          durationUnit: form.duration_unit,
          price,
        });
        created.workspaceTypeName = wsTypes.find(w => w.id === created.workspaceTypeId)?.name || 'Không xác định';
        setPolicies((prev) => [created, ...prev]);
        showSuccess('Đã tạo mức giá ghi đè cho chi nhánh');
      }
    } catch (e: any) {
      setErrors(prev => ({ ...prev, general: e.message || 'Lỗi khi lưu mức giá.' }));
      return;
    }
    setModal(null);
  };

  const deletePolicy = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn mức giá riêng này?')) return;
    try {
      await staffApi.deletePricePolicy(id);
      setPolicies(prev => prev.filter(p => p.id !== id));
      showSuccess('Đã xóa mức giá riêng của chi nhánh');
    } catch (e: any) {
      setErrors(prev => ({ ...prev, general: e.message || 'Lỗi khi xóa.' }));
    }
  };

  const sortedPolicies = [...policies].sort((a, b) => {
    if (a.source === 'branch' && b.source !== 'branch') return -1;
    if (a.source !== 'branch' && b.source === 'branch') return 1;
    return 0;
  });

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up flex items-center gap-2 bg-success text-success-foreground px-4 py-3 rounded-xl shadow-xl">
          <FiCheck className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-2xl font-bold font-heading mt-1">Bảng giá</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">Quản lý các mức giá áp dụng tại chi nhánh của bạn.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <FiPlus className="h-4 w-4" /> Thêm giá riêng
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-2 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary font-medium flex items-center gap-1 shadow-sm">
            <FiMapPin className="h-3.5 w-3.5" /> Giá chi nhánh
          </span>
          <span className="text-muted-foreground/80">Áp dụng riêng cho chi nhánh này</span>
        </span>
        <span className="flex items-center gap-1.5 ml-4">
          <span className="px-3 py-1.5 rounded-full border border-border bg-muted text-muted-foreground font-medium flex items-center gap-1 shadow-sm">
            <FiGlobe className="h-3.5 w-3.5" /> Mặc định
          </span>
          <span className="text-muted-foreground/80">Giá chung của hệ thống</span>
        </span>
      </div>

      {/* Table */}
      {/* Table */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-lg shadow-black/5 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 bg-gradient-to-r from-muted/40 to-transparent border-b border-border/60">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <FiDollarSign className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Chi tiết bảng giá</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tất cả các chính sách giá đang hoạt động</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/20 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Loại workspace</th>
                <th className="px-6 py-4">Thời lượng</th>
                <th className="px-6 py-4">Phân loại</th>
                <th className="px-6 py-4">Giá (VND)</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="bg-card">
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} className="px-6 py-5"><div className="h-5 w-24 bg-muted/60 rounded-md animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : sortedPolicies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiDollarSign className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="text-base font-medium text-foreground mb-1">Chưa có chính sách giá nào</p>
                    <p className="text-sm mb-4">Hệ thống chưa ghi nhận bảng giá cho chi nhánh này.</p>
                    <button className="btn btn-primary shadow-md shadow-primary/20" onClick={openAdd}>
                      <FiPlus className="h-4 w-4" /> Thêm giá ngay
                    </button>
                  </td>
                </tr>
              ) : (
                sortedPolicies.map(pp => {
                  const isBranchSpecific = pp.source === 'branch';
                  const isOverridden = pp.source === 'global' && policies.some(
                    o => o.source === 'branch' && o.workspaceTypeId === pp.workspaceTypeId && o.durationUnit === pp.durationUnit
                  );

                  return (
                    <tr key={pp.id} className={`hover:bg-muted/30 transition-all duration-200 group ${isOverridden ? 'bg-muted/10 opacity-60' : 'bg-card'}`}>
                      <td className="px-6 py-4 align-middle font-semibold text-foreground max-w-[150px]">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${isBranchSpecific ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                          <span className="truncate" title={pp.workspaceTypeName}>{pp.workspaceTypeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-muted-foreground font-medium">
                        {DURATION_LABELS[pp.durationUnit] ?? pp.durationUnit}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        {isBranchSpecific ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[11px] font-bold tracking-wide shadow-sm">
                            <FiMapPin className="h-3 w-3" /> CHI NHÁNH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-muted text-muted-foreground text-[11px] font-bold tracking-wide">
                            <FiGlobe className="h-3 w-3" /> MẶC ĐỊNH
                          </span>
                        )}
                        {isOverridden && <span className="block mt-1 text-[10px] font-semibold text-destructive/80">(Bị ghi đè)</span>}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className={`font-bold text-[15px] ${isBranchSpecific ? 'text-primary' : 'text-foreground'}`}>
                          {isOverridden ? <del className="text-muted-foreground font-medium">{formatVND(pp.price)}</del> : formatVND(pp.price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle text-center">
                        <span className={`badge ${pp.isActive ? 'badge-success' : 'badge-danger'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pp.isActive ? 'bg-success' : 'bg-destructive'}`}></span>
                          {pp.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {!isOverridden && (
                            <button
                              className="p-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors focus:outline-none"
                              onClick={() => openEdit(pp)}
                              title={isBranchSpecific ? 'Chỉnh sửa' : 'Tạo giá ghi đè'}
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                          )}
                          {isBranchSpecific && (
                            <button
                              className="p-2 rounded-full hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors focus:outline-none"
                              onClick={() => deletePolicy(pp.id)}
                              title="Xóa"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <Modal
          title={modal.type === 'add' ? 'Thêm giá riêng cho chi nhánh' : (modal.policy.source === 'branch' ? 'Chỉnh sửa giá chi nhánh' : 'Tạo giá ghi đè cho chi nhánh')}
          onClose={() => setModal(null)}
        >
          <div className="space-y-5">
            {errors.general && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                <FiAlertCircle className="h-5 w-5 shrink-0" />
                <p>{errors.general}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="workspace_type_id" className="block text-sm font-medium">Loại không gian <span className="text-destructive">*</span></label>
              <select
                id="workspace_type_id"
                className={`input-field ${errors.workspace_type_id ? 'border-destructive' : ''}`}
                value={form.workspace_type_id}
                disabled={modal.type === 'edit'}
                onChange={(e) => {
                  setForm(p => ({ ...p, workspace_type_id: e.target.value }));
                  if (errors.workspace_type_id) setErrors(p => ({ ...p, workspace_type_id: '' }));
                }}
              >
                {wsTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
              </select>
              {errors.workspace_type_id && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="shrink-0" /> {errors.workspace_type_id}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="duration_unit" className="block text-sm font-medium">Thời lượng <span className="text-destructive">*</span></label>
                <select
                  id="duration_unit"
                  className="input-field"
                  value={form.duration_unit}
                  disabled={modal.type === 'edit'}
                  onChange={(e) => setForm((p) => ({ ...p, duration_unit: e.target.value }))}
                >
                  <option value="hour">Giờ</option>
                  <option value="day">Ngày</option>
                  <option value="week">Tuần</option>
                  <option value="month">Tháng</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="price" className="block text-sm font-medium">Giá mới (VND) <span className="text-destructive">*</span></label>
                <input
                  id="price"
                  type="number"
                  min={0}
                  step={1000}
                  className={`input-field ${errors.price ? 'border-destructive' : ''}`}
                  placeholder="Ví dụ: 50000"
                  value={form.price}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, price: e.target.value }));
                    if (errors.price) setErrors(p => ({ ...p, price: '' }));
                  }}
                />
                {errors.price && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="shrink-0" /> {errors.price}</p>}
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg mt-2">
              Chính sách giá này sẽ được ưu tiên áp dụng tại chi nhánh của bạn.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="price-active"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="price-active" className="text-sm cursor-pointer">Kích hoạt mức giá này</label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Hủy</button>
              <button className="btn btn-primary btn-sm" onClick={save}>
                <FiCheck className="h-4 w-4" /> Lưu giá riêng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BAPricingPage;