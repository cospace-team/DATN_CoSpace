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
/** service = catalogue add-on; extension = extra hours bought; late_fee = late check-out surcharge. */
export type AddonLineType = 'service' | 'extension' | 'late_fee';

export interface AddonLineDto {
  id: string;
  serviceId: string | null;
  lineType: AddonLineType;
  serviceName: string;
  serviceUnit: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: AddonLineStatus;
  createdBy: string | null;
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

/** VietQR payment for what is still owed on a booking's tab. */
export interface TabPaymentDto {
  paymentId: string;
  bookingId: string;
  orderCode: number;
  orderId: string;
  amount: number;
  checkoutUrl: string;
  /** Image URL in demo mode, VietQR payload string with live PayOS. */
  qrCode: string;
  status: string;
}

/** Price and availability of extending a booking by some hours. */
export interface ExtensionQuoteDto {
  bookingId: string;
  hours: number;
  pricePerHour: number;
  amount: number;
  currentEndAt: string;
  newEndAt: string;
  available: boolean;
  /** Why the extension is not possible, when available is false. */
  reason: string | null;
  maxHours: number;
}

/** Late check-out surcharge if the guest checked out now. */
export interface LateFeeDto {
  bookingId: string;
  endAt: string;
  lateMinutes: number;
  graceMinutes: number;
  billableHours: number;
  pricePerHour: number;
  multiplierPercent: number;
  amount: number;
  due: boolean;
  alreadyCharged: boolean;
}

export const ADDON_LINE_TYPE_LABEL: Record<AddonLineType, string> = {
  service: 'Dịch vụ',
  extension: 'Gia hạn',
  late_fee: 'Check-out muộn',
};

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
  updateQuantity: (bookingId: string, itemId: string, quantity: number) =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/addons/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) },
      'Không thể đổi số lượng'),
  /** Creates a VietQR payment for everything still unpaid on the tab. */
  payByQr: (bookingId: string) =>
    request<TabPaymentDto>(`/api/bookings/${bookingId}/addons/pay/payos`, { method: 'POST' }, 'Không thể tạo mã QR thanh toán'),
  paymentStatus: (orderCode: number | string) =>
    request<{ orderCode: string; status: string }>(`/api/payments/payos/status/${orderCode}`, {}, 'Không thể kiểm tra thanh toán'),
  extensionQuote: (bookingId: string, hours: number) =>
    request<ExtensionQuoteDto>(`/api/bookings/${bookingId}/extension/quote?hours=${hours}`, {}, 'Không thể tính phí gia hạn'),
  /** Adds hours to the booking; the fee is put on the tab. */
  extend: (bookingId: string, hours: number) =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/extension`, { method: 'POST', body: JSON.stringify({ hours }) },
      'Không thể gia hạn'),
  lateFee: (bookingId: string) =>
    request<LateFeeDto>(`/api/bookings/${bookingId}/late-fee`, {}, 'Không thể tính phụ phí check-out muộn'),
  chargeLateFee: (bookingId: string) =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/late-fee`, { method: 'POST' }, 'Không thể tính phụ phí check-out muộn'),
  voidItem: (bookingId: string, itemId: string) =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/addons/${itemId}`, { method: 'DELETE' }, 'Không thể hủy dịch vụ'),
  settle: (bookingId: string, method: 'cash' | 'bank_transfer') =>
    request<BookingTabDto>(`/api/bookings/${bookingId}/addons/settle`, { method: 'POST', body: JSON.stringify({ method }) },
      'Không thể thu tiền dịch vụ'),
};
