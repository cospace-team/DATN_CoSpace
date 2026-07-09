/**
 * FloorPlanEditor — Main orchestrator component.
 * Composes Toolbar + ElementLibrary + EditorCanvas + PropertiesPanel
 * into a modern 3-panel layout with collapsible side panels.
 */

import React, { useState, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { FloorLayout, ElementCatalogItem } from '../../types/floorPlan';
import type { WorkspaceResponse } from '../../lib/spaceApi';
import { useFloorPlanEditor } from '../../hooks/useFloorPlanEditor';
import EditorToolbar from './EditorToolbar';
import ElementLibrary from './ElementLibrary';
import EditorCanvas from './EditorCanvas';
import PropertiesPanel from './PropertiesPanel';

interface Props {
  initialLayout: FloorLayout | null;
  floorName: string;
  workspaces: WorkspaceResponse[];
  onSave: (layout: FloorLayout) => Promise<void>;
}

const FloorPlanEditor: React.FC<Props> = ({
  initialLayout,
  floorName,
  workspaces,
  onSave,
}) => {
  const editor = useFloorPlanEditor(initialLayout);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Collapse states for side panels
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

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

  const handleLibraryDragStart = useCallback((_item: ElementCatalogItem) => {
    // Could show a ghost preview; for now just a no-op
  }, []);

  const linkedCount = editor.layout.elements.filter(
    (e) => e.workspaceId
  ).length;

  if (showPreview) {
    return (
      <div className="flex flex-col h-full bg-background animate-fade-scale-in">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shadow-sm">
          <span className="text-sm font-bold flex items-center gap-2">
            <span role="img" aria-label="eye">👁️</span> Chế độ Xem trước — {floorName}
          </span>
          <button
            onClick={() => setShowPreview(false)}
            className="btn btn-secondary btn-sm flex items-center gap-1 border border-border"
          >
            ← Quay lại Thiết kế
          </button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="w-full max-w-5xl rounded-2xl border border-border/80 bg-card p-6 shadow-xl relative overflow-hidden">
            <FloorPlanPreview layout={editor.layout} workspaces={workspaces} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        floorName={floorName}
        onSave={handleSave}
        saving={saving}
        onPreview={() => setShowPreview(true)}
      />

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Element Library */}
        <div
          className={`border-r border-border bg-card shrink-0 overflow-hidden transition-all duration-300 flex flex-col relative ${
            isLeftCollapsed ? 'w-0' : 'w-[220px]'
          }`}
        >
          {!isLeftCollapsed && <ElementLibrary onDragStart={handleLibraryDragStart} />}
        </div>

        {/* Center: Canvas Area & Toggle Handles */}
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          
          {/* Toggle Left Sidebar Button */}
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-5 h-12 rounded-r-lg bg-card/90 backdrop-blur-sm border-y border-r border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-md transition-all"
            title={isLeftCollapsed ? "Hiện danh mục" : "Ẩn danh mục"}
          >
            {isLeftCollapsed ? <FiChevronRight className="h-3.5 w-3.5" /> : <FiChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Canvas Component */}
          <EditorCanvas editor={editor} />

          {/* Toggle Right Sidebar Button */}
          <button
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-5 h-12 rounded-l-lg bg-card/90 backdrop-blur-sm border-y border-l border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-md transition-all"
            title={isRightCollapsed ? "Hiện thuộc tính" : "Ẩn thuộc tính"}
          >
            {isRightCollapsed ? <FiChevronLeft className="h-3.5 w-3.5" /> : <FiChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Right Sidebar: Properties Panel */}
        <div
          className={`border-l border-border bg-card shrink-0 overflow-hidden transition-all duration-300 flex flex-col relative ${
            isRightCollapsed ? 'w-0' : 'w-[320px]'
          }`}
        >
          {!isRightCollapsed && (
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
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="px-4 py-1.5 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center gap-4 shrink-0 select-none">
        <span className="flex items-center gap-1">
          <span className="font-semibold text-foreground">{editor.layout.elements.length}</span> elements
        </span>
        <div className="w-px h-3 bg-border" />
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-foreground">{linkedCount}</span> đã liên kết workspace
        </span>
        <div className="w-px h-3 bg-border" />
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
          <span className="font-semibold text-foreground">
            {editor.layout.elements.filter((e) => !e.workspaceId).length}
          </span>{' '}
          chưa gán
        </span>
        <span className="ml-auto font-mono text-muted-foreground/85">
          Canvas: <span className="font-semibold">{editor.layout.canvas.width}×{editor.layout.canvas.height}px</span>
        </span>
        <div className="w-px h-3 bg-border" />
        <span className="font-mono text-muted-foreground/85">
          Grid: <span className="font-semibold">{editor.snapToGrid ? `${editor.layout.canvas.gridSize}px` : 'OFF'}</span>
        </span>
      </div>
    </div>
  );
};

/* ─── Simple Preview (read-only) ─── */

import ElementRenderer from './ElementRenderer';

const FloorPlanPreview: React.FC<{
  layout: FloorLayout;
  workspaces: WorkspaceResponse[];
}> = ({ layout }) => {
  const { width, height, gridSize } = layout.canvas;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[500px]">
      <defs>
        <pattern
          id="preview-dots"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={gridSize}
            cy={gridSize}
            r={0.8}
            fill="var(--border-strong, #CBD5E1)"
            opacity={0.35}
          />
        </pattern>
      </defs>

      <rect
        width={width}
        height={height}
        fill="url(#preview-dots)"
        rx={6}
      />
      <rect
        width={width}
        height={height}
        fill="none"
        stroke="var(--border-strong, #CBD5E1)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={6}
      />

      {layout.elements
        .filter((el) => el.visible)
        .map((el) => (
          <ElementRenderer
            key={el.id}
            element={el}
            isSelected={false}
            isHovered={false}
            onMouseDown={() => {}}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          />
        ))}
    </svg>
  );
};

export default FloorPlanEditor;
