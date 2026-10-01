/**
 * PropertiesPanel — right panel: the selected element's workspace link, label, position, size
 * and style. With nothing selected it shows a summary of the plan and the keyboard shortcuts.
 */

import React from 'react';
import {
  FiTrash2, FiCopy, FiLock, FiUnlock,
  FiArrowUp, FiArrowDown, FiEye, FiEyeOff,
  FiPlus, FiMinus, FiCheck, FiAlertTriangle, FiMousePointer,
} from 'react-icons/fi';
import type { LayoutElement } from '../../types/floorPlan';
import type { WorkspaceResponse } from '../../lib/spaceApi';
import { ELEMENT_CATALOG } from '../../data/elementCatalog';
import { ElementTypeIcon } from './elementIcons';

interface Props {
  element: LayoutElement | null;
  workspaces: WorkspaceResponse[];
  onUpdate: (id: string, changes: Partial<LayoutElement>) => void;
  onDelete: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  elementCount: number;
  linkedCount: number;
  elements: LayoutElement[];
}

const COLOR_PRESETS = [
  { name: 'Xanh lá', fill: 'rgba(34,197,94,0.15)', stroke: '#22C55E' },
  { name: 'Xanh dương', fill: 'rgba(59,130,246,0.15)', stroke: '#3B82F6' },
  { name: 'Tím', fill: 'rgba(139,92,246,0.15)', stroke: '#8B5CF6' },
  { name: 'Cam', fill: 'rgba(251,146,60,0.15)', stroke: '#FB923C' },
  { name: 'Vàng', fill: 'rgba(251,191,36,0.15)', stroke: '#FBBF24' },
  { name: 'Xanh ngọc', fill: 'rgba(6,182,212,0.15)', stroke: '#06B6D4' },
  { name: 'Xám đậm', fill: '#334155', stroke: '#64748B' },
  { name: 'Trong suốt', fill: 'transparent', stroke: '#475569' },
];

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ['Del'], desc: 'Xóa phần tử' },
  { keys: ['Ctrl', 'D'], desc: 'Nhân bản' },
  { keys: ['Ctrl', 'Z'], desc: 'Hoàn tác' },
  { keys: ['Ctrl', 'Y'], desc: 'Làm lại' },
  { keys: ['Ctrl', 'A'], desc: 'Chọn tất cả' },
  { keys: ['Esc'], desc: 'Bỏ chọn' },
  { keys: ['←↑→↓'], desc: 'Dịch chuyển' },
  { keys: ['Shift', '←↑→↓'], desc: 'Dịch 10px' },
  { keys: ['Ctrl', 'Cuộn'], desc: 'Phóng to / thu nhỏ' },
];

