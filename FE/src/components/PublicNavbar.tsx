import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { FiMenu, FiX } from "react-icons/fi";
import { Logo } from "./ui/Logo";

const navLinks = [
  { label: "Dịch vụ",   to: "/#services"  },
  { label: "Chi nhánh", to: "/#locations" },
  { label: "Tính năng", to: "/#features"  },
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

  const isActive = (to: string) =>
    to.startsWith("/#") ? false : location.pathname === to;

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-card/80 backdrop-blur-md border-b border-border shadow-sm py-2" : "bg-transparent py-4"
      }`}
    >
      <nav className="flex justify-between items-center px-6 md:px-8 max-w-7xl mx-auto">
        {/* ── Logo ── */}
        <Link to="/" className="group flex items-center gap-2">
          <Logo iconClassName="text-foreground w-6 h-6" textClassName="text-lg font-semibold tracking-tight text-foreground" />
        </Link>

        {/* ── Desktop nav links ── */}
        <div className="hidden md:flex items-center gap-1 bg-card/50 backdrop-blur-md border border-border rounded-full px-2 py-1 shadow-sm">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => handleNavClick(e, link.to)}
              className={`
                px-4 py-2 text-sm font-medium rounded-full transition-all duration-200
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
                className="rounded-full font-medium px-5 py-2"
              >
                Vào Dashboard
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
                className="rounded-full font-medium px-5 py-2"
              >
                Đặt chỗ
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors bg-card/80 border border-border shadow-sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Mở menu"
        >
          {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
        </button>
      </nav>

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-card border-b border-border px-6 py-4 space-y-2 shadow-lg animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => handleNavClick(e, link.to)}
              className={`block py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? "bg-muted/50 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-4 mt-2 border-t border-slate-100 space-y-3">
            {isAuthenticated && user ? (
              <>
                <p className="text-sm text-muted-foreground px-4">
                  Xin chào, <span className="font-semibold text-foreground">{user.fullName}</span>
                </p>
                <Button onClick={handleDashboard} className="w-full rounded-full py-5 font-medium">
                  Vào Dashboard
                </Button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full rounded-full py-5 border-border text-foreground font-medium">Đăng nhập</Button>
                </Link>
                <Button onClick={handleDashboard} className="flex-1 rounded-full py-5 font-medium">
                  Đặt chỗ
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
