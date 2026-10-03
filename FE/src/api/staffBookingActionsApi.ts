import { API_BASE_URL } from '../config/api';
import type { BookingResponse } from '../lib/bookingApi';

/** What can be refunded on a booking, for the staff cancel / end-early dialog. */
export interface StaffRefundPreview {
  bookingCode: string;
  status: string;
  /** Checked in, or a started multi-day pass: it is ended early rather than cancelled. */
  inUse: boolean;
  paid: number;
  refundable: number;
  policyPercent: number;
  policyName: string | null;
  policyRefund: number;
  /** Rental share for the time left (bookings in use). */
  unusedRefund: number;
  unpaidAddons: number;
  startAt: string;
  endAt: string;
}

export type EndEarlyRefundMode = 'UNUSED' | 'FULL' | 'CUSTOM';

async function request<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const token = localStorage.getItem('workhub_access_token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const fields = err.fields ? Object.values(err.fields).join(' · ') : '';
    throw new Error(err.message || fields || fallback);
  }
  return res.json();
}

/** Staff / admin actions on a customer's booking: cancel it, or end it early, with a refund. */
export const staffBookingActionsApi = {
  /** Bookings of a branch overlapping [from, to). Branch staff may omit branchId (their own). */
  list: (branchId: string | undefined, from: Date, to: Date) =>
    request<BookingResponse[]>(
      `/api/staff/bookings?${branchId ? `branchId=${branchId}&` : ''}from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      {}, 'Không thể tải danh sách đơn'),
  refundPreview: (bookingId: string) =>
    request<StaffRefundPreview>(`/api/staff/bookings/${bookingId}/refund-preview`, {}, 'Không thể tải thông tin hoàn tiền'),
  /** Not started yet: cancel; waivePenalty refunds everything (the branch is at fault). */
  cancel: (bookingId: string, reason: string, waivePenalty: boolean) =>
    request<{ refundAmount: number; refundPercent: number }>(`/api/staff/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, waivePenalty }),
    }, 'Không thể hủy đơn'),
  /** In use: check the guest out now and refund. */
  endEarly: (bookingId: string, reason: string, refundMode: EndEarlyRefundMode, amount?: number) =>
    request<{ bookingCode: string; refundAmount: number }>(`/api/staff/bookings/${bookingId}/end-early`, {
      method: 'POST',
      body: JSON.stringify({ reason, refundMode, amount }),
    }, 'Không thể kết thúc sớm đơn'),
};
