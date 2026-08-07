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

export interface StaffDashboardStatsDto {
  revenue: number;
  activeCheckinsCount: number;
  availableWs: number;
  maintenanceWs: number;
  occupancyRate: number;
}

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

  getBranchTodayBookings: async (branchId: string): Promise<any[]> => {
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

  checkout: async (checkinId: string): Promise<CheckinLogDto> => {
    const res = await fetch(`${API_BASE_URL}/api/checkins/${checkinId}/checkout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Checkout failed');
    return res.json();
  },

  getActiveCheckins: async (branchId: string): Promise<BookingWithDetailsDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/checkins/active?branchId=${branchId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch active checkins');
    return res.json();
  },

  getDashboardStats: async (branchId: string): Promise<StaffDashboardStatsDto> => {
    const res = await fetch(`${API_BASE_URL}/api/staff/dashboard/stats?branchId=${branchId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }
};
