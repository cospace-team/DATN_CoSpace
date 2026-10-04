/**
 * bookingApi.ts — API client for CoSpace Booking & payment endpoints.
 * Every result comes from the backend: when it cannot be reached the call fails with a clear
 * message instead of pretending a booking or payment went through.
 */

import { supabase } from './supabase';
import { API_BASE_URL } from '../config/api';

export interface BookingCreatePayload {
  branchId: string;
  workspaceId: string;
  workspaceTypeId: string;
  startAt: string; // ISO String
  endAt: string;   // ISO String
  unit: 'hour' | 'day' | 'week' | 'month';
  unitCount: number;
  /** Add-on services ordered with the booking; priced on the server and paid with it. */
  addons?: { serviceId: string; quantity: number }[];
  source?: 'web' | 'walkin';
  /** Optional promotion code; the backend also applies the membership-tier discount. */
  promotionCode?: string | null;
}

export interface BookingResponse {
  id: string;
  bookingCode: string;
  userId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  workspaceId: string;
  workspaceName?: string;
  workspaceTypeId: string;
  branchId: string;
  branchName?: string;
  startAt: string;
  endAt: string;
  unit: string;
  unitCount: number;
  status: 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'canceled' | 'expired' | 'no_show';
  subtotalAmount: number;
  discountAmount: number;
  membershipTierCode?: string | null;
  membershipDiscountAmount?: number;
  promotionCode?: string | null;
  promotionDiscountAmount?: number;
  addonAmount: number;
  totalAmount: number;
  paymentDeadlineAt?: string;
  source: string;
  createdAt: string;
  cancellationReason?: string;
  refundPercent?: number;
  refundAmount?: number;
  penaltyAmount?: number;
  refundStatus?: string;
  policyName?: string;
  cancelledAt?: string;
  isContract?: boolean;
  pricePerUnit?: number;
  taxAmount?: number;
  serviceFeeAmount?: number;
  paymentStatus?: string | null;
  /* Details for the customer's booking list. */
  workspaceCode?: string | null;
  workspaceTypeName?: string | null;
  workspaceCapacity?: number | null;
  floorName?: string | null;
  floorNo?: number | null;
  branchAddress?: string | null;
  branchCity?: string | null;
  /** payos | momo | cash | bank_transfer */
  paidVia?: string | null;
  paidAt?: string | null;
  firstCheckinAt?: string | null;
  lastCheckoutAt?: string | null;
  checkinCount?: number | null;
  /** Net reputation points this booking earned (+) or cost (-). */
  reputationDelta?: number | null;
  /** Booking group (several seats booked together) this seat belongs to. */
  groupId?: string | null;
  groupCode?: string | null;
  groupSize?: number | null;
}

export interface MomoCreatePaymentResponse {
  payUrl: string;
  deeplink?: string;
  qrCodeUrl?: string;
  orderId: string;
  resultCode: number;
  message: string;
}

export interface BookingCancellationResponse {
  id: string;
  bookingId: string;
  userId: string;
  reason: string;
  refundPercent: number;
  refundAmount: number;
  penaltyAmount: number;
  refundStatus: string;
}

export interface PayosCreatePaymentResponse {
  paymentId: string;
  bookingId: string;
  orderCode: number;
  orderId: string;
  provider: string;
  checkoutUrl: string;
  qrCode?: string;
  amount: number;
  status: string;
  message: string;
}

async function getAuthHeader(): Promise<HeadersInit> {
  const token = localStorage.getItem("workhub_access_token");
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const CACHE_KEY_PREFIX = "coSpace_myBookingsCache_";
const CACHE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

function invalidateBookingCache() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}

export interface CancelPreview {
  bookingCode: string;
  cancellable: boolean;
  message: string | null;
  paid: number;
  refundPercent: number;
  policyName: string | null;
  refundAmount: number;
  penaltyAmount: number;
}

