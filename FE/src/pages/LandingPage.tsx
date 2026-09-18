import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { customerSpaceApi, type BranchResponse, type StartingPriceResponse } from "../lib/spaceApi";
import { formatVND } from "../utils/formatters";
import { Button } from "../components/ui/button";
import PublicNavbar from "../components/PublicNavbar";
import { Logo } from "../components/ui/Logo";
import { useSEO } from "../hooks/useSEO";
import {
  FiArrowRight,
  FiX,
  FiMapPin,
  FiClock,
  FiCheck,
  FiUsers,
  FiLayout,
  FiCreditCard,
  FiSmartphone,
  FiRefreshCw,
  FiCalendar,
  FiChevronDown,
  FiWifi,
  FiMonitor,
  FiPhoneCall,
} from "react-icons/fi";

interface ServiceCard {
  id: string;
  title: string;
  category: "office" | "meeting";
  price: string;
  tag?: string;
  image: string;
  description: string;
  features: string[];
}

interface FeatureItem {
  text: string;
}

interface BranchCard {
  id: string;
  exploreBranchId?: string;
  name: string;
  tag: string;
  address: string;
  description: string;
  hours: string | null;
  image: string;
  features: FeatureItem[];
}

const serviceImages: Record<string, string> = {
  desk: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&q=80&w=800",
  meeting_room: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800",
  private_office: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
};

const serviceFeatures: Record<string, string[]> = {
  desk: [
    "Không gian làm việc mở tràn ngập ánh sáng",
    "Nguồn điện & Internet cáp quang tốc độ cao",
    "Giao lưu kết nối cộng đồng năng động"
  ],
  meeting_room: [
    "Màn hình tương tác Smart TV 4K",
    "Thiết bị Zoom/Teams Meeting hiện đại",
    "Phục vụ trà & cà phê miễn phí"
  ],
  private_office: [
    "Truy cập khóa từ an toàn 24/7",
    "Miễn phí giờ phòng họp hàng tháng",
    "Địa chỉ đăng ký kinh doanh chính thức"
  ]
};

const defaultBranchImages = [
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=1200",
];

const IMAGES = {
  hero: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1400",
  about: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=900",
  highlightCard: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=70&w=600",
  whyUs: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=900",
  steps: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=900",
  calculator: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1000",
  cta: "https://images.unsplash.com/photo-1462826303086-329426d1aef5?auto=format&fit=crop&q=80&w=1400",
};

const unitLabel: Record<string, string> = { hour: "giờ", day: "ngày", week: "tuần", month: "tháng" };

const tourTimeSlots = ["09:00 - 10:00", "10:00 - 11:00", "14:00 - 15:00", "16:00 - 17:00"];

const bookingSteps = [
  { icon: FiMapPin, title: "Chọn chi nhánh", text: "Lọc theo thành phố, giờ mở cửa và loại không gian phù hợp." },
  { icon: FiLayout, title: "Chọn chỗ trên sơ đồ", text: "Xem trống/bận theo thời gian thực và chọn đúng vị trí bạn muốn." },
  { icon: FiCreditCard, title: "Thanh toán online", text: "Thanh toán qua MoMo hoặc VietQR. Chỗ được giữ 15 phút trong lúc bạn thanh toán." },
  { icon: FiSmartphone, title: "Check-in bằng mã QR", text: "Đưa mã đặt chỗ cho lễ tân quét và bắt đầu làm việc ngay." },
];

const whyUsFeatures = [
  { icon: FiLayout, title: "Sơ đồ realtime", text: "Trạng thái trống/bận từng chỗ ngồi cập nhật tức thì." },
  { icon: FiCreditCard, title: "Thanh toán 1 chạm", text: "MoMo hoặc VietQR, hóa đơn lưu sẵn trong tài khoản." },
  { icon: FiSmartphone, title: "Check-in QR", text: "Mỗi đơn một mã riêng, lễ tân quét là vào làm việc." },
  { icon: FiRefreshCw, title: "Hoàn tiền tự động", text: "Hủy đơn là biết ngay số tiền hoàn, không chờ duyệt." },
];

const aboutFeatures = [
  { icon: FiWifi, label: "Internet tốc độ cao" },
  { icon: FiMonitor, label: "Phòng họp hiện đại" },
  { icon: FiUsers, label: "Kết nối đối tác" },
];

const faqs = [
  {
    q: "Tôi có thể thuê theo những khung thời gian nào?",
    a: "Bạn có thể đặt chỗ ngắn hạn theo giờ hoặc theo ngày, và thuê dài hạn theo tuần hoặc theo tháng. Giá hiển thị tùy theo chi nhánh và loại không gian.",
  },
  {
    q: "Nếu cần hủy đặt chỗ thì sao?",
    a: "Bạn tự gửi yêu cầu hủy trong ứng dụng. Hệ thống tự động áp dụng chính sách hủy của chi nhánh, tính số tiền hoàn và thông báo ngay cho bạn mà không cần chờ duyệt.",
  },
  {
    q: "Đơn đặt chỗ chưa thanh toán được giữ bao lâu?",
    a: "Chỗ ngồi được giữ trong 15 phút kể từ lúc tạo đơn. Sau thời gian này đơn chưa thanh toán sẽ tự hết hạn để nhường chỗ cho người khác.",
  },
  {
    q: "Tôi có thể gọi thêm dịch vụ khi đang làm việc không?",
    a: "Có. Lễ tân có thể thêm đồ uống, in ấn hoặc các dịch vụ khác vào đơn của bạn trong suốt thời gian sử dụng.",
  },
];

