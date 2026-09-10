import React, { useState, useEffect } from 'react';
import { FiShield, FiPlus, FiX, FiCheck, FiGlobe, FiMapPin, FiAlertCircle, FiEdit2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { staffApi, type CancellationPolicyDto } from '../../api/staffApi';


const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
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

const RULE_TYPE_LABEL: Record<string, string> = {
  GRACE_HOURS: 'Trong vòng N giờ đầu',
  BEFORE_START_DAYS: 'Trước N ngày',
};


const BAPoliciesPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [allPolicies, setAllPolicies] = useState<CancellationPolicyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await staffApi.getCancellationPolicies(branchId);
        setAllPolicies(data);
      } catch (e: any) {
        setApiError(e.message || 'Không thể tải chính sách.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [branchId]);

  type ModalMode = { type: 'add' } | { type: 'edit'; policy: CancellationPolicyDto } | null;
  const [modal, setModal] = useState<ModalMode>(null);
  const emptyForm = { name: '', rule_type: 'GRACE_HOURS' as string, min_value: '0', max_value: '1', refund_percent: '100' };
  const [form, setForm] = useState(emptyForm);

  const localPolicies = allPolicies.filter(p => p.branchId === branchId && p.isActive);
  const globalPolicies = allPolicies.filter(p => !p.branchId && p.isActive);
  const effectivePolicies = [
    ...localPolicies.map(p => ({ ...p, source: 'branch' as const })),
    ...globalPolicies.map(p => ({ ...p, source: 'global' as const })),
  ];

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
        // The backend replaces every field from this payload (not a partial patch), so send the
        // full record — priority/branchId carried over unchanged from the policy being edited.
        const updated = await staffApi.updateCancellationPolicy(modal.policy.id, {
          ...shared,
          branchId: modal.policy.branchId,
          priority: modal.policy.priority ?? 100,
        });
        setAllPolicies(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await staffApi.createCancellationPolicy({ ...shared, branchId });
        setAllPolicies(prev => [...prev, created]);
      }
      setModal(null);
      setForm(emptyForm);
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi lưu chính sách.');
    }
  };

  const deactivatePolicy = async (id: string) => {
    try {
      await staffApi.deleteCancellationPolicy(id);
      setAllPolicies(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      setApiError(e.message || 'Lỗi khi xóa chính sách.');
    }
  };

  const refundColor = (pct: number) =>
    pct === 100 ? 'text-success' :
    pct >= 50 ? 'text-warning' :
    'text-destructive';


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-1">Chính sách hủy</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              Thêm chính sách riêng cho chi nhánh. Chính sách chi nhánh được ưu tiên hơn mặc định.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <FiPlus className="h-4 w-4" /> Thêm chính sách
          </button>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <FiMapPin className="h-3.5 w-3.5 text-primary" />
          <span className="px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium">Ghi đè chi nhánh</span>
        </span>
        <span className="flex items-center gap-1.5">
          <FiGlobe className="h-3.5 w-3.5" />
          <span className="px-2 py-0.5 rounded-full border border-border bg-muted font-medium">Mặc định hệ thống</span>
        </span>
      </div>

      {/* Policy list */}
      {isLoading ? (
        <div className="bg-card rounded-3xl border border-border p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên chính sách</th>
                <th>Loại quy tắc</th>
                <th>Khoảng giá trị</th>
                <th className="text-center">Hoàn tiền</th>
                <th className="text-center">Nguồn</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {effectivePolicies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <FiAlertCircle className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    Chưa có chính sách nào.
                  </td>
                </tr>
              ) : (
                effectivePolicies.map((p) => (
                  <tr key={`${p.id}-${p.source}`}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-muted-foreground">{RULE_TYPE_LABEL[p.ruleType]}</td>
                    <td className="font-mono text-sm">{p.minValue} → {p.maxValue}</td>
                    <td className="text-center">
                      <span className={`font-bold text-sm ${refundColor(p.refundPercent)}`}>
                        {p.refundPercent}%
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.source === 'branch'
                          ? 'border border-primary/30 bg-primary/10 text-primary'
                          : 'border border-border bg-muted text-muted-foreground'
                      }`}>
                        {p.source === 'branch' ? <FiMapPin className="h-2.5 w-2.5" /> : <FiGlobe className="h-2.5 w-2.5" />}
                        {p.source === 'branch' ? 'Chi nhánh' : 'Hệ thống'}
                      </span>
                    </td>
                    <td className="text-right">
                      {p.source === 'branch' && (
                        <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn btn-ghost btn-sm p-1 hover:bg-primary/10 hover:text-primary"
                          onClick={() => openEdit(p)}
                          title="Chỉnh sửa chính sách"
                        >
                          <FiEdit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm p-1 text-destructive hover:bg-destructive/10"
                          onClick={() => deactivatePolicy(p.id)}
                          title="Xóa chính sách chi nhánh"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground rounded-lg border border-border bg-muted/50 p-4">
        <FiShield className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <p>Chính sách hệ thống không thể xóa từ đây. Liên hệ Super Admin để thay đổi chính sách mặc định.</p>
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <Modal title={modal.type === 'add' ? 'Thêm chính sách hủy' : 'Chỉnh sửa chính sách hủy'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {apiError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
                <FiAlertCircle className="h-4 w-4 shrink-0" />{apiError}
              </div>
            )}
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
                <option value="GRACE_HOURS">Trong vòng N giờ đầu</option>
                <option value="BEFORE_START_DAYS">Trước N ngày bắt đầu</option>
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
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Hủy</button>
              <button className="btn btn-primary btn-sm" onClick={savePolicy} disabled={!form.name.trim()}>
                <FiCheck className="h-3.5 w-3.5" /> Lưu
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BAPoliciesPage;
