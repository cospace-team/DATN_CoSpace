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
  }): Promise<AdminUserDto[]> => {
    const query = new URLSearchParams();
    if (params?.role && params.role !== 'all') query.append('role', params.role);
    if (params?.branchId && params.branchId !== 'all') query.append('branchId', params.branchId);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/api/users${qs}`, {
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
};
