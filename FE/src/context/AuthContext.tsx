import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

export type UserRole = "super_admin" | "branch_admin" | "staff" | "customer";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  phone?: string;
  createdAt?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  backendStatus: "idle" | "ok" | "error";
  loginWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, password: string, fullName: string, confirmPassword?: string, phone?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfileFromBackend: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  changePassword: (data: any) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const ROLE_LIST: UserRole[] = ["super_admin", "branch_admin", "staff", "customer"];

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeRole = (role: unknown, branchId?: string | null): UserRole => {
  if (typeof role !== "string") return "customer";
  const normalized = role.toLowerCase().trim();
  if (normalized === "super_admin") return "super_admin";
  if (normalized === "branch_admin") return "branch_admin";
  if (normalized === "staff") return "staff";
  if (normalized === "admin") {
    // Tương thích ngược: có branchId -> branch_admin, ngược lại -> super_admin
    return branchId ? "branch_admin" : "super_admin";
  }
  return "customer";
};

const mapBackendUser = (dataUser: any, prevUser?: AuthUser | null): AuthUser => {
  const branchId = dataUser.branchId || dataUser.branch_id || prevUser?.branchId || null;
  return {
    id: dataUser.id,
    email: dataUser.email,
    fullName: dataUser.fullName || dataUser.full_name || prevUser?.fullName || "",
    avatarUrl: dataUser.avatarUrl || dataUser.avatar_url || prevUser?.avatarUrl || "",
    role: normalizeRole(dataUser.role || prevUser?.role, branchId),
    branchId,
    branchName: dataUser.branchName || dataUser.branch_name || prevUser?.branchName || null,
    phone: dataUser.phone || prevUser?.phone || "",
  };
};

