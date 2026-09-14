import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiShield, FiCheck, FiX, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import { Skeleton } from '../../components/ui/Skeleton';
import { staffApi, type CancellationPolicyDto } from '../../api/staffApi';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-bold font-heading">{title}</h2>
        <button onClick={onClose} className="btn btn-ghost btn-sm p-1"><FiX className="h-4 w-4" /></button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

const ruleTypeLabel: Record<string, string> = {
  GRACE_HOURS: 'Giờ ân hạn',
  BEFORE_START_DAYS: 'Ngày trước khi bắt đầu',
};

const emptyForm = { name: '', rule_type: 'GRACE_HOURS' as string, min_value: '0', max_value: '1', refund_percent: '100' };

const CancellationPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<CancellationPolicyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  type ModalMode = { type: 'add' } | { type: 'edit'; policy: CancellationPolicyDto } | null;
  const [modal, setModal] = useState<ModalMode>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<CancellationPolicyDto | null>(null);

  const load = async () => {
    setIsLoading(true);
    setApiError('');
    try {
      // No branchId → only system-wide (global) policies, which is what this admin page manages.
      const data = await staffApi.getCancellationPolicies();
      setPolicies(data.filter(p => !p.branchId));
    } catch (e: any) {
      setApiError(e.message || 'Không thể tải chính sách hủy.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setApiError('');
    setModal({ type: 'add' });
  };

  const openEdit = (p: CancellationPolicyDto) => {
    setForm({
      name: p.name,
      rule_type: p.ruleType,
      min_value: String(p.minValue),
      max_value: String(p.maxValue),
      refund_percent: String(p.refundPercent),
    });
    setApiError('');
    setModal({ type: 'edit', policy: p });
  };

  const savePolicy = async () => {
    if (!form.name.trim()) return;
    const shared = {
      name: form.name,
      ruleType: form.rule_type,
      minValue: parseInt(form.min_value) || 0,
      maxValue: parseInt(form.max_value) || 1,
      refundPercent: parseFloat(form.refund_percent) || 0,
      isActive: true,
    };
    try {
      if (modal?.type === 'edit') {
        const updated = await staffApi.updateCancellationPolicy(modal.policy.id, {
          ...shared,
          branchId: undefined,
          priority: modal.policy.priority ?? 100,
        });
        setPolicies(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await staffApi.createCancellationPolicy({ ...shared, branchId: undefined });
        setPolicies(prev => [...prev, created]);
      }
      setModal(null);
      setForm(emptyForm);
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi lưu chính sách hủy.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await staffApi.deleteCancellationPolicy(deleteConfirm.id);
      setPolicies(prev => prev.filter(p => p.id !== deleteConfirm.id));
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi xóa chính sách.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chính sách hủy</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Quy định hủy booking & hoàn tiền</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">Quản lý các quy tắc hoàn tiền mặc định toàn hệ thống. Chi nhánh có thể ghi đè bằng chính sách riêng.</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm quy tắc</button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      {/* Existing Policies Table */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <FiShield className="h-4 w-4 text-primary" />
          Chính sách hiện tại
          {isLoading ? (
            <Skeleton className="h-3 w-24" />
          ) : (
            <span className="text-xs text-muted-foreground font-normal">({policies.length} chính sách)</span>
          )}
        </h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Tên</th><th>Loại quy tắc</th><th>Phạm vi giá trị</th><th>Hoàn tiền</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {isLoading && [...Array(4)].map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td><Skeleton className="h-4 w-32" /></td>
                  <td><Skeleton className="h-5 w-24 rounded-full" /></td>
                  <td><Skeleton className="h-4 w-28" /></td>
                  <td><Skeleton className="h-4 w-12" /></td>
                  <td><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td><Skeleton className="h-7 w-16" /></td>
                </tr>
              ))}
              {!isLoading && policies.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <FiShield className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="font-medium">Chưa có chính sách hủy nào</p>
                  </td>
                </tr>
              )}
              {!isLoading && policies.map(cp => (
                <tr key={cp.id}>
                  <td className="font-medium">{cp.name}</td>
                  <td><span className="badge badge-info">{ruleTypeLabel[cp.ruleType] || cp.ruleType}</span></td>
                  <td>
                    <span className="font-mono text-sm">{cp.minValue}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-mono text-sm">{cp.maxValue === 999 ? '∞' : cp.maxValue}</span>
                    <span className="text-xs text-muted-foreground ml-1">{cp.ruleType === 'GRACE_HOURS' ? 'giờ' : 'ngày'}</span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 font-semibold text-sm ${
                      cp.refundPercent === 100 ? 'text-emerald-600 dark:text-emerald-400' :
                      cp.refundPercent === 0 ? 'text-red-600 dark:text-red-400' :
                      'text-amber-600 dark:text-amber-400'}`}>
                      {cp.refundPercent}%
                      {cp.refundPercent === 100 && <FiCheck className="h-3.5 w-3.5" />}
                      {cp.refundPercent === 0 && <FiX className="h-3.5 w-3.5" />}
                    </span>
                  </td>
                  <td><span className={`badge ${cp.isActive ? 'badge-success' : 'badge-neutral'}`}>{cp.isActive ? 'Hoạt động' : 'Tắt'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(cp)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5"><FiEdit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(cp)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive"><FiTrash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal.type === 'add' ? 'Thêm chính sách hủy' : 'Chỉnh sửa chính sách hủy'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Tên chính sách <span className="text-destructive">*</span></label>
              <input
                className="input-field"
                placeholder="VD: Hủy trong 2 giờ"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Loại quy tắc</label>
              <select
                className="input-field"
                value={form.rule_type}
                onChange={(e) => setForm((p) => ({ ...p, rule_type: e.target.value }))}
              >
                <option value="GRACE_HOURS">Giờ ân hạn</option>
                <option value="BEFORE_START_DAYS">Ngày trước khi bắt đầu</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Giá trị tối thiểu</label>
                <input type="number" min={0} className="input-field" value={form.min_value}
                  onChange={(e) => setForm((p) => ({ ...p, min_value: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Giá trị tối đa</label>
                <input type="number" min={0} className="input-field" value={form.max_value}
                  onChange={(e) => setForm((p) => ({ ...p, max_value: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Tỷ lệ hoàn tiền (%)</label>
              <input type="number" min={0} max={100} className="input-field" value={form.refund_percent}
                onChange={(e) => setForm((p) => ({ ...p, refund_percent: e.target.value }))} />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <button onClick={() => setModal(null)} className="btn btn-secondary btn-sm">Hủy</button>
              <button onClick={savePolicy} disabled={!form.name.trim()} className="btn btn-primary btn-sm">
                <FiCheck className="h-4 w-4" /> Lưu
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center"><FiAlertTriangle className="h-5 w-5 text-destructive" /></div>
              <h3 className="font-bold text-lg">Xóa chính sách?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Bạn có chắc muốn xóa "{deleteConfirm.name}"? Hành động này không thể hoàn tác.</p>
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

export default CancellationPoliciesPage;