export const bookingApi = {
  /**
   * Create a new workspace booking
   */
  async createBooking(payload: BookingCreatePayload): Promise<BookingResponse> {
    const headers = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error('Không kết nối được máy chủ. Đơn đặt chỗ chưa được tạo, vui lòng thử lại.');
    }

    // Surface the server's own error (overlap, opening hours, invalid promotion code, rate limit...).
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Lỗi tạo đơn đặt chỗ (${res.status})`);
    }
    const data = await res.json();
    invalidateBookingCache();
    return data;
  },

  /**
   * List my bookings
   */
  async getMyBookings(forceRefresh = false): Promise<BookingResponse[]> {
    const token = localStorage.getItem("workhub_access_token") || "anon";
    const cacheKey = `${CACHE_KEY_PREFIX}${token.slice(-16)}`;

    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
            return parsed.data;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/bookings/my`, {
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        return data;
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Không tải được danh sách đơn đặt chỗ (${res.status})`);
    } catch (err: any) {
      // Never answer "you have no bookings" when the list simply could not be loaded.
      throw new Error(err?.message?.startsWith('Không tải được')
        ? err.message
        : 'Không kết nối được máy chủ để tải danh sách đơn đặt chỗ.');
    }
  },

  /** What cancelling now would refund, under the same rules the cancellation itself applies. */
  async previewCancellation(bookingId: string): Promise<CancelPreview> {
    const token = localStorage.getItem("workhub_access_token");
    const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel-preview`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Không tính được số tiền hoàn lại.');
    return data as CancelPreview;
  },

  /**
   * Cancel a booking. Uses the policy-aware endpoint so the returned refund/penalty amounts
   * reflect the branch's actual cancellation policy instead of a client-guessed number.
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<BookingCancellationResponse> {
    const token = localStorage.getItem("workhub_access_token");
    if (!token) {
      throw new Error('User is not authenticated.');
    }

    const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: reason || 'Khách hàng yêu cầu hủy đơn' }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to cancel booking: ${response.statusText}`);
    }

    invalidateBookingCache();
    return response.json();
  },

  /**
   * Request MoMo Payment URL from Spring Boot MoMo API
   */
  async createMomoPayment(bookingId: string, amount: number): Promise<MomoCreatePaymentResponse> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/payments/momo/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ booking_id: bookingId, amount: Math.round(amount) }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.payUrl) {
        invalidateBookingCache();
        return {
          payUrl: data.payUrl,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.payUrl)}`,
          orderId: data.orderId || `MOMO-${bookingId.slice(0, 8)}`,
          resultCode: 0,
          message: data.message || 'Tạo liên kết MoMo Sandbox thành công',
        };
      }
    }

    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi kết nối cổng thanh toán MoMo (${res.status})`);
  },

  /**
   * Request PayOS (VietQR) Payment URL from Spring Boot PayOS API
   */
  async createPayosPayment(bookingId: string, amount: number): Promise<PayosCreatePaymentResponse> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/api/payments/payos/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ booking_id: bookingId, amount: Math.round(amount) }),
    });

    if (res.ok) {
      const data = await res.json();
      invalidateBookingCache();
      return data;
    }

    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi kết nối cổng thanh toán PayOS (${res.status})`);
  },

  /**
   * Create cash payment for a booking
   */
  async createCashPayment(bookingId: string): Promise<{ success: boolean; message: string }> {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/payments/cash/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ booking_id: bookingId }),
      });

      if (res.ok) {
        invalidateBookingCache();
        return { success: true, message: 'Thanh toán tiền mặt thành công' };
      }
      const errorData = await res.json().catch(() => ({}));
      return { success: false, message: errorData.message || `Lỗi thanh toán (${res.status})` };
    } catch {
      return { success: false, message: 'Không kết nối được máy chủ. Thanh toán chưa được ghi nhận.' };
    }
  },
};

/* ─────────────── Booking groups: several seats at once ─────────────── */

export interface BookingGroupCreatePayload {
  workspaceIds: string[];
  startAt: string;
  endAt: string;
  unit: 'hour' | 'day' | 'week' | 'month';
  /** Add-ons ordered with the group; served once, attached to the first seat. */
  addons?: { serviceId: string; quantity: number }[];
}

export interface BookingGroupQuote {
  seats: {
    workspaceId: string;
    workspaceName: string | null;
    pricePerUnit: number;
    unitCount: number;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
  }[];
  membershipTierName: string | null;
  membershipDiscountPercent: number;
  subtotalAmount: number;
  discountAmount: number;
  addonAmount: number;
  totalAmount: number;
}

export interface BookingGroupResponse {
  id: string;
  groupCode: string;
  branchId: string;
  startAt: string;
  endAt: string;
  seatCount: number;
  totalAmount: number;
  /** What is still to be paid: the seats awaiting payment. */
  amountDue: number;
  paymentDeadlineAt: string | null;
  bookings: BookingResponse[];
}

async function groupRequest<T>(path: string, body: unknown | undefined, fallback: string): Promise<T> {
  const headers = await getAuthHeader();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `${fallback} (${res.status})`);
  }
  if (body !== undefined) invalidateBookingCache();
  return res.json();
}

export const bookingGroupApi = {
  quote: (payload: Omit<BookingGroupCreatePayload, 'unit'> & { unit: string }) =>
    groupRequest<BookingGroupQuote>('/api/bookings/groups/quote', payload, 'Không thể tính giá các chỗ đã chọn'),
  create: (payload: BookingGroupCreatePayload) =>
    groupRequest<BookingGroupResponse>('/api/bookings/groups', payload, 'Không thể đặt các chỗ đã chọn'),
  get: (groupId: string) =>
    groupRequest<BookingGroupResponse>(`/api/bookings/groups/${groupId}`, undefined, 'Không thể tải đơn nhóm'),
  /** One VietQR payment for every seat still awaiting payment. */
  payPayos: (groupId: string) =>
    groupRequest<PayosCreatePaymentResponse>(`/api/bookings/groups/${groupId}/pay/payos`, {}, 'Không thể tạo thanh toán cho đơn nhóm'),
  cancel: (groupId: string, reason?: string) =>
    groupRequest<BookingGroupResponse>(`/api/bookings/groups/${groupId}/cancel`, reason ? { reason } : {}, 'Không thể hủy đơn nhóm'),
};
