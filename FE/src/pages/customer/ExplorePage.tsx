import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  FiCalendar,
  FiGrid,
  FiList,
  FiMap,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiTag,
  FiUsers,
  FiX,
  FiCheck,
  FiPlus,
  FiMinus,
  FiMaximize2,
  FiChevronDown,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { WorkspaceAmenities } from "../../components/WorkspaceAmenities";
import {
  formatVND,
  durationUnitLabel,
  workspaceTypeLabel,
} from "../../utils/formatters";
import {
  customerSpaceApi,
  type FloorResponse,
  type WorkspaceResponse,
  type BranchResponse,
  type BranchPriceResponse,
  type PublicWorkspaceAvailability,
} from "../../lib/spaceApi";
import { useToast } from "../../components/Toast";
import FloorPlanViewer from "../../components/floor-plan/FloorPlanViewer";
import type { FloorLayout } from "../../types/floorPlan";
import { resolveBranchId } from "../../data/branchAliases";
import { addonApi, type ExtraServiceDto } from "../../api/addonApi";
import { Skeleton } from "../../components/ui/Skeleton";

/* ── Types ── */
type ViewMode = "map" | "day" | "grid" | "list";

/** Workspace as shown on the explore screens, built from the API response. */
interface ExploreWorkspace {
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
}

type PriceUnit = "hour" | "day" | "week" | "month";

interface UnitPrice {
  price: number;
  duration_unit: PriceUnit;
}

const DEFAULT_OPEN_HOUR = 6;
const DEFAULT_CLOSE_HOUR = 23;

/** Whole bookable hours [openHour, closeHour) of a branch, from its "HH:mm:ss" opening hours. */
const branchHourRange = (branch?: Pick<BranchResponse, "openTime" | "closeTime"> | null) => {
  const toMinutes = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const open = toMinutes(branch?.openTime);
  const close = toMinutes(branch?.closeTime);
  if (open == null || close == null || close <= open) {
    return { openHour: DEFAULT_OPEN_HOUR, closeHour: DEFAULT_CLOSE_HOUR };
  }
  return { openHour: Math.ceil(open / 60), closeHour: Math.floor(close / 60) };
};

/* ── Booking Panel (shared between desktop sidebar and mobile bottom sheet) ── */
type DurationUnitMode = 'hour' | 'day' | 'week';

const UNIT_LABELS: Record<DurationUnitMode, string> = {
  hour: 'Giờ',
  day: 'Ngày',
  week: 'Tuần',
};

/** Returns midnight (local) of a Date */
const toMidnight = (d: Date): Date => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
};

/** Count calendar days between two midnight-dates (inclusive start, exclusive end) */
const daysDiff = (from: Date, to: Date): number =>
  Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));