// Overrides an Unsplash source URL's width/height/quality params so the
// browser downloads an image close to its actual rendered size instead of
// the full-resolution source.
function withUnsplashSize(url: string, width: number, height: number, quality = 75): string {
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("h", String(height));
    u.searchParams.set("q", String(quality));
    u.searchParams.set("fit", "crop");
    return u.toString();
  } catch {
    return url;
  }
}

// Shared scroll-reveal props for section content
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const reveal = (delay = 0) => ({
  variants: fadeUp,
  initial: "hidden" as const,
  whileInView: "visible" as const,
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, delay, ease: "easeOut" as const },
});

// Cards that only mount once the API responds: animate on mount so they
// never depend on an in-view trigger that may already have been passed.
const appear = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: "easeOut" as const },
});

const inputClass =
  "w-full min-h-[48px] bg-background border border-input px-4 py-3 rounded-md text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors";

const darkInputClass =
  "w-full min-h-[48px] bg-white/5 border border-white/15 px-4 py-3 rounded-md text-base text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors";

const labelClass = "block text-sm font-medium text-foreground mb-1.5";

// Slanted accent tag used as the eyebrow above every section title.
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block -skew-x-12 bg-primary px-3.5 py-1 mb-4">
    <span className="block skew-x-12 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">{children}</span>
  </span>
);

const SectionTitle: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
  dark?: boolean;
}> = ({ eyebrow, title, description, align = "center", dark = false }) => (
  <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-xl"}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className={`font-display font-bold tracking-tight text-3xl md:text-5xl leading-[1.1] mb-4 text-balance ${dark ? "text-white" : "text-foreground"}`}>
      {title}
    </h2>
    {description && (
      <p className={`text-lg leading-relaxed ${dark ? "text-slate-300" : "text-muted-foreground"}`}>{description}</p>
    )}
  </div>
);

