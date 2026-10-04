import { API_BASE_URL } from "../config/api";

interface MessageResponse {
  message?: string;
}

const post = async (path: string, body: Record<string, string>, fallbackError: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: MessageResponse = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || fallbackError);
  return data.message || "";
};

/** Asks for a reset link. Answers the same whether or not the email has an account. */
export const requestPasswordReset = (email: string) =>
  post("/api/auth/forgot-password", { email }, "Không gửi được yêu cầu. Vui lòng thử lại sau.");

export const resetPassword = (token: string, newPassword: string, confirmPassword: string) =>
  post("/api/auth/reset-password", { token, newPassword, confirmPassword }, "Không đặt lại được mật khẩu. Vui lòng thử lại.");
