import { API_BASE_URL } from '../config/api';

export interface AdminUserDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'super_admin' | 'admin' | 'branch_admin' | 'staff' | 'customer';
  status: 'active' | 'suspended';
  branchId?: string;
  branchName?: string;
  bio?: string;
  profession?: string;
  company?: string;
  contactPublic?: boolean;
  contactLink?: string;
  createdAt?: string;
}

export interface AdminUserPage {
  content: AdminUserDto[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface AdminPricePolicyDto {
  id: string;
  branchId: string | null;
  branchName: string | null;
  workspaceTypeId: string;
  workspaceTypeName: string;
  durationUnit: 'hour' | 'day' | 'week' | 'month';
  price: number;
  isActive: boolean;
}

export interface CreatePricePolicyPayload {
  branchId?: string | null;
  workspaceTypeId: string;
  durationUnit: string;
  price: number;
}

const getHeaders = () => {
  const token = localStorage.getItem('workhub_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const adminApi = {
  getUsers: async (params?: {
    role?: string;
    branchId?: string;
    status?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<AdminUserPage> => {
    const query = new URLSearchParams();
    if (params?.role && params.role !== 'all') query.append('role', params.role);
    if (params?.branchId && params.branchId !== 'all') query.append('branchId', params.branchId);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());
    query.append('page', String(params?.page ?? 0));
    query.append('size', String(params?.size ?? 20));

    const res = await fetch(`${API_BASE_URL}/api/users?${query.toString()}`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải danh sách người dùng');
    }

    return res.json();
  },

  updateUserStatus: async (
    id: string,
    status: 'active' | 'suspended'
  ): Promise<AdminUserDto> => {
    const res = await fetch(`${API_BASE_URL}/api/users/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật trạng thái người dùng');
    }

    return res.json();
  },

  updateUserRole: async (
    id: string,
    role: string,
    branchId?: string
  ): Promise<AdminUserDto> => {
    const res = await fetch(`${API_BASE_URL}/api/users/${id}/role`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ role, branchId: branchId || null }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật vai trò người dùng');
    }

    return res.json();
  },

  /* ── System-wide Price Policies ── */

  getPricePolicies: async (): Promise<AdminPricePolicyDto[]> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/price-policies`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải bảng giá');
    }
    return res.json();
  },

  createPricePolicy: async (payload: CreatePricePolicyPayload): Promise<AdminPricePolicyDto> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/price-policies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể thêm chính sách giá');
    }
    return res.json();
  },

  updatePricePolicy: async (id: string, payload: { price?: number; isActive?: boolean }): Promise<AdminPricePolicyDto> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/price-policies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể cập nhật chính sách giá');
    }
    return res.json();
  },

  deletePricePolicy: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/admin/price-policies/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể xóa chính sách giá');
    }
  },
};
