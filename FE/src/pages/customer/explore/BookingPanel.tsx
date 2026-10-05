import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiCheck, FiPlus, FiUsers, FiClock, FiChevronDown, FiChevronUp, FiAlertCircle } from 'react-icons/fi';
import { WorkspaceAmenities } from '../../../components/WorkspaceAmenities';
import { formatVND, durationUnitLabel, toDateInputValue } from '../../../utils/formatters';
import { serviceLimitApi, type ExtraServiceDto, type ServiceAvailabilityDto } from '../../../api/addonApi';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import WorkspaceGallery from '../../../components/workspace/WorkspaceGallery';
import { ServiceIcon } from '../../../components/ui/ServiceIcon';
import type { ExtraServiceResponse } from '../../../lib/spaceApi';
import { firstBookableHour } from './ExploreFilters';

export type DurationUnitMode = 'hour' | 'day' | 'week';

export interface ExploreWorkspace {
  id: string;
  workspace_type_id: string;
  workspaceTypeName: string;
  code: string;
  name: string;
  capacity: number;
  svg_element_id: string;
  status: string;
  floor_id: string;
  branch_id: string;
  images?: { id: string; url: string }[];
}

export type PriceUnit = 'hour' | 'day' | 'week' | 'month';

export interface UnitPrice {
  price: number;
  duration_unit: PriceUnit;
}


const UNIT_LABELS: Record<DurationUnitMode, string> = {
  hour: 'Giờ',
  day: 'Ngày',
  week: 'Tuần',
};

/** Returns midnight (local) of a Date */
export const toMidnight = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

/** Count calendar days between two midnight-dates (inclusive start, exclusive end) */
export const daysDiff = (from: Date, to: Date): number =>
  Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));

interface BookingPanelProps {
  ws: ExploreWorkspace;
  wsType: any;
  wsAvail: string | null;
  selectedWs: string;
  selectedHour: number;
  initialEndHour: number;
  selectedDate: Date;
  getPrice: (unit: DurationUnitMode) => UnitPrice | undefined;
  addonServices: ExtraServiceDto[];
  openHour: number;
  closeHour: number;
  onClose: () => void;
  onChangeStartHour: (hour: number) => void;
  /** Moves both ends of an hourly booking at once (used by the "free slots" suggestions). */
  onChangeHours?: (startHour: number, endHour: number) => void;
  checkAvailability?: (startHour: number, endHour: number, endDate: Date, unit: string) => string;
  availableServices?: ExtraServiceResponse[];
  /** Other seats of the floor that can be booked together with this one (same time). */
  candidateSeats?: ExploreWorkspace[];
  /** Extra seats chosen to book together with this one. */
  extraSeatIds?: string[];
  onToggleExtraSeat?: (wsId: string) => void;
  /** Availability of another seat for the time being chosen here. */
  checkSeatAvailability?: (wsId: string, startHour: number, endHour: number, endDate: Date, unit: string) => string;
  getSeatPrice?: (wsTypeId: string, unit: DurationUnitMode) => UnitPrice | undefined;
  maxSeats?: number;
  /** Whether clicks on the floor plan add seats instead of switching to them. */
  multiSelect?: boolean;
  /** Services ticked when the panel opens (equipment asked for in the search filters). */
  initialServices?: Record<string, number>;
  /** Short floor label for a seat, shown when adding seats from other floors. */
  floorNameOf?: (floorId: string) => string;
  onToggleMultiSelect?: (on: boolean) => void;
  onBookNow: (
    endHour: number,
    services: Record<string, number>,
    subtotal: number,
    addonTotal: number,
    endDate: Date,
    durationUnit: DurationUnitMode,
    extraSeatIds: string[]
  ) => void;
}

