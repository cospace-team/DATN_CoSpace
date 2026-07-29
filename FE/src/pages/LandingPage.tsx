import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMockData } from "../context/MockDataContext";
import { formatVND } from "../utils/formatters";
import { Button } from "../components/ui/button";
import PublicNavbar from "../components/PublicNavbar";
import { Logo } from "../components/ui/Logo";
import { 
  FiArrowRight, 
  FiX,
  FiMapPin,
  FiClock,
  FiCheck,
  FiZap,
  FiUsers,
  FiShield,
  FiPlay
} from "react-icons/fi";

interface ServiceCard {
  id: string;
  title: string;
  category: "office" | "meeting";
  price?: string;
  tag?: string;
  image?: string;
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
  badges: string[];
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
  "https://images.unsplash.com/photo-1556761175-5973dc0f32b7?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1582653291997-079a1c04e5d1?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=1200",
];

const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { branches, workspaceTypes, pricePolicies, workspaces, floors, users } = useMockData();
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [activeCategory, setActiveCategory] = useState<"all" | "office" | "meeting">("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  
  // Modals state
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [selectedBranchForDetail, setSelectedBranchForDetail] = useState<BranchCard | null>(null);
  const [tourForm, setTourForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: "",
    branchId: "",
    date: "",
    time: "09:00 - 10:00",
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Dynamic real data logic
  const displayBranches: BranchCard[] = useMemo(() => {
    return branches.map((b, idx) => {
      const img = defaultBranchImages[idx % defaultBranchImages.length];
      const floorCount = floors.filter(f => f.branch_id === b.id).length;
      const wsCount = workspaces.filter(w => {
        const floor = floors.find(f => f.id === w.floor_id);
        return floor?.branch_id === b.id;
      }).length;

      return {
        id: b.id,
        exploreBranchId: b.id,
        name: b.name,
        tag: b.city || "TP. HCM",
        address: b.address,
        description: `Cơ sở ${b.name} sở hữu không gian thiết kế độc bản. Cung cấp ${floorCount || 1} tầng chức năng với hơn ${wsCount || 10} vị trí làm việc.`,
        badges: [
          b.status === "active" ? "Đang hoạt động" : "Bảo trì",
          `${wsCount || 10}+ Chỗ ngồi`
        ],
        image: img,
        features: [
          { text: `Vị trí trung tâm ${b.city}` },
          { text: `Wifi 6 & Lễ tân 24/7` }
        ],
      };
    });
  }, [branches, floors, workspaces]);

  const displayServices: ServiceCard[] = useMemo(() => {
    return workspaceTypes.map((wt) => {
      const policy = pricePolicies.find(
        (p) => p.workspace_type_id === wt.id && p.is_active
      );
      
      const priceLabel = policy
        ? `Từ ${formatVND(policy.price)}/${policy.duration_unit === 'hour' ? 'giờ' : policy.duration_unit === 'day' ? 'ngày' : 'tháng'}`
        : "Liên hệ báo giá";

      const category = wt.code.includes("meeting") ? "meeting" : "office";
      const isPopular = wt.code === "desk" || wt.code.includes("private");

      const image = serviceImages[wt.code] || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800";
      const features = serviceFeatures[wt.code] || [
        "Không gian hiện đại & chuyên nghiệp",
        "Wifi tốc độ cao 24/7",
        "Miễn phí trà, cà phê & nước uống",
      ];

      return {
        id: wt.id,
        title: wt.name,
        category: category as "office" | "meeting",
        tag: isPopular ? "Phổ biến" : undefined,
        price: priceLabel,
        description: `Giải pháp ${wt.name.toLowerCase()} được tinh chỉnh tối đa cho cá nhân và tổ chức. Sức chứa chuẩn ${wt.capacity_default} người.`,
        image,
        features,
      };
    });
  }, [workspaceTypes, pricePolicies]);

  useEffect(() => {
    if (displayBranches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(displayBranches[0].id);
      setTourForm(prev => ({ ...prev, branchId: displayBranches[0].id }));
    }
  }, [displayBranches, selectedBranchId]);

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

  const selectedBranch = displayBranches.find(b => b.id === selectedBranchId) || displayBranches[0];

  const handleBookingRedirect = (branchExploreId?: string) => {
    if (isAuthenticated && user) {
      const defaultRoute =
        user.role === 'admin' ? (user.branchId ? "/branch-admin/dashboard" : "/admin/dashboard")
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
    setTimeout(() => {
      setIsTourModalOpen(false);
      setSubmitted(false);
      setTourForm({
        name: user?.fullName || "",
        email: user?.email || "",
        phone: "",
        branchId: displayBranches[0]?.id || "",
        date: "",
        time: "09:00 - 10:00",
      });
    }, 4000);
  };

  const activeCustomerCount = useMemo(() => {
    const custs = users.filter((u: { role: string }) => u.role === 'customer').length;
    return custs * 15 + 180;
  }, [users]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 scroll-smooth font-['Inter'] selection:bg-amber-500/30 selection:text-amber-900 dark:selection:text-amber-200 transition-colors duration-500">
      <PublicNavbar />

      {/* ── Hero Section (Pro Max Dark/Light Bento Glassmorphism) ── */}
      <section className="relative pt-36 pb-24 px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-32 w-[32rem] h-[32rem] bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-[32rem] h-[32rem] bg-amber-500/20 dark:bg-amber-500/15 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
          
          {/* Main Hero Copy - Glass Bento */}
          <div className="lg:col-span-8 bg-white/70 dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-10 md:p-16 border border-slate-200/60 dark:border-white/10 shadow-xl dark:shadow-2xl flex flex-col justify-center relative group overflow-hidden transition-all duration-500 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/90 dark:hover:bg-white/[0.07]">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-slate-100/80 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold tracking-wide w-max mb-10">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)] dark:shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
              <span className="uppercase tracking-widest">CoSpace v4.0 Network</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-['Space_Grotesk'] font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.05]">
              Quản Lý & Đặt Chỗ <br className="hidden md:block"/> Không Gian <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400 dark:from-amber-400 dark:to-amber-200">Thông Minh.</span>
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-lg leading-relaxed font-light">
              Mở khóa hệ sinh thái không gian làm việc hiện đại. Dữ liệu đồng bộ realtime với tốc độ vượt trội.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => handleBookingRedirect()}
                className="bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-400 text-white dark:text-slate-900 px-9 py-7 rounded-full font-semibold text-lg transition-all duration-300 shadow-[0_0_24px_rgba(245,158,11,0.3)] dark:shadow-[0_0_24px_rgba(245,158,11,0.4)] hover:shadow-[0_0_32px_rgba(245,158,11,0.4)] dark:hover:shadow-[0_0_32px_rgba(245,158,11,0.6)] flex items-center gap-3 group/btn"
              >
                Khám phá ngay
                <FiArrowRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={() => openTourModal()}
                variant="outline" 
                className="bg-white/50 dark:bg-white/5 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:border-white/30 px-9 py-7 rounded-full font-semibold text-lg transition-all duration-300"
              >
                Trải nghiệm 3D
              </Button>
            </div>
          </div>

          {/* Right Side Stack - Glass Bento (Stats) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/10 shadow-xl dark:shadow-2xl flex-1 flex flex-col justify-center relative overflow-hidden group transition-all duration-500 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/90 dark:hover:bg-white/[0.07]">
              <div className="relative z-10">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3">Mạng lưới tin dùng</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-6xl font-['Space_Grotesk'] font-bold tracking-tight text-slate-900 dark:text-white">{activeCustomerCount}</p>
                  <span className="text-amber-500 text-3xl font-bold">+</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Startups & Doanh nghiệp</p>
              </div>
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-200/50 dark:bg-amber-500/20 rounded-full blur-[64px] group-hover:bg-amber-300/50 dark:group-hover:bg-amber-500/30 transition-colors duration-700" />
            </div>
            
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 shadow-xl dark:shadow-2xl flex-1 overflow-hidden relative group p-2">
              <div className="w-full h-full rounded-[2rem] overflow-hidden relative">
                <img 
                  src={selectedBranch?.image || defaultBranchImages[0]} 
                  alt="Workspace" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-in-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 dark:from-slate-950/90 dark:via-slate-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 text-white right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">Live</span>
                  </div>
                  <p className="font-['Space_Grotesk'] font-bold text-xl">{selectedBranch?.name || "CoSpace Center"}</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-200 dark:text-slate-300 mt-1">
                    <FiMapPin className="text-amber-400" /> <span className="truncate">{selectedBranch?.address || "Hệ thống toàn quốc"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-['Space_Grotesk'] font-bold tracking-tight mb-6 text-slate-900 dark:text-white">Hệ sinh thái <span className="text-amber-600 dark:text-amber-400">công nghệ.</span></h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-light leading-relaxed">Kiến trúc module độc bản giúp bạn kiểm soát hoàn toàn trải nghiệm làm việc bằng những thao tác mượt mà nhất.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Feature 1: Floor Plan (Spans 8 cols) */}
          <div className="lg:col-span-8 bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-slate-200/60 dark:border-white/10 shadow-xl dark:shadow-2xl flex flex-col justify-between group overflow-hidden relative hover:bg-white/90 dark:hover:bg-white/[0.07] transition-colors duration-500 min-h-[400px]">
            <div className="relative z-10 w-full md:w-[50%] lg:w-[45%] pr-4">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                <FiMapPin size={26} />
              </div>
              <h3 className="text-3xl lg:text-4xl font-['Space_Grotesk'] font-bold mb-4 text-slate-900 dark:text-white">Sơ Đồ SVG <br className="hidden md:block"/> Động Tương Tác</h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed font-light">
                Khám phá mặt bằng với thao tác kéo thả mượt mà. Hệ thống tự động đồng bộ trạng thái trống/bận của mỗi vị trí ngồi theo thời gian thực mà không cần tải lại trang.
              </p>
            </div>
            
            {/* Real Floorplan Image */}
            <div className="absolute right-0 bottom-0 w-[70%] md:w-[55%] lg:w-[50%] h-[50%] md:h-[85%] translate-x-4 translate-y-4 md:translate-x-8 md:translate-y-8 rounded-tl-[3rem] overflow-hidden group-hover:-translate-y-2 group-hover:-translate-x-2 md:group-hover:-translate-y-4 md:group-hover:-translate-x-4 transition-all duration-700 ease-out shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.4)] border-t-4 border-l-4 md:border-t-8 md:border-l-8 border-slate-50 dark:border-slate-800">
              <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800" alt="Floor plan map" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
            </div>
          </div>

          {/* Feature 2: MoMo Payment (Spans 4 cols) */}
          <div className="lg:col-span-4 bg-amber-400 dark:bg-amber-500 rounded-[2.5rem] p-8 md:p-10 border border-amber-300 dark:border-amber-400 shadow-xl dark:shadow-2xl flex flex-col justify-between group overflow-hidden relative transition-transform duration-500 hover:-translate-y-2 min-h-[400px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 dark:bg-white/20 blur-[64px] rounded-full pointer-events-none z-0" />
            <div className="absolute -bottom-16 -right-16 w-72 h-72 opacity-60 group-hover:opacity-100 group-hover:-rotate-6 transition-all duration-700 z-0 mix-blend-multiply dark:mix-blend-normal rounded-full overflow-hidden border-8 border-amber-300/50 shadow-2xl">
              <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800" alt="Payment" className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-14 h-14 bg-white/40 dark:bg-white/20 backdrop-blur-md text-slate-900 dark:text-white rounded-2xl flex items-center justify-center mb-8 border border-white/40 dark:border-white/20 shadow-sm">
                <FiZap size={26} />
              </div>
              <h3 className="text-3xl font-['Space_Grotesk'] font-bold mb-4 text-slate-900">Thanh toán siêu tốc 1 chạm</h3>
              <p className="text-amber-950/80 text-lg leading-relaxed mt-auto font-medium max-w-[80%]">
                Hoàn tất đơn đặt chỗ chỉ trong 3 giây qua ví MoMo.
              </p>
            </div>
          </div>

          {/* Feature 3: Security Check-in (Spans 4 cols) */}
          <div className="lg:col-span-4 bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 border border-slate-200/60 dark:border-white/10 shadow-xl dark:shadow-2xl flex flex-col justify-between hover:bg-white/90 dark:hover:bg-white/[0.07] transition-all duration-500 group overflow-hidden relative hover:-translate-y-2 min-h-[400px]">
            <div className="absolute -bottom-12 -right-12 w-64 h-64 opacity-20 group-hover:opacity-60 transition-opacity duration-700 z-0 rounded-full overflow-hidden shadow-2xl">
              <img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=800" alt="QR Code" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
            </div>
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-8 shadow-sm">
                <FiShield size={26} />
              </div>
              <h3 className="text-3xl font-['Space_Grotesk'] font-bold mb-4 text-slate-900 dark:text-white">QR Access Code</h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mt-auto font-light max-w-[90%]">
                Quét mã định danh để tự động check-in và kích hoạt nguồn điện không gian của bạn.
              </p>
            </div>
          </div>

          {/* Feature 4: Community (Spans 8 cols) */}
          <div className="lg:col-span-8 bg-blue-600 rounded-[2.5rem] p-8 md:p-12 border border-blue-500 shadow-xl dark:shadow-2xl flex flex-col justify-between overflow-hidden relative group hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors duration-500 min-h-[400px]">
            <div className="absolute inset-0 z-0">
              <img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=1200" alt="Community" className="w-full h-full object-cover opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-[2s] ease-out mix-blend-luminosity" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700/95 via-blue-700/80 to-transparent" />
            </div>
            <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] bg-white/20 dark:bg-white/10 blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000 ease-out pointer-events-none z-0" />
            <div className="relative z-10 flex flex-col md:flex-row gap-10 justify-between items-start md:items-center h-full">
              <div className="max-w-md">
                <div className="w-14 h-14 bg-white/20 dark:bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center mb-8 border border-white/30 dark:border-white/20 shadow-sm">
                  <FiUsers size={26} />
                </div>
                <h3 className="text-3xl lg:text-4xl font-['Space_Grotesk'] font-bold mb-4 text-white">Cộng đồng Member <br/>với {branches.length} Chi Nhánh</h3>
                <p className="text-blue-100 text-lg leading-relaxed font-light">
                  Mạng lưới {workspaces.length}+ vị trí phủ sóng. Tham gia hệ sinh thái kết nối, gặp gỡ nhà đầu tư và đối tác ngay tại không gian CoSpace.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                {['Networking Events', 'Pitching Sessions', 'Tech Workshops'].map((tag, i) => (
                  <div key={tag} className={`bg-white/10 dark:bg-black/20 backdrop-blur-md px-6 py-4 rounded-2xl font-semibold border border-white/20 dark:border-white/10 text-white flex items-center gap-3 transform transition-transform duration-500 group-hover:translate-x-[-10px] hover:!bg-white/20`} style={{ transitionDelay: `${i * 100}ms` }}>
                    <FiCheck className="text-amber-300 dark:text-amber-400 shrink-0" /> <span className="whitespace-nowrap">{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Catalog (Real Data Sync) ── */}
      <section id="services" className="py-24 px-6 max-w-7xl mx-auto border-t border-slate-200 dark:border-white/10 mt-10 relative">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-200/50 dark:bg-blue-600/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 relative z-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-['Space_Grotesk'] font-bold tracking-tight text-slate-900 dark:text-white mb-4">Danh mục không gian</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg font-light">Giải pháp module hóa đáp ứng mọi quy mô đội ngũ.</p>
          </div>

          <div className="flex gap-2 bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-2 rounded-full overflow-x-auto w-full md:w-auto shrink-0 hide-scrollbar">
            {["all", "office", "meeting"].map((cat) => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={`px-6 py-3 text-sm font-semibold rounded-full transition-all duration-300 whitespace-nowrap ${
                  activeCategory === cat 
                    ? "bg-amber-500 text-white dark:text-slate-900 shadow-[0_0_16px_rgba(245,158,11,0.3)]" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {cat === "all" ? "Khám phá tất cả" : cat === "office" ? "Khu làm việc" : "Không gian họp"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-xl hover:border-slate-300 dark:hover:border-white/20 transition-all duration-500 group flex flex-col hover:-translate-y-2">
              <div className="relative h-60 overflow-hidden bg-slate-100 dark:bg-slate-900 p-2">
                <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative">
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-in-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 dark:from-slate-950 dark:via-slate-950/20 to-transparent opacity-80" />
                  {service.tag && (
                    <span className="absolute top-4 left-4 bg-amber-500/90 backdrop-blur-md text-white dark:text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase shadow-lg">
                      {service.tag}
                    </span>
                  )}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-['Space_Grotesk'] font-bold text-white mb-1">{service.title}</h3>
                    {service.price && (
                      <p className="text-amber-400 font-bold text-lg">{service.price}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col bg-slate-50 dark:bg-white/[0.02]">
                <p className="text-slate-600 dark:text-slate-400 text-base mb-8 flex-1 leading-relaxed font-light">{service.description}</p>
                
                <div className="space-y-4 mb-10">
                  {service.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <FiCheck className="text-emerald-600 dark:text-emerald-400 w-3 h-3" />
                      </div>
                      <span className="leading-snug text-sm">{feat}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => handleBookingRedirect()}
                  className="w-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 rounded-2xl py-6 font-semibold transition-all duration-300"
                >
                  Bắt đầu đặt chỗ
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Locations Hub (Real Data Sync) ── */}
      <section id="locations" className="py-24 px-6 max-w-7xl mx-auto border-t border-slate-200 dark:border-white/10 relative">
        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-semibold tracking-wide w-max mb-6">
            <FiMapPin /> {displayBranches.length} Chi nhánh khả dụng
          </div>
          <h2 className="text-4xl md:text-5xl font-['Space_Grotesk'] font-bold tracking-tight text-slate-900 dark:text-white mb-6">Bản đồ <span className="text-blue-600 dark:text-blue-400">cơ sở.</span></h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-light max-w-2xl mx-auto">Vị trí đắc địa tại các trung tâm kinh tế hàng đầu. Chọn cơ sở để khám phá layout 2D tương tác.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          {displayBranches.map((branch) => (
            <div 
              key={branch.id} 
              className={`flex flex-col sm:flex-row gap-6 p-4 rounded-[2rem] border transition-all duration-300 cursor-pointer group ${
                selectedBranchId === branch.id 
                  ? "bg-white dark:bg-white/10 border-amber-500/50 shadow-[0_0_32px_rgba(245,158,11,0.1)] dark:shadow-[0_0_32px_rgba(245,158,11,0.15)]" 
                  : "bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-white/90 dark:hover:bg-white/[0.07]"
              }`}
              onClick={() => setSelectedBranchId(branch.id)}
            >
              <div className="sm:w-[45%] aspect-[4/3] sm:aspect-auto rounded-3xl overflow-hidden relative shrink-0">
                <img src={branch.image} alt={branch.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] ease-in-out" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="bg-black/50 backdrop-blur-md border border-white/20 dark:border-white/10 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase text-white shadow-sm">
                    {branch.tag}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center py-4 pr-4">
                <h3 className="text-2xl font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white mb-3">{branch.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed line-clamp-2 font-light">{branch.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {branch.badges.map((badge, idx) => (
                    <span key={idx} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg">
                      {badge}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 mt-auto">
                  <Button 
                    onClick={(e) => { e.stopPropagation(); setSelectedBranchForDetail(branch); }}
                    variant="outline"
                    className="flex-1 bg-transparent border border-slate-300 dark:border-white/20 text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-sm font-semibold dark:text-white transition-colors h-12"
                  >
                    Xem chi tiết
                  </Button>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); handleBookingRedirect(branch.exploreBranchId); }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-400 text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-colors h-12"
                  >
                    Booking
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Call to Action CTA (Glassmorphism) ── */}
      <section className="py-32 px-6 max-w-5xl mx-auto relative">
        <div className="absolute inset-0 bg-amber-500/20 dark:bg-amber-500/10 blur-[100px] rounded-full" />
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-['Space_Grotesk'] font-bold tracking-tight mb-8 text-slate-900 dark:text-white">Khởi tạo không gian làm việc <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-200">tương lai.</span></h2>
            <p className="text-slate-600 dark:text-slate-400 text-xl mb-12 max-w-2xl mx-auto font-light">
              Hơn {displayBranches.length} chi nhánh với hệ thống quản lý Pro Max Edition đã sẵn sàng. Trải nghiệm sự khác biệt ngay hôm nay.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={() => handleBookingRedirect()}
                className="bg-amber-500 text-white dark:text-slate-900 hover:bg-amber-600 dark:hover:bg-amber-400 px-10 py-7 rounded-full font-bold text-lg shadow-[0_0_24px_rgba(245,158,11,0.3)] dark:shadow-[0_0_24px_rgba(245,158,11,0.4)] transition-all duration-300"
              >
                Mở ứng dụng Booking
              </Button>
              <Button 
                onClick={() => openTourModal()}
                className="bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-300 dark:border-white/10 px-10 py-7 rounded-full font-bold text-lg transition-all duration-300 flex items-center gap-3 justify-center"
              >
                <FiPlay className="fill-current" /> Đặt lịch tham quan
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5 py-20 relative overflow-hidden transition-colors duration-500">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10">
          <div className="md:col-span-4">
            <Logo iconClassName="h-8 w-8 text-amber-600 dark:text-amber-500" textClassName="text-2xl font-['Space_Grotesk'] font-bold tracking-tight text-slate-900 dark:text-white" />
            <p className="text-base text-slate-600 dark:text-slate-400 mt-6 leading-relaxed max-w-sm font-light">
              Nền tảng quản lý không gian làm việc số thế hệ mới. Đơn giản hóa vận hành, tối ưu hóa trải nghiệm.
            </p>
          </div>
          <div className="md:col-span-3 md:col-start-6">
            <h5 className="font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">Giải pháp</h5>
            <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-light">
              {workspaceTypes.map(wt => (
                <li key={wt.id}>
                  <a className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors" href="#services">{wt.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <h5 className="font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">Chi nhánh</h5>
            <ul className="space-y-4 text-slate-600 dark:text-slate-400 font-light">
              {branches.slice(0, 4).map(b => (
                <li key={b.id}>
                  <a className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors" href="#locations">{b.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <h5 className="font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">Liên hệ</h5>
            <div className="space-y-4 text-slate-600 dark:text-slate-400 font-light">
              <p className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">1900 3384</p>
              <p className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">hello@cospace.vn</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 flex justify-between items-center text-sm text-slate-500 font-light">
          <p>© 2026 CoSpace Pro Max Edition.</p>
          <p>Thiết kế bởi Datn Team.</p>
        </div>
      </footer>

      {/* ── MODALS (Adapted to Bento Style) ── */}
      {isTourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsTourModalOpen(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[2.5rem] shadow-[0_0_64px_rgba(0,0,0,0.15)] dark:shadow-[0_0_64px_rgba(0,0,0,0.5)] animate-scale-in relative border border-slate-200 dark:border-white/10 z-10">
            <button
              onClick={() => setIsTourModalOpen(false)}
              className="absolute top-6 right-6 p-2.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
            <h3 className="text-3xl font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white mb-3">Đặt lịch tham quan</h3>
            <p className="text-base text-slate-600 dark:text-slate-400 mb-8 font-light">Trực tiếp trải nghiệm không gian làm việc số.</p>
            
            {submitted ? (
              <div className="py-10 text-center">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheck className="w-10 h-10" />
                </div>
                <h4 className="font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white text-2xl mb-3">Thành công</h4>
                <p className="text-slate-600 dark:text-slate-400 text-base mb-8 font-light">Cộng sự CoSpace sẽ liên hệ với bạn trong 15 phút tới.</p>
                <Button onClick={() => { setIsTourModalOpen(false); setSubmitted(false); }} className="w-full rounded-2xl py-6 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white border border-slate-300 dark:border-white/10 font-bold">
                  Hoàn tất
                </Button>
              </div>
            ) : (
              <form onSubmit={handleTourSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Họ & Tên</label>
                  <input
                    type="text"
                    placeholder="Nhập họ và tên..."
                    value={tourForm.name}
                    onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="09xx xxx xxx"
                    value={tourForm.phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cơ sở quan tâm</label>
                  <select
                    value={tourForm.branchId}
                    onChange={(e) => setTourForm({ ...tourForm, branchId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 p-4 rounded-xl text-base text-slate-900 dark:text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none"
                  >
                    {displayBranches.map(b => (
                      <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full rounded-2xl mt-4 py-7 bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-400 text-white dark:text-slate-900 font-bold text-lg">
                  Xác nhận lịch hẹn
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedBranchForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedBranchForDetail(null)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl overflow-hidden rounded-[2.5rem] shadow-2xl animate-scale-in relative border border-slate-200 dark:border-white/10 z-10 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setSelectedBranchForDetail(null)}
              className="absolute top-6 right-6 z-20 p-2.5 rounded-full bg-black/30 dark:bg-black/40 backdrop-blur-md text-white hover:bg-black/50 dark:hover:bg-black/60 transition-colors border border-white/20 dark:border-white/10"
            >
              <FiX className="w-5 h-5" />
            </button>
            <div className="h-72 w-full relative shrink-0">
              <img src={selectedBranchForDetail.image} alt={selectedBranchForDetail.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 to-transparent" />
            </div>
            <div className="p-10 -mt-20 relative z-10 flex-1 overflow-y-auto">
              <span className="bg-amber-500 text-white dark:text-slate-900 text-xs font-bold tracking-wider uppercase px-4 py-1.5 rounded-full mb-4 inline-block shadow-lg">
                {selectedBranchForDetail.tag}
              </span>
              <h3 className="text-4xl font-['Space_Grotesk'] font-bold text-slate-900 dark:text-white mb-3">{selectedBranchForDetail.name}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-base mb-8 font-light flex items-center gap-2"><FiMapPin className="text-amber-500 dark:text-amber-400" /> {selectedBranchForDetail.address}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {selectedBranchForDetail.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                    <FiCheck className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span className="font-light">{feat.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => { handleBookingRedirect(selectedBranchForDetail.exploreBranchId); setSelectedBranchForDetail(null); }} className="flex-1 rounded-2xl py-7 bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-400 text-white dark:text-slate-900 font-bold text-lg shadow-[0_0_24px_rgba(245,158,11,0.2)] dark:shadow-[0_0_24px_rgba(245,158,11,0.3)]">
                  Mở Sơ Đồ Trực Tuyến
                </Button>
                <Button variant="outline" onClick={() => { openTourModal(selectedBranchForDetail.id); setSelectedBranchForDetail(null); }} className="flex-1 rounded-2xl py-7 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-900 dark:text-white border-slate-300 dark:border-white/20 font-bold text-lg">
                  Đặt lịch xem phòng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
