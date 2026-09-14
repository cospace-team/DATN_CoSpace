/**
 * EditorCanvas — The main SVG canvas where elements are rendered, selected,
 * dragged, resized, and dropped from the library.
 * Precision dot-matrix grid, floating telemetry HUD, and snap handles,
 * all rendered with theme-aware (light/dark) colors.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { FiAlertTriangle, FiCompass, FiTarget } from 'react-icons/fi';
import type { FloorPlanEditorAPI } from '../../hooks/useFloorPlanEditor';
import type { ElementCatalogItem, LayoutElement, ElementType } from '../../types/floorPlan';
import ElementRenderer from './ElementRenderer';
import SelectionHandles, { type HandlePosition } from './SelectionHandles';

interface Props {
  editor: FloorPlanEditorAPI;
}

interface DragState {
  type: 'move' | 'resize';
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  handle?: HandlePosition;
}

const EditorCanvas: React.FC<Props> = ({ editor }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);

  const { layout, selectedIds, hoveredId, zoom, panOffset, showGrid, snapToGrid } = editor;
  const { width: canvasW, height: canvasH, gridSize } = layout.canvas;

  /* ─── Out-of-bounds detection ─── */
  const outOfBoundsIds = React.useMemo(() => {
    return new Set(
      layout.elements
        .filter(
          (el) =>
            el.x < 0 ||
            el.y < 0 ||
            el.x + el.width > canvasW ||
            el.y + el.height > canvasH
        )
        .map((el) => el.id)
    );
  }, [layout.elements, canvasW, canvasH]);

  /* ─── SVG coordinate conversion ─── */
  const toSVGCoords = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = (clientX - rect.left) / zoom - panOffset.x;
      const y = (clientY - rect.top) / zoom - panOffset.y;
      return { x, y };
    },
    [zoom, panOffset]
  );

  /* ─── Drop from Element Library ─── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/floor-plan-element');
      if (!data) return;

      try {
        const item: ElementCatalogItem = JSON.parse(data);
        const { x, y } = toSVGCoords(e.clientX, e.clientY);
        editor.addElement(
          item.type as ElementType,
          x - item.defaultWidth / 2,
          y - item.defaultHeight / 2
        );
      } catch (err) {
        console.error('Drop parse error:', err);
      }
    },
    [toSVGCoords, editor]
  );

  /* ─── Element mouse down → start drag ─── */
  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, el: LayoutElement) => {
      if (el.locked) return;
      e.stopPropagation();

      // Select on click
      editor.selectElement(el.id, e.shiftKey);

      const { x: mx, y: my } = toSVGCoords(e.clientX, e.clientY);
      setDrag({
        type: 'move',
        elementId: el.id,
        startMouseX: mx,
        startMouseY: my,
        startX: el.x,
        startY: el.y,
        startW: el.width,
        startH: el.height,
      });
    },
    [editor, toSVGCoords]
  );

  /* ─── Resize handle mouse down ─── */
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, elementId: string, handle: HandlePosition) => {
      e.stopPropagation();
      const el = layout.elements.find((el) => el.id === elementId);
      if (!el || el.locked) return;

      const { x: mx, y: my } = toSVGCoords(e.clientX, e.clientY);
      setDrag({
        type: 'resize',
        elementId,
        startMouseX: mx,
        startMouseY: my,
        startX: el.x,
        startY: el.y,
        startW: el.width,
        startH: el.height,
        handle,
      });
    },
    [layout.elements, toSVGCoords]
  );

  /* ─── Mouse move (drag / resize / cursor coords) ─── */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = toSVGCoords(e.clientX, e.clientY);
      setCursorCoords(coords);

      // Panning
      if (isPanning) {
        const dx = (e.clientX - panStart.x) / zoom;
        const dy = (e.clientY - panStart.y) / zoom;
        editor.setPanOffset({
          x: panOffset.x + dx,
          y: panOffset.y + dy,
        });
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (!drag) return;
      const dx = coords.x - drag.startMouseX;
      const dy = coords.y - drag.startMouseY;

      if (drag.type === 'move') {
        editor.moveElement(drag.elementId, drag.startX + dx, drag.startY + dy);
      } else if (drag.type === 'resize' && drag.handle) {
        let newX = drag.startX;
        let newY = drag.startY;
        let newW = drag.startW;
        let newH = drag.startH;

        const h = drag.handle;
        if (h.includes('e')) newW = drag.startW + dx;
        if (h.includes('w')) {
          newW = drag.startW - dx;
          newX = drag.startX + dx;
        }
        if (h.includes('s')) newH = drag.startH + dy;
        if (h.includes('n')) {
          newH = drag.startH - dy;
          newY = drag.startY + dy;
        }

        editor.resizeElement(drag.elementId, newX, newY, newW, newH);
      }
    },
    [drag, isPanning, panStart, zoom, panOffset, editor, toSVGCoords]
  );

  /* ─── Mouse up → end drag ─── */
  const handleMouseUp = useCallback(() => {
    if (drag) {
      editor.commitMove(
        drag.type === 'move' ? 'Di chuyển element' : 'Resize element'
      );
      setDrag(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [drag, isPanning, editor]);

  /* ─── Canvas background click → deselect ─── */
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse or space+click = pan
      if (e.button === 1 || editor.tool === 'pan') {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
      }
      // Left click on canvas bg → deselect
      if (e.target === svgRef.current || (e.target as SVGElement).dataset?.canvas === 'bg') {
        editor.clearSelection();
      }
    },
    [editor]
  );

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedIds.length) editor.deleteElements(selectedIds);
      } else if (ctrl && e.key === 'z') {
        e.preventDefault();
        editor.undo();
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        editor.redo();
      } else if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length) editor.duplicateElements(selectedIds);
      } else if (ctrl && e.key === 'a') {
        e.preventDefault();
        editor.selectAll();
      } else if (e.key === 'Escape') {
        editor.clearSelection();
      }
      // Arrow key nudge
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const delta = e.shiftKey ? 10 : (editor.snapToGrid ? gridSize : 1);
        const dx = e.key === 'ArrowRight' ? delta : e.key === 'ArrowLeft' ? -delta : 0;
        const dy = e.key === 'ArrowDown' ? delta : e.key === 'ArrowUp' ? -delta : 0;

        const updates = selectedIds
          .map((id) => {
            const el = layout.elements.find((el) => el.id === id);
            if (!el || el.locked) return null;
            return { id, changes: { x: el.x + dx, y: el.y + dy } };
          })
          .filter(Boolean) as { id: string; changes: Partial<LayoutElement> }[];

        if (updates.length) editor.updateElements(updates);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editor, selectedIds, gridSize, layout.elements]);

  /* ─── Wheel zoom ─── */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) editor.zoomIn();
        else editor.zoomOut();
      }
    },
    [editor]
  );

  return (
    <div
      className="flex-1 relative overflow-hidden bg-background transition-colors select-none"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${canvasW} ${canvasH}`}
        className="w-full h-full"
        style={{
          transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center',
          transition: drag || isPanning ? 'none' : 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: isPanning ? 'grabbing' : editor.tool === 'pan' ? 'grab' : 'default',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setCursorCoords(null);
        }}
        onWheel={handleWheel}
      >
        <defs>
          {/* Pro Precision Dot Grid */}
          {showGrid && (
            <pattern
              id="editor-dots"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={gridSize}
                cy={gridSize}
                r={1.2}
                fill="hsl(var(--muted-foreground))"
                opacity={0.45}
              />
            </pattern>
          )}

          {/* Glowing Selection Linear Gradients */}
          <linearGradient id="selectionGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Canvas Background Base */}
        <rect
          width={canvasW}
          height={canvasH}
          fill="hsl(var(--muted) / 0.4)"
          rx={12}
        />

        {/* Pattern Overlay */}
        <rect
          data-canvas="bg"
          width={canvasW}
          height={canvasH}
          fill={showGrid ? 'url(#editor-dots)' : 'transparent'}
          rx={12}
        />

        {/* Outer Blueprint Canvas Border */}
        <rect
          width={canvasW}
          height={canvasH}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1.5}
          strokeDasharray="8 6"
          rx={12}
          style={{ pointerEvents: 'none' }}
        />

        {/* Render elements */}
        {layout.elements.map((el) => (
          <ElementRenderer
            key={el.id}
            element={el}
            isSelected={selectedIds.includes(el.id)}
            isHovered={hoveredId === el.id}
            onMouseDown={(e) => handleElementMouseDown(e, el)}
            onMouseEnter={() => editor.setHoveredId(el.id)}
            onMouseLeave={() => editor.setHoveredId(null)}
          />
        ))}

        {/* Out-of-bounds warning overlay */}
        {outOfBoundsIds.size > 0 &&
          layout.elements
            .filter((el) => outOfBoundsIds.has(el.id))
            .map((el) => (
              <rect
                key={`oob-${el.id}`}
                x={el.x - 3}
                y={el.y - 3}
                width={el.width + 6}
                height={el.height + 6}
                fill="none"
                stroke="var(--state-danger, #EF4444)"
                strokeWidth={2}
                strokeDasharray="5 4"
                rx={6}
                opacity={0.9}
                style={{ pointerEvents: 'none' }}
              />
            ))}

        {/* Selection handles for selected elements */}
        {layout.elements
          .filter((el) => selectedIds.includes(el.id) && !el.locked)
          .map((el) => (
            <SelectionHandles
              key={`handle-${el.id}`}
              element={el}
              onResizeStart={handleResizeStart}
            />
          ))}
      </svg>

      {/* Floating Telemetry HUD (Coordinates + Tooltips) */}
      {cursorCoords && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border text-[11px] font-mono shadow-xl pointer-events-none text-muted-foreground flex items-center gap-3">
          <div className="flex items-center gap-1 text-primary">
            <FiCompass className="h-3.5 w-3.5" />
            <span className="font-bold">X: {Math.round(cursorCoords.x)}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-bold">Y: {Math.round(cursorCoords.y)}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FiTarget className="h-3.5 w-3.5 text-primary" />
            <span>Grid: <strong className="text-foreground">{snapToGrid ? `${gridSize}px` : 'Tắt'}</strong></span>
          </div>
        </div>
      )}

      {/* Out-of-bounds warning banner */}
      {outOfBoundsIds.size > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-destructive/90 backdrop-blur-md text-destructive-foreground text-xs font-bold px-4 py-2 rounded-full shadow-2xl pointer-events-none animate-pulse">
          <FiAlertTriangle className="h-4 w-4" />
          <span>{outOfBoundsIds.size} phần tử vượt ngoài khung vẽ — hãy di chuyển vào trong</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(EditorCanvas);
