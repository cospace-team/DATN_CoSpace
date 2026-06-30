import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  FiCalendar, FiGrid, FiList, FiMap, FiChevronLeft, FiChevronRight,
  FiClock, FiTag, FiUsers, FiX, FiCheck, FiPlus, FiMinus, FiMaximize2,
  FiChevronDown, FiCoffee, FiMonitor
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  branches, floors, workspaces, workspaceTypes, pricePolicies,
  getFloorsByBranch, getWorkspacesByFloor, getWorkspaceType, bookings, Workspace
} from '../../data/mockData';
import { formatVND, durationUnitLabel, workspaceTypeLabel } from '../../utils/formatters';

/* ── Types ── */
type ViewMode = 'map' | 'day' | 'grid' | 'list';

interface ZoneConfig {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  workspaceIds: string[];
}

/* ── Zone configuration for floor plan ── */
const ZONES: ZoneConfig[] = [
  {
    id: 'zone-mgmt',
    name: 'Quản lý',
    color: '#EF4444',
    bgColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.25)',
    workspaceIds: ['ws-0011', 'ws-0012'],
  },
  {
    id: 'zone-tech',
    name: 'Công nghệ',
    color: '#22C55E',
    bgColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.25)',
    workspaceIds: ['ws-0001', 'ws-0002', 'ws-0003', 'ws-0004'],
  },
  {
    id: 'zone-creative',
    name: 'Sáng tạo',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.25)',
    workspaceIds: ['ws-0005', 'ws-0006', 'ws-0007', 'ws-0008'],
  },
  {
    id: 'zone-meeting',
    name: 'Phòng họp',
    color: '#3B82F6',
    bgColor: 'rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.25)',
    workspaceIds: ['ws-0009', 'ws-0010', 'ws-0013'],
  },
];

/* ── Workspace positions on floor plan (x, y, w, h in % of SVG viewBox) ── */
interface WsLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'desk' | 'meeting' | 'office' | 'standing';
  label: string;
  sublabel?: string;
  rotation?: number;
}

const FLOOR1_LAYOUT: WsLayout[] = [
  // Zone: Quản lý (top-left, red)
  { id: 'ws-0011', x: 40, y: 60, w: 180, h: 130, type: 'office', label: 'Bamboo', sublabel: 'VĂN PHÒNG RIÊNG' },
  { id: 'ws-0012', x: 40, y: 210, w: 180, h: 130, type: 'office', label: 'Jasmine', sublabel: 'VĂN PHÒNG RIÊNG' },

  // Zone: Phòng họp (top-center/right, blue)
  { id: 'ws-0009', x: 260, y: 60, w: 200, h: 130, type: 'meeting', label: 'Lotus', sublabel: 'PHÒNG HỌP · 8 CHỖ' },
  { id: 'ws-0010', x: 260, y: 210, w: 200, h: 130, type: 'meeting', label: 'Orchid', sublabel: 'PHÒNG HỌP · 12 CHỖ' },

  // Zone: Công nghệ (right, green) — Hot Desks
  { id: 'ws-0001', x: 510, y: 60, w: 100, h: 80, type: 'desk', label: 'HD-01' },
  { id: 'ws-0002', x: 620, y: 60, w: 100, h: 80, type: 'desk', label: 'HD-02' },
  { id: 'ws-0003', x: 510, y: 160, w: 100, h: 80, type: 'desk', label: 'HD-03' },
  { id: 'ws-0004', x: 620, y: 160, w: 100, h: 80, type: 'desk', label: 'HD-04' },

  // Zone: Sáng tạo (bottom, yellow) — More Desks + Standing
  { id: 'ws-0005', x: 510, y: 280, w: 100, h: 80, type: 'desk', label: 'HD-05' },
  { id: 'ws-0006', x: 620, y: 280, w: 100, h: 80, type: 'desk', label: 'HD-06' },
  { id: 'ws-0007', x: 510, y: 380, w: 100, h: 80, type: 'standing', label: 'DD-01' },
  { id: 'ws-0008', x: 620, y: 380, w: 100, h: 80, type: 'standing', label: 'DD-02' },

  // Event space bottom-left
  { id: 'ws-0013', x: 40, y: 370, w: 420, h: 90, type: 'meeting', label: 'Saigon', sublabel: 'HỘI TRƯỜNG · 30 CHỖ' },
];

