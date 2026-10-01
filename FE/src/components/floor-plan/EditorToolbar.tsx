/**
 * EditorToolbar — the editor's single top bar: floor name and save state on the left, drawing
 * tools in the middle, preview and save on the right.
 */

import React from 'react';
import {
  FiSave, FiRotateCcw, FiRotateCw,
  FiPlus, FiMinus, FiMaximize2,
  FiGrid, FiTarget, FiEye,
  FiMousePointer, FiMove, FiX, FiSidebar,
} from 'react-icons/fi';
import type { FloorPlanEditorAPI } from '../../hooks/useFloorPlanEditor';

interface Props {
  editor: FloorPlanEditorAPI;
  floorName: string;
  onSave: () => void;
  saving: boolean;
  onPreview: () => void;
  onClose?: () => void;
  libraryOpen: boolean;
  onToggleLibrary: () => void;
  propertiesOpen: boolean;
  onToggleProperties: () => void;
}

const EditorToolbar: React.FC<Props> = ({
  editor,
  floorName,
  onSave,
  saving,
  onPreview,
  onClose,
  libraryOpen,
  onToggleLibrary,
  propertiesOpen,
  onToggleProperties,
}) => {
  return (
    <div className="flex h-14 items-center gap-3 px-3 border-b border-border bg-card shrink-0 select-none">
      {/* Left: close, floor name, save state */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onClose && (
          <>
            <IconBtn icon={<FiX className="h-4 w-4" />} label="Đóng trình thiết kế" onClick={onClose} />
            <Separator />
          </>
        )}
        <IconBtn
          icon={<FiSidebar className="h-4 w-4" />}
          label={libraryOpen ? 'Ẩn thư viện phần tử' : 'Hiện thư viện phần tử'}
          onClick={onToggleLibrary}
          active={libraryOpen}
        />
        <div className="min-w-0 pl-1">
          <p className="text-sm font-semibold text-foreground truncate" title={floorName}>
            {floorName}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${editor.isDirty ? 'bg-warning' : 'bg-success'}`} />
            {editor.isDirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}
          </p>
        </div>
      </div>

      {/* Center: drawing tools */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        <div className="flex items-center rounded-lg bg-muted p-0.5">
          <ToolBtn
            icon={<FiMousePointer className="h-3.5 w-3.5" />}
            label="Chọn"
            title="Chọn và kéo phần tử (V)"
            active={editor.tool === 'select'}
            onClick={() => editor.setTool('select')}
          />
          <ToolBtn
            icon={<FiMove className="h-3.5 w-3.5" />}
            label="Di chuyển"
            title="Kéo để di chuyển khung nhìn (H)"
            active={editor.tool === 'pan'}
            onClick={() => editor.setTool('pan')}
          />
        </div>

        <Separator />

        <IconBtn icon={<FiRotateCcw className="h-4 w-4" />} label="Hoàn tác (Ctrl+Z)" onClick={editor.undo} disabled={!editor.canUndo} />
        <IconBtn icon={<FiRotateCw className="h-4 w-4" />} label="Làm lại (Ctrl+Y)" onClick={editor.redo} disabled={!editor.canRedo} />

        <Separator />

        <IconBtn icon={<FiMinus className="h-4 w-4" />} label="Thu nhỏ" onClick={editor.zoomOut} />
        <button
          type="button"
          onClick={editor.zoomReset}
          className="h-8 min-w-[52px] rounded-md px-1.5 text-xs font-medium tabular-nums text-foreground hover:bg-muted transition-colors"
          title="Về 100%"
        >
          {Math.round(editor.zoom * 100)}%
        </button>
        <IconBtn icon={<FiPlus className="h-4 w-4" />} label="Phóng to" onClick={editor.zoomIn} />
        <IconBtn icon={<FiMaximize2 className="h-4 w-4" />} label="Vừa khung nhìn" onClick={editor.zoomReset} />

        <Separator />

        <IconBtn
          icon={<FiGrid className="h-4 w-4" />}
          label={editor.showGrid ? 'Ẩn lưới' : 'Hiện lưới'}
          active={editor.showGrid}
          onClick={() => editor.setShowGrid(!editor.showGrid)}
        />
        <IconBtn
          icon={<FiTarget className="h-4 w-4" />}
          label={editor.snapToGrid ? 'Tắt bắt dính lưới' : 'Bật bắt dính lưới'}
          active={editor.snapToGrid}
          onClick={() => editor.setSnapToGrid(!editor.snapToGrid)}
        />
      </div>

      {/* Right: preview, save */}
      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
        <button
          type="button"
          onClick={onPreview}
          className="h-9 px-3 rounded-lg text-sm font-medium text-foreground border border-border bg-card hover:bg-muted flex items-center gap-2 transition-colors"
        >
          <FiEye className="h-4 w-4" />
          <span className="hidden lg:inline">Xem trước</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !editor.isDirty}
          className="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 flex items-center gap-2 transition"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <FiSave className="h-4 w-4" />
          )}
          <span>{saving ? 'Đang lưu…' : 'Lưu sơ đồ'}</span>
        </button>
        <Separator />
        <IconBtn
          icon={<FiSidebar className="h-4 w-4 -scale-x-100" />}
          label={propertiesOpen ? 'Ẩn bảng thuộc tính' : 'Hiện bảng thuộc tính'}
          onClick={onToggleProperties}
          active={propertiesOpen}
        />
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const Separator: React.FC = () => <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />;

const IconBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}> = ({ icon, label, onClick, disabled, active }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={active}
    title={label}
    className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    {icon}
  </button>
);

const ToolBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, title, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
      active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default React.memo(EditorToolbar);
