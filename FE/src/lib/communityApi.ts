/**
 * communityApi.ts — API client for the CoSpace community feed.
 *
 * Posts are tagged from the same vocabulary as profile skills/interests, which is what lets the
 * backend rank the feed for the reader and recommend members to each other from what they write.
 */
import { API_BASE_URL as API } from '../config/api';

export type PostType = "sharing" | "seeking_partner" | "question" | "event";

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  postType: PostType;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorProfession: string | null;
  authorCompany: string | null;
  tags: string[];
  relevanceScore: number;
  matchedTags: string[];
  mine: boolean;
}

export interface CommunityTag {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

export interface PartnerSuggestion {
  id: string;
  name: string;
  profession: string;
  company: string;
  avatar: string;
  matchScore: number;
  commonTags: string[];
  contactPublic: boolean;
  email: string | null;
  phone: string | null;
  bio: string;
  linkedin: string | null;
  isSameBranch: boolean;
  matchReason: string | null;
  postTags: string[] | null;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("workhub_access_token");
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {}),
    },
  });

  const text = await res.text();
  if (!text || text.trim() === "") {
    if (!res.ok) throw new Error(`Lỗi server (${res.status})`);
    return {} as T;
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Lỗi server (${res.status}): phản hồi không hợp lệ.`);
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `Lỗi server (${res.status})`);
  }
  return data as T;
}

export const communityApi = {
  listFeed: (params: { tagId?: string; type?: string; sort?: "relevant" | "recent" } = {}) => {
    const query = new URLSearchParams();
    if (params.tagId) query.set("tagId", params.tagId);
    if (params.type) query.set("type", params.type);
    query.set("sort", params.sort ?? "relevant");
    return apiFetch<{ data: CommunityPost[] }>(`${API}/api/community/posts?${query.toString()}`)
      .then((r) => r.data ?? []);
  },

  createPost: (body: { title: string; content: string; postType: PostType; tagIds?: string[] }) =>
    apiFetch<CommunityPost>(`${API}/api/community/posts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deletePost: (postId: string) =>
    apiFetch<{ success: boolean }>(`${API}/api/community/posts/${postId}`, { method: "DELETE" }),

  listTags: () => apiFetch<CommunityTag[]>(`${API}/api/community/tags`),

  suggestedPartners: () =>
    apiFetch<{ data: PartnerSuggestion[] }>(`${API}/api/matching/suggestions`).then((r) => r.data ?? []),
};
