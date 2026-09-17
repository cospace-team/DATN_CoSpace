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
  workspaceId: string;
  workspaceName?: string;
  workspaceTypeId: string;
  branchId: string;
  branchName?: string;
  startAt: string;
  endAt: string;
  unit: string;
  unitCount: number;
  status: 'pending_payment' | 'confirmed' | 'checked_in' | 'completed' | 'canceled' | 'expired';
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

const CACHE_KEY = "coSpace_myBookingsCache";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
    sessionStorage.removeItem(CACHE_KEY); // Invalidate cache
    return data;
  },

  /**
   * List my bookings
   */
  async getMyBookings(forceRefresh = false): Promise<BookingResponse[]> {
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(CACHE_KEY);
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
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
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

    sessionStorage.removeItem(CACHE_KEY); // Invalidate cache
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
        sessionStorage.removeItem(CACHE_KEY); // Invalidate cache
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
      sessionStorage.removeItem(CACHE_KEY); // Invalidate cache
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
        sessionStorage.removeItem(CACHE_KEY); // Invalidate cache
        return { success: true, message: 'Thanh toán tiền mặt thành công' };
      }
      const errorData = await res.json().catch(() => ({}));
      return { success: false, message: errorData.message || `Lỗi thanh toán (${res.status})` };
    } catch {
      return { success: false, message: 'Không kết nối được máy chủ. Thanh toán chưa được ghi nhận.' };
    }
  },
};
