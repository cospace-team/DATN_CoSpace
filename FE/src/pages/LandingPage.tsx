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
  FiChevronDown,
  FiMessageSquare,
  FiLock,
} from "react-icons/fi";

interface ServiceCard {
  id: string;
  title: string;
  category: "office" | "meeting";
  price: string;
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

// What each type of space offers in the app itself — no amenity the system cannot back up.
const serviceFeatures: Record<string, string[]> = {
  desk: [
    "Chọn đúng bàn trên sơ đồ tầng",
    "Đặt theo giờ, ngày, tuần hoặc tháng",
    "Gọi đồ uống, in ấn ngay trong ứng dụng",
  ],
  meeting_room: [
    "Đặt theo giờ, gia hạn khi họp kéo dài",
    "Thuê thêm máy chiếu, bảng tương tác",
    "Check-in bằng mã QR tại quầy",
  ],
  private_office: [
    "Thuê theo tuần hoặc theo tháng",
    "Một mã check-in cho cả thời gian thuê",
    "Hóa đơn và lịch sử thanh toán trong tài khoản",
  ],
};

// Stock photos, not the branches themselves (branches have no photo field yet).
// The first three appear nowhere else on the page, so a small network shows no repeats.
const defaultBranchImages = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=1200",
];

const IMAGES = {
  hero: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1400",
  community: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=900",
};

const unitLabel: Record<string, string> = { hour: "giờ", day: "ngày", week: "tuần", month: "tháng" };

// The booking flow in order. Each title is the action itself, so the steps carry no numbers.
const bookingSteps = [
  { icon: FiLayout, title: "Chọn chỗ", text: "Lọc chi nhánh theo thành phố và loại không gian, rồi chọn đúng chỗ còn trống trên sơ đồ tầng." },
  { icon: FiCreditCard, title: "Thanh toán", text: "Trả qua MoMo hoặc VietQR. Chỗ được giữ 15 phút trong lúc bạn thanh toán." },
  { icon: FiSmartphone, title: "Check-in", text: "Đưa mã QR của đơn cho lễ tân quét là bắt đầu làm việc." },
  { icon: FiClock, title: "Gia hạn hoặc hủy", text: "Cần thêm giờ thì gia hạn ngay trong ứng dụng. Hủy trước giờ bắt đầu thì biết trước số tiền được hoàn." },
];

const communityFeatures = [
  { icon: FiUsers, text: "Gợi ý thành viên có kỹ năng chung với bạn, kèm mức độ phù hợp." },
  { icon: FiMessageSquare, text: "Đăng bài chia sẻ, hỏi đáp, tìm cộng sự hoặc mời mọi người tham gia sự kiện." },
  { icon: FiLock, text: "Thông tin liên hệ riêng chỉ hiện khi cả hai bên đã đồng ý kết nối." },
];

const faqs = [
  {
    q: "Tôi có thể thuê theo những khung thời gian nào?",
    a: "Bạn có thể đặt chỗ ngắn hạn theo giờ hoặc theo ngày, và thuê dài hạn theo tuần hoặc theo tháng. Giá hiển thị tùy theo chi nhánh và loại không gian.",
  },
  {
    q: "Nếu cần hủy đặt chỗ thì sao?",
    a: "Bạn có thể hủy trong ứng dụng trước giờ bắt đầu. Số tiền hoàn được tính ngay theo chính sách hủy của chi nhánh, sau đó chi nhánh hoàn lại qua chuyển khoản, tiền mặt hoặc voucher. Khi đơn đã đến giờ sử dụng, vui lòng liên hệ quầy lễ tân.",
  },
  {
    q: "Đơn đặt chỗ chưa thanh toán được giữ bao lâu?",
    a: "Chỗ ngồi được giữ trong 15 phút kể từ lúc tạo đơn. Sau thời gian này đơn chưa thanh toán sẽ tự hết hạn để nhường chỗ cho người khác.",
  },
  {
    q: "Tôi có thể gọi thêm dịch vụ khi đang làm việc không?",
    a: "Có. Bạn tự gọi đồ uống, in ấn hay thiết bị trong mục Lịch sử đặt chỗ, hoặc nhờ lễ tân thêm vào đơn. Phần gọi thêm được thanh toán bằng VietQR hoặc tiền mặt trước khi check-out.",
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
  "w-full min-h-[48px] bg-background border border-input px-4 py-3 rounded-sm text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary transition-colors";

const labelClass = "block text-sm font-medium text-foreground mb-1.5";

// Short label above a section title.
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-3 text-sm font-semibold text-primary">{children}</p>
);

const SectionTitle: React.FC<{
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
}> = ({ eyebrow, title, description }) => (
  <div className="max-w-2xl">
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
    <h2 className={`font-display font-bold tracking-tight text-3xl md:text-5xl leading-[1.1] text-balance text-foreground ${description ? "mb-4" : ""}`}>
      {title}
    </h2>
    {description && <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>}
  </div>
);

// Bento spans for the branch grid: the first branch takes a 2x2 block and the next (up to four)
// share the 2x2 block beside it, so a small network leaves no empty cells.
function branchTileSpan(idx: number, count: number): string {
  if (idx === 0) return count === 1 ? "sm:col-span-2 lg:col-span-4 lg:row-span-2" : "sm:col-span-2 lg:row-span-2";
  const beside = Math.min(count - 1, 4);
  if (idx > beside) return "";
  if (beside === 1) return "sm:col-span-2 lg:row-span-2";
  if (beside === 2 || (beside === 3 && idx === 1)) return "lg:row-span-2";
  // An odd tile left alone on the last two-column row at sm width spans that row.
  return beside === 3 && idx === 3 ? "sm:col-span-2 lg:col-span-1" : "";
}

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
  <div role="alert" className="text-center py-14 border border-dashed border-border rounded-lg text-muted-foreground bg-card">
    <p className="mb-4">{message}</p>
    <Button onClick={onRetry} variant="outline" className="rounded-sm">
      <FiRefreshCw aria-hidden="true" /> Thử lại
    </Button>
  </div>
);

