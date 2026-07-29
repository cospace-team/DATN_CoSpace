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
  FiCoffee,
  FiMonitor,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import {
  branches,
  floors as mockFloors,
  workspaces,
  workspaceTypes,
  pricePolicies,
  getWorkspaceType,
  bookings,
  Workspace,
} from "../../data/mockData";
import {
  formatVND,
  durationUnitLabel,
  workspaceTypeLabel,
} from "../../utils/formatters";
import {
  customerSpaceApi,
  type FloorResponse,
  type WorkspaceResponse,
} from "../../lib/spaceApi";
import FloorPlanViewer from "../../components/floor-plan/FloorPlanViewer";
import type { FloorLayout } from "../../types/floorPlan";

/* ── Types ── */
type ViewMode = "map" | "day" | "grid" | "list";

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
    id: "zone-mgmt",
    name: "Quản lý",
    color: "#EF4444",
    bgColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.25)",
    workspaceIds: ["ws-0011", "ws-0012"],
  },
  {
    id: "zone-tech",
    name: "Công nghệ",
    color: "#22C55E",
    bgColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.25)",
    workspaceIds: ["ws-0001", "ws-0002", "ws-0003", "ws-0004"],
  },
  {
    id: "zone-creative",
    name: "Sáng tạo",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.25)",
    workspaceIds: ["ws-0005", "ws-0006", "ws-0007", "ws-0008"],
  },
  {
    id: "zone-meeting",
    name: "Phòng họp",
    color: "#3B82F6",
    bgColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.25)",
    workspaceIds: ["ws-0009", "ws-0010", "ws-0013"],
  },
];

const PUBLIC_BRANCH_ALIASES: Record<string, string> = {
  "branch-1": "branch-0001",
  "branch-2": "branch-0002",
  "branch-3": "branch-0003",
  "branch-4": "branch-0004",
};

const normalizeBranchId = (id: string): string =>
  PUBLIC_BRANCH_ALIASES[id] ?? id;

const resolveBranchId = (id: string): string | null => {
  const normalized = normalizeBranchId(id);
  if (normalized === "branch-0001") {
    return "7c27278b-eeba-462f-9720-23849d1c3703";
  }
  return null;
};

const toMockFloorResponse = (floorId: string): FloorResponse | null => {
  const floor = mockFloors.find((f) => f.id === floorId);
  if (!floor) return null;

  const workspaceCount = workspaces.filter(
    (w) => w.floor_id === floor.id,
  ).length;
  return {
    id: floor.id,
    floorNo: floor.floor_no,
    name: floor.name,
    svgContent: null,
    layoutJson: null,
    mapVersion: floor.map_version,
    isPublished: floor.is_published,
    workspaceCount,
  };
};

const toMockWorkspaceResponse = (
  workspaceId: string,
): WorkspaceResponse | null => {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;

  const type = workspaceTypes.find((t) => t.id === workspace.workspace_type_id);
  return {
    id: workspace.id,
    code: workspace.code,
    name: workspace.name,
    workspaceTypeId: workspace.workspace_type_id,
    workspaceTypeName: type?.name || "",
    capacity: workspace.capacity,
    svgElementId: workspace.svg_element_id,
    status: workspace.status,
  };
};

