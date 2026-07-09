/**
 * EditorToolbar — Top toolbar with save, undo/redo, zoom, grid toggle, etc.
 * Features a modern polished design, segmented controls, status indicators, and keyboard shortcuts.
 */

import React from 'react';
import {
  FiSave, FiRotateCcw, FiRotateCw,
  FiPlus, FiMinus, FiMaximize2,
  FiGrid, FiTarget, FiEye,
  FiMousePointer, FiMove, FiCheck, FiAlertCircle
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
    <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-card shadow-sm shrink-0 overflow-x-auto select-none">
      
      {/* Left: Floor Name & Save Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="ruler">📐</span>
          <span className="text-sm font-bold text-foreground font-heading truncate max-w-[160px]" title={floorName}>
            {floorName}
          </span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        {/* Elegant Save Status Badge */}
        {editor.isDirty ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Có thay đổi chưa lưu
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Đã lưu
          </div>
        )}
      </div>

      {/* Middle: Canvas Tools & Settings */}
      <div className="flex items-center gap-4">
        
        {/* Tool selector (Segmented Control style) */}
        <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border/40 shrink-0">
          <button
            onClick={() => editor.setTool('select')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              editor.tool === 'select'
                ? 'bg-card text-primary shadow-sm border border-border/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Công cụ Chọn (V)"
          >
            <FiMousePointer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Chọn</span>
          </button>
          <button
            onClick={() => editor.setTool('pan')}
            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              editor.tool === 'pan'
                ? 'bg-card text-primary shadow-sm border border-border/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Công cụ Di chuyển (H)"
          >
            <FiMove className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pan</span>
          </button>
        </div>

        <Divider />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 bg-muted/20 p-0.5 rounded-lg border border-border/20 shrink-0">
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
        <div className="flex items-center gap-1 bg-muted/20 px-1 py-0.5 rounded-lg border border-border/20 shrink-0">
          <ToolbarBtn
            icon={<FiMinus className="h-3.5 w-3.5" />}
            label="Thu nhỏ"
            onClick={editor.zoomOut}
          />
          <button
            onClick={editor.zoomReset}
            className="text-xs font-mono font-bold px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground min-w-[48px] text-center"
            title="Reset Zoom"
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

        {/* Grid & Snapping toggles */}
        <div className="flex items-center gap-0.5 bg-muted/20 p-0.5 rounded-lg border border-border/20 shrink-0">
          <ToolbarBtn
            icon={<FiGrid className="h-3.5 w-3.5" />}
            label="Hiện lưới tọa độ"
            active={editor.showGrid}
            onClick={() => editor.setShowGrid(!editor.showGrid)}
          />
          <ToolbarBtn
            icon={<FiTarget className="h-3.5 w-3.5" />}
            label="Bắt dính vào lưới (Snap)"
            active={editor.snapToGrid}
            onClick={() => editor.setSnapToGrid(!editor.snapToGrid)}
          />
        </div>

      </div>

      {/* Right: Preview & Save */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onPreview}
          className="btn btn-secondary btn-sm flex items-center gap-1.5 border border-border hover:border-primary/50 text-xs shadow-sm"
        >
          <FiEye className="h-3.5 w-3.5" />
          <span>Xem trước</span>
        </button>

        <button
          onClick={onSave}
          disabled={saving || !editor.isDirty}
          className={`btn btn-sm flex items-center gap-1.5 shadow-sm text-xs transition-all ${
            editor.isDirty
              ? 'btn-primary'
              : 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
          }`}
        >
          {saving ? (
            <span className="loading loading-spinner loading-xs h-3.5 w-3.5 animate-spin border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <FiSave className="h-3.5 w-3.5" />
          )}
          <span>{saving ? 'Đang lưu...' : 'Lưu Sơ đồ'}</span>
        </button>
      </div>
    </div>
  );
};

/* ─── Sub-components ─── */

const Divider: React.FC = () => (
  <div className="w-px h-5 bg-border/80 self-center hidden md:block" />
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
    className={`p-1.5 rounded-lg text-xs transition-all border border-transparent ${
      active
        ? 'bg-primary/10 text-primary border-primary/20 font-medium'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    title={shortcut ? `${label} (${shortcut})` : label}
  >
    {icon}
  </button>
);

export default React.memo(EditorToolbar);