const PropertiesPanel: React.FC<Props> = ({
  element,
  workspaces,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  elementCount,
  linkedCount,
  elements,
}) => {
  /* ── Nothing selected: plan summary + shortcuts ── */
  if (!element) {
    const linkable = elements.filter((el) => ELEMENT_CATALOG.find((c) => c.type === el.type)?.canLinkWorkspace);
    const unlinked = linkable.filter((el) => !el.workspaceId).length;
    return (
      <div className="flex flex-col h-full bg-card text-foreground select-none overflow-y-auto custom-scrollbar">
        <div className="px-4 pt-4 pb-5 border-b border-border">
          <h3 className="text-sm font-semibold">Thuộc tính</h3>
          <div className="mt-6 flex flex-col items-center text-center gap-2 text-muted-foreground">
            <FiMousePointer className="h-5 w-5" />
            <p className="text-sm text-foreground font-medium">Chưa chọn phần tử</p>
            <p className="text-xs max-w-[220px]">
              Bấm vào một phần tử trên sơ đồ để sửa tên, kích thước hoặc gán chỗ đặt.
            </p>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Sơ đồ này</h4>
          <dl className="space-y-1.5 text-sm">
            <SummaryRow label="Phần tử" value={elementCount} />
            <SummaryRow label="Đã gán chỗ đặt" value={linkedCount} />
            <SummaryRow
              label="Chỗ chưa gán"
              value={unlinked}
              tone={unlinked > 0 ? 'warning' : undefined}
            />
          </dl>
          {unlinked > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Chỗ chưa gán sẽ được tạo tự động khi lưu sơ đồ.
            </p>
          )}
        </div>

        <details className="px-4 py-3 group">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground list-none flex items-center justify-between">
            Phím tắt
            <span className="text-[10px] group-open:hidden">Hiện</span>
            <span className="text-[10px] hidden group-open:inline">Ẩn</span>
          </summary>
          <ul className="mt-3 space-y-1.5">
            {SHORTCUTS.map((s) => (
              <li key={s.desc} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{s.desc}</span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd key={k} className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    );
  }

  /* ── Element selected ── */
  const catalog = ELEMENT_CATALOG.find((c) => c.type === element.type);
  const canLink = catalog?.canLinkWorkspace ?? false;

  // A workspace can sit on only one element: offer the free ones plus this element's own.
  const linkedWorkspaceIds = elements.map((el) => el.workspaceId).filter(Boolean) as string[];
  const availableWs = workspaces.filter(
    (ws) => !linkedWorkspaceIds.includes(ws.id) || ws.id === element.workspaceId
  );
  const linkedWs = element.workspaceId ? workspaces.find((ws) => ws.id === element.workspaceId) : undefined;

  return (
    <div className="flex flex-col h-full bg-card text-foreground select-none overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
            style={element.strokeColor && element.strokeColor !== 'transparent' ? { borderColor: element.strokeColor, color: element.strokeColor } : undefined}
          >
            <ElementTypeIcon type={element.type} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{element.label || catalog?.label || 'Phần tử'}</h3>
            <p className="text-xs text-muted-foreground truncate">{catalog?.label ?? element.type}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-0.5">
          <ActionBtn icon={<FiCopy className="h-4 w-4" />} title="Nhân bản (Ctrl+D)" onClick={() => onDuplicate([element.id])} />
          <ActionBtn
            icon={element.locked ? <FiLock className="h-4 w-4" /> : <FiUnlock className="h-4 w-4" />}
            title={element.locked ? 'Mở khóa' : 'Khóa vị trí'}
            onClick={() => onUpdate(element.id, { locked: !element.locked })}
            active={element.locked}
          />
          <ActionBtn
            icon={element.visible ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
            title={element.visible ? 'Ẩn phần tử' : 'Hiện phần tử'}
            onClick={() => onUpdate(element.id, { visible: !element.visible })}
            active={!element.visible}
          />
          <ActionBtn icon={<FiArrowUp className="h-4 w-4" />} title="Đưa lên trên cùng" onClick={() => onBringToFront(element.id)} />
          <ActionBtn icon={<FiArrowDown className="h-4 w-4" />} title="Đưa xuống dưới cùng" onClick={() => onSendToBack(element.id)} />
          <button
            type="button"
            onClick={() => onDelete([element.id])}
            title="Xóa phần tử (Del)"
            aria-label="Xóa phần tử"
            className="ml-auto h-8 px-2 rounded-md flex items-center gap-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            <FiTrash2 className="h-4 w-4" /> Xóa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Workspace link: what makes the element bookable */}
        {canLink && (
          <Section title="Chỗ đặt">
            <Field label="Gán với chỗ đặt">
              <div>
                <select
                  className="input-field-custom cursor-pointer"
                  value={element.workspaceId || ''}
                  onChange={(e) => onUpdate(element.id, { workspaceId: e.target.value || null })}
                >
                  <option value="">Chưa gán</option>
                  {availableWs.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.code} · {ws.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            {element.workspaceId ? (
              linkedWs ? (
                <p className="flex items-center gap-1.5 text-xs text-success">
                  <FiCheck className="h-3.5 w-3.5 shrink-0" /> Đã gán {linkedWs.code} · {linkedWs.name}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-warning">
                  <FiAlertTriangle className="h-3.5 w-3.5 shrink-0" /> Chỗ đặt này đã bị xóa, hãy gán lại.
                </p>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Để trống: một chỗ đặt mới sẽ được tạo khi lưu.</p>
            )}
          </Section>
        )}

        <Section title="Thông tin">
          <Field label="Tên hiển thị">
            <input
              type="text"
              className="input-field-custom"
              value={element.label}
              onChange={(e) => onUpdate(element.id, { label: e.target.value })}
              placeholder="VD: Bàn A1"
            />
          </Field>
          {element.type !== 'wall' && element.type !== 'door' && (
            <Field label="Mô tả ngắn">
              <input
                type="text"
                className="input-field-custom"
                value={element.sublabel || ''}
                onChange={(e) => onUpdate(element.id, { sublabel: e.target.value || undefined })}
                placeholder="VD: Khu yên tĩnh"
              />
            </Field>
          )}
          {(element.type === 'meeting_room' || element.type === 'private_office') && (
            <Field label="Số ghế">
              <div className="flex items-center gap-1.5">
                <StepBtn
                  label="Bớt một ghế"
                  icon={<FiMinus className="h-3.5 w-3.5" />}
                  onClick={() => onUpdate(element.id, { seatCount: Math.max(1, (element.seatCount || 1) - 1) })}
                />
                <input
                  type="number"
                  className="input-field-custom text-center tabular-nums"
                  value={element.seatCount ?? (element.type === 'meeting_room' ? 6 : 2)}
                  min={1}
                  max={32}
                  onChange={(e) => onUpdate(element.id, { seatCount: Math.min(32, Math.max(1, Number(e.target.value) || 1)) })}
                />
                <StepBtn
                  label="Thêm một ghế"
                  icon={<FiPlus className="h-3.5 w-3.5" />}
                  onClick={() => onUpdate(element.id, { seatCount: Math.min(32, (element.seatCount || 1) + 1) })}
                />
              </div>
            </Field>
          )}
        </Section>

        <Section title="Vị trí & kích thước">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="X" value={element.x} onChange={(v) => onUpdate(element.id, { x: v })} />
            <NumberField label="Y" value={element.y} onChange={(v) => onUpdate(element.id, { y: v })} />
            <NumberField label="Rộng" value={element.width} min={10} onChange={(v) => onUpdate(element.id, { width: Math.max(10, v) })} />
            <NumberField label="Cao" value={element.height} min={10} onChange={(v) => onUpdate(element.id, { height: Math.max(10, v) })} />
          </div>
          <Field label={`Góc xoay · ${element.rotation}°`}>
            <input
              type="range"
              min={0}
              max={360}
              step={15}
              value={element.rotation}
              onChange={(e) => onUpdate(element.id, { rotation: Number(e.target.value) })}
              className="w-full accent-primary cursor-pointer"
              aria-label="Góc xoay"
            />
            <div className="mt-1 grid grid-cols-4 gap-1">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => onUpdate(element.id, { rotation: deg })}
                  className={`h-7 rounded-md border text-xs tabular-nums transition-colors ${
                    element.rotation === deg
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Màu sắc">
          <div className="grid grid-cols-8 gap-1.5">
            {COLOR_PRESETS.map((preset) => {
              const isCurrent = element.fillColor === preset.fill && element.strokeColor === preset.stroke;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onUpdate(element.id, { fillColor: preset.fill, strokeColor: preset.stroke })}
                  title={preset.name}
                  aria-label={`Màu ${preset.name}`}
                  aria-pressed={isCurrent}
                  className={`h-7 rounded-md border-2 ${isCurrent ? 'ring-2 ring-ring ring-offset-1 ring-offset-card' : ''}`}
                  style={{
                    backgroundColor: preset.fill === 'transparent' ? 'hsl(var(--card))' : preset.fill,
                    borderColor: preset.stroke,
                  }}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Nền" value={element.fillColor || '#FFFFFF'} fallback="#FFFFFF" onChange={(v) => onUpdate(element.id, { fillColor: v })} />
            <ColorField label="Viền" value={element.strokeColor || '#94A3B8'} fallback="#94A3B8" onChange={(v) => onUpdate(element.id, { strokeColor: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Bo góc" value={element.cornerRadius} min={0} onChange={(v) => onUpdate(element.id, { cornerRadius: Math.max(0, v) })} />
            <Field label={`Độ đậm · ${Math.round((element.opacity ?? 1) * 100)}%`}>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={element.opacity ?? 1}
                onChange={(e) => onUpdate(element.id, { opacity: Number(e.target.value) })}
                className="w-full accent-primary cursor-pointer mt-2"
                aria-label="Độ đậm"
              />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="px-4 py-4 border-b border-border space-y-3">
    <h4 className="text-xs font-semibold text-foreground">{title}</h4>
    {children}
  </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="block text-xs text-muted-foreground">{label}</label>
    {children}
  </div>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, onChange }) => (
  <label className="flex items-center gap-2 rounded-md border border-input bg-card px-2 focus-within:border-ring">
    <span className="text-xs text-muted-foreground min-w-[1.5rem] shrink-0 whitespace-nowrap">{label}</span>
    <input
      type="number"
      className="w-full h-8 bg-transparent text-xs tabular-nums text-foreground focus:outline-none"
      value={Math.round(value)}
      min={min}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  </label>
);

const ColorField: React.FC<{
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <label className="flex items-center gap-2 rounded-md border border-input bg-card px-2 h-9 cursor-pointer focus-within:border-ring">
    <input
      type="color"
      value={rgbaToHex(value)}
      onChange={(e) => onChange(e.target.value)}
      className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      aria-label={`Màu ${label.toLowerCase()}`}
    />
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="ml-auto text-[11px] tabular-nums text-foreground truncate">
      {value.startsWith('#') ? value.toUpperCase() : value === 'transparent' ? 'Trong suốt' : 'Tùy chỉnh'}
    </span>
  </label>
);

const StepBtn: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void }> = ({ label, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="h-8 w-8 shrink-0 rounded-md border border-input flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
  >
    {icon}
  </button>
);

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}> = ({ icon, title, onClick, active }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={active}
    className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    {icon}
  </button>
);

const SummaryRow: React.FC<{ label: string; value: number; tone?: 'warning' }> = ({ label, value, tone }) => (
  <div className="flex items-center justify-between">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={`font-medium tabular-nums ${tone === 'warning' ? 'text-warning' : 'text-foreground'}`}>{value}</dd>
  </div>
);

/** Converts rgba(...) or a named colour to hex for input[type="color"]. */
function rgbaToHex(color: string): string {
  if (color.startsWith('#')) return color.slice(0, 7);
  if (color === 'transparent') return '#ffffff';
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const [, r, g, b] = match;
    return `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
  }
  return '#94a3b8';
}

export default React.memo(PropertiesPanel);
