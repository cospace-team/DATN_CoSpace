/**
 * PropertiesPanel — Right panel showing properties of the selected element.
 * Theme-aware (light/dark) glass layout with color swatches, rotation dials,
 * seat counters, workspace linking, and keybindings matrix.
 */

import React, { useState } from 'react';
import {
  FiTrash2, FiCopy, FiLock, FiUnlock,
  FiArrowUp, FiArrowDown, FiEye, FiEyeOff,
  FiInfo, FiSliders, FiLink, FiChevronDown, FiChevronUp, FiPlus, FiMinus, FiCheck
} from 'react-icons/fi';
import type { LayoutElement } from '../../types/floorPlan';
import type { WorkspaceResponse } from '../../lib/spaceApi';
import { ELEMENT_CATALOG } from '../../data/elementCatalog';

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

// Gorgeous Curated Color Presets
const COLOR_PRESETS = [
  { name: 'Xanh lá (Desk)', fill: 'rgba(34,197,94,0.15)', stroke: '#22C55E' },
  { name: 'Xanh dương (Chair)', fill: 'rgba(59,130,246,0.15)', stroke: '#3B82F6' },
  { name: 'Tím (Office)', fill: 'rgba(139,92,246,0.15)', stroke: '#8B5CF6' },
  { name: 'Cam (Lounge)', fill: 'rgba(251,146,60,0.15)', stroke: '#FB923C' },
  { name: 'Vàng (Pantry)', fill: 'rgba(251,191,36,0.15)', stroke: '#FBBF24' },
  { name: 'Cyan (Meeting)', fill: 'rgba(6,182,212,0.15)', stroke: '#06B6D4' },
  { name: 'Xám (Wall)', fill: '#334155', stroke: '#64748B' },
  { name: 'Trong suốt', fill: 'transparent', stroke: '#475569' },
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
  // Collapsible section states
  const [sectionOpen, setSectionOpen] = useState({
    general: true,
    geometry: true,
    style: true,
    workspace: true,
  });

  const toggleSection = (sec: keyof typeof sectionOpen) => {
    setSectionOpen((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  /* ── EMPTY STATE (No Selection) ── */
  if (!element) {
    return (
      <div className="flex flex-col h-full bg-card border-l border-border text-foreground select-none">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FiSliders className="h-4 w-4 text-primary" />
            <span>Thuộc tính</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
          {/* Main Info */}
          <div className="flex flex-col items-center justify-center text-center py-8 gap-3 text-muted-foreground">
            <div className="w-14 h-14 rounded-3xl bg-muted flex items-center justify-center border border-border shadow-inner mb-1 relative">
              <FiInfo className="h-6 w-6 text-primary" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground font-heading">Chưa chọn phần tử</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[210px] leading-relaxed">
                Click chọn hoặc kéo thả vật tư lên sơ đồ để tùy chỉnh thông số.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] bg-muted border border-border px-3 py-1.5 rounded-xl font-mono text-foreground">
              <span>{elementCount} vật tư</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-success font-semibold">{linkedCount} đã liên kết</span>
            </div>
          </div>

          <hr className="border-border" />

          {/* Keyboard Shortcuts Cheatsheet */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Phím tắt thao tác nhanh</span>
              <span className="font-mono text-primary">HUD</span>
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <ShortcutRow keys={['Del', 'Backspace']} desc="Xóa phần tử" />
              <ShortcutRow keys={['Ctrl', 'D']} desc="Nhân bản (Duplicate)" />
              <ShortcutRow keys={['Ctrl', 'Z']} desc="Hoàn tác (Undo)" />
              <ShortcutRow keys={['Ctrl', 'Y']} desc="Làm lại (Redo)" />
              <ShortcutRow keys={['Ctrl', 'A']} desc="Chọn tất cả" />
              <ShortcutRow keys={['Esc']} desc="Hủy lựa chọn" />
              <ShortcutRow keys={['Arrows']} desc="Nudge di chuyển (1px)" />
              <ShortcutRow keys={['Shift', 'Arrows']} desc="Nudge nhanh (10px)" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── ELEMENT SELECTED STATE ── */
  const catalog = ELEMENT_CATALOG.find((c) => c.type === element.type);
  const canLink = catalog?.canLinkWorkspace ?? false;

  // Find all workspace IDs that are currently linked to any element in the layout
  const linkedWorkspaceIds = elements
    .map((el) => el.workspaceId)
    .filter(Boolean) as string[];

  // Filter workspaces not linked, or linked to this specific element
  const availableWs = workspaces.filter(
    (ws) => !linkedWorkspaceIds.includes(ws.id) || ws.id === element.workspaceId
  );

  return (
    <div className="flex flex-col h-full bg-card border-l border-border text-foreground select-none overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-lg shrink-0">
            {catalog?.icon || '⬜'}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-foreground truncate uppercase tracking-wider font-heading">
              {catalog?.label || 'Chỉnh sửa'}
            </h3>
            <span className="text-[9px] font-mono text-muted-foreground truncate block">
              ID: {element.id.substring(0, 10)}...
            </span>
          </div>
        </div>
        <span className="text-[9px] font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
          {element.type.toUpperCase()}
        </span>
      </div>

      {/* Quick Action Toolbar */}
      <div className="px-3.5 py-2 border-b border-border bg-card flex items-center gap-1 shrink-0">
        <ToolbarIconBtn
          icon={<FiCopy className="h-3.5 w-3.5" />}
          title="Nhân bản (Ctrl+D)"
          onClick={() => onDuplicate([element.id])}
        />
        <ToolbarIconBtn
          icon={element.locked ? <FiLock className="h-3.5 w-3.5 text-warning" /> : <FiUnlock className="h-3.5 w-3.5" />}
          title={element.locked ? 'Mở khóa' : 'Khóa element'}
          onClick={() => onUpdate(element.id, { locked: !element.locked })}
          active={element.locked}
        />
        <ToolbarIconBtn
          icon={element.visible ? <FiEye className="h-3.5 w-3.5" /> : <FiEyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
          title={element.visible ? 'Ẩn element' : 'Hiện element'}
          onClick={() => onUpdate(element.id, { visible: !element.visible })}
          active={!element.visible}
        />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarIconBtn
          icon={<FiArrowUp className="h-3.5 w-3.5" />}
          title="Đưa lên trên cùng"
          onClick={() => onBringToFront(element.id)}
        />
        <ToolbarIconBtn
          icon={<FiArrowDown className="h-3.5 w-3.5" />}
          title="Đưa xuống dưới cùng"
          onClick={() => onSendToBack(element.id)}
        />
        <ToolbarIconBtn
          icon={<FiTrash2 className="h-3.5 w-3.5 text-destructive" />}
          title="Xóa element (Del)"
          onClick={() => onDelete([element.id])}
          className="ml-auto hover:bg-destructive/10 rounded-lg text-destructive"
        />
      </div>

      {/* Settings Form Scroller */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">

        {/* ── SECTION 1: THÔNG TIN CHUNG ── */}
        <div className="border border-border rounded-2xl overflow-hidden bg-muted/20">
          <SectionHeader
            title="Thông tin chung"
            open={sectionOpen.general}
            onToggle={() => toggleSection('general')}
          />
          {sectionOpen.general && (
            <div className="p-3.5 space-y-3 bg-card border-t border-border">
              <FieldGroup label="Nhãn hiển thị">
                <input
                  type="text"
                  className="input-field-custom"
                  value={element.label}
                  onChange={(e) => onUpdate(element.id, { label: e.target.value })}
                  placeholder="VD: Bàn A1..."
                />
              </FieldGroup>

              {element.type !== 'wall' && element.type !== 'door' && (
                <FieldGroup label="Nhãn phụ (mô tả)">
                  <input
                    type="text"
                    className="input-field-custom"
                    value={element.sublabel || ''}
                    onChange={(e) =>
                      onUpdate(element.id, { sublabel: e.target.value || undefined })
                    }
                    placeholder="VD: KHU VỰC YÊN TĨNH..."
                  />
                </FieldGroup>
              )}

              {(element.type === 'meeting_room' || element.type === 'private_office') && (
                <FieldGroup label="Số lượng ghế">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdate(element.id, { seatCount: Math.max(1, (element.seatCount || 1) - 1) })}
                      className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <FiMinus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      className="input-field-custom font-mono text-center font-bold text-sm flex-1"
                      value={element.seatCount ?? (element.type === 'meeting_room' ? 6 : 2)}
                      min={1}
                      max={32}
                      onChange={(e) =>
                        onUpdate(element.id, { seatCount: Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => onUpdate(element.id, { seatCount: Math.min(32, (element.seatCount || 1) + 1) })}
                      className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    >
                      <FiPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </FieldGroup>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2: KÍCH THƯỚC & VỊ TRÍ ── */}
        <div className="border border-border rounded-2xl overflow-hidden bg-muted/20">
          <SectionHeader
            title="Vị trí & Kích thước"
            open={sectionOpen.geometry}
            onToggle={() => toggleSection('geometry')}
          />
          {sectionOpen.geometry && (
            <div className="p-3.5 space-y-3.5 bg-card border-t border-border">
              {/* Coordinates Grid */}
              <div className="grid grid-cols-2 gap-2">
                <NumberInputGroup
                  label="X (Ngang)"
                  value={element.x}
                  onChange={(v) => onUpdate(element.id, { x: v })}
                />
                <NumberInputGroup
                  label="Y (Dọc)"
                  value={element.y}
                  onChange={(v) => onUpdate(element.id, { y: v })}
                />
                <NumberInputGroup
                  label="W (Rộng)"
                  value={element.width}
                  min={10}
                  onChange={(v) => onUpdate(element.id, { width: Math.max(10, v) })}
                />
                <NumberInputGroup
                  label="H (Cao)"
                  value={element.height}
                  min={10}
                  onChange={(v) => onUpdate(element.id, { height: Math.max(10, v) })}
                />
              </div>

              {/* Angle / Rotation */}
              <FieldGroup label="Góc xoay">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={15}
                    value={element.rotation}
                    onChange={(e) =>
                      onUpdate(element.id, { rotation: Number(e.target.value) })
                    }
                    className="w-full h-1.5 accent-primary bg-muted rounded-full cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold tabular-nums min-w-[36px] text-right text-primary">
                    {element.rotation}°
                  </span>
                </div>

                {/* Instant Angle Presets */}
                <div className="flex gap-1.5 mt-2">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => onUpdate(element.id, { rotation: deg })}
                      className={`flex-1 py-1 rounded-xl border text-[10px] font-mono font-bold transition-all ${
                        element.rotation === deg
                          ? 'bg-primary/15 text-primary border-primary/40 shadow-sm'
                          : 'bg-muted border-border hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </FieldGroup>
            </div>
          )}
        </div>

        {/* ── SECTION 3: MÀU SẮC & KIỂU DÁNG ── */}
        <div className="border border-border rounded-2xl overflow-hidden bg-muted/20">
          <SectionHeader
            title="Kiểu dáng & Màu sắc"
            open={sectionOpen.style}
            onToggle={() => toggleSection('style')}
          />
          {sectionOpen.style && (
            <div className="p-3.5 space-y-4 bg-card border-t border-border">

              {/* Presets Swatches */}
              <FieldGroup label="Mẫu phối màu sẵn">
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isCurrent =
                      element.fillColor === preset.fill &&
                      element.strokeColor === preset.stroke;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          onUpdate(element.id, {
                            fillColor: preset.fill,
                            strokeColor: preset.stroke,
                          })
                        }
                        className={`h-8 rounded-xl border flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'border-primary ring-2 ring-primary/30 scale-105 shadow-md'
                            : 'border-border hover:border-muted-foreground/50 hover:scale-105'
                        }`}
                        title={preset.name}
                        style={{
                          backgroundColor: preset.fill === 'transparent' ? 'hsl(var(--card))' : preset.fill,
                          borderColor: preset.stroke,
                        }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: preset.stroke }}
                        />
                      </button>
                    );
                  })}
                </div>
              </FieldGroup>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Màu nền (Fill)
                  </label>
                  <div className="flex items-center gap-2 border border-border rounded-xl p-1.5 bg-muted/30">
                    <input
                      type="color"
                      value={rgbaToHex(element.fillColor || '#FFFFFF')}
                      onChange={(e) =>
                        onUpdate(element.id, { fillColor: e.target.value })
                      }
                      className="w-7 h-7 rounded-lg cursor-pointer border border-border bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono font-bold truncate text-foreground">
                      {element.fillColor?.startsWith('#') ? element.fillColor : 'tùy chỉnh'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Viền (Stroke)
                  </label>
                  <div className="flex items-center gap-2 border border-border rounded-xl p-1.5 bg-muted/30">
                    <input
                      type="color"
                      value={rgbaToHex(element.strokeColor || '#94A3B8')}
                      onChange={(e) =>
                        onUpdate(element.id, { strokeColor: e.target.value })
                      }
                      className="w-7 h-7 rounded-lg cursor-pointer border border-border bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono font-bold truncate text-foreground">
                      {element.strokeColor?.startsWith('#') ? element.strokeColor : 'tùy chỉnh'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Corner radius & Opacity */}
              <div className="grid grid-cols-2 gap-3">
                <NumberInputGroup
                  label="Bo góc (px)"
                  value={element.cornerRadius}
                  min={0}
                  onChange={(v) => onUpdate(element.id, { cornerRadius: Math.max(0, v) })}
                />

                <FieldGroup label="Độ mờ">
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={element.opacity ?? 1}
                      onChange={(e) =>
                        onUpdate(element.id, { opacity: Number(e.target.value) })
                      }
                      className="w-full h-1.5 accent-primary bg-muted rounded-full cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold tabular-nums w-[28px] text-right text-foreground">
                      {Math.round((element.opacity ?? 1) * 100)}%
                    </span>
                  </div>
                </FieldGroup>
              </div>

            </div>
          )}
        </div>

        {/* ── SECTION 4: GÁN WORKSPACE ── */}
        {canLink && (
          <div className="border border-border rounded-2xl overflow-hidden bg-muted/20">
            <SectionHeader
              title="Liên kết Workspace"
              open={sectionOpen.workspace}
              onToggle={() => toggleSection('workspace')}
            />
            {sectionOpen.workspace && (
              <div className="p-3.5 space-y-3 bg-card border-t border-border">
                <FieldGroup label="Chọn Workspace">
                  <div className="relative">
                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                    <select
                      className="input-field-custom pl-9 pr-3 appearance-none cursor-pointer"
                      value={element.workspaceId || ''}
                      onChange={(e) =>
                        onUpdate(element.id, {
                          workspaceId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">— Chưa gán workspace —</option>
                      {availableWs.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          [{ws.code}] {ws.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </FieldGroup>

                {element.workspaceId && (() => {
                  const isOrphan = !availableWs.some((ws) => ws.id === element.workspaceId);
                  return isOrphan ? (
                    <div className="flex items-center gap-2 p-2.5 bg-warning/10 border border-warning/30 text-warning rounded-xl text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-warning shrink-0 animate-ping" />
                      Workspace đã xóa — cần liên kết lại.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-success/10 border border-success/30 text-success rounded-xl text-xs font-semibold">
                      <FiCheck className="h-4 w-4 text-success shrink-0" />
                      Đã gán thành công vào sơ đồ.
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

/* ── Sub-components ── */

const SectionHeader: React.FC<{
  title: string;
  open: boolean;
  onToggle: () => void;
}> = ({ title, open, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/60 transition-colors"
  >
    <span>{title}</span>
    {open ? <FiChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <FiChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
  </button>
);

const FieldGroup: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
      {label}
    </label>
    {children}
  </div>
);

const NumberInputGroup: React.FC<{
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
    <input
      type="number"
      className="input-field-custom font-mono text-xs"
      value={Math.round(value)}
      min={min}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  </div>
);

const ShortcutRow: React.FC<{ keys: string[]; desc: string }> = ({ keys, desc }) => (
  <div className="flex items-center justify-between gap-4 text-xs">
    <span className="text-muted-foreground font-medium text-[11px]">{desc}</span>
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className="text-[10px] text-muted-foreground/60">+</span>}
          <kbd className="px-1.5 py-0.5 rounded-lg border border-border bg-muted text-[10px] font-mono font-bold text-primary shadow-sm">
            {k}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  </div>
);

const ToolbarIconBtn: React.FC<{
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}> = ({ icon, title, onClick, active, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1.5 rounded-lg border border-transparent transition-all duration-150 ${
      active
        ? 'bg-primary/15 text-primary border-primary/30 font-medium'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    } ${className || ''}`}
    title={title}
  >
    {icon}
  </button>
);

/** Helper: Convert rgba(...) or named colors to hex for input[type="color"] */
function rgbaToHex(color: string): string {
  if (color.startsWith('#')) return color.slice(0, 7);
  if (color === 'transparent') return '#ffffff';

  const match = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)/
  );
  if (match) {
    const [, r, g, b] = match;
    return `#${[r, g, b].map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
  }
  return '#94a3b8';
}

export default React.memo(PropertiesPanel);
