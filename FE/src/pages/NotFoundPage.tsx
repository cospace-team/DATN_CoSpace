import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useSEO } from "../hooks/useSEO";
import { Button } from "../components/ui/button";
import { Logo } from "../components/ui/Logo";
import {
  FiArrowLeft,
  FiHome,
  FiCompass,
  FiHelpCircle,
  FiMapPin,
  FiCalendar,
} from "react-icons/fi";

const NotFoundPage: React.FC = () => {
  useSEO({
    title: "404 - Không Tìm Thấy Trang",
    description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.",
  });

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const homeRoute =
    !isAuthenticated || !user
      ? "/"
      : user.role === "branch_admin"
      ? "/branch-admin/dashboard"
      : user.role === "super_admin"
      ? "/admin/dashboard"
      : user.role === "staff"
      ? "/staff/dashboard"
      : "/customer/explore";

  const homeLabel =
    !isAuthenticated || !user
      ? "Trang chủ"
      : user.role === "customer"
      ? "Khám phá không gian"
      : "Về Dashboard";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 selection:bg-primary/20">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header bar */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between max-w-6xl mx-auto w-full z-10">
        <Link to="/" className="inline-flex items-center group">
          <Logo iconClassName="h-9 w-9" textClassName="text-lg font-bold tracking-tight" />
        </Link>
        <Link
          to="/"
          className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          CoSpace Vietnam &bull; Hệ Thống Co-Working
        </Link>
      </header>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-xl mx-auto text-center"
      >
        {/* Animated Badge & Error Code */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <span className="text-8xl sm:text-9xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-400 to-sky-400 select-none drop-shadow-sm">
            404
          </span>
          <div className="absolute -bottom-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            Page Not Found
          </div>
        </div>

        {/* Heading & description */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
          Không tìm thấy trang bạn yêu cầu
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
          Đường dẫn có thể bị sai chính tả, đã hết hạn hoặc không gian bạn tìm kiếm đã được chuyển sang địa chỉ mới.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2 rounded-xl px-5 h-11 border-border/80 hover:bg-muted/80 shadow-sm"
          >
            <FiArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>

          <Button
            onClick={() => navigate(homeRoute)}
            className="gap-2 rounded-xl px-6 h-11 shadow-md shadow-primary/25 hover:shadow-primary/35 transition-all"
          >
            <FiHome className="h-4 w-4" />
            {homeLabel}
          </Button>

          {!isAuthenticated && (
            <Button
              variant="secondary"
              onClick={() => navigate("/locations")}
              className="gap-2 rounded-xl px-5 h-11 border border-border/40"
            >
              <FiCompass className="h-4 w-4" />
              Xem các chi nhánh
            </Button>
          )}
        </div>

        {/* Quick Help Card */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-5 text-left shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            <FiHelpCircle className="h-4 w-4 text-primary" />
            Lối tắt gợi ý
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Link
              to="/locations"
              className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FiMapPin className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <div className="font-medium text-foreground truncate">Danh sách Chi nhánh</div>
                <div className="text-xs text-muted-foreground truncate">Khám phá vị trí &amp; tiện ích</div>
              </div>
            </Link>

            <Link
              to={isAuthenticated ? "/customer/explore" : "/login"}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FiCalendar className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <div className="font-medium text-foreground truncate">
                  {isAuthenticated ? "Đặt chỗ không gian" : "Đăng nhập tài khoản"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {isAuthenticated ? "Chọn bàn & phòng họp" : "Truy cập tài nguyên của bạn"}
                </div>
              </div>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Footer copyright */}
      <footer className="absolute bottom-6 text-center text-xs text-muted-foreground/60">
        &copy; {new Date().getFullYear()} CoSpace. Mọi quyền được bảo lưu.
      </footer>
    </div>
  );
};

export default NotFoundPage;
