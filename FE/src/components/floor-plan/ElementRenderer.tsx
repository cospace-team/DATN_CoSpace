/**
 * ElementRenderer — SVG rendering for each element type.
 * Renders a single LayoutElement as SVG group with type-specific inner shapes.
 */

import React from 'react';
import type { LayoutElement } from '../../types/floorPlan';

interface Props {
  element: LayoutElement;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  cursor?: string;
}

/** Render type-specific inner decoration inside the element bounds */
const InnerDecoration: React.FC<{
  el: LayoutElement;
  isSelected: boolean;
}> = ({ el }) => {
  const cx = el.width / 2;
  const cy = el.height / 2;

  switch (el.type) {
    case 'desk':
    case 'standing_desk':
      return (
        <g>
          {/* Table surface */}
          <rect
            x={el.width * 0.15}
            y={el.height * 0.25}
            width={el.width * 0.7}
            height={el.height * 0.4}
            rx={3}
            fill="var(--bg-surface, #fff)"
            stroke="var(--border-strong, #CBD5E1)"
            strokeWidth={0.8}
          />
          {/* Chair dot */}
          <circle
            cx={cx}
            cy={el.height * 0.15}
            r={Math.min(el.width, el.height) * 0.08}
            fill={el.strokeColor || '#22C55E'}
          />
          {el.type === 'standing_desk' && (
            <line
              x1={el.width * 0.25}
              y1={el.height * 0.78}
              x2={el.width * 0.75}
              y2={el.height * 0.78}
              stroke="var(--border-strong, #CBD5E1)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
        </g>
      );

    case 'chair':
      return (
        <g>
          {/* Chair seat back rest (arc or rect) */}
          <path
            d={`M ${el.width * 0.25} ${el.height * 0.2} Q ${el.width * 0.5} ${el.height * 0.05} ${el.width * 0.75} ${el.height * 0.2}`}
            fill="none"
            stroke={el.strokeColor || '#64748B'}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          {/* Chair seat arm rests */}
          <path
            d={`M ${el.width * 0.15} ${el.height * 0.3} L ${el.width * 0.15} ${el.height * 0.7}`}
            stroke={el.strokeColor || '#64748B'}
            strokeWidth={1.2}
          />
          <path
            d={`M ${el.width * 0.85} ${el.height * 0.3} L ${el.width * 0.85} ${el.height * 0.7}`}
            stroke={el.strokeColor || '#64748B'}
            strokeWidth={1.2}
          />
          {/* Chair seat cushion */}
          <rect
            x={el.width * 0.22}
            y={el.height * 0.25}
            width={el.width * 0.56}
            height={el.height * 0.5}
            rx={3}
            fill="var(--bg-surface, #fff)"
            stroke={el.strokeColor || '#64748B'}
            strokeWidth={1}
          />
        </g>
      );

    case 'meeting_room': {
      const seatCount = el.seatCount ?? 6;
      // Calculate dynamic seat positions
      const seats: Array<{ cx: number; cy: number }> = [];
      if (seatCount > 0) {
        if (seatCount === 1) {
          seats.push({ cx: el.width * 0.5, cy: el.height * 0.12 });
        } else if (seatCount === 2) {
          seats.push({ cx: el.width * 0.5, cy: el.height * 0.12 });
          seats.push({ cx: el.width * 0.5, cy: el.height * 0.78 });
        } else {
          let topCount = Math.floor(seatCount / 2);
          let bottomCount = Math.ceil(seatCount / 2);
          let hasLeft = false;
          let hasRight = false;
          let remaining = seatCount;

          if (remaining % 2 !== 0) {
            hasLeft = true;
            remaining -= 1;
          }
          if (remaining >= 8) {
            hasRight = true;
            remaining -= 1;
          }

          topCount = Math.floor(remaining / 2);
          bottomCount = Math.ceil(remaining / 2);

          for (let i = 0; i < topCount; i++) {
            const t = topCount === 1 ? 0.5 : 0.22 + (0.56 * i) / (topCount - 1);
            seats.push({ cx: el.width * t, cy: el.height * 0.12 });
          }
          for (let i = 0; i < bottomCount; i++) {
            const t = bottomCount === 1 ? 0.5 : 0.22 + (0.56 * i) / (bottomCount - 1);
            seats.push({ cx: el.width * t, cy: el.height * 0.78 });
          }
          if (hasLeft) {
            seats.push({ cx: el.width * 0.08, cy: el.height * 0.45 });
          }
          if (hasRight) {
            seats.push({ cx: el.width * 0.92, cy: el.height * 0.45 });
          }
        }
      }

      return (
        <g>
          {/* Large table */}
          <rect
            x={el.width * 0.15}
            y={el.height * 0.22}
            width={el.width * 0.7}
            height={el.height * 0.45}
            rx={6}
            fill="var(--bg-surface, #fff)"
            stroke="var(--border-strong, #CBD5E1)"
            strokeWidth={0.8}
          />
          {/* Chair dots */}
          {seats.map((seat, index) => (
            <circle
              key={index}
              cx={seat.cx}
              cy={seat.cy}
              r={4}
              fill={el.strokeColor || '#64748B'}
            />
          ))}
        </g>
      );
    }

    case 'private_office': {
      const seatCount = el.seatCount ?? 2;
      const seats: Array<{ cx: number; cy: number }> = [];
      if (seatCount > 0) {
        // Main desk chair behind the desk
        seats.push({ cx: el.width * 0.35, cy: el.height * 0.18 });
        
        // Visitor chairs in front of the desk
        const visitorCount = seatCount - 1;
        for (let i = 0; i < visitorCount; i++) {
          const t = visitorCount === 1 ? 0.35 : 0.15 + (0.4 * i) / (visitorCount - 1);
          seats.push({ cx: el.width * t, cy: el.height * 0.8 });
        }
      }

      return (
        <g>
          {/* Desk */}
          <rect
            x={el.width * 0.1}
            y={el.height * 0.28}
            width={el.width * 0.5}
            height={el.height * 0.38}
            rx={3}
            fill="var(--bg-surface, #fff)"
            stroke="var(--border-strong, #CBD5E1)"
            strokeWidth={0.8}
          />
          {/* Chairs */}
          {seats.map((seat, index) => (
            <circle
              key={index}
              cx={seat.cx}
              cy={seat.cy}
              r={index === 0 ? 5 : 4} // Main chair is slightly larger
              fill={el.strokeColor || '#8B5CF6'}
            />
          ))}
          {/* Cabinet */}
          <rect
            x={el.width * 0.7}
            y={el.height * 0.28}
            width={el.width * 0.2}
            height={el.height * 0.38}
            rx={2}
            fill="var(--bg-surface-hover, #F1F5F9)"
            stroke="var(--border-subtle, #E2E8F0)"
            strokeWidth={0.5}
          />
        </g>
      );
    }

    case 'wall':
      return null; // Wall is just a filled rect

    case 'door':
      return (
        <g>
          <line
            x1={el.width * 0.1}
            y1={cy}
            x2={el.width * 0.9}
            y2={cy}
            stroke={el.strokeColor || '#F59E0B'}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        </g>
      );

    case 'plant':
      return (
        <text
          x={cx}
          y={cy + 4}
          fontSize={Math.min(el.width, el.height) * 0.6}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          🌿
        </text>
      );

    case 'staircase':
      return (
        <g>
          {[0.2, 0.35, 0.5, 0.65, 0.8].map((pos) => (
            <line
              key={pos}
              x1={el.width * 0.15}
              y1={el.height * pos}
              x2={el.width * 0.85}
              y2={el.height * pos}
              stroke="var(--border-strong, #CBD5E1)"
              strokeWidth={1}
            />
          ))}
        </g>
      );

    case 'elevator':
      return (
        <g>
          <text
            x={cx}
            y={cy + 4}
            fontSize={Math.min(el.width, el.height) * 0.45}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            🛗
          </text>
        </g>
      );

    case 'restroom':
      return (
        <text
          x={cx}
          y={cy + 4}
          fontSize={Math.min(el.width, el.height) * 0.45}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          🚻
        </text>
      );

    case 'kitchen':
      return (
        <text
          x={cx}
          y={cy + 4}
          fontSize={Math.min(el.width, el.height) * 0.45}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          🍳
        </text>
      );

    case 'lounge':
      return (
        <text
          x={cx}
          y={cy + 4}
          fontSize={Math.min(el.width, el.height) * 0.35}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ☕
        </text>
      );

    case 'reception':
      return (
        <text
          x={cx}
          y={cy + 3}
          fontSize={Math.min(el.width, el.height) * 0.4}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          📋
        </text>
      );

    case 'phone_booth':
      return (
        <text
          x={cx}
          y={cy + 3}
          fontSize={Math.min(el.width, el.height) * 0.45}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          📞
        </text>
      );

    case 'event_space':
      return (
        <text
          x={cx}
          y={cy + 3}
          fontSize={Math.min(el.width, el.height) * 0.25}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          🎤
        </text>
      );

    case 'custom_workspace':
      return (
        <text
          x={cx}
          y={cy + 3}
          fontSize={Math.min(el.width, el.height) * 0.35}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          ✨
        </text>
      );

    default:
      return null;
  }
};

const ElementRenderer: React.FC<Props> = ({
  element: el,
  isSelected,
  isHovered,
  onClick,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  cursor,
}) => {
  if (!el.visible) return null;

  const strokeW = isSelected ? 2.5 : isHovered ? 2 : 1;
  const stroke = isSelected
    ? '#3B82F6'
    : isHovered
      ? (el.strokeColor || '#94A3B8')
      : (el.strokeColor || '#94A3B8');

  const fill = isSelected
    ? 'rgba(59,130,246,0.12)'
    : isHovered
      ? (el.fillColor || 'rgba(148,163,184,0.08)')
      : (el.fillColor || 'rgba(148,163,184,0.08)');

  const isCircle = el.type === 'custom_circle' || el.type === 'plant' || el.type === 'pillar' || el.type === 'chair';

  return (
    <g
      transform={`translate(${el.x}, ${el.y})${
        el.rotation ? ` rotate(${el.rotation}, ${el.width / 2}, ${el.height / 2})` : ''
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (onMouseDown) onMouseDown(e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        cursor: cursor || (el.locked ? 'not-allowed' : 'move'),
        opacity: el.opacity,
        transition: 'opacity 120ms',
        pointerEvents: cursor === 'default' ? 'none' : 'auto',
      }}
      data-element-id={el.id}
    >
      {/* Outer shape */}
      {isCircle ? (
        <ellipse
          cx={el.width / 2}
          cy={el.height / 2}
          rx={el.width / 2}
          ry={el.height / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 120ms, strokeWidth 120ms, fill 120ms' }}
        />
      ) : (
        <rect
          width={el.width}
          height={el.height}
          rx={el.cornerRadius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          style={{ transition: 'stroke 120ms, strokeWidth 120ms, fill 120ms' }}
        />
      )}

      {/* Inner decoration */}
      <InnerDecoration el={el} isSelected={isSelected} />

      {/* Label */}
      {el.label && el.type !== 'wall' && el.type !== 'door' && el.type !== 'window' && (
        <text
          x={el.width / 2}
          y={el.height - (el.sublabel ? 14 : 7)}
          fontSize={el.width > 100 ? 11 : 9}
          fontWeight={700}
          fill="var(--text-main, #0F172A)"
          textAnchor="middle"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {el.label}
        </text>
      )}
      {el.sublabel && (
        <text
          x={el.width / 2}
          y={el.height - 4}
          fontSize={7}
          fontWeight={600}
          fill="var(--text-tertiary, #94A3B8)"
          textAnchor="middle"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            letterSpacing: '0.05em',
          }}
        >
          {el.sublabel}
        </text>
      )}

      {/* Lock indicator */}
      {el.locked && (
        <text
          x={el.width - 8}
          y={12}
          fontSize={10}
          textAnchor="middle"
          style={{ pointerEvents: 'none' }}
        >
          🔒
        </text>
      )}
    </g>
  );
};

export default React.memo(ElementRenderer);
