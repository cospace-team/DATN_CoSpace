import { API_BASE_URL } from '../config/api';
import type { BookingResponse } from '../lib/bookingApi';

/** Counter operations beyond check-in: move, no-show, and the branch's counter log. */

async function request<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const token = localStorage.getItem('workhub_access_token');
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const fields = err.fields ? Object.values(err.fields).join(' · ') : '';
    throw new Error(err.message || fields || fallback);
  }
  return res.json();
}

export type StaffNoteKind = 'handover' | 'incident' | 'lost_found' | 'customer';

export const NOTE_KIND_LABEL: Record<StaffNoteKind, string> = {
  handover: 'Giao ca',
  incident: 'Sự cố',
  lost_found: 'Đồ thất lạc',
  customer: 'Khách hàng',
};

export interface StaffNoteDto {
  id: string;
  branchId: string;
  kind: StaffNoteKind;
  title: string;
  body: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  bookingId: string | null;
  bookingCode: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  photoUrl: string | null;
  status: 'open' | 'resolved';
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface CreateStaffNote {
  kind: StaffNoteKind;
  title: string;
  body?: string;
  customerId?: string;
  bookingId?: string;
  workspaceId?: string;
  photoUrl?: string;
  branchId?: string;
}

export const staffOpsApi = {
  markNoShow: (bookingId: string, reason: string) =>
    request<BookingResponse>(`/api/staff/bookings/${bookingId}/no-show`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }, 'Không thể đánh dấu không đến'),

  undoNoShow: (bookingId: string, reason: string) =>
    request<BookingResponse>(`/api/staff/bookings/${bookingId}/undo-no-show`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }, 'Không thể khôi phục đơn'),

  /** Moves a booking to another seat and/or a new start time (same length, same price). */
  moveBooking: (bookingId: string, payload: { workspaceId?: string; startAt?: string; reason: string }) =>
    request<BookingResponse>(`/api/staff/bookings/${bookingId}/move`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 'Không thể đổi chỗ / đổi giờ'),

  listNotes: (params: { kind?: StaffNoteKind; status?: 'open' | 'resolved'; customerId?: string; branchId?: string }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, v); });
    return request<StaffNoteDto[]>(`/api/staff/notes?${q}`, {}, 'Không thể tải sổ ghi chú');
  },

  createNote: (payload: CreateStaffNote) =>
    request<StaffNoteDto>('/api/staff/notes', { method: 'POST', body: JSON.stringify(payload) }, 'Không thể lưu ghi chú'),

  resolveNote: (id: string, note?: string) =>
    request<StaffNoteDto>(`/api/staff/notes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }, 'Không thể đóng ghi chú'),

  /** Uploads a photo (a broken seat, a lost item) and returns its public URL. */
  uploadPhoto: async (file: File, branchId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (branchId) form.append('branchId', branchId);
    const res = await request<{ url: string }>('/api/staff/photos', { method: 'POST', body: form }, 'Không thể tải ảnh lên');
    return res.url;
  },
};
