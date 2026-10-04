import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiCheck, FiPlus, FiUsers } from 'react-icons/fi';
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

  return (
    <div className="p-5 bg-inherit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg text-foreground">{ws.name}</h3>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm cursor-pointer"
          style={{ padding: '4px' }}
          aria-label="Đóng chi tiết"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>

      {/* Status badge */}
      <span
        className={`badge ${
          currentAvail === 'available'
            ? 'badge-success'
            : currentAvail?.startsWith('booked')
            ? 'badge-danger'
            : 'badge-neutral'
        }`}
      >
        {currentAvail === 'available' ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mr-1" />{' '}
            Trống
          </>
        ) : currentAvail?.startsWith('booked') ? (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-red-50 dark:bg-red-950/30 mr-1" />{' '}
            Đã đặt{' '}
            {currentAvail.split('|').length === 3
              ? `(${currentAvail.split('|')[1]}h-${currentAvail.split('|')[2]}h)`
              : ''}
          </>
        ) : (
          <>
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400 mr-1" /> Bảo trì
          </>
        )}
      </span>

      {/* Info */}
      <div className="mt-5 space-y-3">
        <WorkspaceGallery images={ws.images || []} alt={ws.name} />
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3 border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Loại</p>
              <p className="text-sm font-semibold">{wsType?.name}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Số chỗ ngồi</p>
              <p className="text-sm font-semibold">
                {ws.capacity} {ws.capacity > 1 ? 'chỗ · tối đa ' + ws.capacity + ' người' : 'chỗ (1 người)'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Mã</p>
              <p className="text-sm font-mono">{ws.code}</p>
            </div>
          </div>
        </div>

        <WorkspaceAmenities
          workspaceTypeId={ws.workspace_type_id}
          workspaceTypeCode={wsType?.code}
        />

        {/* Price */}
        {price && (
          <div className="rounded-2xl bg-[var(--brand-primary-light)] border border-[var(--brand-primary)] border-opacity-20 p-4">
            <p className="text-xs text-[var(--text-secondary)]">Giá</p>
            <p className="text-2xl font-medium text-[var(--brand-primary)]">
              {formatVND(price.price)}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              /{durationUnitLabel[price.duration_unit]?.toLowerCase()}
            </p>
          </div>
        )}

        {!price && (
          <p className="rounded-2xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-3 text-xs text-[var(--state-danger)]">
            Chi nhánh chưa có giá cho loại thời gian này. Vui lòng chọn loại thời gian khác.
          </p>
        )}

        {/* Duration unit toggle */}
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3 border border-border">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Loại thời gian đặt</p>
          <div className="flex gap-1 bg-[var(--border-subtle)] rounded-xl p-0.5">
            {(['hour', 'day', 'week'] as DurationUnitMode[]).map(u => (
              <button
                key={u}
                onClick={() => setDurationUnit(u)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  durationUnit === u
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-foreground'
                }`}
              >
                {UNIT_LABELS[u]}
              </button>
            ))}
          </div>
        </div>

        {/* Time selection */}
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3 border border-border">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Thời gian</p>

          {durationUnit === 'hour' ? (
            /* ── Hour mode: same-day start/end hour ── */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor={`start-time-${selectedWs}`}
                  className="text-xs text-[var(--text-secondary)]"
                >
                  Bắt đầu
                </label>
                <select
                  id={`start-time-${selectedWs}`}
                  value={selectedHour}
                  onChange={e => onChangeStartHour(Number(e.target.value))}
                  className="input-field mt-1 text-sm bg-transparent border-b border-border focus:outline-none w-full"
                >
                  {Array.from(
                    { length: Math.max(0, closeHour - openHour) },
                    (_, i) => i + openHour
                  ).filter(h => h >= firstBookableHour(selectedDate, openHour, closeHour)).map(h => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={`end-time-${selectedWs}`}
                  className="text-xs text-[var(--text-secondary)]"
                >
                  Kết thúc
                </label>
                <select
                  id={`end-time-${selectedWs}`}
                  value={endHour}
                  onChange={e => setEndHour(Number(e.target.value))}
                  className="input-field mt-1 text-sm bg-transparent border-b border-border focus:outline-none w-full"
                >
                  {Array.from(
                    { length: Math.max(0, closeHour - selectedHour) },
                    (_, i) => selectedHour + i + 1
                  ).map(h => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* ── Day / Week mode: date-range picker ── */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-[var(--text-secondary)]">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={toDateInputValue(toMidnight(selectedDate))}
                  className="input-field mt-1 text-sm w-full"
                  readOnly
                />
              </div>
              <div>
                <label
                  htmlFor={`end-date-${selectedWs}`}
                  className="text-xs text-[var(--text-secondary)]"
                >
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

          {/* Summary line */}
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            {durationUnit === 'hour'
              ? `${Math.max(1, endHour - selectedHour)} giờ`
              : durationUnit === 'day'
              ? `${unitCount} ngày · ${String(openHour).padStart(2, '0')}:00 – ${String(closeHour).padStart(2, '0')}:00 mỗi ngày`
              : `${unitCount} tuần (≈ ${unitCount * 7} ngày)`}
          </p>
        </div>

        {/* Book more seats at the same time */}
        {onToggleExtraSeat && (
          <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3 border border-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5">
                <FiUsers className="h-3.5 w-3.5" /> Đặt thêm chỗ cùng khung giờ
              </p>
              {onToggleMultiSelect && (
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiSelect}
                    onChange={(e) => onToggleMultiSelect(e.target.checked)}
                    className="rounded accent-[var(--brand-primary)]"
                  />
                  Chọn trên sơ đồ
                </label>
              )}
            </div>
            {multiSelect && (
              <p className="mb-2 text-[11px] text-[var(--text-secondary)]">
                Bấm vào các chỗ còn trống trên sơ đồ để thêm hoặc bỏ khỏi đơn.
              </p>
            )}
            {extraSeats.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {extraSeats.map(({ seat, avail, price: seatPrice, subtotal: seatSubtotal }) => {
                  const ok = avail === 'available' && !!seatPrice;
                  return (
                    <li key={seat.id} className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 ${ok ? 'bg-card' : 'bg-[var(--state-danger-bg)]'}`}>
                      <span className="min-w-0 flex-1">
                        <span className="font-medium truncate block">{seat.name}</span>
                        <span className={`text-[11px] ${ok ? 'text-[var(--text-tertiary)]' : 'text-[var(--state-danger)]'}`}>
                          {!seatPrice
                            ? 'Chưa có giá cho loại thời gian này'
                            : avail !== 'available'
                              ? 'Đã có người đặt khung giờ này'
                              : `${seat.workspaceTypeName} · ${seat.capacity} chỗ`}
                        </span>
                      </span>
                      <span className="text-xs shrink-0">{seatPrice ? formatVND(seatSubtotal) : '—'}</span>
                      <button
                        type="button"
                        onClick={() => onToggleExtraSeat(seat.id)}
                        className="p-1 rounded hover:bg-[var(--border-subtle)] cursor-pointer"
                        aria-label={`Bỏ ${seat.name}`}
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
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
                  {addable.map((c) => {
                    const p = getSeatPrice?.(c.workspace_type_id, durationUnit);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}{floorNameOf && c.floor_id !== ws.floor_id ? ` (${floorNameOf(c.floor_id)})` : ''} · {c.capacity} chỗ{p ? ` · ${formatVND(p.price)}/${durationUnitLabel[p.duration_unit]?.toLowerCase()}` : ''}
                      </option>
                    );
                  })}
                </select>
              );
            })()}
          </div>
        )}

        {/* Add-on services */}
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3 border border-border">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Dịch vụ thêm</p>
          <div className="space-y-2">
            {allAddons.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] italic">
                Chi nhánh chưa có dịch vụ thêm.
              </p>
            ) : (
              allAddons
                .filter((s: any) => s.isActive !== false)
                .map((s: any) => {
                  const stock = serviceStock[s.id];
                  const soldOut = !!stock && stock.remaining <= 0;
                  return (
                  <div key={s.id} className={`flex items-center gap-3 text-sm ${soldOut ? 'opacity-60' : ''}`}>
                    <label
                      htmlFor={`addon-${s.id}-${selectedWs}`}
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                    >
                      <input
                        id={`addon-${s.id}-${selectedWs}`}
                        type="checkbox"
                        checked={!!services[s.id]}
                        disabled={soldOut}
                        onChange={e => handleServiceChange(s.id, e.target.checked)}
                        className="rounded accent-[var(--brand-primary)]"
                      />
                      <span className="flex items-center gap-1.5 min-w-0">
                        <ServiceIcon type={s.serviceType} name={s.name} className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{s.name}</span>
                        {stock && (
                          <span
                            className={`shrink-0 rounded-full px-1.5 text-[10px] font-semibold ${
                              soldOut ? 'bg-[var(--state-danger-bg)] text-[var(--state-danger)]' : 'bg-[var(--border-subtle)] text-[var(--text-secondary)]'
                            }`}
                            title={`Cơ sở có ${stock.maxConcurrent}, đang được đặt ${stock.inUse} trong khung giờ này`}
                          >
                            {soldOut ? 'Hết' : `Còn ${stock.remaining}/${stock.maxConcurrent}`}
                          </span>
                        )}
                      </span>
                    </label>
                    {services[s.id] ? (
                      <QuantityStepper
                        value={services[s.id]}
                        onChange={q => handleQuantityChange(s.id, q)}
                        max={stock ? Math.max(1, stock.remaining) : undefined}
                        label={`Số lượng ${s.name}`}
                      />
                    ) : null}
                    <span className="ml-auto shrink-0 text-xs text-[var(--text-tertiary)] text-right">
                      {services[s.id]
                        ? formatVND(s.price * services[s.id])
                        : `+${formatVND(s.price)}${s.unit ? `/${s.unit}` : ''}`}
                    </span>
                  </div>
                  );
                })
            )}
          </div>
        </div>

      </div>

      {/* Total + book button stay pinned to the bottom of the panel, so on a phone the customer
          does not have to scroll past the photos and every add-on to find them. */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-4 px-5 pt-3 pb-5 bg-inherit border-t border-[var(--border-subtle)]">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">
            Tổng cộng{seatCount > 1 && <span className="font-normal text-[var(--text-tertiary)]"> · {seatCount} chỗ</span>}
          </span>
          <span className="text-lg font-medium text-[var(--brand-primary)]">
            {formatVND(total)}
          </span>
        </div>

      {/* Book button */}
      {currentAvail === 'available' && price && (
        <>
          {blockedExtras.length > 0 && (
            <p className="mt-3 text-xs text-[var(--state-danger)]">
              Bỏ {blockedExtras.length === 1 ? 'chỗ' : `${blockedExtras.length} chỗ`} không đặt được ở trên để tiếp tục.
            </p>
          )}
          <button
            className="btn btn-primary w-full mt-3 cursor-pointer disabled:opacity-50"
            disabled={blockedExtras.length > 0}
            onClick={() => onBookNow(endHour, services, subtotal, addonTotal, endDate, durationUnit, extraSeats.map((e) => e.seat.id))}
          >
            {seatCount > 1 ? <FiPlus className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
            {seatCount > 1 ? `Đặt ${seatCount} chỗ cùng lúc` : 'Đặt chỗ ngay'}
          </button>
        </>
      )}
      {currentAvail?.startsWith('booked') && (
        <div className="mt-3 rounded-2xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-3 text-center">
          <p className="text-sm font-semibold text-[var(--state-danger)]">
            Đã được đặt{' '}
            {currentAvail.split('|').length === 3
              ? `từ ${currentAvail.split('|')[1]}h đến ${currentAvail.split('|')[2]}h`
              : ''}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Thử chọn khung giờ hoặc ngày khác
          </p>
        </div>
      )}
      </div>
    </div>
  );
};