// Accessible modal shell: Escape closes, body scroll locks, focus moves into
// the dialog and returns to the trigger when it closes.
const Dialog: React.FC<{
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: React.ReactNode;
}> = ({ onClose, labelledBy, className = "", children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative z-10 w-full bg-card text-card-foreground border-t-4 border-primary rounded-lg shadow-2xl animate-scale-in focus:outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
};

const CloseButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Đóng"
    className={`absolute top-4 right-4 z-20 w-11 h-11 inline-flex items-center justify-center rounded-full cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
  >
    <FiX className="w-5 h-5" aria-hidden="true" />
  </button>
);

const RetryBlock: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="text-center py-14 border border-dashed border-border text-muted-foreground bg-card">
    <p className="mb-4">{message}</p>
    <Button onClick={onRetry} variant="outline" className="rounded-sm">
      <FiRefreshCw aria-hidden="true" /> Thử lại
    </Button>
  </div>
);

const LandingPage: React.FC = () => {
  useSEO({
    title: "Không Gian Làm Việc Linh Hoạt & Đẳng Cấp",
    description: "CoSpace - Nền tảng đặt chỗ co-working space thông minh, linh hoạt theo giờ, ngày, tháng. Đặt chỗ tức thì, bản đồ trực quan, thanh toán tiện lợi.",
  });

  const { isAuthenticated, user } = useAuth();
  // Public data straight from the backend: active branches and each workspace type's starting price.
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [workspaceTypes, setWorkspaceTypes] = useState<StartingPriceResponse[]>([]);
  const [publicDataError, setPublicDataError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadPublicData = () => {
    setPublicDataError(false);
    setIsLoading(true);
    Promise.allSettled([
      customerSpaceApi.listBranches()
        .then((data) => setBranches(data.filter((b) => b.status === "active")))
        .catch((err) => {
          console.error("Failed to load branches", err);
          setPublicDataError(true);
        }),
      customerSpaceApi.pricingSummary()
        .then(setWorkspaceTypes)
        .catch((err) => {
          console.error("Failed to load pricing", err);
          setPublicDataError(true);
        }),
    ]).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadPublicData();
  }, []);
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [activeCategory, setActiveCategory] = useState<"all" | "office" | "meeting">("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Price estimator
  const [calcTypeId, setCalcTypeId] = useState("");
  const [calcQty, setCalcQty] = useState("4");

  // Modals state
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [selectedBranchForDetail, setSelectedBranchForDetail] = useState<BranchCard | null>(null);
  const [tourForm, setTourForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: "",
    branchId: "",
    date: "",
    time: tourTimeSlots[0],
  });
  const [submitted, setSubmitted] = useState<boolean>(false);
  const tourResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (tourResetTimer.current) clearTimeout(tourResetTimer.current);
  }, []);

  // Dynamic real data logic
  const displayBranches: BranchCard[] = useMemo(() => {
    const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null);
    return branches.map((b, idx) => {
      const img = defaultBranchImages[idx % defaultBranchImages.length];
      const hours = hhmm(b.openTime) && hhmm(b.closeTime) ? `${hhmm(b.openTime)} – ${hhmm(b.closeTime)}` : null;

      return {
        id: b.id,
        exploreBranchId: b.id,
        name: b.name,
        tag: b.city || "Việt Nam",
        address: b.address,
        description: `Cơ sở ${b.name} tại ${b.address}${hours ? `, mở cửa ${hours} hằng ngày` : ""}.`,
        hours,
        image: img,
        features: [
          { text: `Vị trí ${b.city || "trung tâm"}` },
          { text: `Wifi 6 & Lễ tân 24/7` },
          ...(hours ? [{ text: `Mở cửa ${hours}` }] : []),
          { text: "Sơ đồ chỗ ngồi trực tuyến" },
        ],
      };
    });
  }, [branches]);

  const displayServices: ServiceCard[] = useMemo(() => {
    return workspaceTypes.map((wt) => {
      const category = wt.code.includes("meeting") ? "meeting" : "office";
      const isPopular = wt.code === "desk" || wt.code.includes("private");

      const image = serviceImages[wt.code] || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800";
      const features = serviceFeatures[wt.code] || [
        "Không gian hiện đại & chuyên nghiệp",
        "Wifi tốc độ cao 24/7",
        "Miễn phí trà, cà phê & nước uống",
      ];

      return {
        id: wt.workspaceTypeId,
        title: wt.name,
        category: category as "office" | "meeting",
        tag: isPopular ? "Phổ biến" : undefined,
        price: formatVND(wt.price),
        description: `/${unitLabel[wt.unit] || wt.unit} · tối đa ${wt.capacityDefault} người`,
        image,
        features,
      };
    });
  }, [workspaceTypes]);

  // Cheapest entry price, preferring hourly rates so the headline number compares like with like.
  const lowestPrice = useMemo(() => {
    const hourly = workspaceTypes.filter((wt) => wt.unit === "hour");
    const pool = hourly.length > 0 ? hourly : workspaceTypes;
    return pool.reduce<StartingPriceResponse | null>((min, wt) => (!min || wt.price < min.price ? wt : min), null);
  }, [workspaceTypes]);

  useEffect(() => {
    if (displayBranches.length > 0 && !tourForm.branchId) {
      setTourForm(prev => ({ ...prev, branchId: displayBranches[0].id }));
    }
  }, [displayBranches, tourForm.branchId]);

  useEffect(() => {
    if (workspaceTypes.length > 0 && !calcTypeId) {
      setCalcTypeId(workspaceTypes[0].workspaceTypeId);
    }
  }, [workspaceTypes, calcTypeId]);

  useEffect(() => {
    if (routerLocation.pathname === "/locations" || routerLocation.hash === "#locations") {
      setTimeout(() => {
        document.getElementById("locations")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [routerLocation]);

  const filteredServices = activeCategory === "all"
    ? displayServices
    : displayServices.filter(s => s.category === activeCategory);

  const calcType = workspaceTypes.find((wt) => wt.workspaceTypeId === calcTypeId);
  const calcQtyNumber = Math.max(0, Math.floor(Number(calcQty) || 0));
  const calcTotal = calcType && calcQtyNumber > 0 ? calcType.price * calcQtyNumber : null;

  const handleBookingRedirect = (branchExploreId?: string) => {
    if (isAuthenticated && user) {
      const defaultRoute =
        user.role === 'super_admin' ? "/admin/dashboard"
        : user.role === 'branch_admin' ? "/branch-admin/dashboard"
        : user.role === 'staff' ? "/staff/dashboard"
        : `/customer/explore${branchExploreId ? `?branchId=${branchExploreId}` : ""}`;
      navigate(defaultRoute, { state: { branchId: branchExploreId } });
    } else {
      const redirectUrl = branchExploreId ? `/customer/explore?branchId=${branchExploreId}` : `/customer/explore`;
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  };

  const openTourModal = (branchId?: string) => {
    if (branchId) {
      setTourForm((prev) => ({ ...prev, branchId }));
    } else if (displayBranches.length > 0) {
      setTourForm((prev) => ({ ...prev, branchId: displayBranches[0].id }));
    }
    setIsTourModalOpen(true);
  };

  const resetTourForm = () => {
    setTourForm({
      name: user?.fullName || "",
      email: user?.email || "",
      phone: "",
      branchId: displayBranches[0]?.id || "",
      date: "",
      time: tourTimeSlots[0],
    });
  };

  const closeTourModal = () => {
    if (tourResetTimer.current) clearTimeout(tourResetTimer.current);
    setIsTourModalOpen(false);
    if (submitted) {
      setSubmitted(false);
      resetTourForm();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    let formatted = rawDigits;
    if (rawDigits.length > 4 && rawDigits.length <= 7) {
      formatted = `${rawDigits.slice(0, 4)} ${rawDigits.slice(4)}`;
    } else if (rawDigits.length > 7) {
      formatted = `${rawDigits.slice(0, 4)} ${rawDigits.slice(4, 7)} ${rawDigits.slice(7, 11)}`;
    }
    setTourForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleTourSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    tourResetTimer.current = setTimeout(() => {
      setIsTourModalOpen(false);
      setSubmitted(false);
      resetTourForm();
    }, 4000);
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  const categories: { key: "all" | "office" | "meeting"; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "office", label: "Khu làm việc" },
    { key: "meeting", label: "Phòng họp" },
  ];

  const highlightCards = [
    { icon: FiClock, title: "Thuê linh hoạt", text: "Theo giờ, ngày, tuần hoặc tháng — trả đúng thời gian bạn dùng." },
    { icon: FiCreditCard, title: "Thanh toán online", text: "MoMo hoặc VietQR, xác nhận đơn ngay sau khi thanh toán." },
  ];

  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/25 selection:text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-3 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
      >
        Bỏ qua tới nội dung chính
      </a>
      <PublicNavbar />

      <main id="main-content">
      {/* ── Hero: dark, photo on the left, accent slash behind the copy ── */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white pt-28 md:pt-32 pb-36 md:pb-44">
        {/* Photo — full-bleed on mobile, clipped on a diagonal on desktop */}
        <div className="absolute inset-0 lg:right-auto lg:w-1/2 lg:[clip-path:polygon(0_0,100%_0,80%_100%,0_100%)] -z-10">
          <img
            src={withUnsplashSize(IMAGES.hero, 1200, 900, 80)}
            alt=""
            width={1200}
            height={900}
            // React 18 doesn't know the camelCase prop yet; pass the raw attribute.
            {...({ fetchpriority: "high" } as Record<string, string>)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/70 lg:bg-slate-950/25" />
        </div>
        {/* Accent slashes */}
        <div className="hidden lg:block absolute inset-y-0 left-[37%] w-[13%] bg-primary/40 [clip-path:polygon(76.9%_0,92.3%_0,15.4%_100%,0_100%)] -z-10" aria-hidden="true" />
        <div className="hidden lg:block absolute inset-y-0 left-[40%] w-[15%] bg-primary [clip-path:polygon(66.7%_0,93.3%_0,26.7%_100%,0_100%)] -z-10" aria-hidden="true" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12">
          <m.div
            className="lg:col-start-7 lg:col-span-6 lg:pl-12 py-8 lg:py-16"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Eyebrow>
              {isLoading || branches.length === 0 ? "Mạng lưới co-working" : `${branches.length} chi nhánh đang mở cửa`}
            </Eyebrow>
            <h1 className="font-display font-bold uppercase tracking-tight leading-[1.05] text-4xl sm:text-6xl xl:text-7xl mb-6">
              Làm việc
              <br />
              <span className="text-primary">đúng chỗ,</span>
              <br />
              đúng lúc.
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 max-w-lg">
              Đặt bàn làm việc, phòng họp hay văn phòng riêng theo giờ, ngày hoặc tháng. Chọn chỗ trên sơ đồ,
              thanh toán online và check-in bằng mã QR.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handleBookingRedirect()} size="lg" className="rounded-sm px-8 uppercase tracking-wide group/btn">
                Đặt chỗ ngay
                <FiArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />
              </Button>
              <Button
                onClick={() => openTourModal()}
                variant="outline"
                size="lg"
                className="rounded-sm px-8 uppercase tracking-wide bg-transparent border-white/40 text-white hover:bg-white hover:text-slate-950 hover:border-white"
              >
                <FiCalendar className="h-5 w-5" aria-hidden="true" />
                Đặt lịch tham quan
              </Button>
            </div>
          </m.div>
        </div>
      </section>

      {/* ── Highlight cards overlapping the hero ── */}
      <section aria-label="Điểm nổi bật" className="relative z-10 -mt-24 md:-mt-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {highlightCards.map((card, idx) => (
            <m.div
              key={card.title}
              {...reveal(idx * 0.06)}
              className="bg-card border border-border shadow-xl p-7 text-center group hover:border-primary transition-colors duration-200"
            >
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center text-primary border-2 border-primary/20 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                <card.icon className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold uppercase tracking-wide text-foreground mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.text}</p>
            </m.div>
          ))}
          <m.div {...reveal(0.12)} className="relative overflow-hidden bg-slate-950 text-white shadow-xl p-7 text-center">
            <img src={withUnsplashSize(IMAGES.highlightCard, 480, 360)} alt="" width={480} height={360} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="relative">
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                <FiSmartphone className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold uppercase tracking-wide mb-2">Check-in QR</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">Quét mã tại quầy lễ tân là bắt đầu làm việc.</p>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 min-h-[40px] px-4 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-sm hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Xem cách hoạt động <FiArrowRight aria-hidden="true" />
              </a>
            </div>
          </m.div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-10 items-center">
        <m.div {...reveal()}>
          <SectionTitle
            align="left"
            eyebrow="Về CoSpace"
            title="Nâng tầm mỗi ngày làm việc của bạn"
            description="CoSpace là mạng lưới không gian làm việc chung dành cho freelancer, startup và doanh nghiệp. Mọi thứ từ tìm chỗ, đặt chỗ đến thanh toán đều diễn ra trên một nền tảng."
          />
          <ul className="grid grid-cols-3 gap-4 my-10">
            {aboutFeatures.map((f) => (
              <li key={f.label} className="text-center sm:text-left">
                <f.icon className="w-9 h-9 text-primary mb-3 mx-auto sm:mx-0" aria-hidden="true" />
                <p className="font-display font-bold text-sm uppercase tracking-wide text-foreground leading-snug">{f.label}</p>
              </li>
            ))}
          </ul>
          <Button onClick={() => openTourModal()} size="lg" className="rounded-sm px-8 uppercase tracking-wide bg-slate-950 text-white hover:bg-primary hover:text-primary-foreground dark:bg-white dark:text-slate-950">
            Đặt lịch tham quan <FiArrowRight aria-hidden="true" />
          </Button>
        </m.div>

        <m.div {...reveal(0.08)} className="relative flex justify-center">
          {/* Outlined brand word behind the image */}
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 -rotate-90 font-display font-bold uppercase text-7xl md:text-8xl text-transparent [-webkit-text-stroke:1.5px_hsl(var(--border))] select-none pointer-events-none hidden sm:block"
            aria-hidden="true"
          >
            CoSpace
          </span>
          <div className="relative w-72 h-72 sm:w-96 sm:h-96">
            <div className="absolute inset-0 translate-x-6 translate-y-2 rounded-full bg-primary" aria-hidden="true" />
            <img
              src={withUnsplashSize(IMAGES.about, 768, 768)}
              alt="Thành viên đang làm việc với laptop tại CoSpace"
              width={768}
              height={768}
              loading="lazy"
              className="relative w-full h-full object-cover rounded-full border-8 border-background"
            />
            {!isLoading && lowestPrice && (
              <div className="absolute -bottom-4 -left-4 sm:left-0 bg-slate-950 text-white px-5 py-4 shadow-xl">
                <p className="text-xs uppercase tracking-wider text-slate-400">{lowestPrice.name} chỉ từ</p>
                <p className="font-display font-bold text-2xl tabular-nums">
                  {formatVND(lowestPrice.price)}
                  <span className="text-sm text-slate-400">/{unitLabel[lowestPrice.unit] || lowestPrice.unit}</span>
                </p>
              </div>
            )}
          </div>
        </m.div>
      </section>

      {/* ── Branches grid ── */}
      <section id="locations" className="py-20 md:py-28 bg-muted/50 border-y border-border scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <m.div {...reveal()} className="mb-12">
            <SectionTitle
              eyebrow="Chi nhánh"
              title="Tìm CoSpace gần bạn"
              description="Chọn một cơ sở để xem chi tiết, sơ đồ chỗ ngồi và đặt chỗ trực tuyến."
            />
          </m.div>

          {publicDataError && !isLoading && displayBranches.length === 0 ? (
            <RetryBlock message="Không thể tải danh sách chi nhánh. Vui lòng thử lại." onRetry={loadPublicData} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:auto-rows-[220px]">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`bg-muted animate-pulse min-h-[220px] ${i === 0 ? "sm:col-span-2 lg:row-span-2" : ""}`}
                      aria-hidden="true"
                    />
                  ))
                : displayBranches.map((branch, idx) => {
                    const isFeatured = idx === 0;
                    return (
                      <m.button
                        key={branch.id}
                        type="button"
                        {...appear((idx % 4) * 0.05)}
                        onClick={() => setSelectedBranchForDetail(branch)}
                        aria-label={`Xem chi tiết chi nhánh ${branch.name}`}
                        className={`group relative overflow-hidden bg-slate-900 text-left min-h-[220px] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary ${
                          isFeatured ? "sm:col-span-2 lg:row-span-2" : ""
                        }`}
                      >
                        <img
                          src={withUnsplashSize(branch.image, isFeatured ? 900 : 480, isFeatured ? 700 : 360)}
                          alt=""
                          width={isFeatured ? 900 : 480}
                          height={isFeatured ? 700 : 360}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-5">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5">
                            <FiMapPin aria-hidden="true" /> {branch.tag}
                          </p>
                          <h3 className={`font-display font-bold text-white mb-2 ${isFeatured ? "text-2xl md:text-3xl" : "text-lg"}`}>
                            {branch.name}
                          </h3>
                          {branch.hours && (
                            <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 tabular-nums">
                              {branch.hours}
                            </span>
                          )}
                        </div>
                        <span className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true">
                          <FiArrowRight />
                        </span>
                      </m.button>
                    );
                  })}
            </div>
          )}
        </div>
      </section>

      {/* ── Accent band ── */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-y-0 -left-10 w-64 bg-black/10 [clip-path:polygon(0_0,70%_0,100%_100%,30%_100%)]" aria-hidden="true" />
        <div className="absolute inset-y-0 right-10 w-24 bg-white/10 [clip-path:polygon(40%_0,100%_0,60%_100%,0_100%)]" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <h2 className="font-display font-bold text-2xl md:text-3xl max-w-2xl text-balance">
            Không gian chuyên nghiệp, giá linh hoạt cho mọi quy mô đội nhóm.
          </h2>
          <a
            href="#services"
            className="inline-flex items-center gap-2 min-h-[48px] px-7 bg-white text-slate-950 font-bold uppercase tracking-wide text-sm rounded-sm hover:bg-slate-950 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary shrink-0"
          >
            Xem bảng giá <FiArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ── Why choose us (dark) ── */}
      <section id="features" className="relative overflow-hidden bg-slate-950 text-white py-20 md:py-28 scroll-mt-20">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none [background-image:linear-gradient(135deg,white_1px,transparent_1px)] [background-size:28px_28px]"
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <m.div {...reveal()} className="relative max-w-lg mx-auto lg:mx-0 w-full">
            <div className="absolute -top-4 -left-4 w-full h-full border-4 border-primary" aria-hidden="true" />
            <img
              src={withUnsplashSize(IMAGES.whyUs, 800, 900)}
              alt="Nhóm làm việc tại không gian CoSpace"
              width={800}
              height={900}
              loading="lazy"
              className="relative w-full aspect-[8/9] object-cover"
            />
            <div className="absolute -bottom-6 right-4 sm:-right-6 bg-primary text-primary-foreground px-6 py-5 shadow-xl">
              <p className="font-display font-bold text-4xl tabular-nums leading-none">{isLoading ? "…" : branches.length || "—"}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1">Chi nhánh</p>
            </div>
          </m.div>

          <m.div {...reveal(0.08)}>
            <SectionTitle
              dark
              align="left"
              eyebrow="Vì sao chọn CoSpace"
              title="Mọi thứ bạn cần để làm việc hiệu quả"
              description="Một nền tảng cho việc đặt chỗ, thanh toán, check-in và kết nối cộng đồng."
            />
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7 my-10">
              {whyUsFeatures.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 flex items-center justify-center border border-white/15 text-primary">
                    <f.icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold uppercase tracking-wide text-sm mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button onClick={() => handleBookingRedirect()} size="lg" className="rounded-sm px-8 uppercase tracking-wide">
              Khám phá không gian <FiArrowRight aria-hidden="true" />
            </Button>
          </m.div>
        </div>
      </section>

      {/* ── How it works: image + accent panel ── */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-20">
        <m.div {...reveal()} className="mb-12">
          <SectionTitle eyebrow="Cách hoạt động" title="Từ lúc tìm chỗ tới khi ngồi vào bàn: 4 bước" />
        </m.div>
        <m.div {...reveal(0.05)} className="grid grid-cols-1 lg:grid-cols-5 shadow-xl">
          <div className="lg:col-span-2 relative min-h-[260px] bg-muted">
            <img
              src={withUnsplashSize(IMAGES.steps, 720, 800)}
              alt="Nhóm thành viên trao đổi công việc tại CoSpace"
              width={720}
              height={800}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-3 relative bg-primary text-primary-foreground p-8 md:p-12 lg:-ml-12 lg:pl-20 lg:[clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)]">
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {bookingSteps.map((step, idx) => (
                <li key={step.title}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-display font-bold text-4xl leading-none opacity-40 tabular-nums" aria-hidden="true">0{idx + 1}</span>
                    <step.icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-display font-bold uppercase tracking-wide mb-1.5">
                    <span className="sr-only">Bước {idx + 1}: </span>{step.title}
                  </h3>
                  <p className="text-sm leading-relaxed opacity-90">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </m.div>
      </section>

      {/* ── Pricing ── */}
      <section id="services" className="py-20 md:py-28 bg-muted/50 border-y border-border scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <m.div {...reveal()} className="mb-10">
            <SectionTitle
              eyebrow="Bảng giá"
              title="Chọn không gian phù hợp"
              description="Giá khởi điểm theo từng loại không gian. Giá thực tế có thể khác nhau tùy chi nhánh."
            />
          </m.div>

          <div role="group" aria-label="Lọc loại không gian" className="flex justify-center gap-2 mb-10 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                aria-pressed={activeCategory === cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`min-h-[44px] px-5 text-sm font-bold uppercase tracking-wide rounded-sm cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeCategory === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground border border-border hover:text-foreground hover:border-primary"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {publicDataError && !isLoading && filteredServices.length === 0 ? (
            <RetryBlock message="Không thể tải bảng giá. Vui lòng thử lại." onRetry={loadPublicData} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border" aria-hidden="true">
                      <div className="h-40 bg-muted animate-pulse" />
                      <div className="p-8 space-y-3">
                        <div className="h-8 w-1/2 mx-auto bg-muted animate-pulse" />
                        <div className="h-4 w-full bg-muted animate-pulse" />
                        <div className="h-4 w-3/4 mx-auto bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))
                : filteredServices.map((service, idx) => (
                    <m.article
                      key={service.id}
                      {...appear((idx % 3) * 0.06)}
                      className={`bg-card shadow-sm hover:shadow-xl transition-shadow duration-200 flex flex-col text-center ${
                        service.tag ? "border-2 border-primary" : "border border-border"
                      }`}
                    >
                      <div className="relative h-40 overflow-hidden bg-slate-900">
                        <img
                          src={withUnsplashSize(service.image, 640, 320)}
                          alt=""
                          width={640}
                          height={320}
                          loading="lazy"
                          className="w-full h-full object-cover opacity-50"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                          {service.tag && <Eyebrow>{service.tag}</Eyebrow>}
                          <h3 className="font-display font-bold uppercase tracking-wide text-xl text-white">{service.title}</h3>
                        </div>
                      </div>
                      <div className="p-8 flex-1 flex flex-col">
                        <p className="font-display font-bold text-4xl text-foreground tabular-nums mb-1">{service.price}</p>
                        <p className="text-sm text-muted-foreground mb-6">{service.description}</p>
                        <ul className="space-y-3 mb-8 flex-1 text-left">
                          {service.features.map((feat) => (
                            <li key={feat} className="flex items-start gap-2.5 text-sm text-foreground border-b border-border pb-3 last:border-0">
                              <FiCheck className="text-primary w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          onClick={() => handleBookingRedirect()}
                          variant={service.tag ? "default" : "outline"}
                          className="w-full rounded-sm uppercase tracking-wide"
                        >
                          Đặt ngay <FiArrowRight aria-hidden="true" />
                        </Button>
                      </div>
                    </m.article>
                  ))}
              {!isLoading && !publicDataError && filteredServices.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-12">Chưa có không gian nào thuộc nhóm này.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Price estimator (dark, image on the right) ── */}
      <section aria-labelledby="calculator-title" className="relative overflow-hidden bg-slate-950 text-white">
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[45%] [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]">
          <img src={withUnsplashSize(IMAGES.calculator, 900, 700)} alt="" width={900} height={700} loading="lazy" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-950/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
          <m.div {...reveal()} className="lg:w-1/2">
            <Eyebrow>Ước tính chi phí</Eyebrow>
            <h2 id="calculator-title" className="font-display font-bold tracking-tight text-3xl md:text-5xl leading-[1.1] mb-4">
              Tính nhanh chi phí thuê chỗ
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              Chọn loại không gian và thời lượng để xem chi phí tham khảo trước khi đặt.
            </p>

            {workspaceTypes.length === 0 ? (
              <p className="text-slate-400 border border-dashed border-white/20 p-6">
                {isLoading ? "Đang tải bảng giá…" : "Chưa có dữ liệu giá để ước tính."}
              </p>
            ) : (
              <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); handleBookingRedirect(); }}>
                <div>
                  <label htmlFor="calc-type" className="block text-sm font-medium text-slate-300 mb-1.5">Loại không gian</label>
                  <div className="relative">
                    <select
                      id="calc-type"
                      value={calcTypeId}
                      onChange={(e) => setCalcTypeId(e.target.value)}
                      className={`${darkInputClass} appearance-none pr-10 cursor-pointer`}
                    >
                      {workspaceTypes.map((wt) => (
                        <option key={wt.workspaceTypeId} value={wt.workspaceTypeId} className="text-slate-900">
                          {wt.name} ({formatVND(wt.price)}/{unitLabel[wt.unit] || wt.unit})
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <label htmlFor="calc-qty" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Số {calcType ? unitLabel[calcType.unit] || calcType.unit : "đơn vị"}
                  </label>
                  <input
                    id="calc-qty"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    value={calcQty}
                    onChange={(e) => setCalcQty(e.target.value)}
                    onBlur={() => setCalcQty(String(Math.min(999, Math.max(1, calcQtyNumber || 1))))}
                    className={`${darkInputClass} tabular-nums`}
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 pt-6 mt-2">
                  <div aria-live="polite">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Chi phí tạm tính</p>
                    <p className="font-display font-bold text-3xl md:text-4xl text-primary tabular-nums">
                      {calcTotal !== null ? formatVND(calcTotal) : "—"}
                    </p>
                  </div>
                  <Button type="submit" size="lg" className="rounded-sm px-8 uppercase tracking-wide">
                    Đặt chỗ ngay <FiArrowRight aria-hidden="true" />
                  </Button>
                </div>
                <p className="sm:col-span-2 text-xs text-slate-400">
                  Giá tham khảo theo mức khởi điểm, chưa gồm dịch vụ thêm và khuyến mãi.
                </p>
              </form>
            )}
          </m.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 md:py-28 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 scroll-mt-20">
        <m.div {...reveal()} className="lg:col-span-2">
          <SectionTitle
            align="left"
            eyebrow="Câu hỏi thường gặp"
            title="Bạn cần biết thêm?"
            description="Chưa thấy câu trả lời bạn cần? Gọi cho chúng tôi, đội ngũ CoSpace luôn sẵn sàng hỗ trợ."
          />
          <a
            href="tel:19003384"
            className="inline-flex items-center gap-3 mt-6 font-display font-bold text-2xl text-foreground hover:text-primary transition-colors"
          >
            <span className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
              <FiPhoneCall aria-hidden="true" />
            </span>
            1900 3384
          </a>
        </m.div>

        <m.div {...reveal(0.06)} className="lg:col-span-3 space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className={`border bg-card transition-colors ${isOpen ? "border-primary" : "border-border"}`}>
                <h3>
                  <button
                    type="button"
                    id={`faq-trigger-${idx}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${idx}`}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 min-h-[56px] text-left font-display font-bold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    {item.q}
                    <span className={`w-8 h-8 shrink-0 flex items-center justify-center transition-colors ${isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${idx}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${idx}`}
                  hidden={!isOpen}
                  className="px-5 pb-5 text-muted-foreground leading-relaxed"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </m.div>
      </section>

      {/* ── Final CTA (dark with photo) ── */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <img src={withUnsplashSize(IMAGES.cta, 1400, 600)} alt="" width={1400} height={600} loading="lazy" className="absolute inset-0 w-full h-full object-cover -z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
        <div className="hidden md:block absolute inset-y-0 right-[30%] w-24 bg-primary/80 [clip-path:polygon(60%_0,100%_0,40%_100%,0_100%)] -z-10" aria-hidden="true" />
        <m.div {...reveal()} className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-24">
          <h2 className="font-display font-bold tracking-tight text-3xl md:text-5xl leading-[1.1] mb-3 max-w-xl text-balance">
            Cần tư vấn chọn không gian?
          </h2>
          <p className="font-display font-bold text-2xl md:text-3xl text-primary mb-8">
            Gọi ngay: <a href="tel:19003384" className="underline-offset-4 hover:underline">1900 3384</a>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => openTourModal()} size="lg" className="rounded-sm px-8 uppercase tracking-wide">
              <FiCalendar aria-hidden="true" /> Đặt lịch tham quan
            </Button>
            <Button
              onClick={() => handleBookingRedirect()}
              size="lg"
              variant="outline"
              className="rounded-sm px-8 uppercase tracking-wide bg-transparent border-white/40 text-white hover:bg-white hover:text-slate-950 hover:border-white"
            >
              Đặt chỗ ngay
            </Button>
          </div>
        </m.div>
      </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-card border-t-4 border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-2 md:grid-cols-12 gap-10">
          <div className="col-span-2 md:col-span-4">
            <Logo iconClassName="h-8 w-8" textClassName="text-2xl font-display font-bold tracking-tight text-foreground" />
            <p className="text-muted-foreground mt-4 leading-relaxed max-w-sm">
              Nền tảng đặt chỗ và quản lý không gian làm việc chung. Đơn giản hóa vận hành, tối ưu trải nghiệm.
            </p>
            <ul className="mt-6 space-y-2 text-muted-foreground">
              <li><a className="hover:text-primary transition-colors" href="tel:19003384">1900 3384</a></li>
              <li><a className="hover:text-primary transition-colors" href="mailto:hello@cospace.vn">hello@cospace.vn</a></li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1 md:col-span-3">
            <h2 className="font-display font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Không gian</h2>
            <ul className="space-y-3 text-muted-foreground">
              {workspaceTypes.map(wt => (
                <li key={wt.workspaceTypeId}>
                  <a className="hover:text-primary transition-colors" href="#services">{wt.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1 md:col-span-5">
            <h2 className="font-display font-bold text-foreground mb-4 text-sm uppercase tracking-wider">Giờ mở cửa</h2>
            <ul className="space-y-3">
              {displayBranches.slice(0, 4).map(b => (
                <li key={b.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
                  <a className="text-muted-foreground hover:text-primary transition-colors truncate" href="#locations">{b.name}</a>
                  <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{b.hours ?? "Liên hệ"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 border-t border-border flex flex-col sm:flex-row gap-2 justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CoSpace. Bảo lưu mọi quyền.</p>
          <p>Thiết kế bởi DATN Team.</p>
        </div>
      </footer>

      {/* ── MODALS ── */}
      {isTourModalOpen && (
        <Dialog onClose={closeTourModal} labelledBy="tour-dialog-title" className="max-w-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <CloseButton onClick={closeTourModal} className="bg-muted text-muted-foreground hover:text-foreground" />
          <Eyebrow>Tham quan miễn phí</Eyebrow>
          <h2 id="tour-dialog-title" className="text-2xl font-display font-bold text-foreground mb-1 pr-12">Đặt lịch tham quan</h2>
          <p className="text-muted-foreground mb-6">Ghé thăm trực tiếp và trải nghiệm không gian trước khi đặt chỗ.</p>

          {submitted ? (
            <div className="py-6 text-center" role="status" aria-live="polite">
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-5">
                <FiCheck className="w-8 h-8" aria-hidden="true" />
              </div>
              <h3 className="font-display font-bold text-foreground text-xl mb-2">Đã ghi nhận lịch hẹn</h3>
              <p className="text-muted-foreground mb-6">Nhân viên CoSpace sẽ liên hệ với bạn trong 15 phút tới để xác nhận.</p>
              <Button onClick={closeTourModal} variant="outline" className="w-full rounded-sm">
                Đóng
              </Button>
            </div>
          ) : (
            <form onSubmit={handleTourSubmit} className="space-y-4">
              <div>
                <label htmlFor="tour-name" className={labelClass}>Họ và tên <span className="text-destructive" aria-hidden="true">*</span></label>
                <input
                  id="tour-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  value={tourForm.name}
                  onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="tour-phone" className={labelClass}>Số điện thoại <span className="text-destructive" aria-hidden="true">*</span></label>
                <input
                  id="tour-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0912 345 678"
                  pattern="0\d{3} \d{3} \d{3,4}"
                  title="Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0"
                  value={tourForm.phone}
                  onChange={handlePhoneChange}
                  className={`${inputClass} tabular-nums`}
                  required
                />
              </div>
              <div>
                <label htmlFor="tour-branch" className={labelClass}>Chi nhánh</label>
                <div className="relative">
                  <select
                    id="tour-branch"
                    value={tourForm.branchId}
                    onChange={(e) => setTourForm({ ...tourForm, branchId: e.target.value })}
                    className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                  >
                    {displayBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tour-date" className={labelClass}>Ngày <span className="text-destructive" aria-hidden="true">*</span></label>
                  <input
                    id="tour-date"
                    type="date"
                    min={todayIso}
                    value={tourForm.date}
                    onChange={(e) => setTourForm({ ...tourForm, date: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="tour-time" className={labelClass}>Khung giờ</label>
                  <div className="relative">
                    <select
                      id="tour-time"
                      value={tourForm.time}
                      onChange={(e) => setTourForm({ ...tourForm, time: e.target.value })}
                      className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                    >
                      {tourTimeSlots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
                  </div>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full rounded-sm mt-2 uppercase tracking-wide">
                Xác nhận lịch hẹn
              </Button>
            </form>
          )}
        </Dialog>
      )}

      {selectedBranchForDetail && (
        <Dialog
          onClose={() => setSelectedBranchForDetail(null)}
          labelledBy="branch-dialog-title"
          className="max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <CloseButton
            onClick={() => setSelectedBranchForDetail(null)}
            className="bg-slate-950/60 text-white backdrop-blur-sm hover:bg-slate-950/80"
          />
          <div className="aspect-[16/7] w-full shrink-0 bg-muted">
            <img
              src={withUnsplashSize(selectedBranchForDetail.image, 1000, 438)}
              alt={`Không gian chi nhánh ${selectedBranchForDetail.name}`}
              width={1000}
              height={438}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
            <Eyebrow>{selectedBranchForDetail.tag}</Eyebrow>
            <h2 id="branch-dialog-title" className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
              {selectedBranchForDetail.name}
            </h2>
            <p className="text-muted-foreground mb-6 flex items-start gap-2">
              <FiMapPin className="text-primary mt-1 shrink-0" aria-hidden="true" /> {selectedBranchForDetail.address}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {selectedBranchForDetail.features.map((feat) => (
                <li key={feat.text} className="flex items-center gap-3 text-sm text-foreground bg-muted/60 px-4 py-3">
                  <FiCheck className="text-primary shrink-0" aria-hidden="true" />
                  <span>{feat.text}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => { handleBookingRedirect(selectedBranchForDetail.exploreBranchId); setSelectedBranchForDetail(null); }}
                size="lg"
                className="flex-1 rounded-sm uppercase tracking-wide"
              >
                Xem sơ đồ & đặt chỗ
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => { const id = selectedBranchForDetail.id; setSelectedBranchForDetail(null); openTourModal(id); }}
                className="flex-1 rounded-sm uppercase tracking-wide"
              >
                Đặt lịch tham quan
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
    </MotionConfig>
    </LazyMotion>
  );
};

export default LandingPage;
