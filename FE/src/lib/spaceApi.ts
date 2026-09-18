/**
 * Space Management API service layer
 * Used by Branch Admin pages to interact with BE endpoints
 */
import { API_BASE_URL as API } from '../config/api';

const authHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("workhub_access_token")}`,
});

/* ─── Types ─── */

export interface FloorResponse {
  id: string;
  floorNo: number;
  name: string;
  svgContent: string | null;
  layoutJson: string | null;
  mapVersion: number;
  isPublished: boolean;
  workspaceCount: number;
}

export interface WorkspaceResponse {
  id: string;
  code: string;
  name: string;
  workspaceTypeId: string;
  workspaceTypeName: string;
  capacity: number;
  svgElementId: string;
  status: "active" | "maintenance" | "inactive";
}

export interface WorkspaceTypeResponse {
  id: string;
  code: string;
  name: string;
  capacityDefault: number;
}

export interface CreateFloorRequest {
  floorNo: number;
  name: string;
  svgContent?: string;
}

export interface UpdateFloorRequest {
  name?: string;
  floorNo?: number;
  isPublished?: boolean;
  svgContent?: string;
  layoutJson?: string;
}

export interface CreateWorkspaceRequest {
  floorId: string;
  workspaceTypeId: string;
  code: string;
  name: string;
  capacity: number;
  svgElementId: string;
}

export interface UpdateWorkspaceRequest {
  code?: string;
  name?: string;
  workspaceTypeId?: string;
  capacity?: number;
  svgElementId?: string;
  status?: string;
}

/* ─── Generic fetch helper ─── */

// Render's free tier spins the backend down after inactivity; the first
// request after a cold start can take 30-50s to come back. A short timeout
// with one retry keeps the UI responsive without waiting on the browser's
// default (multi-minute) connection timeout.
const FETCH_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("workhub_access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const mergedOptions: RequestInit = {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(url, mergedOptions, FETCH_TIMEOUT_MS);
  } catch {
    // Retry once: absorbs a Render cold start or a transient network blip.
    res = await fetchWithTimeout(url, mergedOptions, FETCH_TIMEOUT_MS);
  }

  // Handle empty responses
  const text = await res.text();

  if (!res.ok) {
    // Debug logging
    console.error(`[spaceApi] ${options?.method || 'GET'} ${url} → ${res.status}`, {
      responseBody: text?.substring(0, 200),
      tokenPrefix: token?.substring(0, 20) + '...',
    });
  }

  if (!text || text.trim() === "") {
    if (!res.ok) {
      throw new Error(
        res.status === 401 ? "Phiên đăng nhập hết hạn (401). Vui lòng đăng nhập lại." :
        res.status === 403 ? "Bạn không có quyền thực hiện thao tác này (403)." :
        `Lỗi server (${res.status})`
      );
    }
    return {} as T;
  }

  // Parse JSON safely
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Lỗi server (${res.status}): phản hồi không hợp lệ.`);
  }

  if (!res.ok) {
    if (data.fields && typeof data.fields === 'object') {
      const fieldDetails = Object.entries(data.fields)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      throw new Error(`Dữ liệu không hợp lệ: ${fieldDetails}`);
    }
    throw new Error(data.message || data.error || `Lỗi server (${res.status})`);
  }
  return data as T;
}

/* ─── Floor APIs ─── */

export const floorApi = {
  list: (branchId?: string) =>
    apiFetch<FloorResponse[]>(
      branchId ? `${API}/api/branch-admin/floors?branchId=${branchId}` : `${API}/api/branch-admin/floors`
    ),

  create: (req: CreateFloorRequest, branchId?: string) =>
    apiFetch<FloorResponse>(
      branchId ? `${API}/api/branch-admin/floors?branchId=${branchId}` : `${API}/api/branch-admin/floors`,
      {
        method: "POST",
        body: JSON.stringify(req),
      }
    ),

  update: (id: string, req: UpdateFloorRequest, branchId?: string) =>
    apiFetch<FloorResponse>(
      branchId ? `${API}/api/branch-admin/floors/${id}?branchId=${branchId}` : `${API}/api/branch-admin/floors/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(req),
      }
    ),

  delete: (id: string, branchId?: string) =>
    apiFetch<{ message: string }>(
      branchId ? `${API}/api/branch-admin/floors/${id}?branchId=${branchId}` : `${API}/api/branch-admin/floors/${id}`,
      {
        method: "DELETE",
      }
    ),
};

/* ─── Workspace APIs ─── */

export const workspaceApi = {
  listByFloor: (floorId: string, branchId?: string) =>
    apiFetch<WorkspaceResponse[]>(
      branchId
        ? `${API}/api/branch-admin/floors/${floorId}/workspaces?branchId=${branchId}`
        : `${API}/api/branch-admin/floors/${floorId}/workspaces`
    ),

  create: (req: CreateWorkspaceRequest, branchId?: string) =>
    apiFetch<WorkspaceResponse>(
      branchId ? `${API}/api/branch-admin/workspaces?branchId=${branchId}` : `${API}/api/branch-admin/workspaces`,
      {
        method: "POST",
        body: JSON.stringify(req),
      }
    ),

  update: (id: string, req: UpdateWorkspaceRequest, branchId?: string) =>
    apiFetch<WorkspaceResponse>(
      branchId ? `${API}/api/branch-admin/workspaces/${id}?branchId=${branchId}` : `${API}/api/branch-admin/workspaces/${id}`,
      { method: "PUT", body: JSON.stringify(req) }
    ),

  delete: (id: string, branchId?: string) =>
    apiFetch<{ message: string }>(
      branchId ? `${API}/api/branch-admin/workspaces/${id}?branchId=${branchId}` : `${API}/api/branch-admin/workspaces/${id}`,
      { method: "DELETE" }
    ),
};

/* ─── Floor Layout APIs ─── */

export const floorLayoutApi = {
  /** Get layout JSON for a floor */
  get: (floorId: string) =>
    apiFetch<{ layoutJson: string | null }>(
      `${API}/api/branch-admin/floors/${floorId}/layout`
    ),

  /** Save layout JSON for a floor */
  save: (floorId: string, layoutJson: string) =>
    apiFetch<FloorResponse>(
      `${API}/api/branch-admin/floors/${floorId}/layout`,
      {
        method: "PUT",
        body: JSON.stringify({ layoutJson }),
      }
    ),
};

/* ─── Workspace Type APIs ─── */

export const workspaceTypeApi = {
  list: (branchId?: string) =>
    apiFetch<WorkspaceTypeResponse[]>(
      branchId ? `${API}/api/branch-admin/workspace-types?branchId=${branchId}` : `${API}/api/branch-admin/workspace-types`
    ),
};

export interface WorkspaceTypeRequest {
  code: string;
  name: string;
  capacityDefault: number;
}

/* ─── Admin: system-wide Workspace Type management ─── */

export const adminWorkspaceTypeApi = {
  list: () =>
    apiFetch<WorkspaceTypeResponse[]>(`${API}/api/admin/workspace-types`),

  create: (req: WorkspaceTypeRequest) =>
    apiFetch<WorkspaceTypeResponse>(`${API}/api/admin/workspace-types`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: WorkspaceTypeRequest) =>
    apiFetch<WorkspaceTypeResponse>(`${API}/api/admin/workspace-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`${API}/api/admin/workspace-types/${id}`, {
      method: "DELETE",
    }),
};

