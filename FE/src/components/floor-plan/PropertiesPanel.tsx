/**
 * PropertiesPanel — Right panel showing properties of the selected element.
 * Redesigned with Pro Max dark glass layout, color swatches, rotation dials,
 * seat counters, workspace linking, and keybindings matrix.
 */

import React, { useState } from 'react';
import {
  FiTrash2, FiCopy, FiLock, FiUnlock,
  FiArrowUp, FiArrowDown, FiEye, FiEyeOff,
  FiInfo, FiSliders, FiGrid, FiLink, FiChevronDown, FiChevronUp, FiPlus, FiMinus, FiCheck
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
      <div className="flex flex-col h-full bg-slate-950/95 border-l border-slate-800 text-slate-200 select-none">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <FiSliders className="h-4 w-4 text-violet-400" />
            <span>Thuộc tính</span>
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
          {/* Main Info */}
          <div className="flex flex-col items-center justify-center text-center py-8 gap-3 text-slate-400">
            <div className="w-14 h-14 rounded-3xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner mb-1 relative">
              <FiInfo className="h-6 w-6 text-violet-400" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-violet-500 animate-ping" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100 font-heading">Chưa chọn phần tử</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[210px] leading-relaxed">
                Click chọn hoặc kéo thả vật tư lên sơ đồ để tùy chỉnh thông số.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-slate-300">
              <span>{elementCount} vật tư</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-semibold">{linkedCount} đã liên kết</span>
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* Keyboard Shortcuts Cheatsheet */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Phím tắt thao tác nhanh</span>
              <span className="font-mono text-violet-400">HUD</span>
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
    <div className="flex flex-col h-full bg-slate-950/95 border-l border-slate-800 text-slate-200 select-none overflow-hidden">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shrink-0">
            {catalog?.icon || '⬜'}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-100 truncate uppercase tracking-wider font-heading">
              {catalog?.label || 'Chỉnh sửa'}
            </h3>
            <span className="text-[9px] font-mono text-slate-400 truncate block">
              ID: {element.id.substring(0, 10)}...
            </span>
          </div>
        </div>
        <span className="text-[9px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-bold">
          {element.type.toUpperCase()}
        </span>
      </div>

      {/* Quick Action Toolbar */}
      <div className="px-3.5 py-2 border-b border-slate-800/80 bg-slate-950 flex items-center gap-1 shrink-0">
        <ToolbarIconBtn
          icon={<FiCopy className="h-3.5 w-3.5" />}
          title="Nhân bản (Ctrl+D)"
          onClick={() => onDuplicate([element.id])}
        />
        <ToolbarIconBtn
          icon={element.locked ? <FiLock className="h-3.5 w-3.5 text-amber-400" /> : <FiUnlock className="h-3.5 w-3.5" />}
          title={element.locked ? 'Mở khóa' : 'Khóa element'}
          onClick={() => onUpdate(element.id, { locked: !element.locked })}
          active={element.locked}
        />
        <ToolbarIconBtn
          icon={element.visible ? <FiEye className="h-3.5 w-3.5" /> : <FiEyeOff className="h-3.5 w-3.5 text-slate-500" />}
          title={element.visible ? 'Ẩn element' : 'Hiện element'}
          onClick={() => onUpdate(element.id, { visible: !element.visible })}
          active={!element.visible}
        />
        <div className="w-px h-4 bg-slate-800 mx-1" />
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
          icon={<FiTrash2 className="h-3.5 w-3.5 text-red-400" />}
          title="Xóa element (Del)"
          onClick={() => onDelete([element.id])}
          className="ml-auto hover:bg-red-500/10 rounded-lg text-red-400"
        />
      </div>

      {/* Settings Form Scroller */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">

        {/* ── SECTION 1: THÔNG TIN CHUNG ── */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
          <SectionHeader
            title="Thông tin chung"
            open={sectionOpen.general}
            onToggle={() => toggleSection('general')}
          />
          {sectionOpen.general && (
            <div className="p-3.5 space-y-3 bg-slate-950 border-t border-slate-800/80">
              <FieldGroup label="Nhãn hiển thị">
                <input
                  type="text"
                  className="input-dark"
                  value={element.label}
                  onChange={(e) => onUpdate(element.id, { label: e.target.value })}
                  placeholder="VD: Bàn A1..."
                />
              </FieldGroup>

              {element.type !== 'wall' && element.type !== 'door' && (
                <FieldGroup label="Nhãn phụ (mô tả)">
                  <input
                    type="text"
                    className="input-dark text-xs"
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
                      className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      <FiMinus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      className="input-dark font-mono text-center font-bold text-sm flex-1"
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
                      className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800"
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
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
          <SectionHeader
            title="Vị trí & Kích thước"
            open={sectionOpen.geometry}
            onToggle={() => toggleSection('geometry')}
          />
          {sectionOpen.geometry && (
            <div className="p-3.5 space-y-3.5 bg-slate-950 border-t border-slate-800/80">
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
                    className="w-full h-1.5 accent-violet-500 bg-slate-800 rounded-full cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold tabular-nums min-w-[36px] text-right text-violet-400">
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
                          ? 'bg-violet-600/20 text-violet-400 border-violet-500/40 shadow-sm'
                          : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
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
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
          <SectionHeader
            title="Kiểu dáng & Màu sắc"
            open={sectionOpen.style}
            onToggle={() => toggleSection('style')}
          />
          {sectionOpen.style && (
            <div className="p-3.5 space-y-4 bg-slate-950 border-t border-slate-800/80">
              
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
                            ? 'border-violet-400 ring-2 ring-violet-500/30 scale-105 shadow-md'
                            : 'border-slate-800 hover:border-slate-600 hover:scale-105'
                        }`}
                        title={preset.name}
                        style={{
                          backgroundColor: preset.fill === 'transparent' ? '#0F172A' : preset.fill,
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Màu nền (Fill)
                  </label>
                  <div className="flex items-center gap-2 border border-slate-800 rounded-xl p-1.5 bg-slate-900">
                    <input
                      type="color"
                      value={rgbaToHex(element.fillColor || '#FFFFFF')}
                      onChange={(e) =>
                        onUpdate(element.id, { fillColor: e.target.value })
                      }
                      className="w-7 h-7 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono font-bold truncate text-slate-300">
                      {element.fillColor?.startsWith('#') ? element.fillColor : 'tùy chỉnh'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Viền (Stroke)
                  </label>
                  <div className="flex items-center gap-2 border border-slate-800 rounded-xl p-1.5 bg-slate-900">
                    <input
                      type="color"
                      value={rgbaToHex(element.strokeColor || '#94A3B8')}
                      onChange={(e) =>
                        onUpdate(element.id, { strokeColor: e.target.value })
                      }
                      className="w-7 h-7 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-0"
                    />
                    <span className="text-[10px] font-mono font-bold truncate text-slate-300">
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
                      className="w-full h-1.5 accent-violet-500 bg-slate-800 rounded-full cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold tabular-nums w-[28px] text-right text-slate-300">
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
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
            <SectionHeader
              title="Liên kết Workspace"
              open={sectionOpen.workspace}
              onToggle={() => toggleSection('workspace')}
            />
            {sectionOpen.workspace && (
              <div className="p-3.5 space-y-3 bg-slate-950 border-t border-slate-800/80">
                <FieldGroup label="Chọn Workspace">
                  <div className="relative">
                    <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
                    <select
                      className="input-dark pl-9 pr-3 py-1.5 text-xs appearance-none bg-slate-900 cursor-pointer text-slate-200"
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
                    <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
                      Workspace đã xóa — cần liên kết lại.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold">
                      <FiCheck className="h-4 w-4 text-emerald-400 shrink-0" />
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
    className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-900/60 transition-colors"
  >
    <span>{title}</span>
    {open ? <FiChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <FiChevronDown className="h-3.5 w-3.5 text-slate-500" />}
  </button>
);

const FieldGroup: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <input
      type="number"
      className="input-dark font-mono text-xs"
      value={Math.round(value)}
      min={min}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  </div>
);

const ShortcutRow: React.FC<{ keys: string[]; desc: string }> = ({ keys, desc }) => (
  <div className="flex items-center justify-between gap-4 text-xs">
    <span className="text-slate-400 font-medium text-[11px]">{desc}</span>
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <React.Fragment key={k}>
          {i > 0 && <span className="text-[10px] text-slate-600">+</span>}
          <kbd className="px-1.5 py-0.5 rounded-lg border border-slate-800 bg-slate-900 text-[10px] font-mono font-bold text-violet-400 shadow-sm">
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
        ? 'bg-violet-600/20 text-violet-400 border-violet-500/30 font-medium'
        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
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
