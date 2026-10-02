import React from 'react';
import { FiCalendar, FiClock, FiMapPin, FiMonitor, FiSearch, FiUsers, FiLayers } from 'react-icons/fi';
import { QuantityStepper } from '../../../components/ui/QuantityStepper';

/** What the customer is looking for; the results only show spaces that match it. */
export interface ExploreFilter {
  branchId: string;
  date: Date;
  startHour: number;
  endHour: number;
  /** Seats needed in one space. */
  people: number;
  /** Workspace types wanted; empty = any. */
  typeIds: string[];
  /** Equipment (extra services) that must be free for the slot, e.g. a projector. */
  equipmentIds: string[];
}

export interface FilterOption {
  id: string;
  name: string;
}

interface ExploreFiltersProps {
  value: ExploreFilter;
  onChange: (next: ExploreFilter) => void;
  onSubmit: () => void;
  branches: (FilterOption & { address?: string | null })[];
  types: FilterOption[];
  equipment: FilterOption[];
  openHour: number;
  closeHour: number;
  /** hero: first screen, large and centred; bar: compact editor above the results. */
  variant: 'hero' | 'bar';
  submitting?: boolean;
}

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;
const toInputDate = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const startOfDay = (d: Date) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

/** Toggleable pill used for types and equipment. */
const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`px-3 py-1.5 rounded-full border text-sm transition-colors cursor-pointer ${
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card text-foreground border-border hover:border-primary/50'
    }`}
  >
    {children}
  </button>
);

const Field: React.FC<{ label: string; icon: React.ReactNode; htmlFor?: string; children: React.ReactNode; className?: string }> = ({
  label, icon, htmlFor, children, className = '',
}) => (
  <div className={`space-y-1.5 ${className}`}>
    <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
      {icon} {label}
    </label>
    {children}
  </div>
);

/**
 * Step 1 of Explore: say what you need (where, when, how many people, what kind of space, which
 * equipment) before any space is shown, so the results are only the ones that fit.
 */
export const ExploreFilters: React.FC<ExploreFiltersProps> = ({
  value, onChange, onSubmit, branches, types, equipment, openHour, closeHour, variant, submitting,
}) => {
  const set = (patch: Partial<ExploreFilter>) => onChange({ ...value, ...patch });
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const hours = Array.from({ length: Math.max(0, closeHour - openHour) }, (_, i) => openHour + i);
  const hero = variant === 'hero';
  const selectCls = 'input-field w-full text-sm';

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className={hero ? 'space-y-6' : 'space-y-4'}
    >
      <div className={`grid gap-4 ${hero ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        <Field label="Chi nhánh" icon={<FiMapPin className="h-3.5 w-3.5" />} htmlFor="f-branch" className={hero ? 'sm:col-span-2' : ''}>
          <select
            id="f-branch"
            value={value.branchId}
            onChange={(e) => set({ branchId: e.target.value, typeIds: [], equipmentIds: [] })}
            className={selectCls}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {hero && branches.find((b) => b.id === value.branchId)?.address && (
            <p className="text-xs text-muted-foreground">{branches.find((b) => b.id === value.branchId)?.address}</p>
          )}
        </Field>

        <Field label="Ngày" icon={<FiCalendar className="h-3.5 w-3.5" />} htmlFor="f-date">
          <input
            id="f-date"
            type="date"
            value={toInputDate(value.date)}
            min={toInputDate(today)}
            onChange={(e) => {
              const d = new Date(e.target.value + 'T00:00:00');
              if (!isNaN(d.getTime())) set({ date: d });
            }}
            className={selectCls}
          />
          <div className="flex gap-1.5">
            {[{ d: today, label: 'Hôm nay' }, { d: tomorrow, label: 'Ngày mai' }].map(({ d, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => set({ date: d })}
                className={`text-xs px-2 py-0.5 rounded-md border cursor-pointer ${
                  isSameDay(value.date, d) ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Khung giờ" icon={<FiClock className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-2">
            <select
              aria-label="Từ giờ"
              value={value.startHour}
              onChange={(e) => {
                const start = Number(e.target.value);
                set({ startHour: start, endHour: Math.max(value.endHour, start + 1) });
              }}
              className={selectCls}
            >
              {hours.map((h) => <option key={h} value={h}>{pad(h)}</option>)}
            </select>
            <span className="text-muted-foreground">→</span>
            <select
              aria-label="Đến giờ"
              value={value.endHour}
              onChange={(e) => set({ endHour: Number(e.target.value) })}
              className={selectCls}
            >
              {hours.filter((h) => h > value.startHour).concat(closeHour).filter((h, i, a) => a.indexOf(h) === i)
                .map((h) => <option key={h} value={h}>{pad(h)}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">{value.endHour - value.startHour} giờ · chi nhánh mở {pad(openHour)}-{pad(closeHour)}</p>
        </Field>

        <Field label="Số người" icon={<FiUsers className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-3">
            <QuantityStepper value={value.people} onChange={(n) => set({ people: n })} min={1} max={50} size="md" label="Số người" />
            <span className="text-sm text-muted-foreground">{value.people === 1 ? 'Làm việc một mình' : `Nhóm ${value.people} người`}</span>
          </div>
        </Field>
      </div>

      {types.length > 0 && (
        <Field label="Loại không gian (bỏ trống = tất cả)" icon={<FiLayers className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <Chip key={t.id} active={value.typeIds.includes(t.id)} onClick={() => set({ typeIds: toggle(value.typeIds, t.id) })}>
                {t.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      {equipment.length > 0 && (
        <Field label="Thiết bị cần dùng" icon={<FiMonitor className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-2">
            {equipment.map((t) => (
              <Chip key={t.id} active={value.equipmentIds.includes(t.id)} onClick={() => set({ equipmentIds: toggle(value.equipmentIds, t.id) })}>
                {t.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      <div className={hero ? '' : 'flex justify-end'}>
        <button
          type="submit"
          disabled={submitting || !value.branchId || value.endHour <= value.startHour}
          className={`btn btn-primary ${hero ? 'w-full !h-12 text-base' : ''} disabled:opacity-50`}
        >
          <FiSearch className="h-4 w-4" /> {hero ? 'Tìm chỗ trống' : 'Áp dụng bộ lọc'}
        </button>
      </div>
    </form>
  );
};
