/**
 * useFloorPlanEditor — Core state management hook for the Floor Plan Editor.
 * Handles element CRUD, selection, history (undo/redo), and canvas state.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  FloorLayout,
  LayoutElement,
  EditorTool,
  HistoryEntry,
  ElementType,
} from '../types/floorPlan';
import {
  ELEMENT_CATALOG,
  generateElementId,
  createDefaultLayout,
} from '../data/elementCatalog';

const MAX_HISTORY = 50;

export function useFloorPlanEditor(initialLayout?: FloorLayout | null) {
  /* ─── Core State ─── */
  const [layout, setLayout] = useState<FloorLayout>(
    initialLayout ?? createDefaultLayout()
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>('select');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  /* ─── Undo / Redo History ─── */
  const historyRef = useRef<HistoryEntry[]>([
    { elements: initialLayout?.elements ?? [], label: 'Initial' },
  ]);
  const historyIndexRef = useRef(0);

  const pushHistory = useCallback(
    (elements: LayoutElement[], label: string) => {
      const history = historyRef.current;
      const idx = historyIndexRef.current;

      // Remove any future history entries (we're branching)
      historyRef.current = history.slice(0, idx + 1);
      historyRef.current.push({ elements: structuredClone(elements), label });

      // Cap history
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current = historyRef.current.slice(-MAX_HISTORY);
      }
      historyIndexRef.current = historyRef.current.length - 1;
    },
    []
  );

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    historyIndexRef.current = idx - 1;
    const entry = historyRef.current[idx - 1];
    setLayout((prev) => ({
      ...prev,
      elements: structuredClone(entry.elements),
    }));
    setIsDirty(true);
  }, []);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIndexRef.current = idx + 1;
    const entry = historyRef.current[idx + 1];
    setLayout((prev) => ({
      ...prev,
      elements: structuredClone(entry.elements),
    }));
    setIsDirty(true);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  /* ─── Grid Snapping ─── */
  const snap = useCallback(
    (value: number): number => {
      if (!snapToGrid) return value;
      const grid = layout.canvas.gridSize;
      return Math.round(value / grid) * grid;
    },
    [snapToGrid, layout.canvas.gridSize]
  );

  /* ─── Element CRUD ─── */

  const addElement = useCallback(
    (type: ElementType, x: number, y: number): LayoutElement => {
      const catalog = ELEMENT_CATALOG.find((c) => c.type === type);
      if (!catalog) throw new Error(`Unknown element type: ${type}`);

      const newElement: LayoutElement = {
        id: generateElementId(),
        type,
        x: snap(x),
        y: snap(y),
        width: catalog.defaultWidth,
        height: catalog.defaultHeight,
        rotation: 0,
        label: catalog.label,
        fillColor: catalog.defaultFill,
        strokeColor: catalog.defaultStroke,
        opacity: 1,
        cornerRadius: catalog.defaultCornerRadius,
        workspaceId: null,
        locked: false,
        visible: true,
        seatCount: type === 'meeting_room' ? 6 : type === 'private_office' ? 2 : undefined,
      };

      setLayout((prev) => {
        const updated = {
          ...prev,
          elements: [...prev.elements, newElement],
        };
        pushHistory(updated.elements, `Thêm ${catalog.label}`);
        return updated;
      });
      setSelectedIds([newElement.id]);
      setIsDirty(true);
      return newElement;
    },
    [snap, pushHistory]
  );

  const updateElement = useCallback(
    (id: string, changes: Partial<LayoutElement>) => {
      setLayout((prev) => {
        const elements = prev.elements.map((el) =>
          el.id === id ? { ...el, ...changes } : el
        );
        pushHistory(elements, 'Cập nhật element');
        return { ...prev, elements };
      });
      setIsDirty(true);
    },
    [pushHistory]
  );

  const updateElements = useCallback(
    (updates: Array<{ id: string; changes: Partial<LayoutElement> }>) => {
      setLayout((prev) => {
        const elements = prev.elements.map((el) => {
          const update = updates.find((u) => u.id === el.id);
          return update ? { ...el, ...update.changes } : el;
        });
        pushHistory(elements, `Cập nhật ${updates.length} elements`);
        return { ...prev, elements };
      });
      setIsDirty(true);
    },
    [pushHistory]
  );

  const moveElement = useCallback(
    (id: string, x: number, y: number) => {
      setLayout((prev) => {
        const elements = prev.elements.map((el) =>
          el.id === id && !el.locked
            ? { ...el, x: snap(x), y: snap(y) }
            : el
        );
        // Don't push to history on every mouse move — only on mouse up
        return { ...prev, elements };
      });
      setIsDirty(true);
    },
    [snap]
  );

  const commitMove = useCallback(
    (label = 'Di chuyển element') => {
      pushHistory(layout.elements, label);
    },
    [pushHistory, layout.elements]
  );

  const resizeElement = useCallback(
    (
      id: string,
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      setLayout((prev) => {
        const elements = prev.elements.map((el) =>
          el.id === id && !el.locked
            ? {
                ...el,
                x: snap(x),
                y: snap(y),
                width: Math.max(20, snap(width)),
                height: Math.max(20, snap(height)),
              }
            : el
        );
        return { ...prev, elements };
      });
      setIsDirty(true);
    },
    [snap]
  );

  const deleteElements = useCallback(
    (ids: string[]) => {
      setLayout((prev) => {
        const elements = prev.elements.filter(
          (el) => !ids.includes(el.id)
        );
        pushHistory(elements, `Xóa ${ids.length} element(s)`);
        return { ...prev, elements };
      });
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setIsDirty(true);
    },
    [pushHistory]
  );

  const duplicateElements = useCallback(
    (ids: string[]) => {
      setLayout((prev) => {
        const newElements = prev.elements
          .filter((el) => ids.includes(el.id))
          .map((el) => ({
            ...structuredClone(el),
            id: generateElementId(),
            x: el.x + 20,
            y: el.y + 20,
            workspaceId: null, // Don't duplicate workspace link
          }));
        const elements = [...prev.elements, ...newElements];
        pushHistory(elements, `Nhân bản ${ids.length} element(s)`);
        setSelectedIds(newElements.map((e) => e.id));
        return { ...prev, elements };
      });
      setIsDirty(true);
    },
    [pushHistory]
  );

  /* ─── Selection ─── */

  const selectElement = useCallback(
    (id: string | null, multi = false) => {
      if (!id) {
        setSelectedIds([]);
        return;
      }
      if (multi) {
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
      } else {
        setSelectedIds([id]);
      }
    },
    []
  );

  const selectAll = useCallback(() => {
    setSelectedIds(layout.elements.map((e) => e.id));
  }, [layout.elements]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  /* ─── Canvas Settings ─── */

  const updateCanvas = useCallback(
    (changes: Partial<FloorLayout['canvas']>) => {
      setLayout((prev) => ({
        ...prev,
        canvas: { ...prev.canvas, ...changes },
      }));
      setIsDirty(true);
    },
    []
  );

  const zoomIn = useCallback(
    () => setZoom((z) => Math.min(z + 0.15, 3)),
    []
  );
  const zoomOut = useCallback(
    () => setZoom((z) => Math.max(z - 0.15, 0.3)),
    []
  );
  const zoomReset = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  /* ─── Z-Order ─── */

  const bringToFront = useCallback(
    (id: string) => {
      setLayout((prev) => {
        const idx = prev.elements.findIndex((e) => e.id === id);
        if (idx < 0) return prev;
        const el = prev.elements[idx];
        const elements = [
          ...prev.elements.slice(0, idx),
          ...prev.elements.slice(idx + 1),
          el,
        ];
        pushHistory(elements, 'Đưa lên trên');
        return { ...prev, elements };
      });
    },
    [pushHistory]
  );

  const sendToBack = useCallback(
    (id: string) => {
      setLayout((prev) => {
        const idx = prev.elements.findIndex((e) => e.id === id);
        if (idx < 0) return prev;
        const el = prev.elements[idx];
        const elements = [
          el,
          ...prev.elements.slice(0, idx),
          ...prev.elements.slice(idx + 1),
        ];
        pushHistory(elements, 'Đưa xuống dưới');
        return { ...prev, elements };
      });
    },
    [pushHistory]
  );

  /* ─── Load / Reset ─── */

  const loadLayout = useCallback(
    (newLayout: FloorLayout) => {
      setLayout(newLayout);
      setSelectedIds([]);
      setIsDirty(false);
      historyRef.current = [
        { elements: structuredClone(newLayout.elements), label: 'Loaded' },
      ];
      historyIndexRef.current = 0;
    },
    []
  );

  const markClean = useCallback(() => setIsDirty(false), []);

  /* ─── Getters ─── */
  const selectedElements = layout.elements.filter((e) =>
    selectedIds.includes(e.id)
  );
  const selectedElement =
    selectedElements.length === 1 ? selectedElements[0] : null;

  return {
    // State
    layout,
    selectedIds,
    selectedElement,
    selectedElements,
    hoveredId,
    tool,
    zoom,
    panOffset,
    showGrid,
    snapToGrid,
    isDirty,
    canUndo,
    canRedo,

    // Actions
    addElement,
    updateElement,
    updateElements,
    moveElement,
    commitMove,
    resizeElement,
    deleteElements,
    duplicateElements,
    selectElement,
    selectAll,
    clearSelection,
    setHoveredId,
    setTool,
    setZoom,
    setPanOffset,
    setShowGrid,
    setSnapToGrid,
    updateCanvas,
    zoomIn,
    zoomOut,
    zoomReset,
    bringToFront,
    sendToBack,
    undo,
    redo,
    loadLayout,
    markClean,
  };
}

export type FloorPlanEditorAPI = ReturnType<typeof useFloorPlanEditor>;
