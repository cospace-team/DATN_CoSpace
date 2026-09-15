import { API_BASE_URL } from '../config/api';

export type RefundStatus = 'pending' | 'processed' | 'rejected';
export type RefundReason = 'CANCELLATION' | 'MAINTENANCE' | 'LATE_PAYMENT' | 'DUPLICATE_PAYMENT';

export interface RefundDto {
  id: string;
  bookingId: string;
  bookingCode: string | null;
  bookingStatus: string | null;
  paymentId: string | null;
  paymentProvider: string | null;
  userId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  branchId: string;
  branchName: string | null;
  amount: number;
  reasonType: RefundReason;
  reason: string | null;
  status: RefundStatus;
  resolutionNote: string | null;
  processedByName: string | null;
  processedAt: string | null;
  createdAt: string;
}

export const REFUND_REASON_LABEL: Record<RefundReason, string> = {
  CANCELLATION: 'Khách hủy đơn',
  MAINTENANCE: 'Bảo trì đột xuất',
  LATE_PAYMENT: 'Thanh toán về muộn',
  DUPLICATE_PAYMENT: 'Thanh toán trùng',
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

export const refundApi = {
  list: (params: { status?: RefundStatus | 'all'; branchId?: string }) => {
    const q = new URLSearchParams();
    if (params.status && params.status !== 'all') q.append('status', params.status);
    if (params.branchId) q.append('branchId', params.branchId);
    return request<RefundDto[]>(`/api/refunds?${q}`, {}, 'Không thể tải danh sách hoàn tiền');
  },
  process: (id: string, note: string) =>
    request<{ message: string }>(`/api/refunds/${id}/process`, { method: 'POST', body: JSON.stringify({ note }) },
      'Không thể xác nhận hoàn tiền'),
  reject: (id: string, note: string) =>
    request<{ message: string }>(`/api/refunds/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) },
      'Không thể từ chối hoàn tiền'),
};
