/**
 * SelectionHandles — Renders resize handles around a selected element.
 * 8 handles: 4 corners + 4 midpoints.
 */

import React, { useCallback } from 'react';
import type { LayoutElement } from '../../types/floorPlan';

interface Props {
  element: LayoutElement;
  onResizeStart: (
    e: React.MouseEvent,
    elementId: string,
    handle: HandlePosition
  ) => void;
}

export type HandlePosition =
  | 'nw' | 'n' | 'ne'
  | 'w'        | 'e'
  | 'sw' | 's' | 'se';

const HANDLE_SIZE = 8;

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: 'nw-resize',
  n: 'n-resize',
  ne: 'ne-resize',
  w: 'w-resize',
  e: 'e-resize',
  sw: 'sw-resize',
  s: 's-resize',
  se: 'se-resize',
};

const handlePositions = (
  w: number,
  h: number
): Record<HandlePosition, { cx: number; cy: number }> => ({
  nw: { cx: 0, cy: 0 },
  n: { cx: w / 2, cy: 0 },
  ne: { cx: w, cy: 0 },
  w: { cx: 0, cy: h / 2 },
  e: { cx: w, cy: h / 2 },
  sw: { cx: 0, cy: h },
  s: { cx: w / 2, cy: h },
  se: { cx: w, cy: h },
});

const SelectionHandles: React.FC<Props> = ({ element, onResizeStart }) => {
  const positions = handlePositions(element.width, element.height);

  return (
    <g
      transform={`translate(${element.x}, ${element.y})`}
      style={{ pointerEvents: 'all' }}
    >
      {/* Selection border */}
      <rect
        x={-1}
        y={-1}
        width={element.width + 2}
        height={element.height + 2}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={1}
        strokeDasharray="4 2"
        style={{ pointerEvents: 'none' }}
      />

      {/* Resize handles */}
      {(Object.entries(positions) as [HandlePosition, { cx: number; cy: number }][]).map(
        ([pos, { cx, cy }]) => (
          <rect
            key={pos}
            x={cx - HANDLE_SIZE / 2}
            y={cy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            rx={2}
            fill="white"
            stroke="#3B82F6"
            strokeWidth={1.5}
            style={{ cursor: HANDLE_CURSORS[pos] }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, element.id, pos);
            }}
          />
        )
      )}
    </g>
  );
};

export default React.memo(SelectionHandles);
