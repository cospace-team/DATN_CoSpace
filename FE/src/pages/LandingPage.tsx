import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import PublicNavbar from "../components/PublicNavbar";
import { Logo } from "../components/ui/Logo";
import { 
  FiArrowRight, 
  FiX,
  FiMapPin,
  FiClock,
  FiCheck
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

const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const [activeCategory, setActiveCategory] = useState<"all" | "office" | "meeting">("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("branch-1");
  
  // Modals state
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [selectedBranchForDetail, setSelectedBranchForDetail] = useState<BranchCard | null>(null);
  const [tourForm, setTourForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: "",
    branchId: "branch-1",
    date: "",
    time: "09:00 - 10:00",
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (routerLocation.pathname === "/locations" || routerLocation.hash === "#locations") {
      setTimeout(() => {
        document.getElementById("locations")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [routerLocation]);

  const services: ServiceCard[] = [
    {
      id: "srv-1",
      title: "Văn phòng ảo",
      category: "office",
      price: "Từ 875k/tháng",
      description: "Địa chỉ kinh doanh đắc địa trung tâm Q.1 & Q.3, kèm dịch vụ lễ tân chuyên nghiệp.",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800",
      features: ["Đăng ký kinh doanh hợp pháp", "Tiếp nhận & chuyển phát thư từ 24/7", "Lễ tân chào đón khách hàng"]
    },
    {
      id: "srv-2",
      title: "Văn phòng riêng",
      category: "office",
      tag: "Phổ biến",
      description: "Phòng làm việc riêng tư từ 4 - 30 chỗ, trang bị trọn gói nội thất cao cấp.",
      image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=800",
      features: ["Truy cập khóa từ 24/7", "Miễn phí giờ phòng họp", "Tùy biến layout linh hoạt"]
    },
    {
      id: "srv-3",
      title: "Phòng họp thông minh",
      category: "meeting",
      price: "Từ 150k/giờ",
      description: "Hệ thống màn hình tương tác, thiết bị Zoom/Teams Meeting hiện đại.",
      image: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800",
      features: ["Smart TV 4K & Bảng tương tác", "Cáp kết nối & Wifi 6 tốc độ cao", "Phục vụ trà & cà phê cao cấp"]
    },
    {
      id: "srv-4",
      title: "Ghế ngồi linh hoạt",
      category: "office",
      tag: "Linh hoạt",
      price: "Từ 80k/ngày",
      description: "Chỗ ngồi với không gian mở ngập tràn ánh sáng tự nhiên cho freelancer.",
      image: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&q=80&w=800",
      features: ["Không gian làm việc thoải mái", "Nguồn điện & Internet cáp quang", "Giao lưu kết nối cộng đồng"]
    }
  ];

  const branches: BranchCard[] = [
    {
      id: "branch-1",
      exploreBranchId: "branch-0001",
      name: "CoSpace Nam Kỳ Khởi Nghĩa",
      tag: "Quận 1",
      address: "63A Nam Kỳ Khởi Nghĩa, Bến Thành, Q.1",
      description: "Nằm ở vị trí trung tâm tài chính sầm uất nhất thành phố. Tầm nhìn bao quát toàn cảnh Sài Gòn.",
      badges: ["Premium", "View Đẹp"],
      image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200",
      features: [{ text: "Vị trí đắc địa Quận 1" }, { text: "Khu vực ẩm thực" }]
    },
    {
      id: "branch-2",
      exploreBranchId: "branch-0002",
      name: "CoSpace Điện Biên Phủ",
      tag: "Quận 3",
      address: "222 Điện Biên Phủ, Võ Thị Sáu, Q.3",
      description: "Không gian biệt thự cổ kiến trúc Pháp hòa quyện cây xanh ngập tràn, cảm hứng sáng tạo.",
      badges: ["Khuôn viên xanh", "Yên tĩnh"],
      image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200",
      features: [{ text: "Biệt thự yên tĩnh" }, { text: "Cộng đồng startup" }]
    },
    {
      id: "branch-3",
      exploreBranchId: "branch-0003",
      name: "CoSpace Hoàng Diệu",
      tag: "Quận 4",
      address: "384 Hoàng Diệu, Phường 6, Q.4",
      description: "Trụ sở sáng tạo hiện đại sát cạnh trung tâm tài chính Quận 1. Chi phí tối ưu.",
      badges: ["Chi phí tối ưu", "Hiện đại"],
      image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=1200",
      features: [{ text: "Cận kề Quận 1" }, { text: "Hội trường lớn" }]
    },
    {
      id: "branch-4",
      exploreBranchId: "branch-0004",
      name: "CoSpace Quang Trung",
      tag: "Đà Nẵng",
      address: "17 Quang Trung, Hải Châu, Đà Nẵng",
      description: "Vị trí đắc địa ven sông Hàn thơ mộng tại trung tâm thành phố Đà Nẵng.",
      badges: ["View Sông Hàn", "Ven biển"],
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200",
      features: [{ text: "Tầm nhìn Sông Hàn" }, { text: "Môi trường xanh" }]
    }
  ];

  const filteredServices = activeCategory === "all" 
    ? services 
    : services.filter(s => s.category === activeCategory);

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

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
        branchId: "branch-1",
        date: "",
        time: "09:00 - 10:00",
      });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-muted/50 text-foreground scroll-smooth font-sans selection:bg-blue-100 selection:text-blue-900">
      <PublicNavbar />

      {/* ── Hero Section (Minimalist Bento) ── */}
      <section className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Hero Copy - Bento Box */}
          <div className="lg:col-span-8 bg-card rounded-[2rem] p-10 md:p-16 border border-border shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-950/30 rounded-full blur-3xl opacity-50 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-muted/50 border border-border text-foreground text-xs font-medium w-max mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-50 dark:bg-emerald-950/300" />
              <span>Cập nhật CoSpace v4.0</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-foreground mb-6 leading-[1.05]">
              Không gian <br className="hidden md:block"/> làm việc của bạn.
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
              Trải nghiệm quản lý văn phòng tinh tế, tối giản. Mọi thứ bạn cần đều nằm trong một lưới giao diện hoàn hảo.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => handleBookingRedirect()}
                className="bg-slate-900 hover:bg-secondary text-white px-8 py-6 rounded-full font-medium transition-all shadow-sm flex items-center gap-2"
              >
                Khám phá ngay
                <FiArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => openTourModal()}
                variant="outline" 
                className="bg-card border border-border text-foreground hover:bg-muted/50 px-8 py-6 rounded-full font-medium transition-all"
              >
                Tham quan
              </Button>
            </div>
          </div>

          {/* Right Side Stack - Bento Boxes */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card rounded-[2rem] p-8 border border-border shadow-sm flex-1 flex flex-col justify-center relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-medium text-muted-foreground mb-2">Được tin dùng bởi</p>
                <p className="text-5xl font-semibold tracking-tight text-foreground">200+</p>
                <p className="text-sm text-muted-foreground mt-1">Startups & Doanh nghiệp</p>
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-amber-50 dark:bg-amber-950/30 rounded-full blur-2xl group-hover:scale-110 transition-transform" />
            </div>
            
            <div className="bg-card rounded-[2rem] border border-border shadow-sm flex-1 overflow-hidden relative group">
              <img 
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800" 
                alt="Workspace" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <p className="font-medium">CoSpace Nam Kỳ Khởi Nghĩa</p>
                <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
                  <FiMapPin /> Quận 1, TP. HCM
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-semibold tracking-tight mb-4 text-foreground">Hệ sinh thái thông minh</h2>
          <p className="text-muted-foreground text-lg">Thiết kế dạng module giúp bạn dễ dàng theo dõi và quản lý toàn bộ trải nghiệm làm việc.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(280px,auto)]">
          {/* Card 1: Map (Spans 2 cols) */}
          <div className="md:col-span-2 bg-card rounded-[2rem] p-8 md:p-10 border border-border shadow-sm flex flex-col justify-between group overflow-hidden relative">
            <div className="relative z-10 max-w-md">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <FiMapPin size={24} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Sơ Đồ Tương Tác 2D</h3>
              <p className="text-muted-foreground">
                Lựa chọn chính xác vị trí ngồi yêu thích thông qua giao diện sơ đồ mặt bằng trực quan, cập nhật trạng thái thời gian thực.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 w-2/3 h-48 translate-x-10 translate-y-10 rounded-tl-3xl bg-muted/50 border border-border shadow-lg p-4 group-hover:-translate-y-4 transition-transform duration-500">
              <div className="flex gap-2">
                <div className="w-16 h-16 rounded-xl bg-emerald-100 border border-emerald-200 dark:border-emerald-900/50" />
                <div className="w-16 h-16 rounded-xl bg-red-100 border border-red-200 dark:border-red-900/50" />
                <div className="w-16 h-16 rounded-xl bg-emerald-100 border border-emerald-200 dark:border-emerald-900/50" />
              </div>
            </div>
          </div>

          {/* Card 2: Speed */}
          <div className="bg-slate-900 text-white rounded-[2rem] p-8 border border-slate-800 shadow-sm flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 dark:bg-emerald-950/300/20 blur-3xl rounded-full" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-card/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <FiClock size={24} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Đặt chỗ siêu tốc</h3>
              <p className="text-slate-400">
                Quy trình thanh toán một chạm thông qua ví MoMo. Đơn giản, an toàn và tức thời.
              </p>
            </div>
          </div>

          {/* Card 3: Check-in */}
          <div className="bg-card rounded-[2rem] p-8 border border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3">QR Check-in</h3>
              <p className="text-muted-foreground">Mở khóa không gian làm việc của bạn chỉ với một lần quét mã tại cửa.</p>
            </div>
          </div>

          {/* Card 4: Networking (Spans 2 cols) */}
          <div className="md:col-span-2 bg-blue-600 text-white rounded-[2rem] p-8 md:p-10 border border-blue-500 shadow-sm flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-card/10 blur-3xl rounded-full group-hover:scale-125 transition-transform duration-700" />
            <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center h-full">
              <div className="max-w-sm">
                <h3 className="text-3xl font-semibold mb-4">Cộng đồng Startup</h3>
                <p className="text-blue-100 text-lg">
                  Tham gia hệ sinh thái kết nối, gặp gỡ nhà đầu tư và đối tác ngay tại không gian CoSpace.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <span className="bg-card/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium border border-white/20">Networking Events</span>
                <span className="bg-card/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium border border-white/20">Pitching Sessions</span>
                <span className="bg-card/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium border border-white/20">Skill Workshops</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Catalog ── */}
      <section id="services" className="py-20 px-6 max-w-7xl mx-auto border-t border-border mt-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3">Dịch vụ</h2>
            <p className="text-muted-foreground text-lg">Giải pháp không gian linh hoạt cho mọi nhu cầu.</p>
          </div>

          <div className="flex gap-2 bg-muted p-1.5 rounded-full overflow-x-auto">
            {["all", "office", "meeting"].map((cat) => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all ${
                  activeCategory === cat 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === "all" ? "Tất cả" : cat === "office" ? "Văn phòng" : "Phòng họp"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {service.tag && (
                  <span className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                    {service.tag}
                  </span>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
                </div>
                {service.price && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium mb-4">{service.price}</p>
                )}
                <p className="text-muted-foreground text-sm mb-6 flex-1">{service.description}</p>
                
                <div className="space-y-3 mb-6">
                  {service.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <FiCheck className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => handleBookingRedirect()}
                  className="w-full bg-muted/50 hover:bg-muted text-foreground border border-border rounded-xl py-5 font-medium transition-colors"
                >
                  Đặt chỗ
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Locations Hub ── */}
      <section id="locations" className="py-20 px-6 max-w-7xl mx-auto border-t border-border">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-3">Hệ thống Chi nhánh</h2>
          <p className="text-muted-foreground text-lg">Vị trí đắc địa tại các trung tâm kinh tế hàng đầu.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <div 
              key={branch.id} 
              className={`flex flex-col sm:flex-row gap-6 p-6 rounded-3xl border transition-all cursor-pointer ${
                selectedBranchId === branch.id 
                  ? "bg-card border-blue-200 dark:border-blue-900/50 shadow-md ring-1 ring-blue-100" 
                  : "bg-card border-border shadow-sm hover:border-border/80"
              }`}
              onClick={() => setSelectedBranchId(branch.id)}
            >
              <div className="sm:w-2/5 aspect-[4/3] sm:aspect-auto rounded-2xl overflow-hidden relative shrink-0">
                <img src={branch.image} alt={branch.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3">
                  <span className="bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-foreground shadow-sm">
                    {branch.tag}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">{branch.name}</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-2">{branch.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {branch.badges.map((badge, idx) => (
                    <span key={idx} className="bg-muted/50 text-muted-foreground border border-border text-xs font-medium px-2.5 py-1 rounded-md">
                      {badge}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 mt-auto">
                  <Button 
                    onClick={(e) => { e.stopPropagation(); setSelectedBranchForDetail(branch); }}
                    variant="outline"
                    className="flex-1 bg-card border border-border rounded-xl text-sm font-medium text-foreground"
                  >
                    Chi tiết
                  </Button>
                  <Button 
                    onClick={(e) => { e.stopPropagation(); handleBookingRedirect(branch.exploreBranchId); }}
                    className="flex-1 bg-slate-900 hover:bg-secondary text-white rounded-xl text-sm font-medium"
                  >
                    Đặt chỗ
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Call to Action CTA ── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <div className="bg-slate-900 rounded-[3rem] p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200')] opacity-10 object-cover" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">Trải nghiệm phong cách làm việc mới</h2>
            <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
              Đội ngũ tư vấn CoSpace sẵn sàng lắng nghe và đưa ra giải pháp không gian linh hoạt phù hợp với ngân sách của bạn.
            </p>
            <Button 
              onClick={() => openTourModal()}
              className="bg-card text-foreground hover:bg-muted/50 px-8 py-7 rounded-full font-medium text-base shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Đặt lịch tham quan miễn phí
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-card border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <Logo iconClassName="h-8 w-8 text-foreground" textClassName="text-xl font-semibold tracking-tight text-foreground" />
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-xs">
              Hệ thống quản lý không gian làm việc tối giản, tập trung vào hiệu suất.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-foreground mb-4">Giải pháp</h5>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a className="hover:text-foreground transition-colors" href="#services">Văn phòng ảo</a></li>
              <li><a className="hover:text-foreground transition-colors" href="#services">Văn phòng riêng</a></li>
              <li><a className="hover:text-foreground transition-colors" href="#services">Ghế ngồi linh hoạt</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-foreground mb-4">Chi nhánh</h5>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a className="hover:text-foreground transition-colors" href="#locations">Quận 1, TP. HCM</a></li>
              <li><a className="hover:text-foreground transition-colors" href="#locations">Quận 3, TP. HCM</a></li>
              <li><a className="hover:text-foreground transition-colors" href="#locations">Đà Nẵng</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-foreground mb-4">Liên hệ</h5>
            <p className="text-sm text-muted-foreground mb-2">1900 3384</p>
            <p className="text-sm text-muted-foreground">hello@cospace.vn</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-100 flex justify-between items-center text-sm text-slate-400">
          <p>© 2026 CoSpace Bento Edition.</p>
          <p>Made with minimal aesthetics.</p>
        </div>
      </footer>

      {/* ── MODALS (Adapted to Bento Style) ── */}
      {isTourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-md p-8 rounded-[2rem] shadow-2xl animate-scale-in relative border border-slate-100">
            <button
              onClick={() => setIsTourModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-muted text-muted-foreground hover:bg-slate-200 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-semibold text-foreground mb-2">Đặt lịch tham quan</h3>
            <p className="text-sm text-muted-foreground mb-6">Điền thông tin để trải nghiệm không gian CoSpace.</p>
            
            {submitted ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheck className="w-8 h-8" />
                </div>
                <h4 className="font-semibold text-foreground text-xl mb-2">Đăng ký thành công</h4>
                <p className="text-muted-foreground text-sm mb-6">Chúng tôi sẽ liên hệ trong 15 phút.</p>
                <Button onClick={() => { setIsTourModalOpen(false); setSubmitted(false); }} className="w-full rounded-full">
                  Hoàn tất
                </Button>
              </div>
            ) : (
              <form onSubmit={handleTourSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Họ và tên"
                  value={tourForm.name}
                  onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })}
                  className="w-full bg-muted/50 border border-border p-4 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
                <input
                  type="tel"
                  placeholder="Số điện thoại"
                  value={tourForm.phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-muted/50 border border-border p-4 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
                <select
                  value={tourForm.branchId}
                  onChange={(e) => setTourForm({ ...tourForm, branchId: e.target.value })}
                  className="w-full bg-muted/50 border border-border p-4 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
                >
                  <option value="branch-1">Quận 1 — Nam Kỳ Khởi Nghĩa</option>
                  <option value="branch-2">Quận 3 — Điện Biên Phủ</option>
                </select>
                <Button type="submit" className="w-full rounded-full mt-4 py-6">
                  Xác nhận lịch hẹn
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {selectedBranchForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-2xl overflow-hidden rounded-[2.5rem] shadow-2xl animate-scale-in relative">
            <button
              onClick={() => setSelectedBranchForDetail(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-card/50 backdrop-blur-md text-foreground hover:bg-card transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
            <div className="h-64 w-full relative">
              <img src={selectedBranchForDetail.image} alt={selectedBranchForDetail.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-8">
              <span className="bg-muted text-foreground text-xs font-medium px-3 py-1 rounded-full mb-3 inline-block">
                {selectedBranchForDetail.tag}
              </span>
              <h3 className="text-3xl font-semibold text-foreground mb-2">{selectedBranchForDetail.name}</h3>
              <p className="text-muted-foreground text-sm mb-6">{selectedBranchForDetail.address}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {selectedBranchForDetail.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl border border-slate-100">
                    <FiCheck className="text-emerald-500" />
                    <span>{feat.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <Button onClick={() => { handleBookingRedirect(selectedBranchForDetail.exploreBranchId); setSelectedBranchForDetail(null); }} className="flex-1 rounded-full py-6">
                  Đặt chỗ ngay
                </Button>
                <Button variant="outline" onClick={() => { openTourModal(selectedBranchForDetail.id); setSelectedBranchForDetail(null); }} className="flex-1 rounded-full py-6">
                  Tham quan
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
