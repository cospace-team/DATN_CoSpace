// Same rules the backend enforces on registration and password reset (RegisterRequest,
// ResetPasswordRequest), checked here first so the customer gets the message before a round trip.
export const PASSWORD_HINT = "Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.";

export const passwordProblem = (password: string): string | null => {
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Mật khẩu cần có cả chữ hoa, chữ thường và số.";
  }
  return null;
};

export const isEmailLike = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
