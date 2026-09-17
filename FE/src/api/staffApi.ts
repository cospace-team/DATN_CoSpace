import { API_BASE_URL } from '../config/api';

export interface CheckinLogDto {
  id: string;
  bookingId: string;
  staffUserId: string;
  checkinAt: string;
  checkoutAt: string | null;
  note: string | null;
}

export interface BookingWithDetailsDto {
  booking: any;
  customer: any;
  workspace: any;
  alreadyCheckedIn: boolean;
  activeCheckin: CheckinLogDto | null;
}

export interface BranchTodayBookingDto {
  id: string;
  bookingCode: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  workspaceId: string;
  workspaceName?: string;
  branchId: string;
  startAt: string;
  endAt: string;
  status: string;
  totalAmount: number;
  type?: string;
  unit?: 'hour' | 'day' | 'week' | 'month';
  unitCount?: number;
  isContract?: boolean;
}

export interface StaffDashboardStatsDto {
  revenue: number;
  activeCheckinsCount: number;
  availableWs: number;
  maintenanceWs: number;
  occupancyRate: number;
  totalCapacity: number;
  activeGuests: number;
  totalWs: number;
  chartData: {
    label: string;
    guests: number;
    revenue: number;
  }[];
}

export interface MaintenanceResponseDto {
  id: string;
  workspaceId: string;
  startAt: string;
  endAt: string;
  reason: string;
  status: 'scheduled' | 'active' | 'done' | 'canceled';
  impactedBookingsCount?: number;
}

export interface WorkspaceMaintenanceStatusDto {
  workspaceId: string;
  name: string;
  code: string;
  workspaceStatus: 'active' | 'maintenance' | 'inactive';
  activeMaintenance?: MaintenanceResponseDto;
}

export interface WorkspaceBookingStatusDto {
  workspaceId: string;
  name: string;
  code: string;
  workspaceStatus: 'active' | 'maintenance' | 'inactive';
  workspaceTypeId?: string;
  activeMaintenance?: MaintenanceResponseDto;
  todayBookings: any[];
}

export interface BranchStaffDto {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  status: 'active' | 'suspended';
  role: string;
  createdAt?: string;
}

export interface PricePolicyDto {
  id: string;
  workspaceTypeId: string;
  durationUnit: string;
  price: number;
  isActive: boolean;
  branchId: string;
  source: 'branch' | 'global';
  /** Not returned by the API — filled in client-side from the workspace types list for display. */
  workspaceTypeName?: string;
}

export interface ExtraServiceDto {
  id: string;
  code: string;
  name: string;
  serviceType: string;
  unit: string;
  price: number;
  isActive: boolean;
  branchId?: string;
  description?: string;
}

export interface CancellationPolicyDto {
  id: string;
  name: string;
  ruleType: string;
  minValue: number;
  maxValue: number;
  refundPercent: number;
  isActive: boolean;
  branchId?: string;
  priority?: number;
}

export interface ReportOverviewDto {
  totalRevenue: number;
  totalBookings: number;
  completedBookings: number;
  canceledBookings: number;
  months: string[];
  monthlyRevenue: number[];
  monthlyBookings?: number[];
  byType: { type: string; count: number; revenue: number; color: string }[];
  branchComparison?: any[];
}

import type { FloorResponse } from '../lib/spaceApi';

