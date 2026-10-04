import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiAlertTriangle, FiLoader, FiLock, FiX } from "react-icons/fi";
import { Button } from "../components/ui/button";
import { Logo } from "../components/ui/Logo";
import { useSEO } from "../hooks/useSEO";
import { resetPassword } from "../api/passwordResetApi";
import { PASSWORD_HINT, passwordProblem } from "../utils/passwordRules";

const fieldClass =
  "block w-full rounded-sm border border-border bg-card px-4 py-3.5 pl-11 text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-200 outline-none text-sm";

/** Landing page of the link in the "forgot password" email: /reset-password?token=… */
const ResetPasswordPage: React.FC = () => {
  useSEO({ title: "Đặt lại mật khẩu", description: "Đặt mật khẩu mới cho tài khoản CoSpace của bạn." });
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    if (password !== confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const message = await resetPassword(token, password, confirmPassword);
      navigate("/login", { replace: true, state: { notice: message || "Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đặt lại được mật khẩu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Link to="/" className="bg-card px-6 py-3 rounded-sm shadow-sm border border-border inline-flex items-center" title="Về trang chủ CoSpace">
            <Logo textClassName="text-xl font-semibold tracking-tight" />
          </Link>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Đặt lại mật khẩu</h1>
          <p className="text-muted-foreground">Chọn mật khẩu mới cho tài khoản CoSpace của bạn.</p>
        </div>

        {!token ? (
          <div role="alert" className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <FiAlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Link không đầy đủ. Hãy mở đúng link trong email, hoặc{" "}
              <Link to="/login" className="font-semibold underline">yêu cầu link mới</Link> qua "Quên mật khẩu?".
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div role="alert" className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-sm font-medium text-red-800 dark:text-red-400 flex items-start gap-3">
                <FiX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="reset-password">Mật khẩu mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                  <FiLock className="w-5 h-5" aria-hidden="true" />
                </span>
                <input
                  type="password"
                  id="reset-password"
                  name="new-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                  placeholder="••••••••"
                  aria-describedby="reset-password-hint"
                />
              </div>
              <p id="reset-password-hint" className="mt-1.5 text-xs text-muted-foreground">{PASSWORD_HINT}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="reset-confirm">Nhập lại mật khẩu mới</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                  <FiLock className="w-5 h-5" aria-hidden="true" />
                </span>
                <input
                  type="password"
                  id="reset-confirm"
                  name="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-sm shadow-sm flex items-center justify-center gap-2"
            >
              {submitting && <FiLoader className="w-5 h-5 animate-spin" aria-hidden="true" />}
              {submitting ? "Đang lưu…" : "Lưu mật khẩu mới"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-foreground hover:underline">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
