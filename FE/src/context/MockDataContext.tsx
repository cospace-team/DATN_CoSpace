import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  branches as initBranches,
  floors as initFloors,
  workspaces as initWorkspaces,
  workspaceTypes as initWorkspaceTypes,
  bookings as initBookings,
  payments as initPayments,
  checkinLogs as initCheckinLogs,
  pricePolicies as initPricePolicies,
  extraServices as initExtraServices,
  bookingServices as initBookingServices,
  cancellationPolicies as initCancellationPolicies,
  bookingCancellations as initBookingCancellations,
  workspaceMaintenances as initMaintenances,
  type Branch, type Floor, type Workspace, type WorkspaceType,
  type Booking, type Payment, type CheckinLog,
  type PricePolicy, type ExtraService, type BookingService,
  type CancellationPolicy, type BookingCancellation, type WorkspaceMaintenance,
} from '../data/mockData';
import { generateBookingCode } from '../utils/formatters';

/* ── Context Value Type ── */
interface MockDataContextValue {
  // Data
  branches: Branch[];
  floors: Floor[];
  workspaces: Workspace[];
  workspaceTypes: WorkspaceType[];
  bookings: Booking[];
  payments: Payment[];
  checkinLogs: CheckinLog[];
  pricePolicies: PricePolicy[];
  extraServices: ExtraService[];
  bookingServices: BookingService[];
  cancellationPolicies: CancellationPolicy[];
  bookingCancellations: BookingCancellation[];
  maintenances: WorkspaceMaintenance[];

  // Lookups
  getBranch: (id: string) => Branch | undefined;
  getFloor: (id: string) => Floor | undefined;
  getWorkspace: (id: string) => Workspace | undefined;
  getWorkspaceType: (id: string) => WorkspaceType | undefined;
  getFloorsByBranch: (branchId: string) => Floor[];
  getWorkspacesByFloor: (floorId: string) => Workspace[];
  getBookingsByUser: (userId: string) => Booking[];
  getPaymentsByBooking: (bookingId: string) => Payment[];
  getPrice: (workspaceTypeId: string, branchId: string) => PricePolicy | undefined;

  // Actions — Booking
  createBooking: (params: CreateBookingParams) => { booking: Booking; payment: Payment };
  cancelBooking: (bookingId: string, userId: string) => void;
  confirmPayment: (bookingId: string, staffId: string) => void;
  simulateMomoPayment: (bookingId: string) => void;
  checkinBooking: (bookingId: string, staffId: string) => void;
  checkoutBooking: (bookingId: string) => void;

  // Actions — Space
  addFloor: (floor: Omit<Floor, 'id'>) => Floor;
  updateFloor: (id: string, updates: Partial<Floor>) => void;
  deleteFloor: (id: string) => void;
  addWorkspace: (ws: Omit<Workspace, 'id'>) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  toggleWorkspaceStatus: (id: string) => void;
}

interface CreateBookingParams {
  userId: string;
  workspaceId: string;
  branchId: string;
  startAt: string;
  endAt: string;
  unit: Booking['unit'];
  unitCount: number;
  paymentMethod: 'momo' | 'cash';
  source?: Booking['source'];
  addons?: { extraServiceId: string; quantity: number }[];
}

const MockDataContext = createContext<MockDataContextValue | null>(null);

