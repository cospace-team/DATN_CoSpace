import React, { useEffect, useState } from 'react';
import { FiBox, FiCheck, FiInfo } from 'react-icons/fi';
import { serviceLimitApi, type ServiceLimitDto } from '../../api/addonApi';
import { useToast } from '../Toast';
import { formatVND } from '../../utils/formatters';
import { ServiceIcon } from '../ui/ServiceIcon';

interface ServiceLimitsPanelProps {
  branchId: string;
}

/**
 * How many of each extra service a branch can lend at the same time — e.g. it owns 2 projectors,
 * so at most 2 bookings whose time overlaps can order one. Empty means unlimited (drinks, printing).
 */
export const ServiceLimitsPanel: React.FC<ServiceLimitsPanelProps> = ({ branchId }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ServiceLimitDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const apply = (list: ServiceLimitDto[]) => {
    setRows(list);
    setDrafts(Object.fromEntries(list.map((r) => [r.serviceKey, r.maxConcurrent == null ? '' : String(r.maxConcurrent)])));
  };

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    setError('');
    serviceLimitApi.list(branchId)
      .then(apply)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [branchId]);

  const save = async (row: ServiceLimitDto) => {
    const raw = (drafts[row.serviceKey] ?? '').trim();
    const value = raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      showToast('Số lượng phải là số nguyên từ 0 trở lên, hoặc để trống nếu không giới hạn.', 'error');
      return;
    }
    setSaving(row.serviceKey);
    try {
      apply(await serviceLimitApi.set(branchId, row.serviceKey, value));
      showToast(value === null ? `"${row.name}" không còn giới hạn số lượng.` : `Đã đặt "${row.name}": tối đa ${value} cùng lúc.`, 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="bg-card rounded-2xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FiBox className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Số lượng tại cơ sở</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Với thiết bị có hạn như máy chiếu, nhập số cái cơ sở đang có. Khách chỉ đặt được khi khung giờ đó còn thiết bị trống.
            Để trống nghĩa là không giới hạn.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <p className="p-5 text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Chi nhánh chưa có dịch vụ nào đang bật.</p>
      ) : (
        <>
        {[
          { key: 'equipment', title: 'Thiết bị', items: rows.filter((r) => (r.serviceType || '').toLowerCase() === 'equipment') },
          { key: 'other', title: 'Dịch vụ khác (đồ uống, in ấn…)', items: rows.filter((r) => (r.serviceType || '').toLowerCase() !== 'equipment') },
        ].filter((g) => g.items.length > 0).map((group) => (
        <details key={group.key} open={group.key === 'equipment' || group.items.some((r) => r.maxConcurrent != null)} className="group border-b border-border last:border-b-0">
          <summary className="px-5 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer select-none bg-muted/30">
            {group.title} ({group.items.length})
          </summary>
        <ul className="divide-y divide-border">
          {group.items.map((row) => {
            const draft = drafts[row.serviceKey] ?? '';
            const current = row.maxConcurrent == null ? '' : String(row.maxConcurrent);
            const dirty = draft.trim() !== current;
            return (
              <li key={row.serviceKey} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ServiceIcon type={row.serviceType} name={row.name} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatVND(row.price)}/{row.unit}
                      {!row.branchOwned && <span title="Dịch vụ chung của hệ thống"> · dùng chung</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`limit-${row.serviceKey}`}>Số lượng {row.name}</label>
                  <input
                    id={`limit-${row.serviceKey}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Không giới hạn"
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.serviceKey]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && dirty) void save(row); }}
                    className="input-field w-36 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void save(row)}
                    disabled={!dirty || saving === row.serviceKey}
                    className="btn btn-primary btn-sm disabled:opacity-40"
                  >
                    <FiCheck className="h-3.5 w-3.5" /> {saving === row.serviceKey ? 'Đang lưu…' : 'Lưu'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        </details>
        ))}
        </>
      )}
      <p className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
        <FiInfo className="h-3.5 w-3.5 shrink-0" /> Đặt 0 để tạm ngừng cho mượn mà vẫn giữ dịch vụ trong danh mục.
      </p>
    </section>
  );
};
