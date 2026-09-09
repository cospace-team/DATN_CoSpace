import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FiPlus, FiMinus, FiMaximize2, FiMap, FiLayers } from 'react-icons/fi';
import type { WorkspaceResponse } from '../../lib/spaceApi';

/* ── Types ── */

export interface SVGElementInfo {
  id: string;
  tagName: string;
}

interface Props {
  svgContent: string | null;
  workspaces: WorkspaceResponse[];
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null) => void;
}

/* ── Ignore list: SVG system elements that shouldn't be assignable ── */
const IGNORE_PREFIXES = [
  'defs', 'gradient', 'clip', 'mask', 'filter', 'pattern',
  'linearGradient', 'radialGradient', 'clipPath', 'symbol',
];

const isAssignableElement = (id: string): boolean => {
  if (!id || id.trim() === '') return false;
  return !IGNORE_PREFIXES.some((p) => id.toLowerCase().startsWith(p.toLowerCase()));
};

/* ── Component ── */

const SVGFloorPlanEditor: React.FC<Props> = ({
  svgContent,
  workspaces,
  selectedElementId,
  onSelectElement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [parsedElements, setParsedElements] = useState<SVGElementInfo[]>([]);

  // Build lookup: svgElementId → workspace
  const wsMap = new Map<string, WorkspaceResponse>();
  workspaces.forEach((ws) => wsMap.set(ws.svgElementId, ws));

  /* ── Parse and inject SVG ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !svgContent) {
      if (container) container.innerHTML = '';
      setParsedElements([]);
      return;
    }

    // Sanitize: escape bare '&' that aren't already XML entities
    const sanitized = svgContent.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, '&amp;');

    // Parse SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'image/svg+xml');

    // Check for XML parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('[SVGEditor] Parse error:', parseError.textContent);
      container.innerHTML = '<p class="text-xs text-red-400 p-4 font-mono">File SVG không hợp lệ (lỗi parse XML).</p>';
      return;
    }

    const svgEl = doc.querySelector('svg');
    if (!svgEl) {
      container.innerHTML = '<p class="text-xs text-red-400 p-4 font-mono">File SVG không hợp lệ (không tìm thấy thẻ svg).</p>';
      return;
    }

    // Ensure SVG scales to fill container
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    if (!svgEl.getAttribute('viewBox')) {
      const w = svgEl.getAttribute('width') || '800';
      const h = svgEl.getAttribute('height') || '500';
      svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    // Collect assignable elements
    const elements: SVGElementInfo[] = [];
    const allWithId = svgEl.querySelectorAll('[id]');
    allWithId.forEach((el) => {
      const id = el.getAttribute('id')!;
      if (isAssignableElement(id)) {
        elements.push({ id, tagName: el.tagName });
      }
    });
    setParsedElements(elements);

    // Inject into DOM
    container.innerHTML = '';
    container.appendChild(svgEl);

    // Apply styles & handlers
    applyInteractiveStyles(container, elements);

    return () => {
      container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgContent]);

  /* ── Re-apply colors when workspaces or selection changes ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || parsedElements.length === 0) return;
    applyInteractiveStyles(container, parsedElements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, selectedElementId, hoveredId, parsedElements]);

  const applyInteractiveStyles = useCallback(
    (container: HTMLDivElement, elements: SVGElementInfo[]) => {
      elements.forEach(({ id }) => {
        const el = container.querySelector(`#${CSS.escape(id)}`) as SVGElement | null;
        if (!el) return;

        const ws = wsMap.get(id);
        const isSelected = selectedElementId === id;
        const isHovered = hoveredId === id;

        // Determine color based on state
        let fillColor: string;
        let strokeColor: string;
        let strokeWidth: string;

        if (isSelected) {
          fillColor = 'rgba(139,92,246,0.35)';
          strokeColor = '#8B5CF6';
          strokeWidth = '3';
        } else if (ws) {
          if (ws.status === 'active') {
            fillColor = isHovered ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.18)';
            strokeColor = '#22C55E';
            strokeWidth = isHovered ? '2.5' : '1.5';
          } else if (ws.status === 'maintenance') {
            fillColor = isHovered ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.18)';
            strokeColor = '#F59E0B';
            strokeWidth = isHovered ? '2.5' : '1.5';
          } else {
            fillColor = 'rgba(148,163,184,0.18)';
            strokeColor = '#94A3B8';
            strokeWidth = '1.5';
          }
        } else {
          // Unassigned
          fillColor = isHovered ? 'rgba(6,182,212,0.2)' : 'rgba(51,65,85,0.2)';
          strokeColor = isHovered ? '#06B6D4' : '#475569';
          strokeWidth = isHovered ? '2' : '1';
        }

        el.style.fill = fillColor;
        el.style.stroke = strokeColor;
        el.style.strokeWidth = strokeWidth;
        el.style.cursor = 'pointer';
        el.style.transition = 'fill 150ms, stroke 150ms, strokeWidth 150ms';

        el.onmouseenter = () => setHoveredId(id);
        el.onmouseleave = () => setHoveredId(null);
        el.onclick = (e) => {
          e.stopPropagation();
          onSelectElement(selectedElementId === id ? null : id);
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wsMap, selectedElementId, hoveredId, onSelectElement]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.4));
  const handleReset = () => setZoom(1);

  if (!svgContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8 bg-slate-950 rounded-2xl border border-slate-800">
        <FiMap className="h-12 w-12 opacity-30 text-violet-400" />
        <p className="font-semibold text-slate-300">Chưa có bản đồ SVG</p>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          Tải lên file SVG cho tầng này để bắt đầu gán không gian tương tác.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-slate-950 select-none overflow-hidden rounded-2xl border border-slate-800">
      {/* Zoom controls overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
        <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-secondary text-slate-300 hover:text-white transition-colors" title="Phóng to">
          <FiPlus className="h-4 w-4" />
        </button>
        <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-secondary text-slate-300 hover:text-white transition-colors" title="Thu nhỏ">
          <FiMinus className="h-4 w-4" />
        </button>
        <button onClick={handleReset} className="p-2 rounded-lg hover:bg-secondary text-slate-300 hover:text-white transition-colors" title="Reset Zoom">
          <FiMaximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Legend overlay */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-4 px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/300 shadow-sm shadow-emerald-500/50" />
          <span className="text-slate-300">Đã gán</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted/500" />
          <span className="text-slate-400">Chưa gán</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-50 dark:bg-amber-950/300 shadow-sm shadow-amber-500/50" />
          <span className="text-slate-300">Bảo trì</span>
        </div>
      </div>

      {/* Hover tooltip HUD */}
      {hoveredId && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl text-xs font-mono backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span className="text-violet-400 font-bold">#{hoveredId}</span>
          {wsMap.has(hoveredId) ? (
            <span className="text-slate-200">
              → <strong className="text-emerald-400">{wsMap.get(hoveredId)!.name}</strong> ({wsMap.get(hoveredId)!.code})
            </span>
          ) : (
            <span className="text-slate-400">— Chưa gán workspace</span>
          )}
        </div>
      )}

      {/* SVG container */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-950 p-4">
        <div
          ref={containerRef}
          className="svg-floor-plan-container w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={() => onSelectElement(null)}
        />
      </div>

      {/* Footer Telemetry */}
      <div className="px-5 py-2 border-t border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 flex items-center gap-4 font-mono">
        <span className="flex items-center gap-1.5">
          <FiLayers className="h-3.5 w-3.5 text-violet-400" />
          <strong className="text-slate-200">{parsedElements.length}</strong> gán được
        </span>
        <div className="w-px h-3 bg-secondary" />
        <span><strong className="text-emerald-400">{workspaces.length}</strong> đã gán</span>
        <div className="w-px h-3 bg-secondary" />
        <span><strong className="text-slate-400">{parsedElements.length - workspaces.length}</strong> chưa gán</span>
      </div>
    </div>
  );
};

export default SVGFloorPlanEditor;
