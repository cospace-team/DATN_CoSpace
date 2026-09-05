import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth, UserRole } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeProvider";
import { ToastProvider } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import { MockDataProvider } from "./context/MockDataContext";
import { Button } from "./components/ui/button";
import { Logo } from "./components/ui/Logo";
import { NotificationBell } from "./components/notifications/NotificationBell";
import {
  FiMapPin,
  FiCalendar,
  FiCreditCard,
  FiUser,
  FiUsers,
  FiActivity,
  FiCheckCircle,
  FiDollarSign,
  FiTool,
  FiTag,
  FiShield,
  FiRefreshCw,
  FiCoffee,
  FiFileText,
  FiBarChart2,
  FiSun,
  FiMoon,
  FiLogOut,
  FiMenu,
  FiChevronLeft,
  FiGrid,
} from "react-icons/fi";

// ── Pages ──
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import LocationsPage from "./pages/LocationPage";
import ExplorePage from "./pages/customer/ExplorePage";
import BookingCheckoutPage from "./pages/customer/BookingCheckoutPage";
import BookingHistoryPage from "./pages/customer/BookingHistoryPage";
import ProfilePage from "./pages/customer/ProfilePage";
import OperationsDashboardPage from "./pages/staff/OperationsDashboardPage";
import CheckInPage from "./pages/staff/CheckInPage";
import MaintenancePage from "./pages/staff/MaintenancePage";
import WalkinBookingPage from "./pages/staff/WalkinBookingPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import BranchManagementPage from "./pages/admin/BranchManagementPage";
import PricingPage from "./pages/admin/PricingPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import CancellationPoliciesPage from "./pages/admin/CancellationPoliciesPage";

import ExtraServicesPage from "./pages/admin/ExtraServicesPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import ReportsPage from "./pages/admin/ReportsPage";
// ── Branch Admin Pages ──
import BADashboardPage from "./pages/branch-admin/BADashboardPage";
import BAWorkspacePage from "./pages/branch-admin/BAWorkspacePage";
import BAPricingPage from "./pages/branch-admin/BAPricingPage";
import BAPoliciesPage from "./pages/branch-admin/BAPoliciesPage";
import BAStaffPage from "./pages/branch-admin/BAStaffPage";
import BAMaintenancePage from "./pages/branch-admin/BAMaintenancePage";
import BAServicesPage from "./pages/branch-admin/BAServicesPage";

// ── Navigation config ──
interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const customerNav: NavItem[] = [
  { to: "/customer/explore", label: "Khám phá Không gian", icon: <FiMapPin className="h-4 w-4" /> },
  { to: "/customer/history", label: "Lịch sử", icon: <FiCalendar className="h-4 w-4" /> },
  { to: "/customer/profile", label: "Hồ sơ & Kết nối", icon: <FiUser className="h-4 w-4" /> },
];

const staffNav: NavItem[] = [
  { to: "/staff/dashboard", label: "Dashboard", icon: <FiActivity className="h-4 w-4" /> },
  { to: "/staff/booking/new", label: "Đặt chỗ", icon: <FiCalendar className="h-4 w-4" /> },
  { to: "/staff/checkin", label: "Check-in", icon: <FiCheckCircle className="h-4 w-4" /> },
  { to: "/staff/maintenance", label: "Bảo trì", icon: <FiTool className="h-4 w-4" /> },
];

const branchAdminNav: NavItem[] = [
  { to: "/branch-admin/dashboard",   label: "Tổng quan",      icon: <FiActivity className="h-4 w-4" /> },
  { to: "/branch-admin/workspaces",  label: "Không gian",     icon: <FiGrid className="h-4 w-4" />    },
  { to: "/branch-admin/pricing",     label: "Bảng giá",       icon: <FiTag className="h-4 w-4" />     },
  { to: "/branch-admin/policies",    label: "Chính sách hủy",  icon: <FiShield className="h-4 w-4" />  },
  { to: "/branch-admin/staff",       label: "Nhân viên",      icon: <FiUsers className="h-4 w-4" />   },
  { to: "/branch-admin/maintenance", label: "Bảo trì",        icon: <FiTool className="h-4 w-4" />    },
  { to: "/branch-admin/services",    label: "Dịch vụ thêm",   icon: <FiCoffee className="h-4 w-4" />  },
];