const LandingPage: React.FC = () => {
  useSEO({
    title: "Không gian làm việc linh hoạt",
    description: "CoSpace - đặt bàn làm việc, phòng họp và văn phòng riêng theo giờ, ngày, tuần hoặc tháng. Chọn chỗ trên sơ đồ, thanh toán online, check-in bằng mã QR.",
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

  const [selectedBranchForDetail, setSelectedBranchForDetail] = useState<BranchCard | null>(null);

  const displayBranches: BranchCard[] = useMemo(() => {
    const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null);
    return branches.map((b, idx) => {
      const img = defaultBranchImages[idx % defaultBranchImages.length];
      const hours = hhmm(b.openTime) && hhmm(b.closeTime) ? `${hhmm(b.openTime)} - ${hhmm(b.closeTime)}` : null;

      return {
        id: b.id,
        exploreBranchId: b.id,
        name: b.name,
        tag: b.city || "Việt Nam",
        address: b.address,
        description: `Cơ sở ${b.name} tại ${b.address}${hours ? `, mở cửa ${hours} hằng ngày` : ""}.`,
        hours,
        image: img,
        // Only what the branch record backs up: amenities live per workspace, not per branch.
        features: [
          ...(b.city ? [{ text: `Vị trí ${b.city}` }] : []),
          ...(hours ? [{ text: `Mở cửa ${hours}` }] : []),
          { text: "Sơ đồ chỗ ngồi trực tuyến" },
        ],
      };
    });
  }, [branches]);

  const displayServices: ServiceCard[] = useMemo(() => {
    return workspaceTypes.map((wt) => {
      const category = wt.code.includes("meeting") ? "meeting" : "office";

      const image = serviceImages[wt.code] || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800";
      const features = serviceFeatures[wt.code] || [
        "Chọn chỗ trên sơ đồ tầng",
        "Thanh toán online qua MoMo hoặc VietQR",
        "Check-in bằng mã QR tại quầy",
      ];

      return {
        id: wt.workspaceTypeId,
        title: wt.name,
        category: category as "office" | "meeting",
        price: formatVND(wt.price),
        description: `/${unitLabel[wt.unit] || wt.unit} · tối đa ${wt.capacityDefault} người`,
        image,
        features,
      };
    });
  }, [workspaceTypes]);

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

  const categories: { key: "all" | "office" | "meeting"; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "office", label: "Khu làm việc" },
    { key: "meeting", label: "Phòng họp" },
  ];

  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/25 selection:text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-3 focus:rounded-sm focus:bg-primary focus:text-primary-foreground"
      >
        Bỏ qua tới nội dung chính
      </a>
      <PublicNavbar />

      <main id="main-content">
      {/* ── Hero: dark, photo on the left ── */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white pt-28 md:pt-32 pb-20 md:pb-28">
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
            <h1 className="font-display font-bold tracking-tight leading-[1.05] text-4xl sm:text-5xl xl:text-6xl mb-6">
              Làm việc <span className="text-primary whitespace-nowrap">đúng chỗ,</span> đúng lúc.
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 max-w-lg">
              Đặt bàn làm việc, phòng họp hay văn phòng riêng theo giờ, ngày, tuần hoặc tháng.
            </p>
            <Button onClick={() => handleBookingRedirect()} size="lg" className="rounded-sm px-8 group/btn">
              Đặt chỗ ngay
              <FiArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />
            </Button>
          </m.div>
        </div>
      </section>

      {/* ── Branches ── */}
      <section id="locations" className="py-20 md:py-28 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <m.div {...reveal()} className="mb-12">
            <SectionTitle
              title="Tìm CoSpace gần bạn"
              description="Một tài khoản dùng được ở mọi chi nhánh. Chọn một cơ sở để xem giờ mở cửa và đặt chỗ trên sơ đồ."
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
                      className={`bg-muted animate-pulse rounded-lg min-h-[220px] ${branchTileSpan(i, 5)}`}
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
                        className={`group relative overflow-hidden rounded-lg bg-slate-900 text-left min-h-[220px] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary ${branchTileSpan(idx, displayBranches.length)}`}
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
                          <p className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                            <FiMapPin aria-hidden="true" /> {branch.tag}
                          </p>
                          <h3 className={`font-display font-bold text-white mb-2 ${isFeatured ? "text-2xl md:text-3xl" : "text-lg"}`}>
                            {branch.name}
                          </h3>
                          {branch.hours && (
                            <span className="inline-block rounded-full bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 tabular-nums">
                              {branch.hours}
                            </span>
                          )}
                        </div>
                        <span className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true">
                          <FiArrowRight />
                        </span>
                      </m.button>
                    );
                  })}
            </div>
          )}
        </div>
      </section>

      {/* ── How booking works ── */}
      <section id="features" className="py-20 md:py-28 bg-muted/50 border-y border-border scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <m.div {...reveal()} className="mb-12">
            <SectionTitle title="Từ lúc chọn chỗ tới khi ngồi vào bàn" />
          </m.div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {bookingSteps.map((step, idx) => (
              <m.li key={step.title} {...reveal(idx * 0.05)} className="border-t-2 border-primary pt-6">
                <step.icon className="w-6 h-6 text-primary mb-4" aria-hidden="true" />
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
              </m.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Member network ── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <m.div {...reveal()}>
          <SectionTitle
            title="Gặp người làm cùng lĩnh vực"
            description="Mỗi thành viên có hồ sơ nghề nghiệp và kỹ năng, để bạn tìm người hợp tác ngay trong mạng lưới CoSpace."
          />
          <ul className="mt-8 space-y-5">
            {communityFeatures.map((f) => (
              <li key={f.text} className="flex gap-4">
                <f.icon className="w-5 h-5 text-primary shrink-0 mt-1" aria-hidden="true" />
                <p className="text-foreground leading-relaxed">{f.text}</p>
              </li>
            ))}
          </ul>
        </m.div>
        <m.div {...reveal(0.08)}>
          {/* Stock photo: keep alt empty rather than describing it as CoSpace. */}
          <img
            src={withUnsplashSize(IMAGES.community, 900, 720)}
            alt=""
            width={900}
            height={720}
            loading="lazy"
            className="w-full aspect-[5/4] object-cover rounded-lg"
          />
        </m.div>
      </section>

      {/* ── Pricing, with the cost estimator under the cards ── */}
      <section id="services" className="py-20 md:py-28 bg-muted/50 border-y border-border scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <m.div {...reveal()} className="mb-10">
            <SectionTitle
              eyebrow="Bảng giá"
              title="Chọn không gian phù hợp"
              description="Giá khởi điểm theo từng loại không gian. Giá thực tế có thể khác nhau tùy chi nhánh."
            />
          </m.div>

          <div role="group" aria-label="Lọc loại không gian" className="flex gap-2 mb-10 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                aria-pressed={activeCategory === cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`min-h-[44px] px-5 text-sm font-bold rounded-sm cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-lg overflow-hidden" aria-hidden="true">
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
                      className="bg-card border border-border rounded-lg overflow-hidden flex flex-col text-center"
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
                        <div className="absolute inset-0 flex items-center justify-center px-4">
                          <h3 className="font-display font-bold text-xl text-white">{service.title}</h3>
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
                          className="w-full rounded-sm"
                        >
                          Đặt chỗ ngay <FiArrowRight aria-hidden="true" />
                        </Button>
                      </div>
                    </m.article>
                  ))}
              {!isLoading && !publicDataError && filteredServices.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-12">Chưa có không gian nào thuộc nhóm này.</p>
              )}
            </div>
          )}

          {workspaceTypes.length > 0 && (
            <m.form
              {...reveal()}
              aria-labelledby="calculator-title"
              onSubmit={(e) => { e.preventDefault(); handleBookingRedirect(); }}
              className="mt-12 bg-card border border-border rounded-lg p-6 md:p-8"
            >
              <h3 id="calculator-title" className="font-display font-bold text-xl text-foreground mb-1">
                Ước tính chi phí
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Giá tham khảo theo mức khởi điểm, chưa gồm dịch vụ thêm và khuyến mãi.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 lg:gap-6 items-end">
                <div>
                  <label htmlFor="calc-type" className={labelClass}>Loại không gian</label>
                  <div className="relative">
                    <select
                      id="calc-type"
                      value={calcTypeId}
                      onChange={(e) => setCalcTypeId(e.target.value)}
                      className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                    >
                      {workspaceTypes.map((wt) => (
                        <option key={wt.workspaceTypeId} value={wt.workspaceTypeId}>
                          {wt.name} ({formatVND(wt.price)}/{unitLabel[wt.unit] || wt.unit})
                        </option>
                      ))}
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <label htmlFor="calc-qty" className={labelClass}>
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
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div aria-live="polite">
                  <p className="text-xs text-muted-foreground">Chi phí tạm tính</p>
                  <p className="font-display font-bold text-3xl text-primary tabular-nums">
                    {calcTotal !== null ? formatVND(calcTotal) : "-"}
                  </p>
                </div>
                <Button type="submit" size="lg" className="rounded-sm px-8">
                  Đặt chỗ ngay <FiArrowRight aria-hidden="true" />
                </Button>
              </div>
            </m.form>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 md:py-28 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-20">
        <m.div {...reveal()} className="mb-10">
          <SectionTitle title="Câu hỏi thường gặp" />
        </m.div>

        <m.div {...reveal(0.06)} className="max-w-3xl space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className={`border rounded-lg overflow-hidden bg-card transition-colors ${isOpen ? "border-primary" : "border-border"}`}>
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
                    <span className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-colors ${isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
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

      {/* ── Closing call to action ── */}
      <section className="bg-muted/50 border-t border-border">
        <m.div
          {...reveal()}
          className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <h2 className="font-display font-bold tracking-tight text-3xl md:text-4xl leading-[1.1] text-foreground text-balance">
            Xem chỗ còn trống ở các chi nhánh
          </h2>
          <Button onClick={() => handleBookingRedirect()} size="lg" className="rounded-sm px-8 shrink-0 self-start md:self-auto">
            Đặt chỗ ngay <FiArrowRight aria-hidden="true" />
          </Button>
        </m.div>
      </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-card border-t-4 border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-2 md:grid-cols-12 gap-10">
          <div className="col-span-2 md:col-span-4">
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                if (window.location.hash) {
                  window.history.pushState(null, "", window.location.pathname);
                }
              }}
              className="inline-flex items-center group cursor-pointer text-left focus:outline-none hover:opacity-90 transition-opacity"
              title="Cuộn về đầu trang CoSpace"
            >
              <Logo iconClassName="h-8 w-8" textClassName="text-2xl font-display font-bold tracking-tight text-foreground" />
            </button>
            <p className="text-muted-foreground mt-4 leading-relaxed max-w-sm">
              Nền tảng đặt chỗ và quản lý không gian làm việc chung.
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 md:col-span-3">
            <h2 className="font-display font-bold text-foreground mb-4 text-sm">Không gian</h2>
            <ul className="space-y-3 text-muted-foreground">
              {workspaceTypes.map(wt => (
                <li key={wt.workspaceTypeId}>
                  <a className="hover:text-primary transition-colors" href="#services">{wt.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1 md:col-span-5">
            <h2 className="font-display font-bold text-foreground mb-4 text-sm">Giờ mở cửa</h2>
            <ul className="space-y-3">
              {displayBranches.slice(0, 4).map(b => (
                <li key={b.id} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
                  <a className="text-muted-foreground hover:text-primary transition-colors truncate" href="#locations">{b.name}</a>
                  <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{b.hours ?? "Không cố định"}</span>
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
              alt=""
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
                <li key={feat.text} className="flex items-center gap-3 text-sm text-foreground bg-muted/60 rounded-lg px-4 py-3">
                  <FiCheck className="text-primary shrink-0" aria-hidden="true" />
                  <span>{feat.text}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => { handleBookingRedirect(selectedBranchForDetail.exploreBranchId); setSelectedBranchForDetail(null); }}
              size="lg"
              className="w-full rounded-sm"
            >
              Xem sơ đồ & đặt chỗ
            </Button>
          </div>
        </Dialog>
      )}
    </div>
    </MotionConfig>
    </LazyMotion>
  );
};

export default LandingPage;