/* ── Helper: get workspace availability ── */
const getWsAvailability = (wsId: string, date: Date, hour: number): 'available' | 'booked' | 'maintenance' => {
  const ws = workspaces.find(w => w.id === wsId);
  if (!ws || ws.status === 'maintenance') return 'maintenance';
  const activeBooking = bookings.find(b => {
    if (b.workspace_id !== wsId) return false;
    if (['canceled', 'expired', 'completed'].includes(b.status)) return false;
    const start = new Date(b.start_at);
    const end = new Date(b.end_at);
    const check = new Date(date);
    check.setHours(hour, 0, 0, 0);
    return check >= start && check < end;
  });
  return activeBooking ? 'booked' : 'available';
};

/* ── Floor Plan SVG Component ── */
const FloorPlanSVG: React.FC<{
  layouts: WsLayout[];
  selectedWs: string | null;
  onSelectWs: (id: string) => void;
  date: Date;
  hour: number;
  zoom: number;
  pan: { x: number; y: number };
}> = ({ layouts, selectedWs, onSelectWs, date, hour, zoom, pan }) => {
  const getZone = (wsId: string) => ZONES.find(z => z.workspaceIds.includes(wsId));

  const statusColor = (wsId: string) => {
    const s = getWsAvailability(wsId, date, hour);
    if (s === 'available') return '#22C55E';
    if (s === 'booked') return '#EF4444';
    return '#94A3B8';
  };

  const statusFill = (wsId: string) => {
    const s = getWsAvailability(wsId, date, hour);
    if (s === 'available') return 'rgba(34,197,94,0.10)';
    if (s === 'booked') return 'rgba(239,68,68,0.08)';
    return 'rgba(148,163,184,0.12)';
  };

  return (
    <svg
      viewBox="0 0 780 510"
      className="w-full h-full"
      style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center center' }}
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-subtle)" strokeWidth="0.3" />
        </pattern>
        <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Background grid */}
      <rect width="780" height="510" fill="url(#grid)" rx="8" />

      {/* Room boundary / Outer wall */}
      <rect x="20" y="30" width="740" height="450" rx="6"
        fill="none" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 3" />

      {/* Zone backgrounds */}
      {ZONES.map(zone => {
        const zoneWs = layouts.filter(l => zone.workspaceIds.includes(l.id));
        if (zoneWs.length === 0) return null;
        const minX = Math.min(...zoneWs.map(w => w.x)) - 15;
        const minY = Math.min(...zoneWs.map(w => w.y)) - 25;
        const maxX = Math.max(...zoneWs.map(w => w.x + w.w)) + 15;
        const maxY = Math.max(...zoneWs.map(w => w.y + w.h)) + 15;
        return (
          <g key={zone.id}>
            <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY}
              rx="8" fill={zone.bgColor} stroke={zone.borderColor} strokeWidth="1.5" />
            <text x={minX + 8} y={minY + 14} fontSize="9" fontWeight="700" fill={zone.color}
              textAnchor="start" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {zone.name}
            </text>
          </g>
        );
      })}

      {/* Decorative: Entry/Reception */}
      <g>
        <rect x="230" y="35" width="80" height="22" rx="4" fill="var(--bg-surface-hover)" stroke="var(--border-subtle)" strokeWidth="0.8" />
        <text x="270" y="49" fontSize="8" fill="var(--text-tertiary)" textAnchor="middle" fontWeight="600">LỐI VÀO</text>
      </g>
      <g>
        <rect x="340" y="35" width="90" height="22" rx="4" fill="var(--bg-surface-hover)" stroke="var(--border-subtle)" strokeWidth="0.8" />
        <text x="385" y="49" fontSize="8" fill="var(--text-tertiary)" textAnchor="middle" fontWeight="600">LỄ TÂN</text>
      </g>

      {/* Decorative: Lounge area */}
      <g>
        <rect x="40" y="355" width="100" height="5" rx="2" fill="var(--border-subtle)" opacity="0.5" />
        <text x="90" y="350" fontSize="7" fill="var(--text-tertiary)" textAnchor="middle" fontWeight="600">LOUNGE</text>
      </g>

      {/* Workspaces */}
      {layouts.map(ws => {
        const zone = getZone(ws.id);
        const avail = getWsAvailability(ws.id, date, hour);
        const isSelected = selectedWs === ws.id;
        const dotColor = statusColor(ws.id);
        const availLabel = avail === 'available' ? 'Trống' : avail === 'booked' ? 'Đã đặt' : 'Bảo trì';

        return (
          <g key={ws.id}
            onClick={() => avail !== 'maintenance' && onSelectWs(ws.id)}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && avail !== 'maintenance') { e.preventDefault(); onSelectWs(ws.id); } }}
            role="button"
            tabIndex={avail !== 'maintenance' ? 0 : -1}
            aria-label={`${ws.label} - ${availLabel}`}
            className="cursor-pointer"
            style={{ transition: 'opacity 150ms' }}
          >
            {/* Workspace box */}
            <rect
              x={ws.x} y={ws.y} width={ws.w} height={ws.h}
              rx={ws.type === 'meeting' || ws.type === 'office' ? 6 : 4}
              fill={isSelected ? 'rgba(59,130,246,0.12)' : statusFill(ws.id)}
              stroke={isSelected ? '#3B82F6' : (zone?.borderColor || 'var(--border-subtle)')}
              strokeWidth={isSelected ? 2.5 : 1}
              filter={isSelected ? 'url(#shadow)' : undefined}
            />

            {/* Desk/table icon */}
            {(ws.type === 'desk' || ws.type === 'standing') && (
              <g>
                {/* Table */}
                <rect x={ws.x + ws.w * 0.2} y={ws.y + ws.h * 0.3} width={ws.w * 0.6} height={ws.h * 0.35}
                  rx="3" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="0.8" />
                {/* Chair dots */}
                <circle cx={ws.x + ws.w * 0.5} cy={ws.y + ws.h * 0.18} r="5"
                  fill={avail === 'available' ? '#22C55E' : avail === 'booked' ? '#EF4444' : '#94A3B8'} />
                {ws.type === 'standing' && (
                  <line x1={ws.x + ws.w * 0.3} y1={ws.y + ws.h * 0.75} x2={ws.x + ws.w * 0.7} y2={ws.y + ws.h * 0.75}
                    stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" />
                )}
              </g>
            )}

            {/* Meeting room icon */}
            {ws.type === 'meeting' && (
              <g>
                {/* Large table */}
                <rect x={ws.x + ws.w * 0.15} y={ws.y + ws.h * 0.25} width={ws.w * 0.7} height={ws.h * 0.45}
                  rx="6" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="0.8" />
                {/* Chair dots around */}
                {[0.25, 0.5, 0.75].map((pos, i) => (
                  <React.Fragment key={i}>
                    <circle cx={ws.x + ws.w * pos} cy={ws.y + ws.h * 0.15} r="4.5"
                      fill={avail === 'available' ? '#22C55E' : avail === 'booked' ? '#EF4444' : '#94A3B8'} />
                    <circle cx={ws.x + ws.w * pos} cy={ws.y + ws.h * 0.8} r="4.5"
                      fill={avail === 'available' ? '#22C55E' : avail === 'booked' ? '#EF4444' : '#94A3B8'} />
                  </React.Fragment>
                ))}
              </g>
            )}

            {/* Office room icon */}
            {ws.type === 'office' && (
              <g>
                <rect x={ws.x + ws.w * 0.12} y={ws.y + ws.h * 0.3} width={ws.w * 0.5} height={ws.h * 0.4}
                  rx="3" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="0.8" />
                <circle cx={ws.x + ws.w * 0.37} cy={ws.y + ws.h * 0.22} r="5"
                  fill={avail === 'available' ? '#22C55E' : avail === 'booked' ? '#EF4444' : '#94A3B8'} />
                {/* Small cabinet */}
                <rect x={ws.x + ws.w * 0.72} y={ws.y + ws.h * 0.3} width={ws.w * 0.18} height={ws.h * 0.4}
                  rx="2" fill="var(--bg-surface-hover)" stroke="var(--border-subtle)" strokeWidth="0.5" />
              </g>
            )}

            {/* Label */}
            <text x={ws.x + ws.w / 2} y={ws.y + ws.h - (ws.sublabel ? 14 : 8)}
              fontSize={ws.type === 'desk' || ws.type === 'standing' ? '9' : '11'}
              fontWeight="700" fill="var(--text-main)" textAnchor="middle">
              {ws.label}
            </text>
            {ws.sublabel && (
              <text x={ws.x + ws.w / 2} y={ws.y + ws.h - 4}
                fontSize="6.5" fontWeight="600" fill="var(--text-tertiary)" textAnchor="middle"
                style={{ letterSpacing: '0.05em' }}>
                {ws.sublabel}
              </text>
            )}
          </g>
        );
      })}

      {/* Decorative plants / features */}
      {[{ x: 745, y: 50 }, { x: 745, y: 200 }, { x: 745, y: 350 }, { x: 25, y: 350 }].map((pos, i) => (
        <g key={`plant-${i}`}>
          <text x={pos.x} y={pos.y} fontSize="12" textAnchor="middle">🌿</text>
        </g>
      ))}
    </svg>
  );
};

