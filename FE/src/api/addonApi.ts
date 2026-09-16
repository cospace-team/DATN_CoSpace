import { API_BASE_URL } from '../config/api';

/** An add-on service from the catalogue (global or branch-specific). */
export interface ExtraServiceDto {
  id: string;
  branchId: string | null;
  code: string;
  name: string;
  serviceType: string;
  description: string | null;
  price: number;
  unit: string;
  isActive?: boolean;
  active?: boolean;
}

export type AddonLineStatus = 'unpaid' | 'paid' | 'void';

export interface AddonLineDto {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceUnit: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: AddonLineStatus;
  createdAt: string;
  paidAt: string | null;
}

/** Running tab of a booking. */
export interface BookingTabDto {
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  branchId: string;
  items: AddonLineDto[];
  unpaidAmount: number;
  paidAmount: number;
}

export interface AddonLineRequest {
  serviceId: string;
  quantity: number;
}

export const ADDON_STATUS_LABEL: Record<AddonLineStatus, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  void: 'Đã hủy',
};

const headers = (): HeadersInit => {
  const token = localStorage.getItem('workhub_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const fieldMessages = err.fields ? Object.values(err.fields).join(' · ') : '';
    throw new Error(err.message || fieldMessages || fallback);
  }
  return res.json();
}

export const addonApi = {
  /** Active services a customer can order at this branch (branch-specific + global). */
  listServices: (branchId: string) =>
    request<ExtraServiceDto[]>(`/api/extra-services?branchId=${encodeURIComponent(branchId)}`, {},
      'Không thể tải danh sách dịch vụ thêm'),
  getTab: (bookingId: string) =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/addons`, {}, 'Không thể tải dịch vụ của đơn'),
  add: (bookingId: string, line: AddonLineRequest) =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/addons`, { method: 'POST', body: JSON.stringify(line) },
      'Không thể thêm dịch vụ'),
  voidItem: (bookingId: string, itemId: string) =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/addons/${itemId}`, { method: 'DELETE' }, 'Không thể hủy dịch vụ'),
  settle: (bookingId: string, method: 'cash' | 'bank_transfer') =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/addons/settle`, { method: 'POST', body: JSON.stringify({ method }) },
      'Không thể thu tiền dịch vụ'),
};
