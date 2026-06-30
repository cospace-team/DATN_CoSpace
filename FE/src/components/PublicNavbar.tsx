import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { FiMapPin, FiMenu, FiX } from "react-icons/fi";

const navLinks = [
  { label: "Dịch vụ",   to: "/#services"  },
  { label: "Chi nhánh", to: "/locations"  },
  { label: "Tính năng", to: "/#features"  },
  { label: "Cộng đồng", to: "/#community" },
];

const PublicNavbar: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleDashboard = () => {
    if (isAuthenticated && user) {
      const route =
        user.role === "admin"
          ? user.branchId ? "/branch-admin/dashboard" : "/admin/dashboard"
          : user.role === "staff"
          ? "/staff/dashboard"
          : "/customer/explore";
      navigate(route);
    } else {
      navigate("/login");
    }
  };

  /**
   * For links starting with "/#…" we handle smooth scroll manually so the
   * browser doesn't do a hard reload when already on "/".
   */
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (to.startsWith("/#")) {
      e.preventDefault();
      const id = to.slice(2); // e.g. "services"
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        // Navigate to home then scroll after mount
        navigate("/");
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }, 400);
      }
    }
  };

  const isActive = (to: string) =>
    to.startsWith("/#") ? false : location.pathname === to;

  return (
    <header
      className={`fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border transition-all duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <nav className="flex justify-between items-center h-20 px-6 md:px-8 max-w-7xl mx-auto">
        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <FiMapPin className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            CoSpace
          </span>
        </Link>

        {/* ── Desktop nav links ── */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => handleNavClick(e, link.to)}
              className={`
                relative pb-1 text-sm font-semibold transition-colors duration-200
                after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:rounded-full
                after:bg-primary after:transition-transform after:duration-300 after:origin-left
                ${isActive(link.to)
                  ? "text-primary font-bold after:scale-x-100"
                  : "text-muted-foreground hover:text-primary after:scale-x-0 hover:after:scale-x-100"
                }
              `}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* ── Desktop auth buttons ── */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated && user ? (
            <>
              <span className="text-sm font-medium text-muted-foreground">
                Chào, <span className="font-bold text-foreground">{user.fullName}</span>
              </span>
              <Button
                onClick={handleDashboard}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-[1.03] transition-transform"
              >
                Vào Dashboard
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                Đăng nhập
              </Link>
              <Button
                onClick={handleDashboard}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:scale-[1.03] transition-transform"
              >
                Đặt chỗ ngay
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Mở menu"
        >
          {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-t border-border px-6 py-4 space-y-3 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => handleNavClick(e, link.to)}
              className={`block py-2 text-sm font-semibold transition-colors ${
                isActive(link.to)
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-3 border-t border-border space-y-2">
            {isAuthenticated && user ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Xin chào, <span className="font-bold text-foreground">{user.fullName}</span>
                </p>
                <Button onClick={handleDashboard} className="w-full bg-primary text-primary-foreground">
                  Vào Dashboard
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" className="w-full">Đăng nhập</Button>
                </Link>
                <Button onClick={handleDashboard} className="w-full bg-primary text-primary-foreground">
                  Đặt chỗ ngay
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
