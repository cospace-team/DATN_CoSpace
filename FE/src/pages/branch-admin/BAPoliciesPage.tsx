import React, { useState } from 'react';
import { FiShield, FiPlus, FiX, FiCheck, FiGlobe, FiMapPin, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { cancellationPolicies as allPolicies, type CancellationPolicy } from '../../data/mockData';
import { getEffectivePolicies } from '../../utils/policyResolver';

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

const RULE_TYPE_LABEL: Record<CancellationPolicy['rule_type'], string> = {
  GRACE_HOURS: 'Trong vòng N giờ đầu',
  BEFORE_START_DAYS: 'Trước N ngày',
};

const BAPoliciesPage: React.FC = () => {
  const { user } = useAuth();
  const branchId = user!.branchId!;

  const [localPolicies, setLocalPolicies] = useState<CancellationPolicy[]>(
    allPolicies.filter((p) => p.branch_id === branchId)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    rule_type: 'GRACE_HOURS' as CancellationPolicy['rule_type'],
    min_value: '0',
    max_value: '1',
    refund_percent: '100',
  });

  const effectivePolicies = [
    ...localPolicies.map((p) => ({ ...p, source: 'branch' as const })),
    ...allPolicies
      .filter((p) => !p.branch_id && p.is_active)
      .map((p) => ({ ...p, source: 'global' as const })),
  ];

  const savePolicy = () => {
    if (!form.name.trim()) return;
    const newPolicy: CancellationPolicy = {
      id: `cp-local-${Date.now()}`,
      name: form.name,
      rule_type: form.rule_type,
      min_value: parseInt(form.min_value) || 0,
      max_value: parseInt(form.max_value) || 1,
      refund_percent: parseFloat(form.refund_percent) || 0,
      is_active: true,
      branch_id: branchId,
      workspace_type_id: null,
    };
    setLocalPolicies((prev) => [...prev, newPolicy]);
    setModalOpen(false);
    setForm({ name: '', rule_type: 'GRACE_HOURS', min_value: '0', max_value: '1', refund_percent: '100' });
  };

  const deactivatePolicy = (id: string) => {
    setLocalPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: false } : p))
    );
  };

  const refundColor = (pct: number) =>
    pct === 100 ? 'text-emerald-600 dark:text-emerald-400' :
    pct >= 50 ? 'text-amber-600 dark:text-amber-400' :
    'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quản lý chi nhánh</p>
            <h1 className="text-xl font-bold font-heading mt-1">Chính sách hủy</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Thêm chính sách riêng cho chi nhánh. Chính sách chi nhánh được ưu tiên hơn mặc định.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <FiPlus className="h-4 w-4" /> Thêm chính sách
          </button>
        </div>
      </div>

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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                    <td className="text-muted-foreground">{RULE_TYPE_LABEL[p.rule_type]}</td>
                    <td className="font-mono text-sm">{p.min_value} → {p.max_value}</td>
                    <td className="text-center">
                      <span className={`font-bold text-sm ${refundColor(p.refund_percent)}`}>
                        {p.refund_percent}%
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
                        <button
                          className="btn btn-ghost btn-sm p-1 text-destructive hover:bg-destructive/10"
                          onClick={() => deactivatePolicy(p.id)}
                          title="Xóa chính sách chi nhánh"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground rounded-lg border border-border bg-muted/50 p-4">
        <FiShield className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <p>Chính sách hệ thống không thể xóa từ đây. Liên hệ Super Admin để thay đổi chính sách mặc định.</p>
      </div>

      {/* Add modal */}
      {modalOpen && (
        <Modal title="Thêm chính sách hủy" onClose={() => setModalOpen(false)}>
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
                onChange={(e) => setForm((p) => ({ ...p, rule_type: e.target.value as CancellationPolicy['rule_type'] }))}
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
              <button className="btn btn-secondary btn-sm" onClick={() => setModalOpen(false)}>Hủy</button>
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
