/**
 * FloorPlanEditor — composes the toolbar, element library, canvas and properties panel.
 * Both side panels can be hidden from the toolbar to give the canvas the full width.
 */

import React, { useState, useCallback } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import type { FloorLayout, ElementCatalogItem, ElementType } from '../../types/floorPlan';
import type { WorkspaceResponse } from '../../lib/spaceApi';
import { useFloorPlanEditor } from '../../hooks/useFloorPlanEditor';
import EditorToolbar from './EditorToolbar';
import ElementLibrary from './ElementLibrary';
import EditorCanvas from './EditorCanvas';
import PropertiesPanel from './PropertiesPanel';
import ElementRenderer from './ElementRenderer';

interface Props {
  initialLayout: FloorLayout | null;
  floorName: string;
  workspaces: WorkspaceResponse[];
  onSave: (layout: FloorLayout) => Promise<void>;
  /** Shows a close button; the user is asked to confirm when there are unsaved changes. */
  onClose?: () => void;
}

const FloorPlanEditor: React.FC<Props> = ({
  initialLayout,
  floorName,
  workspaces,
  onSave,
  onClose,
}) => {
  const editor = useFloorPlanEditor(initialLayout);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(editor.layout);
      editor.markClean();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [editor, onSave]);

  const handleClose = useCallback(() => {
    if (!onClose) return;
    if (editor.isDirty && !window.confirm('Sơ đồ có thay đổi chưa lưu. Đóng mà không lưu?')) return;
    onClose();
  }, [editor.isDirty, onClose]);

  const handleLibraryDragStart = useCallback((_item: ElementCatalogItem) => {
    // The drop target reads the item from the drag payload; nothing else to track here.
  }, []);

  // Clicking a library item drops it in the middle of what is on screen, nudged a little for each
  // element already there so repeated clicks do not stack exactly on top of each other.
  const { layout, panOffset, addElement } = editor;
  const handleLibraryAdd = useCallback(
    (item: ElementCatalogItem) => {
      const { width, height, gridSize } = layout.canvas;
      const step = (layout.elements.length % 6) * gridSize;
      addElement(
        item.type as ElementType,
        width / 2 - panOffset.x - item.defaultWidth / 2 + step,
        height / 2 - panOffset.y - item.defaultHeight / 2 + step,
      );
    },
    [layout.canvas, layout.elements.length, panOffset, addElement],
  );

  const linkedCount = editor.layout.elements.filter((e) => e.workspaceId).length;

  if (showPreview) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex h-14 items-center gap-3 px-3 border-b border-border bg-card shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="h-9 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2"
          >
            <FiArrowLeft className="h-4 w-4" /> Quay lại chỉnh sửa
          </button>
          <span className="text-sm text-muted-foreground truncate">Xem trước · {floorName}</span>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/40 p-8">
          <div className="w-full max-w-5xl rounded-xl border border-border bg-card p-6">
            <FloorPlanPreview layout={editor.layout} workspaces={workspaces} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <EditorToolbar
        editor={editor}
        floorName={floorName}
        onSave={handleSave}
        saving={saving}
        onPreview={() => setShowPreview(true)}
        onClose={onClose ? handleClose : undefined}
        libraryOpen={libraryOpen}
        onToggleLibrary={() => setLibraryOpen((v) => !v)}
        propertiesOpen={propertiesOpen}
        onToggleProperties={() => setPropertiesOpen((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        {libraryOpen && (
          <aside className="w-60 shrink-0 border-r border-border" aria-label="Thư viện phần tử">
            <ElementLibrary onDragStart={handleLibraryDragStart} onAdd={handleLibraryAdd} />
          </aside>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" role="region" aria-label="Khung vẽ sơ đồ">
          <EditorCanvas editor={editor} />
        </div>

        {propertiesOpen && (
          <aside className="w-80 shrink-0 border-l border-border" aria-label="Thuộc tính phần tử">
            <PropertiesPanel
              element={editor.selectedElement}
              workspaces={workspaces}
              onUpdate={editor.updateElement}
              onDelete={editor.deleteElements}
              onDuplicate={editor.duplicateElements}
              onBringToFront={editor.bringToFront}
              onSendToBack={editor.sendToBack}
              elementCount={editor.layout.elements.length}
              linkedCount={linkedCount}
              elements={editor.layout.elements}
            />
          </aside>
        )}
      </div>

      {/* Status bar */}
      <div className="h-8 px-4 border-t border-border bg-card text-xs text-muted-foreground flex items-center gap-4 shrink-0 select-none">
        <span>
          <span className="font-medium text-foreground tabular-nums">{editor.layout.elements.length}</span> phần tử
        </span>
        <span>
          <span className="font-medium text-foreground tabular-nums">{linkedCount}</span> đã gán chỗ đặt
        </span>
        {editor.selectedIds.length > 1 && (
          <span>
            Đang chọn <span className="font-medium text-foreground tabular-nums">{editor.selectedIds.length}</span>
          </span>
        )}
        <span className="ml-auto tabular-nums">
          Khung {editor.layout.canvas.width} × {editor.layout.canvas.height}
        </span>
        <span>
          Lưới {editor.snapToGrid ? `${editor.layout.canvas.gridSize}px` : 'tắt'}
        </span>
      </div>
    </div>
  );
};

/* ── Read-only preview ── */

const FloorPlanPreview: React.FC<{
  layout: FloorLayout;
  workspaces: WorkspaceResponse[];
}> = ({ layout }) => {
  const { width, height } = layout.canvas;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[560px]">
      <rect width={width} height={height} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1.5} rx={8} />
      {layout.elements
        .filter((el) => el.visible)
        .map((el) => (
          <ElementRenderer key={el.id} element={el} isSelected={false} isHovered={false} />
        ))}
    </svg>
  );
};

export default React.memo(FloorPlanEditor);