const mapDbWsTypeIdToMock = (dbWsTypeId: string): string => {
  if (dbWsTypeId === "a1000000-0000-0000-0000-000000000001") return "wst-desk";
  if (dbWsTypeId === "a1000000-0000-0000-0000-000000000002")
    return "wst-meeting";
  if (dbWsTypeId === "a1000000-0000-0000-0000-000000000003")
    return "wst-private";
  return dbWsTypeId;
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
  onBookNow: (
    endHour: number,
    services: Record<string, number>,
    subtotal: number,
    addonTotal: number,
  ) => void;
}> = ({
  ws,
  wsType,
  wsAvail,
  selectedWs,
  selectedHour,
  getPrice,
  onClose,
  onBookNow,
}) => {
  const price = getPrice();
  const ZONES_REF = ZONES;

  const [endHour, setEndHour] = useState(Math.min(selectedHour + 2, 22));
  const [services, setServices] = useState<Record<string, number>>({});

  useEffect(() => {
    setEndHour(Math.max(selectedHour + 1, Math.min(selectedHour + 2, 22)));
    setServices({});
  }, [selectedHour, selectedWs]);

  const handleServiceChange = (id: string, isChecked: boolean) => {
    setServices((prev) => {
      const next = { ...prev };
      if (isChecked) next[id] = 1;
      else delete next[id];
      return next;
    });
  };

  const MOCK_SERVICES = [
    {
      id: "coffee",
      icon: <FiCoffee className="h-3.5 w-3.5" />,
      name: "Cà phê",
      price: 35000,
    },
    {
      id: "lunch",
      icon: <FiCoffee className="h-3.5 w-3.5" />,
      name: "Cơm trưa",
      price: 55000,
    },
    {
      id: "monitor",
      icon: <FiMonitor className="h-3.5 w-3.5" />,
      name: "Màn hình phụ",
      price: 50000,
    },
  ];

  const duration = Math.max(1, endHour - selectedHour);
  const subtotal = duration * (price?.price || 0);
  const addonTotal = Object.keys(services).reduce((sum, id) => {
    const s = MOCK_SERVICES.find((x) => x.id === id);
    return sum + (s?.price || 0);
  }, 0);
  const total = subtotal + addonTotal;

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
        className={`badge ${wsAvail === "available" ? "badge-success" : wsAvail === "booked" ? "badge-danger" : "badge-neutral"}`}
      >
        {wsAvail === "available"
          ? <><span className="inline-block h-2 w-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/300 mr-1" /> Trống</>
          : wsAvail === "booked"
            ? <><span className="inline-block h-2 w-2 rounded-full bg-red-50 dark:bg-red-950/30 dark:bg-red-950/300 mr-1" /> Đã đặt</>
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
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Khu vực</p>
              {(() => {
                const zone = ZONES_REF.find((z) =>
                  z.workspaceIds.includes(selectedWs),
                );
                return zone ? (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: zone.color }}
                  >
                    {zone.name}
                  </p>
                ) : (
                  <p className="text-sm">—</p>
                );
              })()}
            </div>
          </div>
        </div>

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

        {/* Time selection */}
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Thời gian</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor={`start-time-${selectedWs}`}
                className="text-xs text-[var(--text-secondary)]"
              >
                Bắt đầu
              </label>
              <input
                id={`start-time-${selectedWs}`}
                type="time"
                defaultValue={`${String(selectedHour).padStart(2, "0")}:00`}
                className="input-field mt-1 text-sm"
              />
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
                  { length: 23 - selectedHour },
                  (_, i) => selectedHour + i + 1,
                ).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add-on services */}
        <div className="rounded-2xl bg-[var(--bg-surface-hover)] p-3">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">
            Dịch vụ thêm
          </p>
          <div className="space-y-2">
            {MOCK_SERVICES.map((s) => (
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
                <span className="flex items-center gap-1.5">
                  {s.icon} {s.name}
                </span>
                <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                  +{formatVND(s.price)}
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
      {wsAvail === "available" && (
        <button
          className="btn btn-primary w-full mt-5"
          onClick={() => onBookNow(endHour, services, subtotal, addonTotal)}
        >
          <FiCheck className="h-4 w-4" /> Đặt chỗ ngay
        </button>
      )}
      {wsAvail === "booked" && (
        <div className="mt-5 rounded-2xl bg-[var(--state-danger-bg)] border border-[var(--state-danger-border)] p-3 text-center">
          <p className="text-sm font-semibold text-[var(--state-danger)]">
            Đã được đặt
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Thử chọn khung giờ khác
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

  // Retrieve initial branch ID from search params (?branchId=...) or navigation state
  const initialBranchId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const qBranchId = params.get("branchId");
    const normalizedQueryBranchId = qBranchId
      ? normalizeBranchId(qBranchId)
      : "";
    if (normalizedQueryBranchId) {
      return normalizedQueryBranchId;
    }
    const stateBranchId = (location.state as { branchId?: string })?.branchId;
    const normalizedStateBranchId = stateBranchId
      ? normalizeBranchId(stateBranchId)
      : "";
    if (normalizedStateBranchId) {
      return normalizedStateBranchId;
    }
    return branches[0]?.id || "";
  }, [location.search, location.state]);

  const [selectedBranch, setSelectedBranch] = useState(initialBranchId);
  const [selectedFloor, setSelectedFloor] = useState("");

  // Sync state if initial branch selection changes
  useEffect(() => {
    setSelectedBranch(initialBranchId);
    setSelectedFloor("");
  }, [initialBranchId]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Database-loaded floors and workspaces
  const [dbFloors, setDbFloors] = useState<FloorResponse[]>([]);
  const [dbWorkspaces, setDbWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load floors when selected branch changes
  useEffect(() => {
    let active = true;
    const loadFloors = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const resolvedId = resolveBranchId(selectedBranch);
        if (resolvedId) {
          const data = await customerSpaceApi.listFloors(resolvedId);
          if (active) {
            setDbFloors(data);
            setSelectedFloor(data.length > 0 ? data[0].id : "");
          }
          return;
        }

        const fallbackFloors = mockFloors
          .filter((f) => f.branch_id === selectedBranch)
          .map((f) => toMockFloorResponse(f.id))
          .filter((floor): floor is FloorResponse => !!floor)
          .sort((a, b) => a.floorNo - b.floorNo);

        if (active) {
          setDbFloors(fallbackFloors);
          setSelectedFloor(
            fallbackFloors.length > 0 ? fallbackFloors[0].id : "",
          );
        }
      } catch (err: any) {
        console.error("Failed to load floors from DB", err);
        if (active) {
          const fallbackFloors = mockFloors
            .filter((f) => f.branch_id === selectedBranch)
            .map((f) => toMockFloorResponse(f.id))
            .filter((floor): floor is FloorResponse => !!floor)
            .sort((a, b) => a.floorNo - b.floorNo);

          if (fallbackFloors.length > 0) {
            setDbFloors(fallbackFloors);
            setSelectedFloor(fallbackFloors[0].id);
            setErrorMsg("");
          } else {
            setErrorMsg("Không thể tải sơ đồ tầng từ database.");
            setDbFloors([]);
            setSelectedFloor("");
          }
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
    if (!selectedFloor) {
      setDbWorkspaces([]);
      return;
    }
    let active = true;
    const loadWorkspaces = async () => {
      try {
        const resolvedBranchId = resolveBranchId(selectedBranch);
        if (resolvedBranchId) {
          const data = await customerSpaceApi.listWorkspaces(
            resolvedBranchId,
            selectedFloor,
          );
          if (active) {
            setDbWorkspaces(data);
          }
          return;
        }

        const fallbackWorkspaces = workspaces
          .filter((ws) => ws.floor_id === selectedFloor)
          .map((ws) => toMockWorkspaceResponse(ws.id))
          .filter((workspace): workspace is WorkspaceResponse => !!workspace);

        if (active) {
          setDbWorkspaces(fallbackWorkspaces);
        }
      } catch (err) {
        console.error("Failed to load workspaces from DB", err);
        if (active) {
          const fallbackWorkspaces = workspaces
            .filter((ws) => ws.floor_id === selectedFloor)
            .map((ws) => toMockWorkspaceResponse(ws.id))
            .filter((workspace): workspace is WorkspaceResponse => !!workspace);
          setDbWorkspaces(fallbackWorkspaces);
        }
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

  // Map dbWorkspaces to mock-compatible objects
  const mappedWorkspaces = useMemo(() => {
    return dbWorkspaces.map((ws) => {
      const mock = workspaces.find(
        (w) => w.code.toLowerCase() === ws.code.toLowerCase(),
      );
      return {
        id: ws.id,
        mockId: mock?.id || ws.id,
        workspace_type_id:
          mock?.workspace_type_id || mapDbWsTypeIdToMock(ws.workspaceTypeId),
        workspaceTypeName: ws.workspaceTypeName,
        code: ws.code,
        name: ws.name,
        capacity: ws.capacity,
        svg_element_id: ws.svgElementId,
        status: ws.status,
        floor_id: currentFloor,
      };
    });
  }, [dbWorkspaces, currentFloor]);

  const floorWorkspaces = mappedWorkspaces;

  const getWsAvailability = useCallback(
    (wsId: string, checkDate?: Date, checkHour?: number) => {
      const ws = mappedWorkspaces.find((w) => w.id === wsId);
      if (!ws) return "unassigned";
      if (
        ws.status.toLowerCase() === "maintenance" ||
        ws.status.toLowerCase() === "inactive"
      )
        return "maintenance";

      const targetDate = checkDate || selectedDate;
      const targetHour = checkHour !== undefined ? checkHour : selectedHour;

      const activeBooking = bookings.find((b) => {
        if (b.workspace_id !== ws.mockId) return false;
        if (["canceled", "expired", "completed"].includes(b.status))
          return false;
        const start = new Date(b.start_at);
        const end = new Date(b.end_at);
        const check = new Date(targetDate);
        check.setHours(targetHour, 0, 0, 0);
        return check >= start && check < end;
      });
      return activeBooking ? "booked" : "available";
    },
    [mappedWorkspaces, selectedDate, selectedHour],
  );

  const selectedWsData = selectedWs
    ? mappedWorkspaces.find((w) => w.id === selectedWs)
    : null;
  const selectedWsType = selectedWsData
    ? getWorkspaceType(selectedWsData.workspace_type_id)
    : null;
  const selectedWsAvail = selectedWs ? getWsAvailability(selectedWs) : null;

  const getPrice = (wsTypeId: string) => {
    const bp = pricePolicies.find(
      (p) =>
        p.workspace_type_id === wsTypeId &&
        p.branch_id === selectedBranch &&
        p.is_active,
    );
    const gp = pricePolicies.find(
      (p) => p.workspace_type_id === wsTypeId && !p.branch_id && p.is_active,
    );
    return bp || gp;
  };

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

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleBookNow = (
    endHour: number,
    services: Record<string, number>,
    subtotal: number,
    addonTotal: number,
  ) => {
    if (!selectedWsData) return;
    const price = getPrice(selectedWsData.workspace_type_id);
    navigate("/customer/checkout", {
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
        <div className="flex rounded-2xl border border-border overflow-hidden shrink-0 shadow-sm">
          {[
            {
              mode: "day" as ViewMode,
              label: "NGÀY",
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
              label: "BẢN ĐỒ",
              icon: <FiMap className="h-3.5 w-3.5" />,
            },
          ].map((v) => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all border-r last:border-r-0 border-border ${
                viewMode === v.mode
                  ? "bg-slate-900 text-white"
                  : "bg-card text-foreground hover:bg-muted"
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
            min={6}
            max={22}
            value={selectedHour}
            onChange={(e) => setSelectedHour(Number(e.target.value))}
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
            {branches
              .filter((b) => b.status === "active")
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
        </div>

        <div className="flex-1" />

        {/* Space tags toggle */}
        <button
          onClick={() => setShowTags(!showTags)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-medium transition-all border border-border shadow-sm shrink-0 ${
            showTags
              ? "bg-slate-900 text-white"
              : "bg-card text-foreground hover:bg-muted"
          }`}
        >
          <FiTag className="h-4 w-4" /> KHU VỰC
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Floor Plan Area */}
        <div className="flex-1 relative bg-muted/50 overflow-hidden">
          {viewMode === "map" ? (
            <>
              {/* Zoom controls */}
              <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn}
                  className="bg-card border border-border text-foreground p-2.5 rounded-2xl shadow-sm hover:bg-muted transition"
                  aria-label="Phóng to"
                >
                  <FiPlus className="h-5 w-5" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="bg-card border border-border text-foreground p-2.5 rounded-2xl shadow-sm hover:bg-muted transition"
                  aria-label="Thu nhỏ"
                >
                  <FiMinus className="h-5 w-5" />
                </button>
                <button
                  onClick={handleReset}
                  className="bg-slate-900 border border-border text-white p-2.5 rounded-2xl shadow-sm hover:bg-secondary transition"
                  aria-label="Đặt lại zoom"
                >
                  <FiMaximize2 className="h-5 w-5" />
                </button>
              </div>

              {/* Availability indicator */}
              <div className="absolute top-6 right-6 z-10 flex items-center gap-4 px-5 py-3 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-400 border border-border" />
                  <span className="text-xs font-medium text-foreground">
                    Trống ({stats.available})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-rose-400 border border-border" />
                  <span className="text-xs font-medium text-foreground">
                    Đã đặt ({stats.booked})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-slate-300 border border-border" />
                  <span className="text-xs font-medium text-foreground">
                    Bảo trì ({stats.maintenance})
                  </span>
                </div>
              </div>

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
                      getAvailability={(wsId) => getWsAvailability(wsId)}
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

              {/* Zone legend (bottom) */}
              {showTags && (
                <div className="absolute bottom-6 left-6 right-6 z-10 flex items-center justify-center gap-6 px-6 py-4 rounded-2xl bg-card border border-border shadow-sm slide-in-up">
                  <span className="text-xs font-medium text-foreground tracking-tight">
                    Khu vực:
                  </span>
                  {ZONES.map((z) => (
                    <div key={z.id} className="flex items-center gap-2">
                      <span
                        className="h-4 w-6 rounded border border-border"
                        style={{ background: z.color }}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {z.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Khu vực</th>
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Sức chứa</th>
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-foreground tracking-tight text-xs">Giá</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {floorWorkspaces.map((ws) => {
                      const avail = getWsAvailability(
                        ws.id,
                        selectedDate,
                        selectedHour,
                      );
                      const wsType = getWorkspaceType(ws.workspace_type_id);
                      const price = getPrice(ws.workspace_type_id);
                      const zone = ZONES.find((z) =>
                        z.workspaceIds.includes(ws.mockId),
                      );
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
                            {ws.workspaceTypeName ||
                              wsType?.name ||
                              ws.workspace_type_id}
                          </td>
                          <td className="px-4 py-4">
                            {zone && (
                              <span
                                className="px-2 py-1 rounded-lg text-[10px] font-medium tracking-tight border border-border"
                                style={{
                                  background: zone.color,
                                  color: "#FFF",
                                }}
                              >
                                {zone.name}
                              </span>
                            )}
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
                  const zone = ZONES.find((z) =>
                    z.workspaceIds.includes(ws.mockId),
                  );
                  const avail = getWsAvailability(
                    ws.id,
                    selectedDate,
                    selectedHour,
                  );
                  const wsType = getWorkspaceType(ws.workspace_type_id);
                  const price = getPrice(ws.workspace_type_id);
                  return (
                    <div
                      key={ws.id}
                      onClick={() =>
                        setSelectedWs(selectedWs === ws.id ? null : ws.id)
                      }
                      className="bg-card rounded-2xl border border-border p-5 cursor-pointer shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all flex flex-col h-full"
                      style={
                        selectedWs === ws.id
                          ? { borderColor: "#3B82F6", boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.2)" }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between mb-4">
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
                        {zone && (
                          <span
                            className="h-3 w-8 rounded-lg border border-border"
                            style={{ background: zone.color }}
                          />
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-foreground">
                        {ws.name} <span className="opacity-70 text-sm">({ws.code})</span>
                      </h3>
                      <p className="text-sm font-semibold text-foreground opacity-80 mt-1">
                        {ws.workspaceTypeName || wsType?.name} · {ws.capacity}{" "}
                        chỗ
                      </p>
                      
                      <div className="mt-auto pt-4">
                        {price && (
                          <p className="font-medium text-lg text-foreground">
                            {formatVND(price.price)}<span className="text-sm opacity-80">/{durationUnitLabel[price.duration_unit]?.toLowerCase()}</span>
                          </p>
                        )}
                        {avail === "available" && (
                          <button className="w-full mt-4 bg-card text-foreground border border-border py-2.5 rounded-2xl font-medium shadow-sm hover:bg-card transition-colors">
                            Đặt chỗ ngay
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
                      {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
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
                          {Array.from({ length: 17 }, (_, i) => i + 6).map(
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
                                  onClick={() => {
                                    setSelectedHour(h);
                                    setSelectedWs(ws.id);
                                  }}
                                >
                                  <div
                                    className={`w-full h-8 rounded-full border border-border ${
                                      avail === "available"
                                        ? "bg-emerald-400"
                                        : avail === "booked"
                                          ? "bg-rose-400"
                                          : "bg-slate-300"
                                    } transition-colors hover:opacity-80`}
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
                getPrice={() => getPrice(selectedWsData.workspace_type_id)}
                onClose={() => setSelectedWs(null)}
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