/** Expiry of a JWT in epoch milliseconds, or null if it can't be read. */
const readTokenExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const clearStoredSession = () => {
  localStorage.removeItem("workhub_user");
  localStorage.removeItem("workhub_access_token");
  localStorage.removeItem("workhub_refresh_token");
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<"idle" | "ok" | "error">("idle");

  /**
   * Trades the stored refresh token for a new access token. Access tokens live an hour, so
   * without this a session would simply die mid-use and force the user to log in again.
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem("workhub_refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;

      const data = await response.json();
      if (!data.data?.user || !data.data?.accessToken) return false;

      const mappedUser = mapBackendUser(data.data.user, user);
      localStorage.setItem("workhub_user", JSON.stringify(mappedUser));
      localStorage.setItem("workhub_access_token", data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem("workhub_refresh_token", data.data.refreshToken);
      }
      setUser(mappedUser);
      setBackendStatus("ok");
      return true;
    } catch (error) {
      console.error("Failed to refresh session", error);
      return false;
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedUser = localStorage.getItem("workhub_user");
        const accessToken = localStorage.getItem("workhub_access_token");

        if (storedUser && accessToken) {
          const expiry = readTokenExpiry(accessToken);
          const isExpired = expiry === null || expiry < Date.now();

          if (isExpired) {
            // Try to recover the session before sending the user back to the login screen.
            const recovered = await refreshSession();
            if (!recovered) {
              clearStoredSession();
              setBackendStatus("idle");
            }
          } else {
            try {
              const parsed = JSON.parse(storedUser);
              if (parsed && typeof parsed === "object") {
                // If the user had branchId and was incorrectly saved as customer due to previous role normalization, repair to admin
                if (parsed.branchId && parsed.role === "customer") {
                  parsed.role = "admin";
                  localStorage.setItem("workhub_user", JSON.stringify(parsed));
                }
              }
              setUser(parsed);
              setBackendStatus("ok");
            } catch {
              setUser(null);
            }
          }
        } else {
          setBackendStatus("idle");
        }
      } catch (error) {
        console.error("Failed to restore session from local storage", error);
        setBackendStatus("error");
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        const storedToken = localStorage.getItem("workhub_access_token");
        if (event === "SIGNED_IN" && storedToken === session.access_token) {
          // Prevent redundant sync API call on page reload if session is already stored
          return;
        }

        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`
            }
          });
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || "Không thể đồng bộ người dùng Google");
          }
          const userFromDb = await response.json();
          const mappedUser = mapBackendUser(userFromDb);
          
          localStorage.setItem("workhub_user", JSON.stringify(mappedUser));
          localStorage.setItem("workhub_access_token", session.access_token);
          setUser(mappedUser);
          setBackendStatus("ok");
        } catch (error) {
          console.error("Error syncing Google user", error);
          setBackendStatus("error");
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  // Renew the access token shortly before it expires so an active session never breaks mid-use.
  // Each successful refresh replaces `user`, which re-runs this effect and schedules the next one.
  useEffect(() => {
    if (!user) return;
    const accessToken = localStorage.getItem("workhub_access_token");
    if (!accessToken || !localStorage.getItem("workhub_refresh_token")) return;

    const expiry = readTokenExpiry(accessToken);
    if (expiry === null) return;

    const delay = Math.max(5_000, expiry - Date.now() - 60_000);
    const timer = setTimeout(() => { void refreshSession(); }, delay);
    return () => clearTimeout(timer);
  }, [user, refreshSession]);

  const refreshProfileFromBackend = useCallback(async () => {
    const token = localStorage.getItem("workhub_access_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        const resData = await response.json();
        const mappedUser = mapBackendUser(resData, user);
        localStorage.setItem("workhub_user", JSON.stringify(mappedUser));
        setUser(mappedUser);
      }
    } catch (error) {
      console.error("Failed to refresh profile from backend", error);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/login",
      },
    });
    if (error) throw error;
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, fullName: string, confirmPassword?: string, phone?: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email, 
        password, 
        fullName, 
        confirmPassword: confirmPassword || password,
        phone: phone || ""
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (data.fields) {
         const firstError = Object.values(data.fields)[0];
         throw new Error(firstError as string);
      }
      throw new Error(data.message || "Đăng ký thất bại");
    }

    if (data.data?.user && data.data?.accessToken) {
       const mappedUser = mapBackendUser(data.data.user);
       localStorage.setItem("workhub_user", JSON.stringify(mappedUser));
       localStorage.setItem("workhub_access_token", data.data.accessToken);
       if (data.data.refreshToken) {
         localStorage.setItem("workhub_refresh_token", data.data.refreshToken);
       }
       setUser(mappedUser);
       setBackendStatus("ok");
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Đăng nhập thất bại");
    }

    if (data.data?.user && data.data?.accessToken) {
       const mappedUser = mapBackendUser(data.data.user);
       localStorage.setItem("workhub_user", JSON.stringify(mappedUser));
       localStorage.setItem("workhub_access_token", data.data.accessToken);
       if (data.data.refreshToken) {
         localStorage.setItem("workhub_refresh_token", data.data.refreshToken);
       }
       setUser(mappedUser);
       setBackendStatus("ok");
    }
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    const token = localStorage.getItem("workhub_access_token");
    if (!token) throw new Error("Chưa đăng nhập");

    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.message || "Cập nhật hồ sơ thất bại");
    }

    const updatedUser = mapBackendUser(resData, user);
    localStorage.setItem("workhub_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    return updatedUser;
  }, []);

  const changePassword = useCallback(async (data: any) => {
    const token = localStorage.getItem("workhub_access_token");
    if (!token) throw new Error("Chưa đăng nhập");

    const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.message || "Đổi mật khẩu thất bại");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out from Supabase", e);
    }
    localStorage.removeItem("workhub_user");
    localStorage.removeItem("workhub_access_token");
    localStorage.removeItem("workhub_refresh_token");
    setUser(null);
    setBackendStatus("idle");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      backendStatus,
      loginWithGoogle,
      registerWithEmail,
      loginWithEmail,
      logout,
      refreshProfileFromBackend,
      updateProfile,
      changePassword,
    }),
    [
      user,
      isLoading,
      backendStatus,
      loginWithGoogle,
      registerWithEmail,
      loginWithEmail,
      logout,
      refreshProfileFromBackend,
      updateProfile,
      changePassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
