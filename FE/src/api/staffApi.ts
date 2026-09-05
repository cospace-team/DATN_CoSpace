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
  }
};
