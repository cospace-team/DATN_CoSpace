import React, { useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiImage, FiLayers, FiMap, FiMonitor, FiUsers } from 'react-icons/fi';
import { formatVND, durationUnitLabel } from '../../../utils/formatters';
import type { ExploreWorkspace, UnitPrice } from './BookingPanel';
import type { ServiceAvailabilityDto } from '../../../api/addonApi';

export interface ResultFloor {
  id: string;
  floorNo: number;
  name: string;
}

interface ExploreResultsProps {
  workspaces: ExploreWorkspace[];
  floors: ResultFloor[];
  people: number;
  typeIds: string[];
  /** Status for the searched slot: available | booked|startH|endH | maintenance | unassigned. */
  statusOf: (wsId: string) => string;
  priceOf: (typeId: string) => UnitPrice | undefined;
  /** Equipment the customer asked for, with what is left of each for the slot. */
  equipment: { id: string; name: string; stock?: ServiceAvailabilityDto }[];
  slotLabel: string;
  loading: boolean;
  selectedWs: string | null;
  onSelect: (ws: ExploreWorkspace) => void;
  onShowOnMap: (ws: ExploreWorkspace) => void;
  onEditFilters: () => void;
}

/**
 * Step 2 of Explore: the spaces that fit what the customer asked for, grouped by floor, free ones
 * first. Taken spaces can be shown on request so the customer sees why a favourite is missing.
 */
export const ExploreResults: React.FC<ExploreResultsProps> = ({
  workspaces, floors, people, typeIds, statusOf, priceOf, equipment, slotLabel, loading, selectedWs,
  onSelect, onShowOnMap, onEditFilters,
}) => {
  const [showTaken, setShowTaken] = useState(false);

  const matching = useMemo(
    () => workspaces.filter((w) => w.capacity >= people && (typeIds.length === 0 || typeIds.includes(w.workspace_type_id))),
    [workspaces, people, typeIds],
  );
  const withStatus = matching.map((w) => ({ ws: w, status: statusOf(w.id) }));
  const freeCount = withStatus.filter((r) => r.status === 'available').length;
  const visible = withStatus
    .filter((r) => showTaken || r.status === 'available')
    .sort((a, b) => Number(b.status === 'available') - Number(a.status === 'available') || a.ws.capacity - b.ws.capacity);

  const byFloor = floors
    .map((f) => ({ floor: f, items: visible.filter((r) => r.ws.floor_id === f.id) }))
    .filter((g) => g.items.length > 0);

  const outOfStock = equipment.filter((e) => e.stock && e.stock.remaining <= 0);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {loading ? 'Đang tìm chỗ phù hợp…' : freeCount > 0 ? `${freeCount} chỗ trống phù hợp` : 'Chưa có chỗ trống phù hợp'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {slotLabel} · từ {people} người{matching.length > freeCount && !loading ? ` · ${matching.length - freeCount} chỗ phù hợp đã kín` : ''}
          </p>
        </div>
        {matching.length > freeCount && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showTaken} onChange={(e) => setShowTaken(e.target.checked)} className="rounded" />
            Hiện cả chỗ đã kín
          </label>
        )}
      </div>

      {/* Equipment for the slot */}
      {equipment.length > 0 && (
        <div className={`rounded-xl border p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-2 ${
          outOfStock.length ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'
        }`}>
          <span className="flex items-center gap-1.5 font-medium text-foreground"><FiMonitor className="h-4 w-4" /> Thiết bị đã chọn:</span>
          {equipment.map((e) => (
            <span key={e.id} className="flex items-center gap-1.5">
              {e.stock && e.stock.remaining <= 0
                ? <FiAlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                : <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
              {e.name}
              <span className="text-muted-foreground">
                {e.stock ? (e.stock.remaining <= 0 ? '(đã hết trong khung giờ này)' : `(còn ${e.stock.remaining}/${e.stock.maxConcurrent})`) : '(luôn sẵn)'}
              </span>
            </span>
          ))}
          {outOfStock.length > 0 && (
            <span className="basis-full text-xs text-amber-700 dark:text-amber-400">
              Hãy chọn khung giờ khác nếu bạn bắt buộc cần thiết bị đã hết.
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-56 rounded-2xl bg-card border border-border animate-pulse" />)}
        </div>
      ) : byFloor.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <FiUsers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">Không có chỗ nào khớp bộ lọc</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {matching.length === 0
              ? `Chi nhánh chưa có không gian ${typeIds.length ? 'thuộc loại đã chọn ' : ''}đủ ${people} người. Thử giảm số người hoặc chọn loại khác.`
              : 'Các chỗ phù hợp đều đã kín trong khung giờ này. Thử đổi giờ, đổi ngày hoặc bật "Hiện cả chỗ đã kín".'}
          </p>
          <button type="button" onClick={onEditFilters} className="btn btn-secondary btn-sm mt-4">Sửa bộ lọc</button>
        </div>
      ) : (
        byFloor.map(({ floor, items }) => (
          <section key={floor.id} className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <FiLayers className="h-4 w-4" />
              {/^tầng\b/i.test(floor.name.trim()) ? floor.name : `Tầng ${floor.floorNo} · ${floor.name}`}
              <span className="font-normal">({items.filter((r) => r.status === 'available').length} trống)</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map(({ ws, status }) => {
                const free = status === 'available';
                const price = priceOf(ws.workspace_type_id);
                const busy = status.startsWith('booked') ? status.split('|') : null;
                const isSelected = selectedWs === ws.id;
                return (
                  <article
                    key={ws.id}
                    className={`rounded-2xl border bg-card overflow-hidden flex flex-col transition-shadow ${
                      isSelected ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:shadow-md'
                    } ${free ? '' : 'opacity-70'}`}
                  >
                    {ws.images && ws.images.length > 0 ? (
                      <div className="aspect-[16/9] bg-muted overflow-hidden">
                        <img src={ws.images[0].url} alt={ws.name} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="h-14 bg-muted/60 flex items-center justify-center" aria-hidden>
                        <FiImage className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{ws.name}</h4>
                          <p className="text-xs text-muted-foreground truncate">{ws.workspaceTypeName}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          free
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-border bg-muted text-muted-foreground'
                        }`}>
                          {free ? 'Trống' : busy ? `Bận ${busy[1]}h-${busy[2]}h` : 'Bảo trì'}
                        </span>
                      </div>
                      <p className="text-sm text-foreground flex items-center gap-1.5">
                        <FiUsers className="h-4 w-4 text-muted-foreground" /> {ws.capacity} chỗ ngồi
                        <span className="text-muted-foreground font-mono text-xs ml-auto">{ws.code}</span>
                      </p>
                      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
                        <p className="text-sm">
                          {price ? (
                            <>
                              <span className="font-semibold text-foreground">{formatVND(price.price)}</span>
                              <span className="text-muted-foreground">/{durationUnitLabel[price.duration_unit]?.toLowerCase()}</span>
                            </>
                          ) : <span className="text-muted-foreground">Chưa có giá</span>}
                        </p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => onShowOnMap(ws)}
                            className="btn btn-ghost btn-sm !px-2"
                            title="Xem vị trí trên sơ đồ tầng"
                            aria-label={`Xem ${ws.name} trên sơ đồ`}
                          >
                            <FiMap className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelect(ws)}
                            disabled={!free || !price}
                            className="btn btn-primary btn-sm disabled:opacity-40"
                          >
                            {isSelected ? 'Đang chọn' : 'Chọn chỗ này'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
