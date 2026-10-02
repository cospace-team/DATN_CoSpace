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
  type ExtraServiceResponse,
} from "../../lib/spaceApi";
import { useToast } from "../../components/Toast";
import FloorPlanViewer from "../../components/floor-plan/FloorPlanViewer";
import type { FloorLayout } from "../../types/floorPlan";
import { resolveBranchId } from "../../data/branchAliases";
import { addonApi, type ExtraServiceDto } from "../../api/addonApi";
import { Skeleton } from "../../components/ui/Skeleton";

import { ExploreFilters, type ExploreFilter } from "./explore/ExploreFilters";
import { ExploreResults } from "./explore/ExploreResults";
import { serviceLimitApi, type ServiceAvailabilityDto } from "../../api/addonApi";
import {
  BookingPanel,
  type DurationUnitMode,
  type ExploreWorkspace,
  type PriceUnit,
  type UnitPrice,
} from "./explore/BookingPanel";

/* ── Types ── */
/** results: spaces matching the filters; map: floor plan; day: hourly timeline. */
type ViewMode = "results" | "map" | "day";

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

/* ── Main Explore Page ── */
const ExplorePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("results");
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
  // Persist selectedBranch to sessionStorage
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
  /* ── Step 1 filters: who, when, what kind of space and which equipment ── */
  const readJson = <T,>(key: string, fallback: T): T => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const [filterEndHour, setFilterEndHour] = useState<number>(() => readJson("exploreEndHour", selectedHour + 2));
  const [people, setPeople] = useState<number>(() => readJson("explorePeople", 1));
  const [typeIds, setTypeIds] = useState<string[]>(() => readJson("exploreTypes", []));
  const [equipmentIds, setEquipmentIds] = useState<string[]>(() => readJson("exploreEquipment", []));
  // The results show once the customer has searched (or arrives with a space already picked).
  const [searched, setSearched] = useState<boolean>(
    () => !!new URLSearchParams(location.search).get("wsId") || sessionStorage.getItem("exploreSearched") === "1",
  );
  const [editingFilters, setEditingFilters] = useState(false);
  const [draft, setDraft] = useState<ExploreFilter | null>(null);
  useEffect(() => {
    sessionStorage.setItem("exploreEndHour", JSON.stringify(filterEndHour));
    sessionStorage.setItem("explorePeople", JSON.stringify(people));
    sessionStorage.setItem("exploreTypes", JSON.stringify(typeIds));
    sessionStorage.setItem("exploreEquipment", JSON.stringify(equipmentIds));
    sessionStorage.setItem("exploreSearched", searched ? "1" : "0");
  }, [filterEndHour, people, typeIds, equipmentIds, searched]);

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



  // Further seats booked together with the selected one (same time, same floor), and whether
  // clicks on the floor plan add seats to that list instead of switching the selected seat.
  const [extraSeatIds, setExtraSeatIds] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const MAX_GROUP_SEATS = 10;
  const toggleExtraSeat = useCallback((wsId: string) => {
    setExtraSeatIds((prev) =>
      prev.includes(wsId) ? prev.filter((id) => id !== wsId) : prev.length + 1 >= MAX_GROUP_SEATS ? prev : [...prev, wsId],
    );
  }, []);

  const [apiBranches, setApiBranches] = useState<BranchResponse[]>([]);
  const [branchPrices, setBranchPrices] = useState<BranchPriceResponse[]>([]);
  const [extraServices, setExtraServices] = useState<ExtraServiceResponse[]>([]);

  // Database-loaded floors, workspaces and user bookings
  const [dbFloors, setDbFloors] = useState<FloorResponse[]>([]);
  // Workspaces of every floor of the branch, so results can span floors.
  const [allWorkspaces, setAllWorkspaces] = useState<Record<string, WorkspaceResponse[]>>({});
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

  // Real prices and extra services of the selected branch.
  useEffect(() => {
    let active = true;
    const resolvedId = resolveBranchId(selectedBranch);
    setBranchPrices([]);
    setExtraServices([]);
    if (!resolvedId) return;
    customerSpaceApi.listPrices(resolvedId)
      .then((data) => { if (active) setBranchPrices(data); })
      .catch((err) => console.error("Failed to load branch prices", err));
    customerSpaceApi.listExtraServices(resolvedId)
      .then((data) => { if (active) setExtraServices(data); })
      .catch((err) => console.error("Failed to load extra services", err));
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

  // Load the workspaces of every floor once the branch's floors are known.
  useEffect(() => {
    const resolvedBranchId = resolveBranchId(selectedBranch);
    if (!resolvedBranchId || dbFloors.length === 0) {
      setAllWorkspaces({});
      setWorkspacesLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setWorkspacesLoading(true);
      try {
        const lists = await Promise.all(
          dbFloors.map((f) => customerSpaceApi.listWorkspaces(resolvedBranchId, f.id).then((ws) => [f.id, ws] as const)),
        );
        if (active) setAllWorkspaces(Object.fromEntries(lists));
      } catch (err) {
        console.error("Failed to load workspaces from DB", err);
        if (active) {
          setAllWorkspaces({});
          setErrorMsg("Không thể tải danh sách chỗ ngồi. Vui lòng thử lại sau.");
        }
      } finally {
        if (active) setWorkspacesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [dbFloors, selectedBranch]);

  const branchFloors = dbFloors;
  const currentFloor = selectedFloor || branchFloors[0]?.id || "";
  const currentFloorData = branchFloors.find((f) => f.id === currentFloor);

  const mappedWorkspaces = useMemo<ExploreWorkspace[]>(() => {
    return Object.entries(allWorkspaces).flatMap(([floorId, list]) => list.map((ws) => ({
      id: ws.id,
      workspace_type_id: ws.workspaceTypeId,
      workspaceTypeName: ws.workspaceTypeName,
      code: ws.code,
      name: ws.name,
      capacity: ws.capacity,
      svg_element_id: ws.svgElementId,
      status: ws.status,
      floor_id: floorId,
      branch_id: resolveBranchId(selectedBranch),
      images: ws.images || [],
    })));
  }, [allWorkspaces, selectedBranch]);

  const floorWorkspaces = useMemo(
    () => mappedWorkspaces.filter((w) => w.floor_id === currentFloor),
    [mappedWorkspaces, currentFloor],
  );

  // Extra seats belong to the branch on screen and never include the main seat.
  useEffect(() => {
    setExtraSeatIds([]);
    setMultiSelect(false);
  }, [selectedBranch]);
  useEffect(() => {
    if (!selectedWs) {
      setExtraSeatIds([]);
      setMultiSelect(false);
    } else {
      setExtraSeatIds((prev) => prev.filter((id) => id !== selectedWs));
    }
  }, [selectedWs]);

  /** Floor plan click: adds/removes a seat while picking several, otherwise selects it. */
  const handleMapSelect = useCallback(
    (wsId: string | null) => {
      if (multiSelect && selectedWs && wsId && wsId !== selectedWs) {
        toggleExtraSeat(wsId);
        return;
      }
      setSelectedWs(wsId);
    },
    [multiSelect, selectedWs, toggleExtraSeat, setSelectedWs],
  );

  const getWsAvailability = useCallback(
    (wsId: string, checkDate?: Date, checkHour?: number, checkEndDate?: Date, checkEndHour?: number) => {
      const ws = mappedWorkspaces.find((w) => w.id === wsId);
      if (!ws) return workspacesLoading ? "available" : "unassigned";
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
      // With no explicit time the searched slot is meant (floor plan, panel status), else one hour.
      const searchedSlot = checkHour === undefined && checkEndDate === undefined && checkEndHour === undefined;
      checkTimeEnd.setHours(searchedSlot ? Math.max(filterEndHour, targetHour + 1) : targetHour + 1, 0, 0, 0);
      
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
    [mappedWorkspaces, selectedDate, selectedHour, branchAvailability, workspacesLoading, filterEndHour],
  );

  // Stable adapter for the memoized FloorPlanViewer — an inline arrow would re-render the whole
  // floor plan on every ExplorePage state change (form inputs, booking panel, etc.).
  const getFloorAvailability = useCallback(
    (wsId: string) => {
      const avail = getWsAvailability(wsId);
      if (avail?.startsWith('booked')) return 'booked';
      return avail as "maintenance" | "available" | "unassigned";
    },
    [getWsAvailability],
  );

  // Seat count and type shown on each workspace of the floor plan.
  const getFloorWorkspaceInfo = useCallback(
    (wsId: string) => {
      const ws = mappedWorkspaces.find((w) => w.id === wsId);
      return ws ? { code: ws.code, capacity: ws.capacity, typeName: ws.workspaceTypeName } : null;
    },
    [mappedWorkspaces],
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
    extraIds: string[] = [],
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
    const branchName = branchObj ? branchObj.name : "CoSpace Chi nhánh";
    const allAddonsList = extraServices;
    const addons = Object.entries(services)
      .map(([serviceId, quantity]) => {
        const s = allAddonsList.find((x: any) => x.id === serviceId);
        return s ? { serviceId, quantity, name: s.name, price: s.price, unit: s.unit || 'lượt' } : null;
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
    const selectedServiceDetails = allAddonsList.filter((s: any) => !!services[s.id]);

    // Seats booked together with this one: re-checked here, priced by their own type.
    const extraWorkspaces = [];
    for (const id of extraIds) {
      const seat = mappedWorkspaces.find((w) => w.id === id);
      if (!seat) continue;
      const seatAvail = getWsAvailability(id, selectedDate, selectedHour, endDate, durationUnit === 'hour' ? endHour : undefined);
      if (seatAvail !== "available") {
        showToast(`Chỗ "${seat.name}" không còn trống trong khoảng thời gian này, vui lòng bỏ chỗ đó ra.`, "error");
        return;
      }
      const seatPrice = getPrice(seat.workspace_type_id, durationUnit);
      if (!seatPrice) {
        showToast(`Chỗ "${seat.name}" chưa có giá cho loại thời gian này.`, "error");
        return;
      }
      extraWorkspaces.push({ workspace: seat, price: seatPrice });
    }

    navigate("/customer/checkout", {
      state: {
        extraWorkspaces,
        workspace: selectedWsData,
        workspaceType: selectedWsType,
        branchName: branchName,
        date: selectedDate,
        hour: selectedHour,
        endHour: endHour,
        endDate: endDate,
        durationUnit: durationUnit,
        services: services,
        serviceDetails: selectedServiceDetails,
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

  /* ── Filters → results ── */
  const currentFilter: ExploreFilter = {
    branchId: resolveBranchId(selectedBranch),
    date: selectedDate,
    startHour: selectedHour,
    endHour: Math.min(Math.max(filterEndHour, selectedHour + 1), closeHour),
    people,
    typeIds,
    equipmentIds,
  };
  const workspaceTypes = useMemo(() => {
    const seen = new Map<string, string>();
    mappedWorkspaces.forEach((w) => { if (!seen.has(w.workspace_type_id)) seen.set(w.workspace_type_id, w.workspaceTypeName); });
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [mappedWorkspaces]);
  const equipmentServices = useMemo(
    () => extraServices.filter((s) => (s.serviceType || "").toLowerCase() === "equipment").map((s) => ({ id: s.id, name: s.name })),
    [extraServices],
  );

  // What is left of each piece of equipment the customer asked for, for the searched slot.
  const [equipmentStock, setEquipmentStock] = useState<Record<string, ServiceAvailabilityDto>>({});
  useEffect(() => {
    const branchId = resolveBranchId(selectedBranch);
    if (!searched || !branchId || equipmentIds.length === 0) {
      setEquipmentStock({});
      return;
    }
    const start = new Date(selectedDate);
    start.setHours(selectedHour, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(currentFilter.endHour, 0, 0, 0);
    if (end <= start) return;
    let active = true;
    serviceLimitApi.availability(branchId, start, end)
      .then((list) => { if (active) setEquipmentStock(Object.fromEntries(list.map((a) => [a.serviceId, a]))); })
      .catch(() => { if (active) setEquipmentStock({}); });
    return () => { active = false; };
  }, [searched, selectedBranch, selectedDate, selectedHour, currentFilter.endHour, equipmentIds.join(",")]);

  // Equipment asked for in the filters is pre-ticked when a space is opened (if any is left).
  const initialServices = useMemo(() => {
    const picked: Record<string, number> = {};
    equipmentIds.forEach((id) => {
      const stock = equipmentStock[id];
      if (!stock || stock.remaining > 0) picked[id] = 1;
    });
    return picked;
  }, [equipmentIds, equipmentStock]);

  const applyFilter = (f: ExploreFilter) => {
    if (f.branchId !== resolveBranchId(selectedBranch)) {
      setSelectedBranch(f.branchId);
      setSelectedFloor("");
    }
    setSelectedDate(f.date);
    setSelectedHour(f.startHour);
    setFilterEndHour(f.endHour);
    setPeople(f.people);
    setTypeIds(f.typeIds);
    setEquipmentIds(f.equipmentIds);
    setSelectedWs(null);
    setSearched(true);
    setEditingFilters(false);
    setDraft(null);
    setViewMode("results");
  };
  // Changing branch in the form loads that branch's types and equipment right away.
  const onDraftChange = (next: ExploreFilter) => {
    if (next.branchId !== resolveBranchId(selectedBranch)) {
      setSelectedBranch(next.branchId);
      setSelectedFloor("");
    }
    setDraft(next);
  };
  const activeDraft = draft ?? currentFilter;

  const slotLabel = `${selectedDate.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}, ${String(selectedHour).padStart(2, "0")}:00–${String(currentFilter.endHour).padStart(2, "0")}:00`;
  const resultStatus = useCallback(
    (wsId: string) => getWsAvailability(wsId, selectedDate, selectedHour, undefined, currentFilter.endHour),
    [getWsAvailability, selectedDate, selectedHour, currentFilter.endHour],
  );
  const openSpace = (ws: ExploreWorkspace) => {
    if (ws.floor_id !== currentFloor) setSelectedFloor(ws.floor_id);
    setSelectedWs(ws.id);
    setSelectedEndHour(currentFilter.endHour);
  };
  const branchName = apiBranches.find((b) => b.id === resolveBranchId(selectedBranch))?.name ?? "";

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


      {!searched ? (
        /* ── Step 1: what do you need? ── */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Tìm chỗ làm việc phù hợp</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Cho chúng tôi biết bạn cần gì, chúng tôi chỉ hiện những chỗ còn trống và vừa với nhóm của bạn.
            </p>
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              {errorMsg && !activeBranches.length ? (
                <p className="text-sm text-destructive">{errorMsg}</p>
              ) : (
                <ExploreFilters
                  variant="hero"
                  value={activeDraft}
                  onChange={onDraftChange}
                  onSubmit={() => applyFilter(activeDraft)}
                  branches={activeBranches.map((b) => ({ id: b.id, name: b.name, address: b.address }))}
                  types={workspaceTypes}
                  equipment={equipmentServices}
                  openHour={openHour}
                  closeHour={closeHour}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* ── Filter summary + view switcher ── */}
      <div className="px-4 sm:px-6 py-3 bg-card border-b border-border shrink-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setEditingFilters((v) => !v); setDraft(null); }}
            className="flex flex-wrap items-center gap-1.5 text-left rounded-xl border border-border bg-muted/40 hover:bg-muted px-3 py-2 text-sm cursor-pointer min-w-0"
            aria-expanded={editingFilters}
          >
            <span className="font-semibold text-foreground truncate max-w-[16rem]">{branchName}</span>
            <span className="text-muted-foreground">· {slotLabel}</span>
            <span className="text-muted-foreground">· {people} người</span>
            {typeIds.length > 0 && <span className="text-muted-foreground">· {typeIds.length} loại</span>}
            {equipmentIds.length > 0 && <span className="text-muted-foreground">· {equipmentIds.length} thiết bị</span>}
            <span className="text-primary font-medium ml-1">{editingFilters ? "Đóng" : "Sửa bộ lọc"}</span>
          </button>

          <div className="flex-1" />

          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border" role="tablist">
            {([
              { mode: "results", label: "Kết quả", icon: <FiList className="h-3.5 w-3.5" /> },
              { mode: "map", label: "Sơ đồ tầng", icon: <FiMap className="h-3.5 w-3.5" /> },
              { mode: "day", label: "Lịch theo giờ", icon: <FiCalendar className="h-3.5 w-3.5" /> },
            ] as const).map((v) => (
              <button
                key={v.mode}
                role="tab"
                aria-selected={viewMode === v.mode}
                onClick={() => setViewMode(v.mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === v.mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          {viewMode !== "results" && branchFloors.length > 0 && (
            <div className="relative">
              <select
                value={currentFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                aria-label="Chọn tầng"
                className="appearance-none bg-card border border-border rounded-xl px-3 py-2 pr-9 text-xs font-medium text-foreground cursor-pointer"
              >
                {branchFloors.map((f) => (
                  <option key={f.id} value={f.id}>Tầng {f.floorNo} · {f.name}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none" />
            </div>
          )}
        </div>

        {editingFilters && (
          <div className="rounded-2xl border border-border bg-background p-4">
            <ExploreFilters
              variant="bar"
              value={activeDraft}
              onChange={onDraftChange}
              onSubmit={() => applyFilter(activeDraft)}
              branches={activeBranches.map((b) => ({ id: b.id, name: b.name, address: b.address }))}
              types={workspaceTypes}
              equipment={equipmentServices}
              openHour={openHour}
              closeHour={closeHour}
            />
          </div>
        )}
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
                      onSelectWorkspace={handleMapSelect}
                      getAvailability={getFloorAvailability}
                      getWorkspaceInfo={getFloorWorkspaceInfo}
                      extraSelectedIds={extraSeatIds}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-10 text-center bg-card border border-border rounded-3xl max-w-md shadow-sm animate-fade-in">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <FiMap className="h-7 w-7" />
                      </div>
                      <p className="text-base font-semibold text-foreground tracking-tight">
                        Khu vực tầng này đang cập nhật sơ đồ
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Sơ đồ mặt bằng chi tiết của tầng đang được hoàn thiện. Quý khách vui lòng chọn tầng khác hoặc chuyển sang chế độ danh sách để xem chỗ ngồi khả dụng.
                      </p>
                      <button
                        onClick={() => setViewMode("results")}
                        className="btn btn-outline btn-sm mt-4 text-xs font-medium"
                      >
                        Chuyển sang xem dạng danh sách
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </>
          ) : viewMode === "results" ? (
            <div className="h-full overflow-y-auto">
              <ExploreResults
                workspaces={mappedWorkspaces}
                floors={branchFloors.map((f) => ({ id: f.id, floorNo: f.floorNo, name: f.name }))}
                people={people}
                typeIds={typeIds}
                statusOf={resultStatus}
                priceOf={(typeId) => getPrice(typeId, "hour") ?? getDisplayPrice(typeId)}
                equipment={equipmentIds.map((id) => ({
                  id,
                  name: extraServices.find((x) => x.id === id)?.name ?? "Thiết bị",
                  stock: equipmentStock[id],
                }))}
                slotLabel={slotLabel}
                loading={loading || workspacesLoading}
                selectedWs={selectedWs}
                onSelect={openSpace}
                onShowOnMap={(ws) => { openSpace(ws); setViewMode("map"); }}
                onEditFilters={() => setEditingFilters(true)}
              />
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
                initialEndHour={selectedEndHour || currentFilter.endHour}
                initialServices={initialServices}
                floorNameOf={(floorId) => { const f = branchFloors.find((x) => x.id === floorId); return f ? `Tầng ${f.floorNo}` : ""; }}
                selectedDate={selectedDate}
                getPrice={(unit) => getPrice(selectedWsData.workspace_type_id, unit)}
                addonServices={extraServices as any}
                openHour={openHour}
                closeHour={closeHour}
                onClose={() => setSelectedWs(null)}
                onChangeStartHour={(h) => setSelectedHour(h)}
                checkAvailability={(stH, endH, endD, unit) => getWsAvailability(selectedWs, selectedDate, stH, endD, unit === 'hour' ? endH : undefined)}
                availableServices={extraServices}
                candidateSeats={mappedWorkspaces}
                extraSeatIds={extraSeatIds}
                onToggleExtraSeat={toggleExtraSeat}
                checkSeatAvailability={(wsId, stH, endH, endD, unit) => getWsAvailability(wsId, selectedDate, stH, endD, unit === 'hour' ? endH : undefined)}
                getSeatPrice={(typeId, unit) => getPrice(typeId, unit)}
                maxSeats={MAX_GROUP_SEATS}
                multiSelect={multiSelect}
                onToggleMultiSelect={setMultiSelect}
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
                  initialEndHour={selectedEndHour || currentFilter.endHour}
                initialServices={initialServices}
                floorNameOf={(floorId) => { const f = branchFloors.find((x) => x.id === floorId); return f ? `Tầng ${f.floorNo}` : ""; }}
                  selectedDate={selectedDate}
                  getPrice={(unit) => getPrice(selectedWsData.workspace_type_id, unit)}
                  addonServices={extraServices as any}
                  openHour={openHour}
                  closeHour={closeHour}
                  onClose={() => setSelectedWs(null)}
                  onChangeStartHour={(h) => setSelectedHour(h)}
                  checkAvailability={(stH, endH, endD, unit) => getWsAvailability(selectedWs, selectedDate, stH, endD, unit === 'hour' ? endH : undefined)}
                  availableServices={extraServices}
                  candidateSeats={mappedWorkspaces}
                extraSeatIds={extraSeatIds}
                onToggleExtraSeat={toggleExtraSeat}
                checkSeatAvailability={(wsId, stH, endH, endD, unit) => getWsAvailability(wsId, selectedDate, stH, endD, unit === 'hour' ? endH : undefined)}
                getSeatPrice={(typeId, unit) => getPrice(typeId, unit)}
                maxSeats={MAX_GROUP_SEATS}
                multiSelect={multiSelect}
                onToggleMultiSelect={setMultiSelect}
                onBookNow={handleBookNow}
                />
              </div>
            </div>
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default ExplorePage;