const BookingPanel: React.FC<{
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
  onBookNow: (
    endHour: number,
    services: Record<string, number>,
    subtotal: number,
    addonTotal: number,
    endDate: Date,
    durationUnit: DurationUnitMode,
  ) => void;
}> = ({
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
  }, [selectedHour, initialEndHour, selectedWs, selectedDate]);

  const handleServiceChange = (id: string, isChecked: boolean) => {
    setServices((prev) => {
      const next = { ...prev };
      if (isChecked) next[id] = 1;
      else delete next[id];
      return next;
    });
  };

  // Calculate unitCount based on selected durationUnit
  const unitCount = useMemo(() => {
    if (durationUnit === 'hour') return Math.max(1, endHour - selectedHour);
    if (durationUnit === 'day') return daysDiff(toMidnight(selectedDate), endDate);
    // week
    return Math.max(1, Math.ceil(daysDiff(toMidnight(selectedDate), endDate) / 7));
  }, [durationUnit, endHour, selectedHour, selectedDate, endDate]);

  const subtotal = unitCount * (price?.price || 0);
  const addonTotal = Object.keys(services).reduce((sum, id) => {
    const s = addonServices.find((x) => x.id === id);
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
        <h3 className="font-medium text-lg">{ws.name}</h3>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm"
          style={{ padding: "4px" }}
          aria-label="Đóng chi tiết"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>

      {/* Status badge */}
      <span
        className={`badge ${currentAvail === "available" ? "badge-success" : currentAvail?.startsWith("booked") ? "badge-danger" : "badge-neutral"}`}
      >
        {currentAvail === "available"
          ? <><span className="inline-block h-2 w-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/300 mr-1" /> Trống</>
          : currentAvail?.startsWith("booked")
            ? <><span className="inline-block h-2 w-2 rounded-full bg-red-50 dark:bg-red-950/30 dark:bg-red-950/300 mr-1" /> Đã đặt {currentAvail.split('|').length === 3 ? `(${currentAvail.split('|')[1]}h-${currentAvail.split('|')[2]}h)` : ''}</>
            : <><span className="inline-block h-2 w-2 rounded-full bg-slate-400 mr-1" /> Bảo trì</>}
      </span>

      {/* Info */}
      <div className="mt-5 space-y-3">
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3">
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
          </div>
        </div>

        <WorkspaceAmenities workspaceTypeId={ws.workspace_type_id} workspaceTypeCode={wsType?.code} />

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
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Loại thời gian đặt</p>
          <div className="flex gap-1 bg-[var(--border-subtle)] rounded-xl p-0.5">
            {(['hour', 'day', 'week'] as DurationUnitMode[]).map((u) => (
              <button
                key={u}
                onClick={() => setDurationUnit(u)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
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
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3">
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
                  onChange={(e) => onChangeStartHour(Number(e.target.value))}
                  className="input-field mt-1 text-sm bg-transparent border-b border-border focus:outline-none w-full"
                >
                  {Array.from({ length: Math.max(0, closeHour - openHour) }, (_, i) => i + openHour).map((h) => (
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
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="input-field mt-1 text-sm bg-transparent border-b border-border focus:outline-none w-full"
                >
                  {Array.from(
                    { length: Math.max(0, closeHour - selectedHour) },
                    (_, i) => selectedHour + i + 1,
                  ).map((h) => (
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
                  onChange={(e) => {
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
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">
            Dịch vụ thêm
          </p>
          <div className="space-y-2">
            {addonServices.length === 0 && (
              <p className="text-xs text-[var(--text-tertiary)]">Chi nhánh chưa có dịch vụ thêm.</p>
            )}
            {addonServices.map((s) => (
              <label
                key={s.id}
                htmlFor={`addon-${s.id}-${selectedWs}`}
                className="flex items-center gap-3 text-sm cursor-pointer"
              >
                <input
                  id={`addon-${s.id}-${selectedWs}`}
                  type="checkbox"
                  checked={!!services[s.id]}
                  onChange={(e) => handleServiceChange(s.id, e.target.checked)}
                  className="rounded accent-[var(--brand-primary)]"
                />
                <span className="flex items-center gap-1.5">{s.name}</span>
                <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                  +{formatVND(s.price)}/{s.unit}
                </span>
              </label>
            ))}
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
      {currentAvail === "available" && price && (
        <button
          className="btn btn-primary w-full mt-5"
          onClick={() => onBookNow(endHour, services, subtotal, addonTotal, endDate, durationUnit)}
        >
          <FiCheck className="h-4 w-4" /> Đặt chỗ ngay
        </button>
      )}
      {currentAvail?.startsWith("booked") && (
        <div className="mt-5 rounded-2xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-3 text-center">
          <p className="text-sm font-semibold text-[var(--state-danger)]">
            Đã được đặt {currentAvail.split('|').length === 3 ? `từ ${currentAvail.split('|')[1]}h đến ${currentAvail.split('|')[2]}h` : ''}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Thử chọn khung giờ hoặc ngày khác
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Main Explore Page ── */
const ExplorePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // Retrieve initial branch ID from search params (?branchId=...) or navigation state
  const initialBranchId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const qBranchId = params.get("branchId");
    const normalizedQueryBranchId = qBranchId
      ? resolveBranchId(qBranchId)
      : "";
    if (normalizedQueryBranchId) {
      return normalizedQueryBranchId;
    }
    const stateBranchId = (location.state as { branchId?: string })?.branchId;
    const normalizedStateBranchId = stateBranchId
      ? resolveBranchId(stateBranchId)
      : "";
    if (normalizedStateBranchId) {
      return normalizedStateBranchId;
    }
    return "";
  }, [location.search, location.state]);

  const [selectedBranch, setSelectedBranch] = useState(() => {
    return initialBranchId || sessionStorage.getItem("selectedBranch") || "";
  });

  // Restore selectedFloor and selectedWs from URL search params or sessionStorage
  const [selectedFloor, setSelectedFloor] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("floorId") || sessionStorage.getItem("selectedFloorId") || "";
  });

  // Sync state if initial branch selection changes
  useEffect(() => {
    if (initialBranchId) {
      setSelectedBranch(initialBranchId);
    }
  }, [initialBranchId]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = sessionStorage.getItem("selectedDate");
    return saved ? new Date(saved) : new Date();
  });
  
  const [selectedHour, setSelectedHour] = useState(() => {
    const saved = sessionStorage.getItem("selectedHour");
    return saved ? Number(saved) : new Date().getHours();
  });
  
  const [selectedEndHour, setSelectedEndHour] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("selectedEndHour");
    return saved ? Number(saved) : null;
  });
  
  // Persist states to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("selectedBranch", selectedBranch);
  }, [selectedBranch]);

  useEffect(() => {
    sessionStorage.setItem("selectedFloorId", selectedFloor);
  }, [selectedFloor]);

  useEffect(() => {
    sessionStorage.setItem("selectedDate", selectedDate.toISOString());
  }, [selectedDate]);

  useEffect(() => {
    sessionStorage.setItem("selectedHour", String(selectedHour));
  }, [selectedHour]);

  useEffect(() => {
    if (selectedEndHour !== null) {
      sessionStorage.setItem("selectedEndHour", String(selectedEndHour));
    } else {
      sessionStorage.removeItem("selectedEndHour");
    }
  }, [selectedEndHour]);
  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);

  useEffect(() => {
    const handleMouseUp = () => setIsDraggingTime(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const [selectedWs, setSelectedWsState] = useState<string | null>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("wsId") || sessionStorage.getItem("selectedWsId") || null;
  });

  const setSelectedWs = useCallback((wsId: string | null) => {
    setSelectedWsState(wsId);
    setSelectedEndHour(null); // Reset range selection on new workspace
    if (wsId) {
      sessionStorage.setItem("selectedWsId", wsId);
    } else {
      sessionStorage.removeItem("selectedWsId");
    }
  }, []);



  const [apiBranches, setApiBranches] = useState<BranchResponse[]>([]);
  const [branchPrices, setBranchPrices] = useState<BranchPriceResponse[]>([]);
  const [addonServices, setAddonServices] = useState<ExtraServiceDto[]>([]);

  // Database-loaded floors, workspaces and user bookings
  const [dbFloors, setDbFloors] = useState<FloorResponse[]>([]);
  const [dbWorkspaces, setDbWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [branchAvailability, setBranchAvailability] = useState<PublicWorkspaceAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Branches come only from the API; if they cannot be loaded the page says so.
  useEffect(() => {
    let active = true;
    const loadBranches = async () => {
      try {
        const data = await customerSpaceApi.listBranches();
        if (!active) return;
        setApiBranches(data);
        const usable = data.filter((b) => b.status === "active");
        setSelectedBranch((prev) => {
          const resolved = resolveBranchId(prev);
          return usable.some((b) => b.id === resolved) ? resolved : (usable[0]?.id ?? "");
        });
        if (usable.length === 0) {
          setErrorMsg("Hiện chưa có chi nhánh nào nhận đặt chỗ.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load branches", err);
        if (active) {
          setErrorMsg("Không tải được danh sách chi nhánh. Vui lòng kiểm tra kết nối và thử lại.");
          setLoading(false);
        }
      }
    };
    loadBranches();
    return () => { active = false; };
  }, []);

  const activeBranches = useMemo(() => apiBranches.filter((b) => b.status === "active"), [apiBranches]);

  const { openHour, closeHour } = useMemo(
    () => branchHourRange(apiBranches.find((b) => b.id === resolveBranchId(selectedBranch))),
    [apiBranches, selectedBranch],
  );

  // Keep the selected hour inside the branch's opening hours.
  useEffect(() => {
    if (selectedHour < openHour) setSelectedHour(openHour);
    else if (selectedHour >= closeHour) setSelectedHour(Math.max(openHour, closeHour - 1));
  }, [openHour, closeHour]);

  // Real prices and add-on services of the selected branch.
  useEffect(() => {
    let active = true;
    const resolvedId = resolveBranchId(selectedBranch);
    setBranchPrices([]);
    setAddonServices([]);
    if (!resolvedId) return;
    customerSpaceApi.listPrices(resolvedId)
      .then((data) => { if (active) setBranchPrices(data); })
      .catch((err) => console.error("Failed to load branch prices", err));
    addonApi.listServices(resolvedId)
      .then((data) => { if (active) setAddonServices(data); })
      .catch((err) => console.error("Failed to load add-on services", err));
    return () => { active = false; };
  }, [selectedBranch]);

  // Fetch branch-wide booking status (ALL customers, not just the current one) to color the
  // availability map correctly — bookingApi.getMyBookings() only ever reflects the caller's own
  // bookings, so a desk booked by someone else would otherwise still render as "available".
  useEffect(() => {
    let active = true;
    const fetchAvailability = async () => {
      try {
        const resolvedId = resolveBranchId(selectedBranch);
        if (!resolvedId) return;
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const to = new Date(from);
        to.setDate(to.getDate() + 90); // 90-day lookahead covers realistic day/week bookings
        const data = await customerSpaceApi.getBookingStatus(resolvedId, from, to);
        if (active && Array.isArray(data)) {
          setBranchAvailability(data);
        }
      } catch (err) {
        console.warn("Failed to load branch-wide availability map:", err);
        if (active) setBranchAvailability([]);
      }
    };
    fetchAvailability();
    return () => { active = false; };
  }, [selectedBranch]);

  // Load floors when selected branch changes
  useEffect(() => {
    const resolvedId = resolveBranchId(selectedBranch);
    if (!resolvedId) return;
    let active = true;
    const loadFloors = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const data = await customerSpaceApi.listFloors(resolvedId);
        if (active) {
          setDbFloors(data);
          const savedFloorId = sessionStorage.getItem("selectedFloorId");
          const hasSaved = savedFloorId && data.some((f) => f.id === savedFloorId);
          setSelectedFloor(hasSaved ? savedFloorId : (data.length > 0 ? data[0].id : ""));
        }
      } catch (err: any) {
        console.error("Failed to load floors from DB", err);
        if (active) {
          setErrorMsg("Không thể tải sơ đồ tầng. Vui lòng thử lại sau.");
          setDbFloors([]);
          setSelectedFloor("");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadFloors();
    return () => {
      active = false;
    };
  }, [selectedBranch]);

  // Load workspaces when selected floor changes
  useEffect(() => {
    const resolvedBranchId = resolveBranchId(selectedBranch);
    if (!selectedFloor || !resolvedBranchId) {
      setDbWorkspaces([]);
      setWorkspacesLoading(false);
      return;
    }
    let active = true;
    const loadWorkspaces = async () => {
      setWorkspacesLoading(true);
      try {
        const data = await customerSpaceApi.listWorkspaces(resolvedBranchId, selectedFloor);
        if (active) setDbWorkspaces(data);
      } catch (err) {
        console.error("Failed to load workspaces from DB", err);
        if (active) {
          setDbWorkspaces([]);
          setErrorMsg("Không thể tải danh sách chỗ ngồi. Vui lòng thử lại sau.");
        }
      } finally {
        if (active) setWorkspacesLoading(false);
      }
    };
    loadWorkspaces();
    return () => {
      active = false;
    };
  }, [selectedFloor, selectedBranch]);

  const branchFloors = dbFloors;
  const currentFloor = selectedFloor || branchFloors[0]?.id || "";
  const currentFloorData = branchFloors.find((f) => f.id === currentFloor);

  const mappedWorkspaces = useMemo<ExploreWorkspace[]>(() => {
    return dbWorkspaces.map((ws) => ({
      id: ws.id,
      workspace_type_id: ws.workspaceTypeId,
      workspaceTypeName: ws.workspaceTypeName,
      code: ws.code,
      name: ws.name,
      capacity: ws.capacity,
      svg_element_id: ws.svgElementId,
      status: ws.status,
      floor_id: currentFloor,
      branch_id: resolveBranchId(selectedBranch),
    }));
  }, [dbWorkspaces, currentFloor, selectedBranch]);

  const floorWorkspaces = mappedWorkspaces;

  const getWsAvailability = useCallback(
    (wsId: string, checkDate?: Date, checkHour?: number, checkEndDate?: Date, checkEndHour?: number) => {
      const ws = mappedWorkspaces.find((w) => w.id === wsId);
      if (!ws) return "unassigned";
      if (
        ws.status.toLowerCase() === "maintenance" ||
        ws.status.toLowerCase() === "inactive"
      )
        return "maintenance";

      const targetDate = checkDate || selectedDate;
      const targetHour = checkHour !== undefined ? checkHour : selectedHour;
      
      const checkTimeStart = new Date(targetDate);
      checkTimeStart.setHours(targetHour, 0, 0, 0);

      let checkTimeEnd = new Date(checkTimeStart);
      checkTimeEnd.setHours(targetHour + 1, 0, 0, 0);
      
      if (checkEndDate || checkEndHour !== undefined) {
         if (checkEndDate) {
             checkTimeEnd = new Date(checkEndDate);
             if (checkEndHour !== undefined) {
                 checkTimeEnd.setHours(checkEndHour, 0, 0, 0);
             } else {
                 checkTimeEnd.setHours(23, 59, 59, 999);
             }
         } else if (checkEndHour !== undefined) {
             checkTimeEnd = new Date(targetDate);
             checkTimeEnd.setHours(checkEndHour, 0, 0, 0);
         }
      }

      // Check branch-wide availability from API — covers bookings made by ANY customer, not
      // just the current one (bookingApi.getMyBookings() only ever returns the caller's own).
      const wsAvailability = branchAvailability.find(
        (a) => a.workspaceId === ws.id,
      );
      const activeBusySlot = wsAvailability?.busySlots.find((slot) => {
        const start = new Date(slot.startAt);
        const end = new Date(slot.endAt);
        return checkTimeStart < end && start < checkTimeEnd;
      });

      if (activeBusySlot) {
        if (activeBusySlot.reason === "maintenance") return "maintenance";
        return `booked|${new Date(activeBusySlot.startAt).getHours()}|${new Date(activeBusySlot.endAt).getHours()}`;
      }
      return "available";
    },
    [mappedWorkspaces, selectedDate, selectedHour, branchAvailability],
  );

  const selectedWsData = selectedWs
    ? mappedWorkspaces.find((w) => w.id === selectedWs)
    : null;
  const selectedWsType = selectedWsData
    ? {
        id: selectedWsData.workspace_type_id,
        name: selectedWsData.workspaceTypeName,
        code: branchPrices.find((p) => p.workspaceTypeId === selectedWsData.workspace_type_id)?.workspaceTypeCode,
      }
    : null;
  const selectedWsAvail = selectedWs ? getWsAvailability(selectedWs) : null;

  const getPrice = (wsTypeId: string, unit: PriceUnit): UnitPrice | undefined => {
    const p = branchPrices.find((x) => x.workspaceTypeId === wsTypeId && x.unit === unit);
    return p ? { price: p.price, duration_unit: p.unit } : undefined;
  };

  /** Headline price on cards and rows: the shortest unit the type can be booked by. */
  const getDisplayPrice = (wsTypeId: string): UnitPrice | undefined =>
    (["hour", "day", "week", "month"] as PriceUnit[])
      .map((u) => getPrice(wsTypeId, u))
      .find((p): p is UnitPrice => !!p);

  const formatDateShort = (d: Date) =>
    d
      .toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
      .toUpperCase();

  const shiftDate = (offset: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    if (d < today) return; // Prevent picking past dates
    setSelectedDate(d);
  };

  const handleBookNow = (
    endHour: number,
    services: Record<string, number>,
    subtotal: number,
    addonTotal: number,
    endDate: Date,
    durationUnit: DurationUnitMode,
  ) => {
    if (!selectedWsData) return;
    
    // Check if the selected date and time is in the past
    const now = new Date();
    now.setMinutes(0, 0, 0); // Allow booking for the current hour even if minutes have passed

    const startAtDate = new Date(selectedDate);
    startAtDate.setHours(selectedHour, 0, 0, 0);
    if (startAtDate < now) {
      showToast("Không thể đặt chỗ trong quá khứ. Vui lòng chọn khung giờ khác.", "error");
      return;
    }

    if (durationUnit === 'hour' && endHour <= selectedHour) {
      showToast("Giờ kết thúc phải lớn hơn giờ bắt đầu!", "error");
      return;
    }

    const avail = getWsAvailability(selectedWsData.id, selectedDate, selectedHour, endDate, durationUnit === 'hour' ? endHour : undefined);
    
    if (avail?.startsWith('booked') || avail === 'booked') {
        const parts = avail.split('|');
        if (parts.length === 3) {
            showToast(`Khoảng thời gian này đã có người đặt (${parts[1]}h-${parts[2]}h), vui lòng chọn khoảng thời gian hoặc vị trí khác.`, "error");
        } else {
            showToast("Khoảng thời gian này đã có người đặt, vui lòng chọn khoảng thời gian hoặc vị trí khác.", "error");
        }
        return;
    }

    const price = getPrice(selectedWsData.workspace_type_id, durationUnit);
    if (!price) {
      showToast("Chi nhánh chưa có giá cho loại thời gian này.", "error");
      return;
    }
    const branchObj = apiBranches.find((b) => b.id === resolveBranchId(selectedBranch));
    const branchName = branchObj ? branchObj.name : "CoSpace";
    const addons = Object.entries(services)
      .map(([serviceId, quantity]) => {
        const s = addonServices.find((x) => x.id === serviceId);
        return s ? { serviceId, quantity, name: s.name, price: s.price, unit: s.unit } : null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    navigate("/customer/checkout", {
      state: {
        workspace: selectedWsData,
        workspaceType: selectedWsType,
        branchName: branchName,
        date: selectedDate,
        hour: selectedHour,
        endHour: endHour,
        endDate: endDate,
        durationUnit: durationUnit,
        addons,
        subtotal: subtotal,
        addonTotal: addonTotal,
        total: subtotal + addonTotal,
        price: price,
      },
    });
  };

  /* Stats */
  const stats = useMemo(() => {
    const total = mappedWorkspaces.length;
    const available = mappedWorkspaces.filter(
      (ws) => getWsAvailability(ws.id) === "available",
    ).length;
    const booked = mappedWorkspaces.filter(
      (ws) => getWsAvailability(ws.id) === "booked",
    ).length;
    return {
      total,
      available,
      booked,
      maintenance: total - available - booked,
    };
  }, [mappedWorkspaces, getWsAvailability]);

  // Parse layoutJson
  const parsedLayout = useMemo(() => {
    if (!currentFloorData?.layoutJson) return null;
    try {
      return JSON.parse(currentFloorData.layoutJson) as FloorLayout;
    } catch (e) {
      console.error("Failed to parse layout JSON", e);
      return null;
    }
  }, [currentFloorData]);

  return (
    <div
      className="flex flex-col h-full bg-muted/50 font-sans"
      style={{
        margin: "-24px",
        width: "calc(100% + 48px)",
        height: "calc(100% + 48px)",
        fontFamily: "'Space Grotesk', 'DM Sans', sans-serif"
      }}
    >


      {/* ── Top Toolbar (Block-based) ── */}
      <div className="flex items-center gap-3 px-6 py-3 bg-card border-b border-border shrink-0 overflow-x-auto shadow-sm">
        {/* View mode switcher */}
        <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border shrink-0 shadow-sm">
          {[
            {
              mode: "day" as ViewMode,
              label: "LỊCH NGÀY",
              icon: <FiCalendar className="h-3.5 w-3.5" />,
            },
            {
              mode: "grid" as ViewMode,
              label: "LƯỚI",
              icon: <FiGrid className="h-3.5 w-3.5" />,
            },
            {
              mode: "list" as ViewMode,
              label: "DANH SÁCH",
              icon: <FiList className="h-3.5 w-3.5" />,
            },
            {
              mode: "map" as ViewMode,
              label: "SƠ ĐỒ 2D",
              icon: <FiMap className="h-3.5 w-3.5" />,
            },
          ].map((v) => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all rounded-xl ${
                viewMode === v.mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1 shrink-0 bg-muted rounded-2xl border border-border p-1 shadow-sm">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 rounded-full hover:bg-card text-foreground transition"
            aria-label="Ngày trước"
          >
            <FiChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-foreground px-2 whitespace-nowrap tracking-tight">
            {formatDateShort(selectedDate)}
          </span>
          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 rounded-full hover:bg-card text-foreground transition"
            aria-label="Ngày sau"
          >
            <FiChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Floor/Level selector */}
        <div className="relative shrink-0">
          {branchFloors.length > 0 ? (
            <>
              <select
                value={currentFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="appearance-none bg-card border border-border rounded-2xl px-4 py-2 pr-10 text-xs font-medium text-foreground cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {branchFloors.map((f) => (
                  <option key={f.id} value={f.id}>
                    TẦNG {f.floorNo} - {f.name}
                  </option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
            </>
          ) : (
            <span className="text-xs text-foreground px-4 py-2 border border-border bg-muted rounded-2xl shadow-sm font-medium">
              Không có không gian
            </span>
          )}
        </div>

        {/* Time slider */}
        <div className="flex items-center gap-3 shrink-0 bg-card border border-border rounded-2xl px-4 py-2 shadow-sm">
          <FiClock className="h-4 w-4 text-foreground" />
          <input
            type="range"
            min={openHour}
            max={Math.max(openHour, closeHour - 1)}
            value={selectedHour}
            onChange={(e) => {
              setSelectedHour(Number(e.target.value));
              setSelectedEndHour(null);
            }}
            className="w-24 h-2 accent-[#2563EB] cursor-pointer"
            aria-label="Chọn giờ"
          />
          <span className="text-xs font-medium text-foreground w-12 tabular-nums">
            {String(selectedHour).padStart(2, "0")}:00
          </span>
        </div>

        {/* Branch selector */}
        <div className="relative shrink-0">
          <select
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setSelectedFloor("");
            }}
            className="appearance-none bg-card border border-border rounded-2xl px-4 py-2 pr-10 text-xs font-medium text-foreground cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
        </div>

        <div className="flex-1" />

      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Floor Plan Area */}
        <div className="flex-1 relative bg-muted/50 overflow-hidden">
          {viewMode === "map" ? (
            <>

              {/* SVG Floor Plan */}
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <div className="w-full max-w-4xl h-full flex items-center justify-center">
                  {loading ? (
                    <div className="flex items-center gap-3 px-6 py-4 bg-card border border-border rounded-2xl shadow-sm">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-slate-900" />
                      <span className="text-sm font-medium text-foreground">Đang tải sơ đồ...</span>
                    </div>
                  ) : errorMsg ? (
                    <div className="text-sm text-foreground font-medium px-6 py-4 bg-card border border-border rounded-2xl shadow-sm">
                      {errorMsg}
                    </div>
                  ) : parsedLayout ? (
                    <FloorPlanViewer
                      layout={parsedLayout}
                      selectedWsId={selectedWs}
                      onSelectWorkspace={(wsId) => setSelectedWs(wsId)}
                      getAvailability={(wsId) => {
                        const avail = getWsAvailability(wsId);
                        if (avail?.startsWith('booked')) return 'booked';
                        return avail as "maintenance" | "available" | "unassigned";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-2xl max-w-md shadow-sm">
                      <FiMap className="h-12 w-12 text-foreground mb-4" />
                      <p className="text-base font-medium text-foreground tracking-tight">
                        Tầng này chưa được thiết lập sơ đồ.
                      </p>
                      <p className="text-sm text-foreground opacity-70 mt-2 font-semibold">
                        Vui lòng quay lại sau hoặc liên hệ quản trị viên.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </>
          ) : viewMode === "list" ? (
            /* ── LIST VIEW ── */
            <div className="p-6 overflow-y-auto h-full bg-muted/50">
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Workspace</th>
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Loại</th>
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Sức chứa</th>
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Giá</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loading || workspacesLoading) &&
                      [...Array(6)].map((_, i) => (
                        <tr key={`ws-skeleton-${i}`} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-4 w-8" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-4 py-4"><Skeleton className="h-8 w-20" /></td>
                        </tr>
                      ))}
                    {!loading && !workspacesLoading && floorWorkspaces.map((ws) => {
                      const avail = getWsAvailability(
                        ws.id,
                        selectedDate,
                        selectedHour,
                      );
                      const price = getDisplayPrice(ws.workspace_type_id);
                      return (
                        <tr
                          key={ws.id}
                          className="cursor-pointer border-b border-border last:border-b-0 hover:bg-card/10 transition-colors"
                          style={
                            selectedWs === ws.id
                              ? { background: "rgba(245, 158, 11, 0.2)" }
                              : undefined
                          }
                          onClick={() =>
                            setSelectedWs(selectedWs === ws.id ? null : ws.id)
                          }
                        >
                          <td className="px-4 py-4 font-medium text-foreground">
                            {ws.name} <span className="text-xs opacity-70">({ws.code})</span>
                          </td>
                          <td className="px-4 py-4 text-foreground text-sm">
                            {ws.workspaceTypeName || "—"}
                          </td>
                          <td className="px-4 py-4 text-foreground font-medium">{ws.capacity || "—"}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border border-border ${
                                avail === "available"
                                  ? "bg-emerald-100 text-emerald-800 dark:text-emerald-400 dark:text-emerald-400"
                                  : avail === "booked"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-200 text-foreground"
                              }`}
                            >
                              {avail === "available"
                                ? "Trống"
                                : avail === "booked"
                                  ? "Đã đặt"
                                  : "Bảo trì"}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium text-foreground">
                            {price
                              ? formatVND(price.price) +
                                "/" +
                                durationUnitLabel[
                                  price.duration_unit
                                ]?.toLowerCase()
                              : "—"}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {avail === "available" && (
                              <button
                                className="bg-card text-foreground border border-border px-4 py-1.5 rounded-2xl font-medium shadow-sm hover:translate-y-px hover:shadow-none transition-all text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWs(ws.id);
                                }}
                              >
                                Đặt
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ── */
            <div className="p-6 overflow-y-auto h-full bg-muted/50">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {floorWorkspaces.map((ws) => {
                  const avail = getWsAvailability(
                    ws.id,
                    selectedDate,
                    selectedHour,
                  );
                  const price = getDisplayPrice(ws.workspace_type_id);
                  return (
                    <div
                      key={ws.id}
                      onClick={() =>
                        setSelectedWs(selectedWs === ws.id ? null : ws.id)
                      }
                      className={`group relative overflow-hidden bg-card rounded-3xl border transition-all duration-300 p-5 cursor-pointer flex flex-col h-full ${
                        selectedWs === ws.id
                          ? "border-primary ring-2 ring-primary/25 shadow-lg -translate-y-1 bg-primary/[0.02]"
                          : "border-border shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3.5">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            avail === "available"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : avail === "booked"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {avail === "available"
                            ? "Còn trống"
                            : avail === "booked"
                              ? "Đang có khách"
                              : "Đang bảo trì"}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{ws.name}</span>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          {ws.code}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                        <FiUsers className="h-3.5 w-3.5 text-primary" />
                        <span>{ws.workspaceTypeName || 'Không gian làm việc'}</span>
                        <span>·</span>
                        <span>{ws.capacity} chỗ ngồi</span>
                      </p>
                      
                      <div className="mt-auto pt-4 border-t border-border/60">
                        {price && (
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-muted-foreground">Giá tiêu chuẩn:</span>
                            <p className="font-bold text-lg text-primary">
                              {formatVND(price.price)}
                              <span className="text-xs font-normal text-muted-foreground">/{durationUnitLabel[price.duration_unit]?.toLowerCase()}</span>
                            </p>
                          </div>
                        )}
                        {avail === "available" && (
                          <button className="w-full mt-3 btn btn-primary py-2.5 rounded-2xl font-semibold text-xs shadow-sm hover:shadow-md transition-all">
                            Chọn đặt bàn này
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── DAY VIEW (Timeline) ── */
            <div className="p-6 overflow-y-auto h-full bg-muted/50">
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Time header */}
                  <div className="flex border-b border-border bg-muted">
                    <div className="w-36 shrink-0 p-3 text-xs font-medium text-foreground tracking-tight flex items-center justify-center border-r border-border">
                      Workspace
                    </div>
                    <div className="flex-1 flex">
                      {Array.from({ length: Math.max(0, closeHour - openHour) }, (_, i) => i + openHour).map((h) => (
                        <div
                          key={h}
                          className={`flex-1 p-2 text-center text-xs border-r last:border-r-0 border-border ${h === selectedHour ? "bg-slate-900 font-medium text-white" : "text-foreground font-medium"}`}
                        >
                          {String(h).padStart(2, "0")}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Workspace rows */}
                  {floorWorkspaces.map((ws) => {
                    return (
                      <div
                        key={ws.id}
                        className="flex border-b last:border-b-0 border-border hover:bg-card/10 transition-colors"
                      >
                        <div className="w-36 shrink-0 p-3 text-sm font-medium truncate border-r border-border text-foreground flex items-center">
                          {ws.name}
                        </div>
                        <div className="flex-1 flex">
                          {Array.from({ length: Math.max(0, closeHour - openHour) }, (_, i) => i + openHour).map(
                            (h) => {
                              const avail = getWsAvailability(
                                ws.id,
                                selectedDate,
                                h,
                              );
                              return (
                                <div
                                  key={h}
                                  className="flex-1 border-r last:border-r-0 border-border p-1.5 cursor-pointer hover:bg-card/50 transition-colors"
                                  onMouseDown={() => {
                                    if (avail === "available") {
                                      setIsDraggingTime(true);
                                      setDragStartHour(h);
                                      setSelectedHour(h);
                                      setSelectedEndHour(h + 1);
                                      setSelectedWs(ws.id);
                                    } else {
                                      setSelectedHour(h);
                                      setSelectedWs(ws.id);
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    if (isDraggingTime && dragStartHour !== null && ws.id === selectedWs) {
                                      if (avail === "available") {
                                        let allAvail = true;
                                        const start = Math.min(dragStartHour, h);
                                        const end = Math.max(dragStartHour, h);
                                        for (let i = start; i <= end; i++) {
                                          if (getWsAvailability(ws.id, selectedDate, i) !== "available") {
                                            allAvail = false;
                                            break;
                                          }
                                        }
                                        if (allAvail) {
                                          setSelectedHour(start);
                                          setSelectedEndHour(end + 1);
                                        }
                                      }
                                    }
                                  }}
                                >
                                  <div
                                    className={`w-full h-8 rounded-full border border-border ${
                                      (ws.id === selectedWs && h >= selectedHour && h < (selectedEndHour || selectedHour + 1))
                                        ? "bg-[var(--brand-primary)] shadow-[0_0_10px_rgba(37,99,235,0.4)] scale-[1.05]"
                                        : avail === "available"
                                          ? "bg-emerald-400"
                                          : avail === "booked"
                                            ? "bg-rose-400"
                                            : "bg-slate-300"
                                    } transition-all hover:opacity-80`}
                                  />
                                </div>
                              );
                            },
                          )}
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
                initialEndHour={selectedEndHour || Math.min(selectedHour + 1, closeHour)}
                selectedDate={selectedDate}
                getPrice={(unit) => getPrice(selectedWsData.workspace_type_id, unit)}
                addonServices={addonServices}
                openHour={openHour}
                closeHour={closeHour}
                onClose={() => setSelectedWs(null)}
                onChangeStartHour={(h) => setSelectedHour(h)}
                checkAvailability={(stH, endH, endD, unit) => getWsAvailability(selectedWs, selectedDate, stH, endD, unit === 'hour' ? endH : undefined)}
                onBookNow={handleBookNow}
              />
            </div>

            {/* Mobile: bottom sheet */}
            <div className="lg:hidden">
              <div
                className="bottom-sheet-overlay"
                onClick={() => setSelectedWs(null)}
              />
              <div className="bottom-sheet bottom-sheet-enter">
                <div className="bottom-sheet-handle" />
                <BookingPanel
                  ws={selectedWsData}
                  wsType={selectedWsType}
                  wsAvail={selectedWsAvail}
                  selectedWs={selectedWs}
                  selectedHour={selectedHour}
                  initialEndHour={selectedEndHour || Math.min(selectedHour + 1, closeHour)}
                  selectedDate={selectedDate}
                  getPrice={(unit) => getPrice(selectedWsData.workspace_type_id, unit)}
                  addonServices={addonServices}
                  openHour={openHour}
                  closeHour={closeHour}
                  onClose={() => setSelectedWs(null)}
                  onChangeStartHour={(h) => setSelectedHour(h)}
                  checkAvailability={(stH, endH, endD, unit) => getWsAvailability(selectedWs, selectedDate, stH, endD, unit === 'hour' ? endH : undefined)}
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
