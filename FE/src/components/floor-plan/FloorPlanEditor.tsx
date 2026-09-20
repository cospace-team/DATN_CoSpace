/**
 * FloorPlanEditor — Main orchestrator component.
 * Composes Toolbar + ElementLibrary + EditorCanvas + PropertiesPanel
 * into a modern 3-panel layout with collapsible side panels, fully theme-aware
 * (light/dark) using the app's semantic design tokens.
 */

import React, { useState, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight, FiEye, FiArrowLeft, FiGrid } from 'react-icons/fi';
import type { FloorLayout, ElementCatalogItem } from '../../types/floorPlan';
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
    // Optional drag ghost handling
  }, []);

  const linkedCount = editor.layout.elements.filter(
    (e) => e.workspaceId
  ).length;

  if (showPreview) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground animate-fade-scale-in">
        {/* Preview Topbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/90 shadow-sm">
          <div className="flex items-center gap-2.5">
            <FiEye className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold font-heading">
              Chế độ Xem trước Sơ đồ — {floorName}
            </span>
          </div>
          <button
            onClick={() => setShowPreview(false)}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-muted border border-border hover:bg-muted/70 text-foreground flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span>Quay lại Thiết kế</span>
          </button>
        </div>

        {/* Preview Viewport */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-background p-8">
          <div className="w-full max-w-5xl rounded-3xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden">
            <FloorPlanPreview layout={editor.layout} workspaces={workspaces} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background font-sans relative z-0">
      {/* Ambient Light Blobs (theme-aware, subtle) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />

      {/* Toolbar */}
      <EditorToolbar
        editor={editor}
        floorName={floorName}
        onSave={handleSave}
        saving={saving}
        onPreview={() => setShowPreview(true)}
      />

      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Element Library */}
        <div
          className={`border-r border-border bg-card shrink-0 overflow-hidden transition-all duration-300 flex flex-col relative z-20 ${
            isLeftCollapsed ? 'w-0' : 'w-[230px]'
          }`}
        >
          {!isLeftCollapsed && <ElementLibrary onDragStart={handleLibraryDragStart} />}
        </div>

        {/* Center: Canvas Area & Collapse Handles */}
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">

          {/* Toggle Left Sidebar Button */}
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-5 h-12 rounded-r-xl bg-card/90 backdrop-blur-md border-y border-r border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-lg transition-all active:scale-95"
            title={isLeftCollapsed ? "Hiện danh mục" : "Ẩn danh mục"}
          >
            {isLeftCollapsed ? <FiChevronRight className="h-3.5 w-3.5 text-primary" /> : <FiChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Canvas Component */}
          <EditorCanvas editor={editor} />

          {/* Toggle Right Sidebar Button */}
          <button
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-5 h-12 rounded-l-xl bg-card/90 backdrop-blur-md border-y border-l border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center shadow-lg transition-all active:scale-95"
            title={isRightCollapsed ? "Hiện thuộc tính" : "Ẩn thuộc tính"}
          >
            {isRightCollapsed ? <FiChevronLeft className="h-3.5 w-3.5 text-primary" /> : <FiChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Right Sidebar: Properties Panel */}
        <div
          className={`border-l border-border bg-card shrink-0 overflow-hidden transition-all duration-300 flex flex-col relative z-20 ${
            isRightCollapsed ? 'w-0' : 'w-[330px]'
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

      {/* Bottom Telemetry Status Bar */}
      <div className="px-5 py-2 border-t border-border bg-card/80 backdrop-blur-md text-[11px] text-muted-foreground flex items-center gap-4 shrink-0 select-none font-mono z-30">
        <span className="flex items-center gap-1.5">
          <span className="font-bold text-foreground">{editor.layout.elements.length}</span>
          <span>phần tử</span>
        </span>

        <div className="w-px h-3.5 bg-border" />

        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success shadow-sm shadow-success/50" />
          <span className="font-bold text-success">{linkedCount}</span>
          <span>đã gán workspace</span>
        </span>

        <div className="w-px h-3.5 bg-border" />

        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
          <span className="font-bold text-foreground">
            {editor.layout.elements.filter((e) => !e.workspaceId).length}
          </span>
          <span>chưa gán</span>
        </span>

        <span className="ml-auto text-muted-foreground">
          Canvas: <strong className="text-foreground font-bold">{editor.layout.canvas.width}×{editor.layout.canvas.height}px</strong>
        </span>

        <div className="w-px h-3.5 bg-border" />

        <span className="text-muted-foreground flex items-center gap-1">
          <FiGrid className="h-3 w-3 text-primary" />
          <span>Grid:</span>
          <strong className="text-foreground font-bold">{editor.snapToGrid ? `${editor.layout.canvas.gridSize}px` : 'TẮT'}</strong>
        </span>
      </div>
    </div>
  );
};

/* ── Simple Read-Only Floor Plan Preview ── */

const FloorPlanPreview: React.FC<{
  layout: FloorLayout;
  workspaces: WorkspaceResponse[];
}> = ({ layout }) => {
  const { width, height, gridSize } = layout.canvas;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[520px]">
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
            r={1}
            fill="hsl(var(--muted-foreground))"
            opacity={0.4}
          />
        </pattern>
      </defs>

      <rect
        width={width}
        height={height}
        fill="url(#preview-dots)"
        rx={12}
      />
      <rect
        width={width}
        height={height}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        rx={12}
      />

      {layout.elements
        .filter((el) => el.visible)
        .map((el) => (
          <ElementRenderer
            key={el.id}
            element={el}
            isSelected={false}
            isHovered={false}
          />
        ))}
    </svg>
  );
};

export default React.memo(FloorPlanEditor);
