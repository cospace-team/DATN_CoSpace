import { API_BASE_URL } from '../config/api';

/** Where the viewer stands with another member. */
export type ConnectionState = 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected';

/** Another member's profile as the viewer may see it; contact fields are null unless contactVisible. */
export interface MemberProfile {
  userId: string;
  name: string;
  avatarUrl: string | null;
  profession: string | null;
  company: string | null;
  bio: string | null;
  skills: string[];
  branchName: string | null;
  memberSince: string | null;
  connectionState: ConnectionState;
  connectionId: string | null;
  connectionMessage: string | null;
  contactVisible: boolean;
  contactPublic: boolean;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  facebook: string | null;
  website: string | null;
}

export interface ConnectionItem {
  id: string;
  state: Exclude<ConnectionState, 'none'>;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  member: MemberProfile;
}

export interface ConnectionOverview {
  incoming: ConnectionItem[];
  outgoing: ConnectionItem[];
  connected: ConnectionItem[];
}

async function request<T>(path: string, init: RequestInit = {}, fallback = 'Có lỗi xảy ra'): Promise<T> {
  const token = localStorage.getItem('workhub_access_token');
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const fieldMessages = err.fields ? Object.values(err.fields).join(' · ') : '';
    throw new Error(err.message || err.error || fieldMessages || fallback);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const connectionApi = {
  overview: () => request<ConnectionOverview>('/api/connections', {}, 'Không thể tải danh sách kết nối'),
  profile: (userId: string) => request<MemberProfile>(`/api/profiles/${userId}`, {}, 'Không thể tải hồ sơ thành viên'),
  send: (userId: string, message?: string) =>
    request<MemberProfile>('/api/connections', { method: 'POST', body: JSON.stringify({ userId, message }) },
      'Không thể gửi lời mời kết nối'),
  accept: (connectionId: string) =>
    request<MemberProfile>(`/api/connections/${connectionId}/accept`, { method: 'POST' }, 'Không thể chấp nhận lời mời'),
  decline: (connectionId: string) =>
    request<MemberProfile>(`/api/connections/${connectionId}/decline`, { method: 'POST' }, 'Không thể từ chối lời mời'),
  remove: (connectionId: string) =>
    request<void>(`/api/connections/${connectionId}`, { method: 'DELETE' }, 'Không thể hủy kết nối'),
};

export const CONNECTION_STATE_LABEL: Record<ConnectionState, string> = {
  none: 'Chưa kết nối',
  pending_outgoing: 'Đã gửi lời mời',
  pending_incoming: 'Đang chờ bạn phản hồi',
  connected: 'Đã kết nối',
};
