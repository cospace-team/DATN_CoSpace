/**
 * Space Management API service layer
 * Used by Branch Admin pages to interact with BE endpoints
 */

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

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

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("workhub_access_token");
  if (!token) {
    throw new Error("Chưa đăng nhập. Vui lòng đăng nhập lại.");
  }

  const res = await fetch(url, { ...options, headers: authHeaders() });

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
    throw new Error(data.message || data.error || `Lỗi server (${res.status})`);
  }
  return data as T;
}

/* ─── Floor APIs ─── */

export const floorApi = {
  list: () =>
    apiFetch<FloorResponse[]>(`${API}/api/branch-admin/floors`),

  create: (req: CreateFloorRequest) =>
    apiFetch<FloorResponse>(`${API}/api/branch-admin/floors`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateFloorRequest) =>
    apiFetch<FloorResponse>(`${API}/api/branch-admin/floors/${id}`, {
      method: "PUT",
      body: JSON.stringify(req),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`${API}/api/branch-admin/floors/${id}`, {
      method: "DELETE",
    }),
};

/* ─── Workspace APIs ─── */

export const workspaceApi = {
  listByFloor: (floorId: string) =>
    apiFetch<WorkspaceResponse[]>(
      `${API}/api/branch-admin/floors/${floorId}/workspaces`
    ),

  create: (req: CreateWorkspaceRequest) =>
    apiFetch<WorkspaceResponse>(`${API}/api/branch-admin/workspaces`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  update: (id: string, req: UpdateWorkspaceRequest) =>
    apiFetch<WorkspaceResponse>(
      `${API}/api/branch-admin/workspaces/${id}`,
      { method: "PUT", body: JSON.stringify(req) }
    ),

  delete: (id: string) =>
    apiFetch<{ message: string }>(
      `${API}/api/branch-admin/workspaces/${id}`,
      { method: "DELETE" }
    ),
};

/* ─── Workspace Type APIs ─── */

export const workspaceTypeApi = {
  list: () =>
    apiFetch<WorkspaceTypeResponse[]>(
      `${API}/api/branch-admin/workspace-types`
    ),
};