/* ─── Admin: system-wide Branch management ─── */

export interface AdminBranchDto {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  timezone: string;
  openTime: string | null;
  closeTime: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CreateBranchRequest {
  code: string;
  name: string;
  address: string;
  city?: string;
  timezone?: string;
  openTime?: string;
  closeTime?: string;
}

export interface UpdateBranchRequest {
  name?: string;
  address?: string;
  city?: string;
  timezone?: string;
  openTime?: string;
  closeTime?: string;
  status?: "active" | "inactive";
}

export const adminBranchApi = {
  list: () => apiFetch<AdminBranchDto[]>(`${API}/api/admin/branches`),

  create: (req: CreateBranchRequest) =>
    apiFetch<AdminBranchDto>(`${API}/api/admin/branches`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateBranchRequest) =>
    apiFetch<AdminBranchDto>(`${API}/api/admin/branches/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  deactivate: (id: string) =>
    apiFetch<{ message: string }>(`${API}/api/admin/branches/${id}`, {
      method: "DELETE",
    }),
};

/* ─── Branch Response (public listing) ─── */

export interface BranchResponse {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  status: string;
  /** "HH:mm:ss" in Vietnam time; null when the branch has no fixed hours. */
  openTime: string | null;
  closeTime: string | null;
}

/** Price per unit a customer pays at a branch (branch policy, else the system-wide one). */
export interface BranchPriceResponse {
  workspaceTypeId: string;
  workspaceTypeCode: string;
  workspaceTypeName: string;
  unit: "hour" | "day" | "week" | "month";
  price: number;
}

/** Cheapest starting price of a workspace type across branches (public). */
export interface StartingPriceResponse {
  workspaceTypeId: string;
  code: string;
  name: string;
  capacityDefault: number;
  unit: "hour" | "day" | "week" | "month";
  price: number;
}

export interface PublicWorkspaceAvailability {
  workspaceId: string;
  status: "active" | "maintenance" | "inactive";
  busySlots: Array<{ startAt: string; endAt: string; reason: "booking" | "maintenance" }>;
}

export interface ExtraServiceResponse {
  id: string;
  code?: string;
  name: string;
  description?: string;
  serviceType?: string;
  unit: string;
  price: number;
  isActive: boolean;
  branchId?: string;
}

/* ─── Customer Space APIs ─── */
export const customerSpaceApi = {
  listBranches: () =>
    apiFetch<BranchResponse[]>(`${API}/api/customer/spaces/branches`),

  listFloors: (branchId: string) =>
    apiFetch<FloorResponse[]>(`${API}/api/customer/spaces/branches/${branchId}/floors`),

  listPrices: (branchId: string) =>
    apiFetch<BranchPriceResponse[]>(`${API}/api/customer/spaces/branches/${branchId}/prices`),

  pricingSummary: () =>
    apiFetch<StartingPriceResponse[]>(`${API}/api/customer/spaces/pricing-summary`),

  listWorkspaces: (branchId: string, floorId: string) =>
    apiFetch<WorkspaceResponse[]>(
      `${API}/api/customer/spaces/branches/${branchId}/floors/${floorId}/workspaces`
    ),

  /**
   * Busy time ranges for every workspace in the branch, across ALL customers — unlike
   * bookingApi.getMyBookings(), which only reflects the caller's own bookings.
   */
  getBookingStatus: (branchId: string, from: Date, to: Date) =>
    apiFetch<PublicWorkspaceAvailability[]>(
      `${API}/api/customer/spaces/branches/${branchId}/booking-status?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
    ),

  listExtraServices: (branchId?: string) =>
    apiFetch<ExtraServiceResponse[]>(
      branchId ? `${API}/api/extra-services?branchId=${branchId}` : `${API}/api/extra-services`
    ),
};
