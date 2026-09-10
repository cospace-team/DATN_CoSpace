/**
 * EditorToolbar — Top toolbar with save, undo/redo, zoom, grid toggle, etc.
 * Uses the app's semantic design tokens so it follows light/dark mode like the
 * rest of the branch-admin pages, with glass panels and gradient accents.
 */

import React from 'react';
import {
  FiSave, FiRotateCcw, FiRotateCw,
  FiPlus, FiMinus, FiMaximize2,
  FiGrid, FiTarget, FiEye,
  FiMousePointer, FiMove, FiCheckCircle,
} from 'react-icons/fi';
import type { FloorPlanEditorAPI } from '../../hooks/useFloorPlanEditor';

interface Props {
  editor: FloorPlanEditorAPI;
  floorName: string;
  onSave: () => void;
  saving: boolean;
  onPreview: () => void;
}

const EditorToolbar: React.FC<Props> = ({
  editor,
  floorName,
  onSave,
  saving,
  onPreview,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5 border-b border-border bg-card/95 backdrop-blur-md shadow-sm shrink-0 overflow-x-auto select-none z-30">

      {/* Left: Floor Title & Status Badge */}
      <div className="flex items-center gap-3.5 shrink-0">
        <div className="flex items-center gap-2.5 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
          <span className="text-base leading-none">📐</span>
          <span className="text-sm font-bold text-foreground font-heading truncate max-w-[180px]" title={floorName}>
            {floorName}
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Status Badge with Micro-pulse */}
        {editor.isDirty ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-[11px] font-semibold border border-warning/30 shadow-sm animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" />
            <span>Có thay đổi chưa lưu</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-semibold border border-success/30 shadow-sm">
            <FiCheckCircle className="h-3 w-3 text-success" />
            <span>Đã đồng bộ</span>
          </div>
        )}
      </div>

      {/* Center: Tools Dock */}
      <div className="flex items-center gap-3 bg-muted/40 p-1 rounded-2xl border border-border">

        {/* Segmented Tool Switcher */}
        <div className="flex items-center bg-background/60 p-1 rounded-xl border border-border/80">
          <button
            onClick={() => editor.setTool('select')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              editor.tool === 'select'
                ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Công cụ Chọn (V)"
          >
            <FiMousePointer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chọn</span>
          </button>
          <button
            onClick={() => editor.setTool('pan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              editor.tool === 'pan'
                ? 'bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title="Công cụ Pan (H / Space)"
          >
            <FiMove className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pan</span>
          </button>
        </div>

        <Divider />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/60">
          <ToolbarBtn
            icon={<FiRotateCcw className="h-3.5 w-3.5" />}
            label="Hoàn tác"
            onClick={editor.undo}
            disabled={!editor.canUndo}
            shortcut="Ctrl+Z"
          />
          <ToolbarBtn
            icon={<FiRotateCw className="h-3.5 w-3.5" />}
            label="Làm lại"
            onClick={editor.redo}
            disabled={!editor.canRedo}
            shortcut="Ctrl+Y"
          />
        </div>

        <Divider />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/60">
          <ToolbarBtn
            icon={<FiMinus className="h-3.5 w-3.5" />}
            label="Thu nhỏ"
            onClick={editor.zoomOut}
          />
          <button
            onClick={editor.zoomReset}
            className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg hover:bg-muted transition-colors text-foreground min-w-[52px] text-center"
            title="Click để reset 100%"
          >
            {Math.round(editor.zoom * 100)}%
          </button>
          <ToolbarBtn
            icon={<FiPlus className="h-3.5 w-3.5" />}
            label="Phóng to"
            onClick={editor.zoomIn}
          />
          <ToolbarBtn
            icon={<FiMaximize2 className="h-3.5 w-3.5" />}
            label="Phóng toàn cảnh"
            onClick={editor.zoomReset}
          />
        </div>

        <Divider />

        {/* Grid & Snap Toggles */}
        <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/60">
          <ToolbarBtn
            icon={<FiGrid className="h-3.5 w-3.5" />}
            label="Lưới tọa độ"
            active={editor.showGrid}
            onClick={() => editor.setShowGrid(!editor.showGrid)}
          />
          <ToolbarBtn
            icon={<FiTarget className="h-3.5 w-3.5" />}
            label="Bắt dính lưới (Snap)"
            active={editor.snapToGrid}
            onClick={() => editor.setSnapToGrid(!editor.snapToGrid)}
          />
        </div>

      </div>

      {/* Right Actions: Preview & Save */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onPreview}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-muted border border-border text-foreground hover:bg-muted/70 flex items-center gap-2 transition-all shadow-sm active:scale-95"
        >
          <FiEye className="h-3.5 w-3.5 text-primary" />
          <span>Xem trước</span>
        </button>

        <button
          onClick={onSave}
          disabled={saving || !editor.isDirty}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
            editor.isDirty
              ? 'bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground hover:brightness-110 shadow-primary/25'
              : 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
          }`}
        >
          {saving ? (
            <span className="loading loading-spinner loading-xs h-3.5 w-3.5 animate-spin border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <FiSave className="h-3.5 w-3.5" />
          )}
          <span>{saving ? 'Đang lưu...' : 'Lưu Sơ đồ'}</span>
        </button>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const Divider: React.FC = () => (
  <div className="w-px h-4 bg-border self-center hidden md:block" />
);

const ToolbarBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  shortcut?: string;
}> = ({ icon, label, onClick, disabled, active, shortcut }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-center ${
      active
        ? 'bg-primary/15 text-primary border border-primary/30 font-medium shadow-sm'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
    title={shortcut ? `${label} (${shortcut})` : label}
  >
    {icon}
  </button>
);

export default React.memo(EditorToolbar);
