import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FiPlus, FiMinus, FiMaximize2 } from 'react-icons/fi';
import type { WorkspaceResponse } from '../../lib/spaceApi';

/* ─── Types ─── */

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

/* ─── Ignore list: SVG system elements that shouldn't be assignable ─── */
const IGNORE_PREFIXES = [
  'defs', 'gradient', 'clip', 'mask', 'filter', 'pattern',
  'linearGradient', 'radialGradient', 'clipPath', 'symbol',
];

const isAssignableElement = (id: string): boolean => {
  if (!id || id.trim() === '') return false;
  return !IGNORE_PREFIXES.some((p) => id.toLowerCase().startsWith(p.toLowerCase()));
};

/* ─── Component ─── */

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
      console.error('[SVGEditor] svgContent preview:', svgContent.substring(0, 200));
      container.innerHTML = '<p class="text-sm text-destructive p-4">File SVG không hợp lệ (lỗi parse XML).</p>';
      return;
    }

    const svgEl = doc.querySelector('svg');
    if (!svgEl) {
      console.error('[SVGEditor] No <svg> element found. Content starts with:', svgContent.substring(0, 200));
      container.innerHTML = '<p class="text-sm text-destructive p-4">File SVG không hợp lệ (không tìm thấy thẻ svg).</p>';
      return;
    }

    // Ensure SVG scales to fill container
    // Remove fixed dimensions, let viewBox handle scaling
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.width = '100%';
    svgEl.style.height = '100%';
    // Ensure viewBox exists for proper scaling
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

    // Apply styles & handlers to assignable elements
    applyInteractiveStyles(container, elements);

    // Cleanup
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
          fillColor = 'rgba(59,130,246,0.25)';
          strokeColor = '#3B82F6';
          strokeWidth = '3';
        } else if (ws) {
          if (ws.status === 'active') {
            fillColor = isHovered ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.15)';
            strokeColor = '#22C55E';
            strokeWidth = isHovered ? '2.5' : '1.5';
          } else if (ws.status === 'maintenance') {
            fillColor = isHovered ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.15)';
            strokeColor = '#F59E0B';
            strokeWidth = isHovered ? '2.5' : '1.5';
          } else {
            fillColor = 'rgba(148,163,184,0.15)';
            strokeColor = '#94A3B8';
            strokeWidth = '1.5';
          }
        } else {
          // Unassigned
          fillColor = isHovered ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.08)';
          strokeColor = isHovered ? '#3B82F6' : '#94A3B8';
          strokeWidth = isHovered ? '2' : '1';
        }

        el.style.fill = fillColor;
        el.style.stroke = strokeColor;
        el.style.strokeWidth = strokeWidth;
        el.style.cursor = 'pointer';
        el.style.transition = 'fill 150ms, stroke 150ms, stroke-width 150ms';

        // Event handlers (re-attach on each render)
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
        <svg className="h-16 w-16 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </svg>
        <p className="font-medium">Chưa có bản đồ SVG</p>
        <p className="text-sm">Tải lên file SVG cho tầng này để bắt đầu gán không gian.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Zoom controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <button onClick={handleZoomIn} className="btn btn-ghost btn-sm p-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm" aria-label="Phóng to">
          <FiPlus className="h-4 w-4" />
        </button>
        <button onClick={handleZoomOut} className="btn btn-ghost btn-sm p-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm" aria-label="Thu nhỏ">
          <FiMinus className="h-4 w-4" />
        </button>
        <button onClick={handleReset} className="btn btn-ghost btn-sm p-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm" aria-label="Reset zoom">
          <FiMaximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-4 px-4 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: '#22C55E' }} />
          <span className="text-xs font-medium text-muted-foreground">Đã gán</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: '#94A3B8' }} />
          <span className="text-xs font-medium text-muted-foreground">Chưa gán</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="text-xs font-medium text-muted-foreground">Bảo trì</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredId && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-card border border-border shadow-lg text-sm animate-fade-in">
          <span className="font-mono text-primary font-semibold">#{hoveredId}</span>
          {wsMap.has(hoveredId) ? (
            <span className="ml-2 text-muted-foreground">
              → {wsMap.get(hoveredId)!.name} ({wsMap.get(hoveredId)!.code})
            </span>
          ) : (
            <span className="ml-2 text-muted-foreground">— Chưa gán workspace</span>
          )}
        </div>
      )}

      {/* SVG container */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20">
        <div
          ref={containerRef}
          className="svg-floor-plan-container"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 200ms ease',
            width: '100%',
            height: '100%',
            padding: '8px',
          }}
          onClick={() => onSelectElement(null)} // Deselect when clicking background
        />
      </div>

      {/* Element count */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
        <span>{parsedElements.length} element(s) có thể gán</span>
        <span>{workspaces.length} workspace đã gán</span>
        <span>{parsedElements.length - workspaces.length} chưa gán</span>
      </div>
    </div>
  );
};

export default SVGFloorPlanEditor;