export const BookingPanel: React.FC<BookingPanelProps> = ({
  ws,
  wsType,
  wsAvail,
  selectedWs,
  selectedHour,
  initialEndHour,
  selectedDate,
  getPrice,
  addonServices,
  openHour,
  closeHour,
  onClose,
  onChangeStartHour,
  onChangeHours,
  checkAvailability,
  availableServices = [],
  candidateSeats = [],
  extraSeatIds = [],
  onToggleExtraSeat,
  checkSeatAvailability,
  getSeatPrice,
  maxSeats = 10,
  multiSelect = false,
  onToggleMultiSelect,
  initialServices,
  floorNameOf,
  onBookNow,
}) => {
  const [endHour, setEndHour] = useState(initialEndHour);
  const [services, setServices] = useState<Record<string, number>>({});
  const [durationUnit, setDurationUnit] = useState<DurationUnitMode>('hour');
  const [endDate, setEndDate] = useState<Date>(toMidnight(selectedDate));
  const price = getPrice(durationUnit);

  useEffect(() => {
    let validEndHour = initialEndHour;
    if (validEndHour <= selectedHour) {
      validEndHour = selectedHour + 1;
    }
    validEndHour = Math.min(validEndHour, closeHour);
    setEndHour(validEndHour);
    setServices(initialServices ?? {});
    setDurationUnit('hour');
    setEndDate(toMidnight(selectedDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialServices only seeds a newly opened panel
  }, [selectedHour, initialEndHour, selectedWs, selectedDate, closeHour]);

  // Items the branch has only a few of (projectors…): what is still free for the chosen time.
  const [serviceStock, setServiceStock] = useState<Record<string, ServiceAvailabilityDto>>({});
  useEffect(() => {
    const start = new Date(selectedDate);
    start.setHours(selectedHour, 0, 0, 0);
    const end = new Date(durationUnit === 'hour' ? selectedDate : endDate);
    end.setHours(durationUnit === 'hour' ? endHour : selectedHour, 0, 0, 0);
    if (!ws.branch_id || end <= start) return;
    let active = true;
    const timer = window.setTimeout(() => {
      serviceLimitApi.availability(ws.branch_id, start, end)
        .then((list) => {
          if (active) setServiceStock(Object.fromEntries(list.map((a) => [a.serviceId, a])));
        })
        .catch(() => { if (active) setServiceStock({}); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [ws.branch_id, selectedDate, selectedHour, endHour, endDate, durationUnit]);

  // A chosen quantity never exceeds what is left; a service that ran out is dropped.
  useEffect(() => {
    setServices((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const [id, qty] of Object.entries(prev)) {
        const stock = serviceStock[id];
        if (stock && stock.remaining <= 0) { changed = true; continue; }
        const capped = stock ? Math.min(qty, stock.remaining) : qty;
        if (capped !== qty) changed = true;
        next[id] = capped;
      }
      return changed ? next : prev;
    });
  }, [serviceStock]);

  const handleServiceChange = (id: string, isChecked: boolean) => {
    setServices(prev => {
      const next = { ...prev };
      if (isChecked) next[id] = 1;
      else delete next[id];
      return next;
    });
  };

  const handleQuantityChange = (id: string, quantity: number) => {
    setServices(prev => ({ ...prev, [id]: quantity }));
  };

  // Calculate unitCount based on selected durationUnit
  const unitCount = useMemo(() => {
    if (durationUnit === 'hour') return Math.max(1, endHour - selectedHour);
    if (durationUnit === 'day') return daysDiff(toMidnight(selectedDate), endDate);
    // week
    return Math.max(1, Math.ceil(daysDiff(toMidnight(selectedDate), endDate) / 7));
  }, [durationUnit, endHour, selectedHour, selectedDate, endDate]);

  // Extra seats booked for the same time: each priced by its own type for the chosen unit.
  const extraSeats = useMemo(
    () =>
      extraSeatIds
        .map((id) => candidateSeats.find((c) => c.id === id))
        .filter((c): c is ExploreWorkspace => !!c)
        .map((seat) => {
          const avail = checkSeatAvailability
            ? checkSeatAvailability(seat.id, selectedHour, endHour, endDate, durationUnit)
            : 'available';
          const seatPrice = getSeatPrice?.(seat.workspace_type_id, durationUnit);
          return { seat, avail, price: seatPrice, subtotal: (seatPrice?.price || 0) * unitCount };
        }),
    [extraSeatIds, candidateSeats, checkSeatAvailability, getSeatPrice, selectedHour, endHour, endDate, durationUnit, unitCount],
  );
  const blockedExtras = extraSeats.filter((e) => e.avail !== 'available' || !e.price);
  const seatCount = 1 + extraSeats.length;

  const subtotal = (price?.price || 0) * unitCount + extraSeats.reduce((sum, e) => sum + e.subtotal, 0);
  const allAddons = addonServices && addonServices.length > 0 ? addonServices : availableServices;
  const addonTotal = Object.keys(services).reduce((sum, id) => {
    const s = allAddons.find((x: any) => x.id === id);
    return sum + (s?.price || 0) * (services[id] || 1);
  }, 0);
  const total = subtotal + addonTotal;

  // Min end-date for date pickers (= start date + 1 day for day, + 7 days for week)
  const minEndDate = useMemo(() => {
    const d = toMidnight(selectedDate);
    d.setDate(d.getDate() + (durationUnit === 'week' ? 7 : 1));
    return d;
  }, [selectedDate, durationUnit]);

  // Ensure endDate stays valid when switching unit or startDate changes
  useEffect(() => {
    if (durationUnit !== 'hour' && endDate < minEndDate) {
      setEndDate(new Date(minEndDate));
    }
  }, [durationUnit, minEndDate, endDate]);

  const currentAvail = checkAvailability
    ? checkAvailability(selectedHour, endHour, endDate, durationUnit)
    : wsAvail;

  const [showAllAddons, setShowAllAddons] = useState(false);
  const isBooked = !!currentAvail?.startsWith('booked');
  const isFree = currentAvail === 'available';

  // When the chosen hours are taken, offer the nearest free slots of the same length.
  const freeSlots = useMemo(() => {
    if (!isBooked || durationUnit !== 'hour' || !checkAvailability || !onChangeHours) return [];
    const len = Math.max(1, endHour - selectedHour);
    const slots: number[] = [];
    for (let h = firstBookableHour(selectedDate, openHour, closeHour); h + len <= closeHour; h++) {
      if (h !== selectedHour && checkAvailability(h, h + len, endDate, 'hour') === 'available') slots.push(h);
    }
    return slots
      .sort((a, b) => Math.abs(a - selectedHour) - Math.abs(b - selectedHour))
      .slice(0, 3)
      .sort((a, b) => a - b)
      .map((h) => ({ start: h, end: h + len }));
  }, [isBooked, durationUnit, checkAvailability, onChangeHours, endHour, selectedHour, selectedDate, openHour, closeHour, endDate]);

  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
  const addonList = allAddons.filter((s: any) => s.isActive !== false);
  const ADDON_PREVIEW = 5;
  const visibleAddons = showAllAddons ? addonList : addonList.slice(0, ADDON_PREVIEW);
  const unitName = durationUnitLabel[price?.duration_unit ?? durationUnit]?.toLowerCase();
  const timeSummary =
    durationUnit === 'hour'
      ? `${hh(selectedHour)} – ${hh(endHour)} · ${Math.max(1, endHour - selectedHour)} giờ`
      : durationUnit === 'day'
      ? `${unitCount} ngày · ${hh(openHour)} – ${hh(closeHour)} mỗi ngày`
      : `${unitCount} tuần (≈ ${unitCount * 7} ngày)`;

  const card = 'rounded-2xl bg-[var(--bg-surface-hover)] p-3.5 border border-border';

  return (
    <div className="p-5 bg-inherit">
      {/* Header: name, one status chip, close */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-lg leading-tight text-foreground">{ws.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`badge ${isFree ? 'badge-success' : isBooked ? 'badge-danger' : 'badge-neutral'}`}>
              <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${isFree ? 'bg-emerald-500' : isBooked ? 'bg-red-500' : 'bg-slate-400'}`} />
              {isFree ? 'Còn trống' : isBooked ? 'Đã có người đặt' : 'Bảo trì'}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] font-mono">{ws.code}</span>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-ghost btn-sm cursor-pointer shrink-0" style={{ padding: '4px' }} aria-label="Đóng chi tiết">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        <WorkspaceGallery images={ws.images || []} alt={ws.name} />

        {/* Info */}
        <div className={card}>
          <p className="text-sm font-semibold">{wsType?.name}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {ws.capacity > 1 ? `${ws.capacity} chỗ · tối đa ${ws.capacity} người` : '1 chỗ · 1 người'}
          </p>
        </div>

        <WorkspaceAmenities workspaceTypeId={ws.workspace_type_id} workspaceTypeCode={wsType?.code} />

        {/* When: unit, time and the price that applies — one card instead of three */}
        <div className={card}>
          <div className="flex gap-1 bg-[var(--border-subtle)] rounded-xl p-0.5" role="tablist" aria-label="Loại thời gian đặt">
            {(['hour', 'day', 'week'] as DurationUnitMode[]).map(u => (
              <button
                key={u}
                role="tab"
                aria-selected={durationUnit === u}
                onClick={() => setDurationUnit(u)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
                  durationUnit === u ? 'bg-card text-foreground shadow-sm' : 'text-[var(--text-tertiary)] hover:text-foreground'
                }`}
              >
                {UNIT_LABELS[u]}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {durationUnit === 'hour' ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div>
                  <label htmlFor={`start-time-${selectedWs}`} className="text-xs text-[var(--text-secondary)]">Bắt đầu</label>
                  <select
                    id={`start-time-${selectedWs}`}
                    value={selectedHour}
                    onChange={e => onChangeStartHour(Number(e.target.value))}
                    className="input-field mt-1 text-sm w-full"
                  >
                    {Array.from({ length: Math.max(0, closeHour - openHour) }, (_, i) => i + openHour)
                      .filter(h => h >= firstBookableHour(selectedDate, openHour, closeHour))
                      .map(h => <option key={h} value={h}>{hh(h)}</option>)}
                  </select>
                </div>
                <FiClock className="h-4 w-4 mb-3 text-[var(--text-tertiary)]" aria-hidden="true" />
                <div>
                  <label htmlFor={`end-time-${selectedWs}`} className="text-xs text-[var(--text-secondary)]">Kết thúc</label>
                  <select
                    id={`end-time-${selectedWs}`}
                    value={endHour}
                    onChange={e => setEndHour(Number(e.target.value))}
                    className="input-field mt-1 text-sm w-full"
                  >
                    {Array.from({ length: Math.max(0, closeHour - selectedHour) }, (_, i) => selectedHour + i + 1)
                      .map(h => <option key={h} value={h}>{hh(h)}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[var(--text-secondary)]">Ngày bắt đầu</label>
                  <input type="date" value={toDateInputValue(toMidnight(selectedDate))} className="input-field mt-1 text-sm w-full" readOnly />
                </div>
                <div>
                  <label htmlFor={`end-date-${selectedWs}`} className="text-xs text-[var(--text-secondary)]">
                    {durationUnit === 'day' ? 'Đến hết ngày' : 'Ngày kết thúc'}
                  </label>
                  {/* endDate is exclusive (the day after the last one). A day pass shows the last day
                      it can be used instead, so a one-day pass reads "5/10 → 5/10", not "→ 6/10". */}
                  <input
                    id={`end-date-${selectedWs}`}
                    type="date"
                    value={toDateInputValue(durationUnit === 'day' ? addDays(endDate, -1) : endDate)}
                    min={toDateInputValue(durationUnit === 'day' ? addDays(minEndDate, -1) : minEndDate)}
                    onChange={e => {
                      const d = new Date(e.target.value + 'T00:00:00');
                      if (!isNaN(d.getTime())) setEndDate(durationUnit === 'day' ? addDays(d, 1) : d);
                    }}
                    className="input-field mt-1 text-sm w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">{timeSummary}</span>
            {price && (
              <span className="shrink-0 font-semibold text-[var(--brand-primary)]">
                {formatVND(price.price)}<span className="font-normal text-xs text-[var(--text-secondary)]">/{unitName}</span>
              </span>
            )}
          </div>

          {!price && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-2.5 text-xs text-[var(--state-danger)]">
              <FiAlertCircle className="h-4 w-4 shrink-0 mt-px" />
              Chi nhánh chưa có giá cho loại thời gian này. Vui lòng chọn loại khác.
            </p>
          )}

          {/* Taken: say it once, here, next to the hours the customer can change */}
          {isBooked && (
            <div className="mt-3 rounded-xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-2.5">
              <p className="text-xs font-semibold text-[var(--state-danger)] flex items-start gap-2">
                <FiAlertCircle className="h-4 w-4 shrink-0 mt-px" />
                <span>
                  Đã có người đặt{currentAvail!.split('|').length === 3 ? ` ${currentAvail!.split('|')[1]}h – ${currentAvail!.split('|')[2]}h` : ''}.
                  {freeSlots.length > 0 ? ' Chọn khung giờ còn trống:' : ' Hãy thử khung giờ hoặc ngày khác.'}
                </span>
              </p>
              {freeSlots.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {freeSlots.map((f) => (
                    <button
                      key={f.start}
                      type="button"
                      onClick={() => onChangeHours?.(f.start, f.end)}
                      className="rounded-full border border-[var(--brand-primary)] bg-card px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] cursor-pointer"
                    >
                      {hh(f.start)} – {hh(f.end)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Book more seats at the same time */}
        {onToggleExtraSeat && (
          <div className={card}>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <FiUsers className="h-4 w-4 text-[var(--text-tertiary)]" /> Đặt thêm chỗ cùng khung giờ
            </p>
            {onToggleMultiSelect && (
              <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={multiSelect} onChange={(e) => onToggleMultiSelect(e.target.checked)} className="rounded accent-[var(--brand-primary)]" />
                Chọn chỗ trực tiếp trên sơ đồ
              </label>
            )}
            {multiSelect && (
              <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">Bấm vào các chỗ còn trống trên sơ đồ để thêm hoặc bỏ khỏi đơn.</p>
            )}
            {extraSeats.length > 0 && (
              <ul className="space-y-1.5 mt-3">
                {extraSeats.map(({ seat, avail, price: seatPrice, subtotal: seatSubtotal }) => {
                  const ok = avail === 'available' && !!seatPrice;
                  return (
                    <li key={seat.id} className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${ok ? 'bg-card' : 'bg-[var(--state-danger-bg)]'}`}>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium block">{seat.name}</span>
                        <span className={`text-[11px] ${ok ? 'text-[var(--text-tertiary)]' : 'text-[var(--state-danger)]'}`}>
                          {!seatPrice ? 'Chưa có giá cho loại thời gian này' : avail !== 'available' ? 'Đã có người đặt khung giờ này' : `${seat.workspaceTypeName} · ${seat.capacity} chỗ`}
                        </span>
                      </span>
                      <span className="text-xs font-medium shrink-0">{seatPrice ? formatVND(seatSubtotal) : '—'}</span>
                      <button type="button" onClick={() => onToggleExtraSeat(seat.id)} className="p-2 -mr-1 rounded-lg hover:bg-[var(--border-subtle)] cursor-pointer" aria-label={`Bỏ ${seat.name}`}>
                        <FiX className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3">
              {(() => {
                const addable = candidateSeats.filter(
                  (c) =>
                    c.id !== ws.id &&
                    !extraSeatIds.includes(c.id) &&
                    (checkSeatAvailability ? checkSeatAvailability(c.id, selectedHour, endHour, endDate, durationUnit) : 'available') === 'available' &&
                    !!getSeatPrice?.(c.workspace_type_id, durationUnit),
                );
                if (seatCount >= maxSeats) {
                  return <p className="text-[11px] text-[var(--text-tertiary)]">Đã đạt tối đa {maxSeats} chỗ cho một lần đặt.</p>;
                }
                if (addable.length === 0) {
                  return <p className="text-[11px] text-[var(--text-tertiary)] italic">Không còn chỗ trống nào khác cho khung giờ đã chọn.</p>;
                }
                return (
                  <select
                    value=""
                    onChange={(e) => e.target.value && onToggleExtraSeat(e.target.value)}
                    className="input-field text-sm w-full"
                    aria-label="Thêm chỗ"
                  >
                    <option value="">+ Thêm chỗ trống ({addable.length})</option>
                    {/* Same kind of space first (another desk for a desk), other kinds apart, smallest first. */}
                    {[
                      { label: 'Cùng loại chỗ', items: addable.filter((c) => c.workspace_type_id === ws.workspace_type_id) },
                      { label: 'Loại khác', items: addable.filter((c) => c.workspace_type_id !== ws.workspace_type_id) },
                    ].filter((g) => g.items.length > 0).map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {[...g.items].sort((a, b) => a.capacity - b.capacity).map((c) => {
                          const p = getSeatPrice?.(c.workspace_type_id, durationUnit);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.name}{floorNameOf && c.floor_id !== ws.floor_id ? ` (${floorNameOf(c.floor_id)})` : ''} · {c.capacity} chỗ{p ? ` · ${formatVND(p.price)}/${durationUnitLabel[p.duration_unit]?.toLowerCase()}` : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                );
              })()}
            </div>
          </div>
        )}

        {/* Add-on services: names wrap instead of being cut, price sits under the name */}
        <div className={card}>
          <p className="text-sm font-semibold mb-2">Dịch vụ thêm</p>
          {addonList.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] italic">Chi nhánh chưa có dịch vụ thêm.</p>
          ) : (
            <ul className="space-y-1.5">
              {visibleAddons.map((s: any) => {
                const stock = serviceStock[s.id];
                const soldOut = !!stock && stock.remaining <= 0;
                const picked = !!services[s.id];
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                      picked ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]' : 'border-transparent bg-card'
                    } ${soldOut ? 'opacity-60' : ''}`}
                  >
                    <label htmlFor={`addon-${s.id}-${selectedWs}`} className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                      <input
                        id={`addon-${s.id}-${selectedWs}`}
                        type="checkbox"
                        checked={picked}
                        disabled={soldOut}
                        onChange={e => handleServiceChange(s.id, e.target.checked)}
                        className="h-4 w-4 shrink-0 rounded accent-[var(--brand-primary)]"
                      />
                      <ServiceIcon type={s.serviceType} name={s.name} className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-snug break-words">{s.name}</span>
                        <span className="block text-xs text-[var(--text-tertiary)]">
                          {formatVND(s.price)}{s.unit ? `/${s.unit}` : ''}
                          {stock && (
                            <span className={`ml-2 font-semibold ${soldOut ? 'text-[var(--state-danger)]' : ''}`} title={`Cơ sở có ${stock.maxConcurrent}, đang được đặt ${stock.inUse} trong khung giờ này`}>
                              {soldOut ? 'Hết' : `Còn ${stock.remaining}/${stock.maxConcurrent}`}
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                    {picked && (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <QuantityStepper
                          value={services[s.id]}
                          onChange={q => handleQuantityChange(s.id, q)}
                          max={stock ? Math.max(1, stock.remaining) : undefined}
                          label={`Số lượng ${s.name}`}
                        />
                        <span className="text-xs font-semibold text-[var(--brand-primary)]">{formatVND(s.price * services[s.id])}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {addonList.length > ADDON_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllAddons(v => !v)}
              className="mt-2 w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold text-[var(--brand-primary)] cursor-pointer"
            >
              {showAllAddons ? <>Thu gọn <FiChevronUp className="h-3.5 w-3.5" /></> : <>Xem thêm {addonList.length - ADDON_PREVIEW} dịch vụ <FiChevronDown className="h-3.5 w-3.5" /></>}
            </button>
          )}
        </div>
      </div>

      {/* Total and the action share one compact row pinned to the bottom, so a phone never has to
          scroll past the photos and every add-on to find them (and no banner eats the screen). */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-4 px-5 pt-3 pb-4 bg-inherit border-t border-[var(--border-subtle)]">
        {blockedExtras.length > 0 && isFree && (
          <p className="mb-2 text-xs text-[var(--state-danger)]">
            Bỏ {blockedExtras.length === 1 ? 'chỗ' : `${blockedExtras.length} chỗ`} không đặt được ở trên để tiếp tục.
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-secondary)]">
              Tổng cộng{seatCount > 1 && <> · {seatCount} chỗ</>}
            </p>
            <p className="text-xl font-semibold leading-tight text-[var(--brand-primary)]">{formatVND(total)}</p>
          </div>
          <button
            className="btn btn-primary flex-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isFree || !price || blockedExtras.length > 0}
            onClick={() => onBookNow(endHour, services, subtotal, addonTotal, endDate, durationUnit, extraSeats.map((e) => e.seat.id))}
          >
            {isFree && price ? (
              <>
                {seatCount > 1 ? <FiPlus className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                {seatCount > 1 ? `Đặt ${seatCount} chỗ` : 'Đặt chỗ ngay'}
              </>
            ) : isBooked ? 'Khung giờ đã kín' : !price ? 'Chưa có giá' : 'Không thể đặt'}
          </button>
        </div>
      </div>
    </div>
  );
};
