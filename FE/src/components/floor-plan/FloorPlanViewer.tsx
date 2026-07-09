/**
 * FloorPlanViewer — Read-only floor plan renderer for customer-facing pages.
 * Renders elements from a FloorLayout JSON with availability status colors.
 */

import React, { useState, useCallback } from 'react';
import { FiPlus, FiMinus, FiMaximize2 } from 'react-icons/fi';
import type { FloorLayout, LayoutElement } from '../../types/floorPlan';
import ElementRenderer from './ElementRenderer';
import { ELEMENT_CATALOG } from '../../data/elementCatalog';

interface Props {
  layout: FloorLayout;
  selectedWsId: string | null;
  onSelectWorkspace: (wsId: string | null) => void;
  /** Optional: returns availability status for a workspace */
  getAvailability?: (wsId: string) => 'available' | 'booked' | 'maintenance';
  isAdmin?: boolean;
  onElementClick?: (el: LayoutElement) => void;
}

const FloorPlanViewer: React.FC<Props> = ({
  layout,
  selectedWsId,
  onSelectWorkspace,
  getAvailability,
  isAdmin = false,
  onElementClick,
}) => {
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { width, height, gridSize } = layout.canvas;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  const handleElementClick = useCallback(
    (el: LayoutElement) => {
      if (isAdmin && onElementClick) {
        onElementClick(el);
        return;
      }
      // Only workspace-linked elements are clickable for clients
      if (!el.workspaceId) return;
      if (getAvailability) {
        const avail = getAvailability(el.workspaceId);
        if (avail === 'maintenance') return;
      }
      onSelectWorkspace(
        selectedWsId === el.workspaceId ? null : el.workspaceId
      );
    },
    [selectedWsId, onSelectWorkspace, getAvailability, isAdmin, onElementClick]
  );

  /** Override element colors based on availability status or admin assignment state */
  const getElementWithStatus = (el: LayoutElement): LayoutElement => {
    // Check if it is a linkable type
    const catalogItem = ELEMENT_CATALOG.find((c) => c.type === el.type);
    const canLink = catalogItem?.canLinkWorkspace ?? false;

    if (isAdmin) {
      if (!canLink) return el;
      
      const isSelected = selectedWsId === el.workspaceId;
      let fillColor = el.fillColor;
      let strokeColor = el.strokeColor;

      if (el.workspaceId) {
        // Linked workspace
        const avail = getAvailability ? getAvailability(el.workspaceId) : 'available';
        if (isSelected) {
          fillColor = 'rgba(59,130,246,0.22)';
          strokeColor = '#3B82F6';
        } else if (avail === 'maintenance') {
          fillColor = 'rgba(245,158,11,0.12)';
          strokeColor = '#F59E0B';
        } else {
          fillColor = 'rgba(34,197,94,0.12)';
          strokeColor = '#22C55E';
        }
      } else {
        // Unassigned elements: light gray with dashed/gray stroke
        fillColor = 'rgba(148,163,184,0.08)';
        strokeColor = '#94A3B8';
      }

      return { ...el, fillColor, strokeColor };
    }

    if (!el.workspaceId || !getAvailability) return el;

    const avail = getAvailability(el.workspaceId);
    const isSelected = selectedWsId === el.workspaceId;

    let fillColor = el.fillColor;
    let strokeColor = el.strokeColor;

    if (isSelected) {
      fillColor = 'rgba(59,130,246,0.18)';
      strokeColor = '#3B82F6';
    } else if (avail === 'available') {
      fillColor = 'rgba(34,197,94,0.12)';
      strokeColor = '#22C55E';
    } else if (avail === 'booked') {
      fillColor = 'rgba(239,68,68,0.1)';
      strokeColor = '#EF4444';
    } else if (avail === 'maintenance') {
      fillColor = 'rgba(148,163,184,0.12)';
      strokeColor = '#94A3B8';
    }

    return { ...el, fillColor, strokeColor };
  };

  // Stats
  const wsElements = layout.elements.filter((e) => e.workspaceId);
  const stats = getAvailability
    ? {
        available: wsElements.filter(
          (e) => getAvailability(e.workspaceId!) === 'available'
        ).length,
        booked: wsElements.filter(
          (e) => getAvailability(e.workspaceId!) === 'booked'
        ).length,
        maintenance: wsElements.filter(
          (e) => getAvailability(e.workspaceId!) === 'maintenance'
        ).length,
      }
    : null;

  // Hovered element info
  const hoveredEl = hoveredId
    ? layout.elements.find((e) => e.id === hoveredId)
    : null;
  const hoveredCatalog = hoveredEl
    ? ELEMENT_CATALOG.find((c) => c.type === hoveredEl.type)
    : null;

  return (
    <div className="relative w-full h-full">
      {/* Zoom controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="btn btn-ghost btn-sm p-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
          aria-label="Phóng to"
        >
          <FiPlus className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="btn btn-ghost btn-sm p-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
          aria-label="Thu nhỏ"
        >
          <FiMinus className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          className="btn btn-ghost btn-sm p-2 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
          aria-label="Reset zoom"
        >
          <FiMaximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      {stats && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-4 px-4 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
            <span className="text-xs font-medium text-muted-foreground">
              Trống ({stats.available})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
            <span className="text-xs font-medium text-muted-foreground">
              Đã đặt ({stats.booked})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#94A3B8]" />
            <span className="text-xs font-medium text-muted-foreground">
              Bảo trì ({stats.maintenance})
            </span>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredEl && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg bg-card border border-border shadow-lg text-sm animate-fade-in">
          <span className="mr-1">{hoveredCatalog?.icon}</span>
          <span className="font-semibold">{hoveredEl.label}</span>
          {hoveredEl.sublabel && (
            <span className="ml-2 text-muted-foreground text-xs">
              {hoveredEl.sublabel}
            </span>
          )}
          {hoveredEl.workspaceId && getAvailability && (
            <span
              className={`ml-2 text-xs font-medium ${
                getAvailability(hoveredEl.workspaceId) === 'available'
                  ? 'text-[#22C55E]'
                  : getAvailability(hoveredEl.workspaceId) === 'booked'
                    ? 'text-[#EF4444]'
                    : 'text-[#94A3B8]'
              }`}
            >
              {getAvailability(hoveredEl.workspaceId) === 'available'
                ? '● Trống'
                : getAvailability(hoveredEl.workspaceId) === 'booked'
                  ? '● Đã đặt'
                  : '● Bảo trì'}
            </span>
          )}
        </div>
      )}

      {/* SVG */}
      <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 200ms ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelectWorkspace(null);
          }}
        >
          <defs>
            <pattern
              id="viewer-grid"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="var(--border-subtle, #E2E8F0)"
                strokeWidth={0.25}
              />
            </pattern>
          </defs>

          <rect
            width={width}
            height={height}
            fill="url(#viewer-grid)"
            rx={4}
          />

          {layout.elements
            .filter((el) => el.visible)
            .map((el) => {
              const styledEl = getElementWithStatus(el);
              const catalogItem = ELEMENT_CATALOG.find((c) => c.type === el.type);
              const canLink = catalogItem?.canLinkWorkspace ?? false;
              const cursor = isAdmin 
                ? (canLink ? 'pointer' : 'default') 
                : (el.workspaceId ? 'pointer' : 'default');

              return (
                <ElementRenderer
                  key={el.id}
                  element={styledEl}
                  isSelected={selectedWsId === el.workspaceId}
                  isHovered={hoveredId === el.id}
                  cursor={cursor}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleElementClick(el);
                  }}
                  onMouseEnter={() => setHoveredId(el.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              );
            })}
        </svg>
      </div>
    </div>
  );
};

export default React.memo(FloorPlanViewer);
