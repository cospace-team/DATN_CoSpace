import { API_BASE_URL } from '../config/api';

/* ─── Amenities ─── */

export interface AmenityDto {
  id: string;
  name: string;
  iconName: string | null;
  description: string | null;
  isActive: boolean;
  workspaceTypeCount: number;
}

export interface AmenityPayload {
  name: string;
  iconName?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface AssignedAmenityDto {
  amenityId: string;
  name: string;
  iconName: string | null;
  quantity: number;
}

export interface WorkspaceTypeAmenitiesDto {
  workspaceTypeId: string;
  workspaceTypeCode: string;
  workspaceTypeName: string;
  capacityDefault: number;
  amenities: AssignedAmenityDto[];
}

/* ─── Membership tiers ─── */

export interface MembershipTierDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  minTotalSpent: number;
  minBookings: number;
  discountPercent: number;
  benefits: string | null;
  color: string;
  sortOrder: number;
  isActive: boolean;
  memberCount?: number | null;
}

export interface MembershipTierPayload {
  code: string;
  name: string;
  description?: string | null;
  minTotalSpent: number;
  minBookings: number;
  discountPercent: number;
  benefits?: string | null;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MyMembershipDto {
  currentTier: MembershipTierDto | null;
  nextTier: MembershipTierDto | null;
  totalSpent: number;
  bookingCount: number;
  spendToNextTier: number;
  bookingsToNextTier: number;
  progressPercent: number;
}

/* ─── Promotions ─── */

export type PromotionState = 'scheduled' | 'running' | 'ended' | 'inactive' | 'exhausted';

export interface PromotionDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  perUserLimit: number | null;
  branchId: string | null;
  branchName: string | null;
  workspaceTypeId: string | null;
  workspaceTypeName: string | null;
  minTierCode: string | null;
  minTierName: string | null;
  isPublic: boolean;
  isActive: boolean;
  usedCount: number | null;
  state: PromotionState;
  createdAt: string;
}

export interface PromotionPayload {
  code: string;
  name: string;
  description?: string | null;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  startAt: string;
  endAt: string;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  branchId?: string | null;
  workspaceTypeId?: string | null;
  minTierCode?: string | null;
  isPublic: boolean;
  isActive: boolean;
}

export interface BookingQuoteDto {
  pricePerUnit: number;
  unitCount: number;
  subtotalAmount: number;
  membershipTierCode: string | null;
  membershipTierName: string | null;
  membershipDiscountPercent: number;
  membershipDiscountAmount: number;
  promotionCode: string | null;
  promotionName: string | null;
  promotionDiscountAmount: number;
  discountAmount: number;
  /** Add-ons ordered with the booking, already included in totalAmount. */
  addonAmount: number;
  totalAmount: number;
}

/* ─── HTTP ─── */

const headers = (): HeadersInit => {
  const token = localStorage.getItem('workhub_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request<T>(path: string, init: RequestInit = {}, fallbackError = 'Có lỗi xảy ra'): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: headers() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    // Bean-validation failures come back as { fields: { field: message } } without a message.
    const fieldMessages = err.fields ? Object.values(err.fields).join(' · ') : '';
    throw new Error(err.message || fieldMessages || fallbackError);
  }
  return res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});