const adminNav: NavItem[] = [
  { to: "/admin/dashboard", label: "Tổng quan", icon: <FiActivity className="h-4 w-4" /> },
  { to: "/admin/branches", label: "Chi nhánh", icon: <FiMapPin className="h-4 w-4" /> },
  { to: "/admin/pricing", label: "Bảng giá", icon: <FiTag className="h-4 w-4" /> },
  { to: "/admin/users", label: "Người dùng", icon: <FiUsers className="h-4 w-4" /> },
  { to: "/admin/cancellation", label: "Chính sách hủy", icon: <FiShield className="h-4 w-4" /> },
  { to: "/admin/services", label: "Dịch vụ thêm", icon: <FiCoffee className="h-4 w-4" /> },
  { to: "/admin/audit", label: "Nhật ký", icon: <FiFileText className="h-4 w-4" /> },
  { to: "/admin/reports", label: "Báo cáo", icon: <FiBarChart2 className="h-4 w-4" /> },
];

// ── Mobile Bottom Nav ──
const MobileBottomNav: React.FC<{ items: NavItem[] }> = ({ items }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleItems = items.slice(0, 5);

  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
      {visibleItems.map((item) => (
        <button
          key={item.to}
          onClick={() => navigate(item.to)}
          className={`nav-item ${location.pathname === item.to ? "active" : ""}`}
          aria-label={item.label}
          aria-current={location.pathname === item.to ? "page" : undefined}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ── Layout Shell ──
const AppShell: React.FC = () => {
  const { user, logout, isAuthenticated, isLoading, backendStatus } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-5">
          <Logo showText={false} iconClassName="h-12 w-12 animate-float" />
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm px-8 py-5 text-sm text-muted-foreground shadow-lg">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Đang kiểm tra phiên đăng nhập...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Public Routes ──
  if (location.pathname === "/" || location.pathname === "/locations") {
    return <LandingPage />;
  }

  // ── Auth Check ──
  if (!isAuthenticated || !user) {
    if (location.pathname === "/login") {
      return <LoginPage />;
    }
    return <Navigate to="/login" replace />;
  }

  const isBranchAdmin = user.role === "admin" && !!user.branchId;
  const isSuperAdmin  = user.role === "admin" && !user.branchId;

  const navItems =
    isBranchAdmin ? branchAdminNav
    : isSuperAdmin  ? adminNav
    : user.role === "staff" ? staffNav
    : customerNav;
  const roleLabel: Record<UserRole, string> = {
    customer: "Khách hàng",
    staff: "Nhân viên",
    admin: isBranchAdmin ? `Quản lý chi nhánh` : "Quản trị viên",
  };
  const defaultRoute =
    isBranchAdmin ? "/branch-admin/dashboard"
    : isSuperAdmin  ? "/admin/dashboard"
    : user.role === "staff" ? "/staff/dashboard"
    : "/customer/explore";

  // Redirect authenticated user away from login page
  if (location.pathname === "/login") {
    const params = new URLSearchParams(location.search);
    const redirectUrl = params.get("redirect") || (location.state as { redirect?: string })?.redirect;
    const branchId = params.get("branchId") || (location.state as { branchId?: string })?.branchId;
    if (redirectUrl) {
      const fullRedirect = branchId ? `${redirectUrl}?branchId=${branchId}` : redirectUrl;
      return <Navigate to={fullRedirect} replace />;
    }
    return <Navigate to={defaultRoute} replace />;
  }

  // Find current nav label for breadcrumb
  const currentNavItem = navItems.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentNavItem?.label || "Dashboard";

  const backendPillClass =
    backendStatus === "ok"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
      : backendStatus === "error"
        ? "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400"
        : "bg-muted text-muted-foreground border-border";
  const backendLabel =
    backendStatus === "ok" ? "Online" : backendStatus === "error" ? "Offline" : "Checking";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip-to-content link (a11y) */}
      <a href="#main-content" className="skip-link">
        Bỏ qua điều hướng
      </a>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          role="button"
          aria-label="Đóng menu"
          tabIndex={-1}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed lg:static z-50 h-full flex flex-col bg-sidebar transition-all duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "w-[68px]" : "w-[260px]"}`}
        aria-label="Điều hướng chính"
      >
        {/* Logo area */}
        <div className={`flex items-center gap-3 h-[68px] border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-3" : "px-5"}`}>
          <Logo
            showText={!collapsed}
            isDarkBackground
            iconClassName="h-9 w-9"
            textClassName="text-lg font-bold tracking-tight"
          />
        </div>

        {/* Section label */}
        {!collapsed && (
          <div className="px-5 pt-5 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/40">
              Điều hướng
            </p>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5" aria-label="Menu chính">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link group ${isActive ? "active" : ""} ${collapsed ? "justify-center px-3" : ""}`
              }
              title={item.label}
              aria-current={location.pathname === item.to ? "page" : undefined}
            >
              <span className="transition-transform duration-200 group-hover:scale-110 shrink-0">
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden lg:block px-3 py-2 border-t border-sidebar-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="sidebar-link w-full justify-center"
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            <FiChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* User profile card */}
        <div className={`shrink-0 border-t border-sidebar-border ${collapsed ? "px-2 py-3" : "p-3"}`}>
          {!collapsed ? (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] transition-colors cursor-default">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-blue-500/30">
                {user.fullName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white truncate">{user.fullName}</p>
                <p className="text-[11px] text-sidebar-foreground/60 truncate">{roleLabel[user.role]}</p>
              </div>
              <button
                onClick={() => void logout()}
                className="p-1.5 rounded-lg text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                aria-label="Đăng xuất"
                title="Đăng xuất"
              >
                <FiLogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30" title={user.fullName}>
                {user.fullName.charAt(0)}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="h-[60px] flex items-center justify-between px-6 border-b border-border bg-card/60 backdrop-blur-xl shrink-0">
          {/* Left: mobile menu + page context */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Mở menu điều hướng"
            >
              <FiMenu className="h-5 w-5" />
            </button>

            <div className="hidden lg:flex items-center gap-2.5">
              <h1 className="text-[15px] font-bold font-heading text-foreground">{pageTitle}</h1>
              {user.branchName && (
                <>
                  <div className="w-px h-4 bg-border" />
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FiMapPin className="h-3 w-3" /> {user.branchName}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: status + actions */}
          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${backendPillClass}`}
            >
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                backendStatus === "ok" ? "bg-emerald-500 animate-glow" : backendStatus === "error" ? "bg-red-500" : "bg-gray-400"
              }`} />
              {backendLabel}
            </span>

            <div className="w-px h-5 bg-border hidden sm:block" />

            <NotificationBell />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-lg"
              aria-label={resolvedTheme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            >
              {resolvedTheme === "dark" ? (
                <FiSun className="h-4 w-4" />
              ) : (
                <FiMoon className="h-4 w-4" />
              )}
            </Button>

            {/* Logout visible only on desktop header (mobile uses sidebar) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void logout()}
              className="hidden lg:inline-flex text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              aria-label="Đăng xuất"
            >
              <FiLogOut className="h-4 w-4" />
              <span className="hidden xl:inline">Đăng xuất</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-6 py-6 bg-background mobile-main-content"
        >
          <ErrorBoundary>
            <Routes>
              {/* Customer */}
              {user.role === 'customer' && (
                <>
                  <Route path="/customer/explore" element={<ExplorePage />} />
                  <Route path="/customer/checkout" element={<BookingCheckoutPage />} />
                  <Route path="/customer/history" element={<BookingHistoryPage />} />
                  <Route path="/customer/profile" element={<ProfilePage />} />
                </>
              )}

              {/* Staff */}
              {user.role === 'staff' && (
                <>
                  <Route path="/staff/dashboard" element={<OperationsDashboardPage />} />
                  <Route path="/staff/checkin" element={<CheckInPage />} />
                  <Route path="/staff/maintenance" element={<MaintenancePage />} />
                  <Route path="/staff/booking/new" element={<WalkinBookingPage />} />
                </>
              )}

              {/* Super Admin */}
              {isSuperAdmin && (
                <>
                  <Route path="/admin/dashboard"   element={<AdminDashboardPage />} />
                  <Route path="/admin/branches"    element={<BranchManagementPage />} />
                  <Route path="/admin/pricing"     element={<PricingPage />} />
                  <Route path="/admin/users"       element={<UserManagementPage />} />
                  <Route path="/admin/cancellation" element={<CancellationPoliciesPage />} />

                  <Route path="/admin/services"    element={<ExtraServicesPage />} />
                  <Route path="/admin/audit"       element={<AuditLogPage />} />
                  <Route path="/admin/reports"     element={<ReportsPage />} />
                </>
              )}

              {/* Branch Admin */}
              {isBranchAdmin && (
                <>
                  <Route path="/branch-admin/dashboard"   element={<BADashboardPage />} />
                  <Route path="/branch-admin/workspaces"  element={<BAWorkspacePage />} />
                  <Route path="/branch-admin/pricing"     element={<BAPricingPage />} />
                  <Route path="/branch-admin/policies"    element={<BAPoliciesPage />} />
                  <Route path="/branch-admin/staff"       element={<BAStaffPage />} />
                  <Route path="/branch-admin/maintenance" element={<BAMaintenancePage />} />
                  <Route path="/branch-admin/services"    element={<BAServicesPage />} />
                </>
              )}

              {/* Default redirect */}
              <Route path="*" element={<Navigate to={defaultRoute} replace />} />
            </Routes>
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Nav */}
        <MobileBottomNav items={navItems} />
      </div>
    </div>
  );
};

// ── Root App ──
const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <MockDataProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </ToastProvider>
      </MockDataProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