export const MockDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branches] = useState<Branch[]>(initBranches);
  const [floors, setFloors] = useState<Floor[]>(initFloors);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initWorkspaces);
  const [workspaceTypes] = useState<WorkspaceType[]>(initWorkspaceTypes);
  const [bookingsState, setBookings] = useState<Booking[]>(initBookings);
  const [paymentsState, setPayments] = useState<Payment[]>(initPayments);
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>(initCheckinLogs);
  const [pricePolicies] = useState<PricePolicy[]>(initPricePolicies);
  const [extraServices] = useState<ExtraService[]>(initExtraServices);
  const [bookingServicesState, setBookingServices] = useState<BookingService[]>(initBookingServices);
  const [cancellationPolicies] = useState<CancellationPolicy[]>(initCancellationPolicies);
  const [bookingCancellations, setBookingCancellations] = useState<BookingCancellation[]>(initBookingCancellations);
  const [maintenances] = useState<WorkspaceMaintenance[]>(initMaintenances);

  // ── Lookups ──
  const getBranch = useCallback((id: string) => branches.find(b => b.id === id), [branches]);
  const getFloor = useCallback((id: string) => floors.find(f => f.id === id), [floors]);
  const getWorkspace = useCallback((id: string) => workspaces.find(w => w.id === id), [workspaces]);
  const getWorkspaceType = useCallback((id: string) => workspaceTypes.find(t => t.id === id), [workspaceTypes]);
  const getFloorsByBranch = useCallback((branchId: string) => floors.filter(f => f.branch_id === branchId), [floors]);
  const getWorkspacesByFloor = useCallback((floorId: string) => workspaces.filter(w => w.floor_id === floorId), [workspaces]);
  const getBookingsByUser = useCallback((userId: string) =>
    bookingsState.filter(b => b.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [bookingsState]
  );
  const getPaymentsByBooking = useCallback((bookingId: string) => paymentsState.filter(p => p.booking_id === bookingId), [paymentsState]);

  const getPrice = useCallback((workspaceTypeId: string, branchId: string) => {
    const branchPrice = pricePolicies.find(p => p.workspace_type_id === workspaceTypeId && p.branch_id === branchId && p.is_active);
    const globalPrice = pricePolicies.find(p => p.workspace_type_id === workspaceTypeId && !p.branch_id && p.is_active);
    return branchPrice || globalPrice;
  }, [pricePolicies]);

  // ── Booking Actions ──
  const createBooking = useCallback((params: CreateBookingParams) => {
    const price = getPrice(
      workspaces.find(w => w.id === params.workspaceId)?.workspace_type_id ?? '',
      params.branchId
    );

    const subtotal = (price?.price ?? 0) * params.unitCount;
    let addonAmount = 0;
    const newBookingServices: BookingService[] = [];

    if (params.addons) {
      for (const addon of params.addons) {
        const svc = extraServices.find(s => s.id === addon.extraServiceId);
        if (svc) {
          const lineTotal = svc.price * addon.quantity;
          addonAmount += lineTotal;
          newBookingServices.push({
            id: `bs-${Date.now()}-${addon.extraServiceId}`,
            booking_id: '', // will be set below
            extra_service_id: addon.extraServiceId,
            quantity: addon.quantity,
            unit_price: svc.price,
            line_total: lineTotal,
          });
        }
      }
    }

    const totalAmount = subtotal + addonAmount;
    const now = new Date().toISOString();
    const bookingId = `bk-${Date.now()}`;

    const newBooking: Booking = {
      id: bookingId,
      booking_code: generateBookingCode(),
      user_id: params.userId,
      workspace_id: params.workspaceId,
      branch_id: params.branchId,
      start_at: params.startAt,
      end_at: params.endAt,
      unit: params.unit,
      unit_count: params.unitCount,
      status: 'pending_payment',
      subtotal_amount: subtotal,
      discount_amount: 0,
      addon_amount: addonAmount,
      total_amount: totalAmount,
      payment_deadline_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      source: params.source ?? 'web',
      created_at: now,
    };

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      booking_id: bookingId,
      provider: params.paymentMethod === 'momo' ? 'momo' : 'cash',
      method: params.paymentMethod === 'momo' ? 'ewallet' : 'cash',
      order_id: params.paymentMethod === 'momo' ? `MOMO-${Date.now()}` : `CASH-${Date.now()}`,
      amount: totalAmount,
      status: params.paymentMethod === 'momo' ? 'initiated' : 'pending',
      paid_at: null,
      created_by_staff_id: null,
      created_at: now,
    };

    // Update booking services with booking id
    for (const bs of newBookingServices) {
      bs.booking_id = bookingId;
    }

    setBookings(prev => [newBooking, ...prev]);
    setPayments(prev => [newPayment, ...prev]);
    if (newBookingServices.length > 0) {
      setBookingServices(prev => [...newBookingServices, ...prev]);
    }

    return { booking: newBooking, payment: newPayment };
  }, [workspaces, extraServices, getPrice]);

  const simulateMomoPayment = useCallback((bookingId: string) => {
    const now = new Date().toISOString();
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: 'confirmed' as const, updated_at: now } : b
    ));
    setPayments(prev => prev.map(p =>
      p.booking_id === bookingId && p.provider === 'momo' ? { ...p, status: 'paid' as const, paid_at: now } : p
    ));
  }, []);

  const confirmPayment = useCallback((bookingId: string, staffId: string) => {
    const now = new Date().toISOString();
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: 'confirmed' as const, updated_at: now } : b
    ));
    setPayments(prev => prev.map(p =>
      p.booking_id === bookingId ? { ...p, status: 'paid' as const, paid_at: now, created_by_staff_id: staffId } : p
    ));
  }, []);

  const cancelBooking = useCallback((bookingId: string, userId: string) => {
    const booking = bookingsState.find(b => b.id === bookingId);
    if (!booking) return;

    // Find applicable policy
    const hoursBeforeStart = (new Date(booking.start_at).getTime() - Date.now()) / (1000 * 60 * 60);
    const daysBeforeStart = hoursBeforeStart / 24;
    const hoursSinceCreated = (Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60);

    let refundPercent = 0;
    let matchedPolicy = cancellationPolicies[cancellationPolicies.length - 1]; // default last

    for (const policy of cancellationPolicies.filter(p => p.is_active)) {
      if (policy.rule_type === 'GRACE_HOURS' && hoursSinceCreated >= policy.min_value && hoursSinceCreated <= policy.max_value) {
        refundPercent = policy.refund_percent;
        matchedPolicy = policy;
        break;
      }
      if (policy.rule_type === 'BEFORE_START_DAYS' && daysBeforeStart >= policy.min_value && daysBeforeStart < policy.max_value) {
        refundPercent = policy.refund_percent;
        matchedPolicy = policy;
        break;
      }
    }

    const refundAmount = booking.total_amount * refundPercent / 100;
    const now = new Date().toISOString();

    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: 'canceled' as const } : b
    ));

    setBookingCancellations(prev => [...prev, {
      id: `bc-${Date.now()}`,
      booking_id: bookingId,
      policy_id: matchedPolicy.id,
      refund_percent: refundPercent,
      refund_amount: refundAmount,
      penalty_amount: booking.total_amount - refundAmount,
      reason: 'Khách hàng yêu cầu hủy',
      cancelled_by: userId,
      cancelled_at: now,
      refund_status: 'confirmed' as const,
    }]);
  }, [bookingsState, cancellationPolicies]);

  const checkinBooking = useCallback((bookingId: string, staffId: string) => {
    const now = new Date().toISOString();
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: 'checked_in' as const } : b
    ));
    setCheckinLogs(prev => [...prev, {
      id: `ci-${Date.now()}`,
      booking_id: bookingId,
      staff_user_id: staffId,
      checkin_at: now,
      checkout_at: null,
      note: '',
    }]);
  }, []);

  const checkoutBooking = useCallback((bookingId: string) => {
    const now = new Date().toISOString();
    setBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: 'completed' as const } : b
    ));
    setCheckinLogs(prev => prev.map(ci =>
      ci.booking_id === bookingId && !ci.checkout_at ? { ...ci, checkout_at: now } : ci
    ));
  }, []);

  // ── Space Actions ──
  const addFloor = useCallback((floor: Omit<Floor, 'id'>) => {
    const newFloor: Floor = { ...floor, id: `floor-${Date.now()}` };
    setFloors(prev => [...prev, newFloor]);
    return newFloor;
  }, []);

  const updateFloor = useCallback((id: string, updates: Partial<Floor>) => {
    setFloors(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const deleteFloor = useCallback((id: string) => {
    setFloors(prev => prev.filter(f => f.id !== id));
    setWorkspaces(prev => prev.filter(w => w.floor_id !== id));
  }, []);

  const addWorkspace = useCallback((ws: Omit<Workspace, 'id'>) => {
    const newWs: Workspace = { ...ws, id: `ws-${Date.now()}` };
    setWorkspaces(prev => [...prev, newWs]);
    return newWs;
  }, []);

  const updateWorkspace = useCallback((id: string, updates: Partial<Workspace>) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const toggleWorkspaceStatus = useCallback((id: string) => {
    setWorkspaces(prev => prev.map(w =>
      w.id === id ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' } : w
    ));
  }, []);

  const value: MockDataContextValue = {
    branches, floors, workspaces, workspaceTypes,
    bookings: bookingsState, payments: paymentsState, checkinLogs,
    pricePolicies, extraServices, bookingServices: bookingServicesState,
    cancellationPolicies, bookingCancellations, maintenances,
    getBranch, getFloor, getWorkspace, getWorkspaceType,
    getFloorsByBranch, getWorkspacesByFloor, getBookingsByUser, getPaymentsByBooking, getPrice,
    createBooking, cancelBooking, confirmPayment, simulateMomoPayment,
    checkinBooking, checkoutBooking,
    addFloor, updateFloor, deleteFloor,
    addWorkspace, updateWorkspace, toggleWorkspaceStatus,
  };

  return <MockDataContext.Provider value={value}>{children}</MockDataContext.Provider>;
};

export const useMockData = (): MockDataContextValue => {
  const ctx = useContext(MockDataContext);
  if (!ctx) throw new Error('useMockData must be inside MockDataProvider');
  return ctx;
};