export const amenityApi = {
  list: () => request<AmenityDto[]>('/api/admin/amenities', {}, 'Không thể tải danh sách tiện ích'),
  create: (payload: AmenityPayload) =>
    request<AmenityDto>('/api/admin/amenities', json('POST', payload), 'Không thể thêm tiện ích'),
  update: (id: string, payload: AmenityPayload) =>
    request<AmenityDto>(`/api/admin/amenities/${id}`, json('PUT', payload), 'Không thể cập nhật tiện ích'),
  remove: (id: string) =>
    request<{ message: string }>(`/api/admin/amenities/${id}`, json('DELETE'), 'Không thể xóa tiện ích'),
  listByWorkspaceType: () =>
    request<WorkspaceTypeAmenitiesDto[]>('/api/admin/workspace-type-amenities', {}, 'Không thể tải tiện ích theo loại không gian'),
  assign: (workspaceTypeId: string, amenities: { amenityId: string; quantity: number }[]) =>
    request<AssignedAmenityDto[]>(`/api/admin/workspace-types/${workspaceTypeId}/amenities`,
      json('PUT', { amenities }), 'Không thể lưu tiện ích cho loại không gian'),
  /** Customer view: only active amenities. */
  listPublic: () =>
    request<WorkspaceTypeAmenitiesDto[]>('/api/customer/spaces/workspace-types', {}, 'Không thể tải tiện ích'),
};

export const membershipApi = {
  list: () => request<MembershipTierDto[]>('/api/admin/membership-tiers', {}, 'Không thể tải hạng thành viên'),
  create: (payload: MembershipTierPayload) =>
    request<MembershipTierDto>('/api/admin/membership-tiers', json('POST', payload), 'Không thể thêm hạng thành viên'),
  update: (id: string, payload: MembershipTierPayload) =>
    request<MembershipTierDto>(`/api/admin/membership-tiers/${id}`, json('PUT', payload), 'Không thể cập nhật hạng thành viên'),
  remove: (id: string) =>
    request<{ message: string }>(`/api/admin/membership-tiers/${id}`, json('DELETE'), 'Không thể xóa hạng thành viên'),
  recalculate: () =>
    request<{ processedUsers: number; changedUsers: number }>('/api/admin/membership-tiers/recalculate',
      json('POST'), 'Không thể tính lại hạng thành viên'),
  me: () => request<MyMembershipDto>('/api/membership/me', {}, 'Không thể tải hạng thành viên'),
  publicTiers: () => request<MembershipTierDto[]>('/api/membership/tiers', {}, 'Không thể tải hạng thành viên'),
};

export const promotionApi = {
  list: () => request<PromotionDto[]>('/api/admin/promotions', {}, 'Không thể tải chương trình khuyến mãi'),
  create: (payload: PromotionPayload) =>
    request<PromotionDto>('/api/admin/promotions', json('POST', payload), 'Không thể tạo khuyến mãi'),
  update: (id: string, payload: PromotionPayload) =>
    request<PromotionDto>(`/api/admin/promotions/${id}`, json('PUT', payload), 'Không thể cập nhật khuyến mãi'),
  remove: (id: string) =>
    request<{ deleted: boolean; message: string }>(`/api/admin/promotions/${id}`, json('DELETE'), 'Không thể xóa khuyến mãi'),
  available: (branchId: string, workspaceTypeId?: string) => {
    const q = new URLSearchParams({ branchId });
    if (workspaceTypeId) q.append('workspaceTypeId', workspaceTypeId);
    return request<PromotionDto[]>(`/api/promotions/available?${q}`, {}, 'Không thể tải mã khuyến mãi');
  },
  quote: (payload: { workspaceId: string; unit: string; startAt: string; endAt: string; promotionCode?: string | null;
    addons?: { serviceId: string; quantity: number }[] }) =>
    request<BookingQuoteDto>('/api/bookings/quote', json('POST', payload), 'Không thể tính giá đơn đặt chỗ'),
};

/** Human-readable discount, e.g. "Giảm 10% (tối đa 50.000 ₫)" or "Giảm 30.000 ₫". */
export const describePromotion = (p: Pick<PromotionDto, 'discountType' | 'discountValue' | 'maxDiscountAmount'>,
  formatMoney: (n: number) => string): string =>
  p.discountType === 'percent'
    ? `Giảm ${p.discountValue}%${p.maxDiscountAmount ? ` (tối đa ${formatMoney(p.maxDiscountAmount)})` : ''}`
    : `Giảm ${formatMoney(p.discountValue)}`;