/* ── Booking Panel (shared between desktop sidebar and mobile bottom sheet) ── */
const BookingPanel: React.FC<{
  ws: Workspace;
  wsType: any;
  wsAvail: string | null;
  selectedWs: string;
  selectedHour: number;
  getPrice: () => any;
  onClose: () => void;
  onBookNow: (endHour: number, services: Record<string, number>, subtotal: number, addonTotal: number) => void;
}> = ({ ws, wsType, wsAvail, selectedWs, selectedHour, getPrice, onClose, onBookNow }) => {
  const price = getPrice();
  const ZONES_REF = ZONES;

  const [endHour, setEndHour] = useState(Math.min(selectedHour + 2, 22));
  const [services, setServices] = useState<Record<string, number>>({});

  useEffect(() => {
    setEndHour(Math.max(selectedHour + 1, Math.min(selectedHour + 2, 22)));
    setServices({});
  }, [selectedHour, selectedWs]);

  const handleServiceChange = (id: string, isChecked: boolean) => {
    setServices(prev => {
      const next = { ...prev };
      if (isChecked) next[id] = 1;
      else delete next[id];
      return next;
    });
  };

  const MOCK_SERVICES = [
    { id: 'coffee', icon: <FiCoffee className="h-3.5 w-3.5" />, name: 'Cà phê', price: 35000 },
    { id: 'lunch', icon: <span className="text-xs">🍽️</span>, name: 'Cơm trưa', price: 55000 },
    { id: 'monitor', icon: <FiMonitor className="h-3.5 w-3.5" />, name: 'Màn hình phụ', price: 50000 },
  ];

  const duration = Math.max(1, endHour - selectedHour);
  const subtotal = duration * (price?.price || 0);
  const addonTotal = Object.keys(services).reduce((sum, id) => {
    const s = MOCK_SERVICES.find(x => x.id === id);
    return sum + (s?.price || 0);
  }, 0);
  const total = subtotal + addonTotal;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{ws.name}</h3>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }} aria-label="Đóng chi tiết">
          <FiX className="h-4 w-4" />
        </button>
      </div>

      {/* Status badge */}
      <span className={`badge ${wsAvail === 'available' ? 'badge-success' : wsAvail === 'booked' ? 'badge-danger' : 'badge-neutral'}`}>
        {wsAvail === 'available' ? '🟢 Trống' : wsAvail === 'booked' ? '🔴 Đã đặt' : '⚪ Bảo trì'}
      </span>

      {/* Info */}
      <div className="mt-5 space-y-3">
        <div className="rounded-xl bg-[var(--bg-surface-hover)] p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Loại</p>
              <p className="text-sm font-semibold">{wsType?.name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Sức chứa</p>
              <p className="text-sm font-semibold">{ws.capacity} chỗ</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Mã</p>
              <p className="text-sm font-mono">{ws.code}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Khu vực</p>
              {(() => { const zone = ZONES_REF.find(z => z.workspaceIds.includes(selectedWs)); return zone ? <p className="text-sm font-semibold" style={{ color: zone.color }}>{zone.name}</p> : <p className="text-sm">—</p>; })()}
            </div>
          </div>
        </div>

        {/* Price */}
        {price && (
          <div className="rounded-xl bg-[var(--brand-primary-light)] border border-[var(--brand-primary)] border-opacity-20 p-4">
            <p className="text-xs text-[var(--text-secondary)]">Giá</p>
            <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatVND(price.price)}</p>
            <p className="text-xs text-[var(--text-secondary)]">/{durationUnitLabel[price.duration_unit]?.toLowerCase()}</p>
          </div>
        )}

        {/* Time selection */}
        <div className="rounded-xl bg-[var(--bg-surface-hover)] p-3">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Thời gian</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`start-time-${selectedWs}`} className="text-xs text-[var(--text-secondary)]">Bắt đầu</label>
              <input id={`start-time-${selectedWs}`} type="time" defaultValue={`${String(selectedHour).padStart(2, '0')}:00`} className="input-field mt-1 text-sm" />
            </div>
            <div>
              <label htmlFor={`end-time-${selectedWs}`} className="text-xs text-[var(--text-secondary)]">Kết thúc</label>
              <select id={`end-time-${selectedWs}`} value={endHour} onChange={e => setEndHour(Number(e.target.value))} className="input-field mt-1 text-sm bg-transparent border-b border-border focus:outline-none w-full">
                {Array.from({ length: 23 - selectedHour }, (_, i) => selectedHour + i + 1).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add-on services */}
        <div className="rounded-xl bg-[var(--bg-surface-hover)] p-3">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Dịch vụ thêm</p>
          <div className="space-y-2">
            {MOCK_SERVICES.map(s => (
              <label key={s.id} htmlFor={`addon-${s.id}-${selectedWs}`} className="flex items-center gap-3 text-sm cursor-pointer">
                <input id={`addon-${s.id}-${selectedWs}`} type="checkbox" checked={!!services[s.id]} onChange={e => handleServiceChange(s.id, e.target.checked)} className="rounded accent-[var(--brand-primary)]" />
                <span className="flex items-center gap-1.5">{s.icon} {s.name}</span>
                <span className="ml-auto text-xs text-[var(--text-tertiary)]">+{formatVND(s.price)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Total Price summary */}
        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-sm font-semibold">Tổng cộng</span>
          <span className="text-lg font-bold text-[var(--brand-primary)]">{formatVND(total)}</span>
        </div>
      </div>

      {/* Book button */}
      {wsAvail === 'available' && (
        <button className="btn btn-primary w-full mt-5" onClick={() => onBookNow(endHour, services, subtotal, addonTotal)}>
          <FiCheck className="h-4 w-4" /> Đặt chỗ ngay
        </button>
      )}
      {wsAvail === 'booked' && (
        <div className="mt-5 rounded-xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-3 text-center">
          <p className="text-sm font-semibold text-[var(--state-danger)]">Đã được đặt</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Thử chọn khung giờ khác</p>
        </div>
      )}
    </div>
  );
};

/* ── Main Explore Page ── */
const ExplorePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve initial branch ID from search params (?branchId=...) or navigation state
  const initialBranchId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const qBranchId = params.get('branchId');
    if (qBranchId && branches.some(b => b.id === qBranchId)) {
      return qBranchId;
    }
    const stateBranchId = (location.state as { branchId?: string })?.branchId;
    if (stateBranchId && branches.some(b => b.id === stateBranchId)) {
      return stateBranchId;
    }
    return branches[0]?.id || '';
  }, [location.search, location.state]);

  const [selectedBranch, setSelectedBranch] = useState(initialBranchId);
  const [selectedFloor, setSelectedFloor] = useState('');

  // Sync state if initial branch selection changes
  useEffect(() => {
    setSelectedBranch(initialBranchId);
    setSelectedFloor('');
  }, [initialBranchId]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const branchFloors = useMemo(() => getFloorsByBranch(selectedBranch), [selectedBranch]);
  const currentFloor = selectedFloor || branchFloors[0]?.id || '';
  const currentFloorData = branchFloors.find(f => f.id === currentFloor);

  const floorWorkspaces = useMemo(() => getWorkspacesByFloor(currentFloor), [currentFloor]);

  const selectedWsData = selectedWs ? workspaces.find(w => w.id === selectedWs) : null;
  const selectedWsType = selectedWsData ? getWorkspaceType(selectedWsData.workspace_type_id) : null;
  const selectedWsAvail = selectedWs ? getWsAvailability(selectedWs, selectedDate, selectedHour) : null;

  const getPrice = (wsTypeId: string) => {
    const bp = pricePolicies.find(p => p.workspace_type_id === wsTypeId && p.branch_id === selectedBranch && p.is_active);
    const gp = pricePolicies.find(p => p.workspace_type_id === wsTypeId && !p.branch_id && p.is_active);
    return bp || gp;
  };

  const formatDateShort = (d: Date) => d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  const shiftDate = (offset: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    if (d < today) return; // Prevent picking past dates
    setSelectedDate(d);
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleBookNow = (endHour: number, services: Record<string, number>, subtotal: number, addonTotal: number) => {
    if (!selectedWsData) return;
    const price = getPrice(selectedWsData.workspace_type_id);
    navigate('/customer/checkout', {
      state: {
        workspace: selectedWsData,
        workspaceType: selectedWsType,
        date: selectedDate,
        hour: selectedHour,
        endHour: endHour,
        services: services,
        subtotal: subtotal,
        addonTotal: addonTotal,
        total: subtotal + addonTotal,
        price: price
      }
    });
  };

  /* Stats */
  const stats = useMemo(() => {
    const total = FLOOR1_LAYOUT.length;
    const available = FLOOR1_LAYOUT.filter(l => getWsAvailability(l.id, selectedDate, selectedHour) === 'available').length;
    const booked = FLOOR1_LAYOUT.filter(l => getWsAvailability(l.id, selectedDate, selectedHour) === 'booked').length;
    return { total, available, booked, maintenance: total - available - booked };
  }, [selectedDate, selectedHour]);

  return (
    <div className="flex flex-col h-full" style={{ margin: '-24px', width: 'calc(100% + 48px)', height: 'calc(100% + 48px)' }}>
      {/* ── Top Toolbar ── */}
      <div className="flex items-center gap-1 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] shrink-0 overflow-x-auto">
        {/* View mode switcher */}
        <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden shrink-0">
          {([
            { mode: 'day' as ViewMode, label: 'NGÀY', icon: <FiCalendar className="h-3.5 w-3.5" /> },
            { mode: 'grid' as ViewMode, label: 'LƯỚI', icon: <FiGrid className="h-3.5 w-3.5" /> },
            { mode: 'list' as ViewMode, label: 'DANH SÁCH', icon: <FiList className="h-3.5 w-3.5" /> },
            { mode: 'map' as ViewMode, label: 'BẢN ĐỒ', icon: <FiMap className="h-3.5 w-3.5" /> },
          ]).map(v => (
            <button key={v.mode} onClick={() => setViewMode(v.mode)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all ${
                viewMode === v.mode
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
              }`}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        <div className="w-px h-7 bg-[var(--border-subtle)] mx-2 shrink-0" />

        {/* Date navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => shiftDate(-1)} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} aria-label="Ngày trước"><FiChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => shiftDate(1)} className="btn btn-ghost btn-sm" style={{ padding: '6px' }} aria-label="Ngày sau"><FiChevronRight className="h-4 w-4" /></button>
          <span className="text-xs font-semibold text-[var(--text-main)] px-2 whitespace-nowrap">{formatDateShort(selectedDate)}</span>
        </div>

        <div className="w-px h-7 bg-[var(--border-subtle)] mx-2 shrink-0" />

        {/* Floor/Level selector */}
        <div className="relative shrink-0">
          <select value={currentFloor} onChange={e => setSelectedFloor(e.target.value)}
            className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-[var(--text-main)] cursor-pointer">
            {branchFloors.map(f => (
              <option key={f.id} value={f.id}>TẦNG {f.floor_no}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-tertiary)] pointer-events-none" />
        </div>

        <div className="w-px h-7 bg-[var(--border-subtle)] mx-2 shrink-0" />

        {/* Time slider */}
        <div className="flex items-center gap-2 shrink-0">
          <FiClock className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          <input type="range" min={6} max={22} value={selectedHour}
            onChange={e => setSelectedHour(Number(e.target.value))}
            className="w-24 h-1.5 accent-[var(--brand-primary)]"
            aria-label="Chọn giờ"
            aria-valuemin={6} aria-valuemax={22} aria-valuenow={selectedHour} />
          <span className="text-xs font-semibold text-[var(--text-main)] w-12 tabular-nums">{String(selectedHour).padStart(2, '0')}:00</span>
        </div>

        <div className="w-px h-7 bg-[var(--border-subtle)] mx-2 shrink-0" />

        {/* Branch selector */}
        <div className="relative shrink-0">
          <select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedFloor(''); }}
            className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-[var(--text-main)] cursor-pointer">
            {branches.filter(b => b.status === 'active').map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--text-tertiary)] pointer-events-none" />
        </div>

        <div className="flex-1" />

        {/* Space tags toggle */}
        <button onClick={() => setShowTags(!showTags)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            showTags ? 'bg-[var(--brand-primary)] text-white' : 'border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]'
          }`}>
          <FiTag className="h-3.5 w-3.5" /> KHU VỰC
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Floor Plan Area */}
        <div className="flex-1 relative bg-[var(--bg-base)] overflow-hidden">
          {viewMode === 'map' ? (
            <>
              {/* Zoom controls */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <button onClick={handleZoomIn} className="btn btn-secondary btn-sm" style={{ padding: '8px', borderRadius: 'var(--radius-lg)' }} aria-label="Phóng to"><FiPlus className="h-4 w-4" /></button>
                <button onClick={handleZoomOut} className="btn btn-secondary btn-sm" style={{ padding: '8px', borderRadius: 'var(--radius-lg)' }} aria-label="Thu nhỏ"><FiMinus className="h-4 w-4" /></button>
                <button onClick={handleReset} className="btn btn-secondary btn-sm" style={{ padding: '8px', borderRadius: 'var(--radius-lg)' }} aria-label="Đặt lại zoom"><FiMaximize2 className="h-4 w-4" /></button>
              </div>

              {/* Availability indicator */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-4 px-4 py-2 rounded-xl bg-[var(--overlay-bg)] border border-[var(--border-subtle)] shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#22C55E]" />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Trống ({stats.available})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Đã đặt ({stats.booked})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#94A3B8]" />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Bảo trì ({stats.maintenance})</span>
                </div>
              </div>

              {/* SVG Floor Plan */}
              <div className="w-full h-full flex items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                  <FloorPlanSVG
                    layouts={FLOOR1_LAYOUT}
                    selectedWs={selectedWs}
                    onSelectWs={id => setSelectedWs(selectedWs === id ? null : id)}
                    date={selectedDate}
                    hour={selectedHour}
                    zoom={zoom}
                    pan={pan}
                  />
                </div>
              </div>

              {/* Zone legend (bottom) */}
              {showTags && (
                <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-center gap-6 px-6 py-3 rounded-xl bg-[var(--overlay-bg)] border border-[var(--border-subtle)] shadow-sm slide-in-up">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Khu vực:</span>
                  {ZONES.map(z => (
                    <div key={z.id} className="flex items-center gap-2">
                      <span className="h-3 w-6 rounded" style={{ background: z.color }} />
                      <span className="text-xs font-medium text-[var(--text-main)]">{z.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : viewMode === 'list' ? (
            /* ── LIST VIEW ── */
            <div className="p-6 overflow-y-auto h-full">
              <div className="section-card overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Workspace</th><th>Loại</th><th>Khu vực</th><th>Sức chứa</th><th>Trạng thái</th><th>Giá</th><th></th></tr>
                  </thead>
                  <tbody>
                    {FLOOR1_LAYOUT.map(l => {
                      const ws = workspaces.find(w => w.id === l.id);
                      const zone = ZONES.find(z => z.workspaceIds.includes(l.id));
                      const avail = getWsAvailability(l.id, selectedDate, selectedHour);
                      const wsType = ws ? getWorkspaceType(ws.workspace_type_id) : null;
                      const price = ws ? getPrice(ws.workspace_type_id) : null;
                      return (
                        <tr key={l.id} className={`cursor-pointer`} style={selectedWs === l.id ? { background: 'var(--brand-primary-light)' } : undefined}
                          onClick={() => setSelectedWs(selectedWs === l.id ? null : l.id)}>
                          <td className="font-semibold">{l.label}</td>
                          <td>{wsType?.name || l.type}</td>
                          <td>{zone && <span className="badge" style={{ background: zone.bgColor, color: zone.color, border: `1px solid ${zone.borderColor}` }}>{zone.name}</span>}</td>
                          <td>{ws?.capacity || '—'}</td>
                          <td>
                            <span className={`badge ${avail === 'available' ? 'badge-success' : avail === 'booked' ? 'badge-danger' : 'badge-neutral'}`}>
                              {avail === 'available' ? 'Trống' : avail === 'booked' ? 'Đã đặt' : 'Bảo trì'}
                            </span>
                          </td>
                          <td className="font-semibold text-[var(--brand-primary)]">{price ? formatVND(price.price) + '/' + durationUnitLabel[price.duration_unit]?.toLowerCase() : '—'}</td>
                          <td>{avail === 'available' && <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setSelectedWs(l.id); }}>Đặt</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            /* ── GRID VIEW ── */
            <div className="p-6 overflow-y-auto h-full">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {FLOOR1_LAYOUT.map(l => {
                  const ws = workspaces.find(w => w.id === l.id);
                  const zone = ZONES.find(z => z.workspaceIds.includes(l.id));
                  const avail = getWsAvailability(l.id, selectedDate, selectedHour);
                  const wsType = ws ? getWorkspaceType(ws.workspace_type_id) : null;
                  const price = ws ? getPrice(ws.workspace_type_id) : null;
                  return (
                    <div key={l.id}
                      onClick={() => setSelectedWs(selectedWs === l.id ? null : l.id)}
                      className="section-card card-interactive cursor-pointer" style={selectedWs === l.id ? { borderColor: 'var(--brand-primary)' } : undefined}>
                      <div className="flex items-center justify-between">
                        <span className={`badge ${avail === 'available' ? 'badge-success' : avail === 'booked' ? 'badge-danger' : 'badge-neutral'}`}>
                          {avail === 'available' ? 'Trống' : avail === 'booked' ? 'Đã đặt' : 'Bảo trì'}
                        </span>
                        {zone && <span className="h-2 w-6 rounded-full" style={{ background: zone.color }} />}
                      </div>
                      <h3 className="mt-3 font-semibold">{l.label}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">{wsType?.name} · {ws?.capacity} chỗ</p>
                      {price && (
                        <p className="mt-2 font-semibold text-sm text-[var(--brand-primary)]">{formatVND(price.price)}/{durationUnitLabel[price.duration_unit]?.toLowerCase()}</p>
                      )}
                      {avail === 'available' && (
                        <button className="btn btn-primary btn-sm w-full mt-3">Đặt chỗ</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── DAY VIEW (Timeline) ── */
            <div className="p-6 overflow-y-auto h-full">
              <div className="section-card overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Time header */}
                  <div className="flex border-b border-[var(--border-subtle)]">
                    <div className="w-32 shrink-0 p-3 text-xs font-semibold text-[var(--text-secondary)]">Workspace</div>
                    <div className="flex-1 flex">
                      {Array.from({ length: 17 }, (_, i) => i + 6).map(h => (
                        <div key={h} className={`flex-1 p-2 text-center text-xs border-l border-[var(--border-subtle)] ${h === selectedHour ? 'bg-[var(--brand-primary-light)] font-bold text-[var(--brand-primary)]' : 'text-[var(--text-tertiary)]'}`}>
                          {String(h).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Workspace rows */}
                  {FLOOR1_LAYOUT.slice(0, 8).map(l => {
                    const ws = workspaces.find(w => w.id === l.id);
                    return (
                      <div key={l.id} className="flex border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)]">
                        <div className="w-32 shrink-0 p-3 text-sm font-medium truncate">{l.label}</div>
                        <div className="flex-1 flex">
                          {Array.from({ length: 17 }, (_, i) => i + 6).map(h => {
                            const avail = getWsAvailability(l.id, selectedDate, h);
                            return (
                              <div key={h} className="flex-1 border-l border-[var(--border-subtle)] p-1 cursor-pointer"
                                onClick={() => { setSelectedHour(h); setSelectedWs(l.id); }}>
                                <div className={`w-full h-6 rounded ${
                                  avail === 'available' ? 'bg-[var(--state-success-bg)] hover:bg-[var(--state-success)]' :
                                  avail === 'booked' ? 'bg-[var(--state-danger-bg)]' : 'bg-[var(--state-neutral-bg)]'
                                } transition-colors`} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel — Booking Details ── */}
        {/* ── Right Panel — Desktop */}
        {selectedWs && selectedWsData && (
          <>
            {/* Desktop: side panel */}
            <div className="hidden lg:block w-80 shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-y-auto slide-in-right">
              <BookingPanel
                ws={selectedWsData}
                wsType={selectedWsType}
                wsAvail={selectedWsAvail}
                selectedWs={selectedWs}
                selectedHour={selectedHour}
                getPrice={() => getPrice(selectedWsData.workspace_type_id)}
                onClose={() => setSelectedWs(null)}
                onBookNow={handleBookNow}
              />
            </div>

            {/* Mobile: bottom sheet */}
            <div className="lg:hidden">
              <div className="bottom-sheet-overlay" onClick={() => setSelectedWs(null)} />
              <div className="bottom-sheet bottom-sheet-enter">
                <div className="bottom-sheet-handle" />
                <BookingPanel
                  ws={selectedWsData}
                  wsType={selectedWsType}
                  wsAvail={selectedWsAvail}
                  selectedWs={selectedWs}
                  selectedHour={selectedHour}
                  getPrice={() => getPrice(selectedWsData.workspace_type_id)}
                  onClose={() => setSelectedWs(null)}
                  onBookNow={handleBookNow}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
