import type { ConnectionState } from "./connectionApi";
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
  /** Replies under the post. */
  commentCount?: number;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorProfession: string | null;
  content: string;
  createdAt: string;
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
  /** False when commonTags only lists the member's own skills (nothing shared yet). */
  commonTagsShared?: boolean;
  commonTags: string[];
  contactPublic: boolean;
  contactVisible?: boolean;
  connectionState?: ConnectionState;
  connectionId?: string | null;
  email: string | null;
  phone: string | null;
  bio: string;
  linkedin: string | null;
  github?: string | null;
  isSameBranch: boolean;
  matchReason: string | null;
  postTags: string[] | null;
  [key: string]: any;
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

let cachedPartners: { data: PartnerSuggestion[]; timestamp: number } | null = null;
const PARTNER_CACHE_TTL_MS = 60_000; // 60 seconds

const feedCache = new Map<string, { data: CommunityPost[]; timestamp: number }>();
const FEED_CACHE_TTL_MS = 30_000; // 30 seconds

let cachedTags: { data: CommunityTag[]; timestamp: number } | null = null;
const TAGS_CACHE_TTL_MS = 10 * 60_000; // 10 minutes

export const invalidateSuggestedPartners = () => {
  cachedPartners = null;
};

export const invalidateCommunityFeed = () => {
  feedCache.clear();
};

export const invalidateCommunityTags = () => {
  cachedTags = null;
};

export const communityApi = {
  listFeed: (
    params: { tagId?: string; type?: string; sort?: "relevant" | "recent" } = {},
    forceRefresh = false
  ): Promise<CommunityPost[]> => {
    const key = `${params.tagId || ""}:${params.type || ""}:${params.sort || "relevant"}`;
    if (!forceRefresh) {
      const entry = feedCache.get(key);
      if (entry && Date.now() - entry.timestamp < FEED_CACHE_TTL_MS) {
        return Promise.resolve(entry.data);
      }
    }
    const query = new URLSearchParams();
    if (params.tagId) query.set("tagId", params.tagId);
    if (params.type) query.set("type", params.type);
    query.set("sort", params.sort ?? "relevant");
    return apiFetch<{ data: CommunityPost[] }>(`${API}/api/community/posts?${query.toString()}`)
      .then((r) => {
        const posts = r.data ?? [];
        feedCache.set(key, { data: posts, timestamp: Date.now() });
        return posts;
      });
  },

  createPost: (body: { title: string; content: string; postType: PostType; tagIds?: string[] }) => {
    feedCache.clear();
    return apiFetch<CommunityPost>(`${API}/api/community/posts`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deletePost: (postId: string) => {
    feedCache.clear();
    return apiFetch<{ success: boolean }>(`${API}/api/community/posts/${postId}`, { method: "DELETE" });
  },

  listComments: (postId: string): Promise<PostComment[]> =>
    apiFetch<{ data: PostComment[] }>(`${API}/api/community/posts/${postId}/comments`).then((r) => r.data ?? []),

  addComment: (postId: string, content: string) => {
    feedCache.clear();
    return apiFetch<PostComment>(`${API}/api/community/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  deleteComment: (commentId: string) => {
    feedCache.clear();
    return apiFetch<{ success: boolean }>(`${API}/api/community/comments/${commentId}`, { method: "DELETE" });
  },

  listTags: (forceRefresh = false): Promise<CommunityTag[]> => {
    if (!forceRefresh && cachedTags && Date.now() - cachedTags.timestamp < TAGS_CACHE_TTL_MS) {
      return Promise.resolve(cachedTags.data);
    }
    return apiFetch<CommunityTag[]>(`${API}/api/community/tags`).then((tags) => {
      cachedTags = { data: tags, timestamp: Date.now() };
      return tags;
    });
  },

  suggestedPartners: (forceRefresh = false): Promise<PartnerSuggestion[]> => {
    if (!forceRefresh && cachedPartners && Date.now() - cachedPartners.timestamp < PARTNER_CACHE_TTL_MS) {
      return Promise.resolve(cachedPartners.data);
    }
    return apiFetch<{ data: PartnerSuggestion[] }>(`${API}/api/matching/suggestions`).then((r) => {
      const list = r.data ?? [];
      cachedPartners = { data: list, timestamp: Date.now() };
      return list;
    });
  },

  invalidateSuggestedPartners,
  invalidateFeed: invalidateCommunityFeed,
  invalidateTags: invalidateCommunityTags,
};


