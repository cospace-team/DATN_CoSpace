import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiShield, FiCheck, FiX, FiAlertTriangle, FiArrowRight, FiSave } from 'react-icons/fi';
import { cancellationPolicies } from '../../data/mockData';
import type { CancellationPolicy } from '../../data/mockData';

interface RuleRow {
  id: string;
  rule_type: 'GRACE_HOURS' | 'BEFORE_START_DAYS';
  min_value: number;
  max_value: number;
  refund_percent: number;
  is_active: boolean;
}

const CancellationPoliciesPage: React.FC = () => {
  const [policies] = useState<CancellationPolicy[]>(cancellationPolicies);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CancellationPolicy | null>(null);
  const [newRules, setNewRules] = useState<RuleRow[]>([]);

  const addNewRule = () => {
    setNewRules(prev => [...prev, {
      id: `new-${Date.now()}`,
      rule_type: 'GRACE_HOURS',
      min_value: 0,
      max_value: 1,
      refund_percent: 100,
      is_active: true,
    }]);
    setShowRuleBuilder(true);
  };

  const removeNewRule = (id: string) => setNewRules(prev => prev.filter(r => r.id !== id));
  const updateNewRule = (id: string, field: keyof RuleRow, value: unknown) => {
    setNewRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const ruleTypeLabel: Record<string, string> = {
    GRACE_HOURS: 'Giờ ân hạn',
    BEFORE_START_DAYS: 'Ngày trước khi bắt đầu',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chính sách hủy</p>
            <h1 className="text-xl font-bold font-heading mt-1">Quy định hủy booking & hoàn tiền</h1>
            <p className="text-sm text-muted-foreground mt-1">Quản lý các quy tắc hoàn tiền khi hủy booking theo điều kiện thời gian</p>
          </div>
          <button onClick={addNewRule} className="btn btn-primary btn-sm"><FiPlus className="h-4 w-4" /> Thêm quy tắc</button>
        </div>
      </div>

      {/* Rule Builder */}
      {(showRuleBuilder || newRules.length > 0) && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FiShield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Rule Builder</h2>
              <p className="text-xs text-muted-foreground">Thêm quy tắc mới — định nghĩa điều kiện và hành động</p>
            </div>
          </div>

          <div className="space-y-3">
            {newRules.map((rule, idx) => (
              <div key={rule.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3 group transition-all hover:border-primary/30">
                {/* Row number */}
                <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                {/* Condition */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Điều kiện</label>
                  <select value={rule.rule_type} onChange={e => updateNewRule(rule.id, 'rule_type', e.target.value)}
                    className="input-field !min-h-[36px] !py-1 !px-3 text-sm w-auto">
                    <option value="GRACE_HOURS">Giờ ân hạn</option>
                    <option value="BEFORE_START_DAYS">Ngày trước khi bắt đầu</option>
                  </select>
                </div>

                {/* Range */}
                <div className="flex items-center gap-2">
                  <input type="number" value={rule.min_value} onChange={e => updateNewRule(rule.id, 'min_value', Number(e.target.value))}
                    className="input-field !min-h-[36px] !py-1 !px-3 text-sm w-16 text-center" min={0} />
                  <span className="text-muted-foreground text-sm">→</span>
                  <input type="number" value={rule.max_value} onChange={e => updateNewRule(rule.id, 'max_value', Number(e.target.value))}
                    className="input-field !min-h-[36px] !py-1 !px-3 text-sm w-16 text-center" min={0} />
                  <span className="text-xs text-muted-foreground">{rule.rule_type === 'GRACE_HOURS' ? 'giờ' : 'ngày'}</span>
                </div>

                {/* Arrow */}
                <FiArrowRight className="h-4 w-4 text-primary shrink-0" />

                {/* Action */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Hoàn tiền</label>
                  <div className="relative">
                    <input type="number" value={rule.refund_percent} onChange={e => updateNewRule(rule.id, 'refund_percent', Number(e.target.value))}
                      className="input-field !min-h-[36px] !py-1 !pl-3 !pr-8 text-sm w-20 text-center" min={0} max={100} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => removeNewRule(rule.id)} className="btn btn-ghost btn-sm !min-h-[32px] !p-1.5 text-destructive hover:!text-destructive ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {newRules.length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
              <button onClick={addNewRule} className="btn btn-ghost btn-sm text-primary"><FiPlus className="h-4 w-4" /> Thêm quy tắc khác</button>
              <div className="flex-1" />
              <button onClick={() => { setNewRules([]); setShowRuleBuilder(false); }} className="btn btn-secondary btn-sm">Hủy bỏ</button>
              <button onClick={() => { setNewRules([]); setShowRuleBuilder(false); }} className="btn btn-primary btn-sm"><FiSave className="h-4 w-4" /> Lưu tất cả</button>
            </div>
          )}
          {newRules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nhấn "Thêm quy tắc" để bắt đầu tạo chính sách mới</p>
            </div>
          )}
        </div>
      )}

      {/* Existing Policies Table */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <FiShield className="h-4 w-4 text-primary" />
          Chính sách hiện tại
          <span className="text-xs text-muted-foreground font-normal">({policies.length} chính sách)</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Tên</th><th>Loại quy tắc</th><th>Phạm vi giá trị</th><th>Hoàn tiền</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {policies.map(cp => (
                <tr key={cp.id}>
                  <td className="font-medium">{cp.name}</td>
                  <td><span className="badge badge-info">{ruleTypeLabel[cp.rule_type]}</span></td>
                  <td>
                    <span className="font-mono text-sm">{cp.min_value}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-mono text-sm">{cp.max_value === 999 ? '∞' : cp.max_value}</span>
                    <span className="text-xs text-muted-foreground ml-1">{cp.rule_type === 'GRACE_HOURS' ? 'giờ' : 'ngày'}</span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 font-semibold text-sm ${
                      cp.refund_percent === 100 ? 'text-emerald-600 dark:text-emerald-400' :
                      cp.refund_percent === 0 ? 'text-red-600 dark:text-red-400' :
                      'text-amber-600 dark:text-amber-400'}`}>
                      {cp.refund_percent}%
                      {cp.refund_percent === 100 && <FiCheck className="h-3.5 w-3.5" />}
                      {cp.refund_percent === 0 && <FiX className="h-3.5 w-3.5" />}
                    </span>
                  </td>
                  <td><span className={`badge ${cp.is_active ? 'badge-success' : 'badge-neutral'}`}>{cp.is_active ? 'Hoạt động' : 'Tắt'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingId(cp.id)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5"><FiEdit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(cp)} className="btn btn-ghost btn-sm !min-h-[28px] !p-1.5 text-destructive hover:!text-destructive"><FiTrash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center"><FiAlertTriangle className="h-5 w-5 text-destructive" /></div>
              <h3 className="font-bold text-lg">Xóa chính sách?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Bạn có chắc muốn xóa "{deleteConfirm.name}"? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Hủy bỏ</button>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-danger btn-sm">Xác nhận xóa</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CancellationPoliciesPage;