const getAuthHeaders = () => {
  const token = localStorage.getItem('workhub_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const staffApi = {
  getBookingByCode: async (code: string, branchId: string): Promise<BookingWithDetailsDto> => {
    const res = await fetch(`${API_BASE_URL}/api/bookings/code/${code}?branchId=${branchId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get booking');
    }
    return res.json();
  },

  searchUsers: async (query: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to search users');
    return res.json();
  },

  createWalkinUser: async (payload: { fullName: string; phone: string }): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/users/walkin`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create walk-in user');
    }
    return res.json();
  },

  createWalkinBooking: async (payload: any): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/staff/bookings/walkin`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create walk-in booking');
    }
    return res.json();
  },

  createCashPayment: async (bookingId: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/api/payments/cash/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ booking_id: bookingId })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.message || 'Failed to create cash payment');
      (error as any).response = { data: errorData };
      throw error;
    }
    return res.json();
  },

  getBranchTodayBookings: async (branchId: string): Promise<BranchTodayBookingDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/bookings/branch-today?branchId=${branchId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch today bookings');
    return res.json();
  },

  checkin: async (bookingId: string, note?: string): Promise<CheckinLogDto> => {
    const url = new URL(`${API_BASE_URL}/api/checkins/booking/${bookingId}`);
    if (note) url.searchParams.append('note', note);
    
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.message || 'Checkin failed');
      (error as any).response = { data: errorData };
      throw error;
    }
    return res.json();
  },

  checkout: async (checkinId: string, note?: string): Promise<CheckinLogDto> => {
    let url = `${API_BASE_URL}/api/checkins/${checkinId}/checkout`;
    if (note && note.trim()) {
      url += `?note=${encodeURIComponent(note.trim())}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.message || 'Checkout failed');
      (error as any).response = { data: errorData };
      throw error;
    }
    return res.json();
  },


  getActiveCheckins: async (branchId: string): Promise<BookingWithDetailsDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/checkins/active?branchId=${branchId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch active checkins');
    return res.json();
  },

  getDashboardStats: async (branchId: string, filter?: string): Promise<StaffDashboardStatsDto> => {
    let url = `${API_BASE_URL}/api/staff/dashboard/stats?branchId=${branchId}`;
    if (filter) url += `&filter=${filter}`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  getMaintenances: async (branchId: string): Promise<MaintenanceResponseDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/staff/branches/${branchId}/maintenance`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch maintenances');
    return res.json();
  },

  getWorkspaceMaintenances: async (branchId: string): Promise<WorkspaceMaintenanceStatusDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/staff/branches/${branchId}/workspaces-maintenance`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch workspaces');
    return res.json();
  },

  getWorkspaceBookingStatus: async (branchId: string, date?: string): Promise<WorkspaceBookingStatusDto[]> => {
    let url = `${API_BASE_URL}/api/staff/bookings/branches/${branchId}/workspaces-booking-status`;
    if (date) url += `?date=${date}`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch workspace booking status');
    return res.json();
  },

  getFloors: async (branchId: string): Promise<FloorResponse[]> => {
    const res = await fetch(`${API_BASE_URL}/api/customer/spaces/branches/${branchId}/floors`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch floors');
    return res.json();
  },

  createMaintenance: async (workspaceId: string, payload: { startAt: string; endAt: string; reason: string }): Promise<MaintenanceResponseDto> => {
    const res = await fetch(`${API_BASE_URL}/api/staff/workspaces/${workspaceId}/maintenance`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create maintenance');
    }
    return res.json();
  },

  completeMaintenance: async (maintenanceId: string): Promise<MaintenanceResponseDto> => {
    const res = await fetch(`${API_BASE_URL}/api/staff/maintenance/${maintenanceId}/complete`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to complete maintenance');
    return res.json();
  },

  deleteMaintenance: async (maintenanceId: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/staff/maintenance/${maintenanceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete maintenance');
  },

  /* ── Branch-Admin: Staff Management ── */

  // No branchId parameter — the endpoint derives the caller's branch from their JWT.
  getStaff: async (): Promise<BranchStaffDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/staff`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch staff');
    return res.json();
  },

  createStaff: async (payload: { email: string; fullName: string; password: string; phone?: string }): Promise<BranchStaffDto> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/staff`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create staff');
    }
    return res.json();
  },

  updateStaff: async (staffId: string, payload: { fullName?: string; email?: string; phone?: string; password?: string }): Promise<BranchStaffDto> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/staff/${staffId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update staff');
    }
    return res.json();
  },

  updateStaffStatus: async (staffId: string, status: 'active' | 'suspended'): Promise<{ id: string; status: string }> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/staff/${staffId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update staff status');
    }
    return res.json();
  },

  /* ── Branch-Admin: Price Policies ── */

  getWorkspaceTypes: async (): Promise<{ id: string; name: string }[]> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/workspace-types`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch workspace types');
    return res.json();
  },

  getPricePolicies: async (): Promise<PricePolicyDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/price-policies`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch price policies');
    return res.json();
  },

  createPricePolicy: async (payload: { workspaceTypeId: string; durationUnit: string; price: number }): Promise<PricePolicyDto> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/price-policies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create price policy');
    }
    return res.json();
  },

  updatePricePolicy: async (id: string, payload: { price?: number; isActive?: boolean }): Promise<PricePolicyDto> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/price-policies/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update price policy');
    }
    return res.json();
  },

  deletePricePolicy: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/branch-admin/price-policies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete price policy');
  },

  /* ── Extra Services ── */

  getExtraServices: async (branchId?: string, includeInactive = false): Promise<ExtraServiceDto[]> => {
    const basePath = includeInactive ? `${API_BASE_URL}/api/extra-services/all` : `${API_BASE_URL}/api/extra-services`;
    const url = branchId ? `${basePath}?branchId=${branchId}` : basePath;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch extra services');
    const rawList: any[] = await res.json();
    return (rawList || []).map((s: any) => ({
      ...s,
      isActive: Boolean(s.isActive ?? s.active ?? false)
    }));
  },

  createExtraService: async (payload: Partial<ExtraServiceDto>): Promise<ExtraServiceDto> => {
    const res = await fetch(`${API_BASE_URL}/api/extra-services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create service');
    }
    const raw: any = await res.json();
    return {
      ...raw,
      isActive: Boolean(raw.isActive ?? raw.active ?? false)
    };
  },

  updateExtraService: async (id: string, payload: Partial<ExtraServiceDto>): Promise<ExtraServiceDto> => {
    const res = await fetch(`${API_BASE_URL}/api/extra-services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update service');
    }
    const raw: any = await res.json();
    return {
      ...raw,
      isActive: Boolean(raw.isActive ?? raw.active ?? false)
    };
  },

  deleteExtraService: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/extra-services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete service');
    }
  },

  /* ── Cancellation Policies ── */

  getCancellationPolicies: async (branchId?: string): Promise<CancellationPolicyDto[]> => {
    const url = branchId
      ? `${API_BASE_URL}/api/cancellation-policies?branchId=${branchId}`
      : `${API_BASE_URL}/api/cancellation-policies`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch cancellation policies');
    return res.json();
  },

  createCancellationPolicy: async (payload: Partial<CancellationPolicyDto>): Promise<CancellationPolicyDto> => {
    const res = await fetch(`${API_BASE_URL}/api/cancellation-policies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create cancellation policy');
    }
    return res.json();
  },

  // The backend replaces every field from this payload (it's not a partial PATCH) — always pass
  // the complete, already-merged policy object, never a sparse subset of changed fields.
  updateCancellationPolicy: async (id: string, payload: Omit<CancellationPolicyDto, 'id'>): Promise<CancellationPolicyDto> => {
    const res = await fetch(`${API_BASE_URL}/api/cancellation-policies/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update cancellation policy');
    }
    return res.json();
  },

  deleteCancellationPolicy: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/cancellation-policies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete cancellation policy');
  },

  /* ── Reports ── */

  getReportOverview: async (branchId?: string, dateFrom?: string, dateTo?: string, groupBy?: string): Promise<ReportOverviewDto> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (groupBy) params.append('groupBy', groupBy);
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/reports/overview${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch report overview');
    return res.json();
  },

  exportReportCsv: async (branchId?: string, dateFrom?: string, dateTo?: string): Promise<Blob> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/reports/export/csv${queryString ? `?${queryString}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Không thể xuất báo cáo.');
    return res.blob();
  },
};
