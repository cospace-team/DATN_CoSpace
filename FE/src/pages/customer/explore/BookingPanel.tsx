import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import { WorkspaceAmenities } from '../../../components/WorkspaceAmenities';
import { formatVND, durationUnitLabel } from '../../../utils/formatters';
import type { ExtraServiceDto } from '../../../api/addonApi';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';
import WorkspaceGallery from '../../../components/workspace/WorkspaceGallery';
import type { ExtraServiceResponse } from '../../../lib/spaceApi';

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

export const getServiceIcon = (type?: string, name?: string) => {
  const n = (name || '').toLowerCase();
  const t = (type || '').toLowerCase();
  if (t === 'drink' || n.includes('cà phê') || n.includes('trà') || n.includes('nước')) return '☕';
  if (t === 'printing' || n.includes('in') || n.includes('scan')) return '🖨️';
  if (t === 'meal' || n.includes('bánh') || n.includes('cơm') || n.includes('ăn')) return '🥪';
  if (n.includes('màn hình') || n.includes('máy chiếu')) return '🖥️';
  if (n.includes('bút') || n.includes('bảng')) return '📝';
  return '✨';
};

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
  onBookNow: (
    endHour: number,
    services: Record<string, number>,
    subtotal: number,
    addonTotal: number,
    endDate: Date,
    durationUnit: DurationUnitMode
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
    setServices({});
    setDurationUnit('hour');
    setEndDate(toMidnight(selectedDate));
  }, [selectedHour, initialEndHour, selectedWs, selectedDate, closeHour]);

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

  const subtotal = (price?.price || 0) * unitCount;
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

  const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

  const currentAvail = checkAvailability
    ? checkAvailability(selectedHour, endHour, endDate, durationUnit)
    : wsAvail;

  return (
    <div className="p-5">
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
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
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
                  ).map(h => (
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
                  value={toInputDate(toMidnight(selectedDate))}
                  className="input-field mt-1 text-sm w-full"
                  readOnly
                />
              </div>
              <div>
                <label
                  htmlFor={`end-date-${selectedWs}`}
                  className="text-xs text-[var(--text-secondary)]"
                >
                  Ngày kết thúc
                </label>
                <input
                  id={`end-date-${selectedWs}`}
                  type="date"
                  value={toInputDate(endDate)}
                  min={toInputDate(minEndDate)}
                  onChange={e => {
                    const d = new Date(e.target.value + 'T00:00:00');
                    if (!isNaN(d.getTime())) setEndDate(d);
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
              ? `${unitCount} ngày`
              : `${unitCount} tuần (≈ ${unitCount * 7} ngày)`}
          </p>
        </div>

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
                .map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 text-sm">
                    <label
                      htmlFor={`addon-${s.id}-${selectedWs}`}
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                    >
                      <input
                        id={`addon-${s.id}-${selectedWs}`}
                        type="checkbox"
                        checked={!!services[s.id]}
                        onChange={e => handleServiceChange(s.id, e.target.checked)}
                        className="rounded accent-[var(--brand-primary)]"
                      />
                      <span className="flex items-center gap-1.5 min-w-0">
                        {getServiceIcon(s.unit || s.serviceType, s.name)}
                        <span className="truncate">{s.name}</span>
                      </span>
                    </label>
                    {services[s.id] ? (
                      <QuantityStepper
                        value={services[s.id]}
                        onChange={q => handleQuantityChange(s.id, q)}
                        label={`Số lượng ${s.name}`}
                      />
                    ) : null}
                    <span className="ml-auto shrink-0 text-xs text-[var(--text-tertiary)] text-right">
                      {services[s.id]
                        ? formatVND(s.price * services[s.id])
                        : `+${formatVND(s.price)}${s.unit ? `/${s.unit}` : ''}`}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Total Price summary */}
        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-sm font-semibold">Tổng cộng</span>
          <span className="text-lg font-medium text-[var(--brand-primary)]">
            {formatVND(total)}
          </span>
        </div>
      </div>

      {/* Book button */}
      {currentAvail === 'available' && price && (
        <button
          className="btn btn-primary w-full mt-5 cursor-pointer"
          onClick={() => onBookNow(endHour, services, subtotal, addonTotal, endDate, durationUnit)}
        >
          <FiCheck className="h-4 w-4" /> Đặt chỗ ngay
        </button>
      )}
      {currentAvail?.startsWith('booked') && (
        <div className="mt-5 rounded-2xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-3 text-center">
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
  );
};
