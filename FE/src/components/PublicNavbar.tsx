import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, buttonVariants } from "./ui/button";
import { FiMenu, FiX, FiLogOut } from "react-icons/fi";
import { Logo } from "./ui/Logo";

const navLinks = [
  { label: "Dịch vụ",   to: "/#services"  },
  { label: "Chi nhánh", to: "/#locations" },
  { label: "Tính năng", to: "/#features"  },
];

const PublicNavbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleDashboard = () => {
    if (isAuthenticated && user) {
      const route =
        user.role === "super_admin"
          ? "/admin/dashboard"
          : user.role === "branch_admin"
          ? "/branch-admin/dashboard"
          : user.role === "staff"
          ? "/staff/dashboard"
          : "/customer/explore";
      navigate(route);
    } else {
      navigate("/login");
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (to.startsWith("/#")) {
      e.preventDefault();
      const id = to.slice(2);
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/");
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }, 400);
      }
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash) {
        window.history.pushState(null, "", window.location.pathname);
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Customers land on the booking page, everyone else on their management dashboard.
  const dashboardLabel = user?.role === "customer" ? "Đặt chỗ ngay" : "Vào trang quản lý";

  const isActive = (to: string) =>
    to.startsWith("/#") ? false : location.pathname === to;

  return (
    // Always solid: a transparent bar over the dark hero left the logo and links unreadable.
    <header
      className={`fixed top-0 w-full z-50 bg-card border-b border-border transition-[padding] duration-300 ${scrolled ? "py-2" : "py-4"}`}
    >
      <nav className="flex justify-between items-center px-6 md:px-8 max-w-7xl mx-auto">
        {/* ── Logo ── */}
        <Link to="/" onClick={handleLogoClick} className="group flex items-center gap-2 cursor-pointer" title="Về đầu trang CoSpace">
          <Logo iconClassName="text-foreground w-6 h-6" textClassName="text-lg font-semibold tracking-tight text-foreground" />
        </Link>

        {/* ── Desktop nav links ── */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => handleNavClick(e, link.to)}
              className={`
                px-4 py-2 text-sm font-medium rounded-sm transition-colors duration-200
                ${isActive(link.to)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Desktop auth buttons ── */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm font-medium text-muted-foreground">
                Chào, <span className="font-semibold text-foreground">{user.fullName}</span>
              </span>
              <Button
                onClick={handleDashboard}
                className="rounded-sm font-medium px-5 py-2"
              >
                {dashboardLabel}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void logout()}
                className="rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 px-3 py-2 text-sm"
                title="Đăng xuất"
              >
                <FiLogOut className="h-4 w-4" aria-hidden="true" />
                <span>Đăng xuất</span>
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                Đăng nhập
              </Link>
              <Button
                onClick={handleDashboard}
                className="rounded-sm font-medium px-5 py-2"
              >
                Đặt chỗ ngay
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors bg-card/80 border border-border shadow-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          aria-controls="public-mobile-menu"
        >
          {mobileOpen ? <FiX className="w-5 h-5" aria-hidden="true" /> : <FiMenu className="w-5 h-5" aria-hidden="true" />}
        </button>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && (
        <div id="public-mobile-menu" className="md:hidden absolute top-full left-0 w-full bg-card border-b border-border px-6 py-4 space-y-2 shadow-lg animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => handleNavClick(e, link.to)}
              className={`block py-3 px-4 rounded-sm text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? "bg-muted/50 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-4 mt-2 border-t border-border space-y-3">
            {isAuthenticated && user ? (
              <>
                <p className="text-sm text-muted-foreground px-4">
                  Xin chào, <span className="font-semibold text-foreground">{user.fullName}</span>
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleDashboard} className="flex-1 rounded-sm py-5 font-medium">
                    {dashboardLabel}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void logout()}
                    className="rounded-sm py-5 px-4 text-destructive border-destructive/30 hover:bg-destructive/10"
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
                  >
                    <FiLogOut className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className={buttonVariants({ variant: "outline", className: "flex-1 rounded-sm py-5 border-border text-foreground font-medium" })}
                >
                  Đăng nhập
                </Link>
                <Button onClick={handleDashboard} className="flex-1 rounded-sm py-5 font-medium">
                  Đặt chỗ ngay
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
