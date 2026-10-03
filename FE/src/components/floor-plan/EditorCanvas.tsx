/**
 * EditorCanvas — the SVG drawing surface: renders the elements, handles selection, dragging,
 * resizing, panning, keyboard shortcuts and drops from the element library.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
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

  const { layout, selectedIds, hoveredId, zoom, panOffset, showGrid } = editor;
  // `editor` is a new object every render; these actions are stable, so depend on them directly
  // to keep the memoized ElementRenderer children from re-rendering on every mouse move.
  const { selectElement, setHoveredId } = editor;
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
      selectElement(el.id, e.shiftKey);

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
    [selectElement, toSVGCoords]
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
      className="flex-1 relative overflow-hidden bg-muted/50 select-none"
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
                r={1}
                fill="hsl(var(--muted-foreground))"
                opacity={0.35}
              />
            </pattern>
          )}

        </defs>

        {/* The sheet: card-coloured, with the dot grid on top */}
        <rect width={canvasW} height={canvasH} fill="hsl(var(--card))" rx={6} />
        <rect
          data-canvas="bg"
          width={canvasW}
          height={canvasH}
          fill={showGrid ? 'url(#editor-dots)' : 'transparent'}
          rx={6}
        />
        <rect
          width={canvasW}
          height={canvasH}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={1}
          rx={6}
          style={{ pointerEvents: 'none' }}
        />

        {/* Render elements */}
        {layout.elements.map((el) => (
          <ElementRenderer
            key={el.id}
            element={el}
            isSelected={selectedIds.includes(el.id)}
            isHovered={hoveredId === el.id}
            onMouseDown={handleElementMouseDown}
            onHoverChange={setHoveredId}
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

      {/* Cursor position on the sheet */}
      {cursorCoords && (
        <div className="absolute bottom-3 left-3 rounded-md border border-border bg-card px-2 py-1 text-[11px] tabular-nums text-muted-foreground pointer-events-none">
          x {Math.round(cursorCoords.x)} · y {Math.round(cursorCoords.y)}
        </div>
      )}

      {/* Out-of-bounds warning banner */}
      {outOfBoundsIds.size > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-md border border-destructive/30 bg-card px-3 py-1.5 text-xs font-medium text-destructive pointer-events-none">
          <FiAlertTriangle className="h-4 w-4" />
          <span>{outOfBoundsIds.size} phần tử vượt ngoài khung vẽ — hãy di chuyển vào trong</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(EditorCanvas);
