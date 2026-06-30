import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import PublicNavbar from "../components/PublicNavbar";
import { 
  FiMapPin,
  FiCalendar, 
  FiUsers, 
  FiGrid,
  FiLayers,
  FiArrowRight, 
  FiPhone, 
  FiCheckCircle, 
  FiGlobe, 
  FiHeart, 
  FiChevronRight
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

interface BranchLocation {
  id: string;
  name: string;
  address: string;
  description: string;
  image: string;
}

const LandingPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<"all" | "office" | "meeting">("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("branch-1");

  // Parallax effect for floating background blobs
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const blobs = document.querySelectorAll(".blob-parallax");
      const { clientX, clientY } = e;
      const moveX = (clientX - window.innerWidth / 2) / 30;
      const moveY = (clientY - window.innerHeight / 2) / 30;
      
      blobs.forEach((blob) => {
        (blob as HTMLElement).style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const services: ServiceCard[] = [
    {
      id: "srv-1",
      title: "Văn phòng ảo",
      category: "office",
      price: "Từ 875k/tháng",
      description: "Địa chỉ kinh doanh đắc địa, dịch vụ lễ tân chuyên nghiệp.",
      image: "https://lh3.googleusercontent.com/aida/AP1WRLsfapuXkQJExZA7y2zX7PvKgEhQXuXuVMNsGxkABUK9swWkf1PoheexecFsO9_L2eHe6D0hfaB78ihM1YbSY6nAwabGSHndt31j6uv1q4JXCoyWdkUXBvjy7q6mfS91GMqQfHpOtL9kPQ5iNj1tF2zmwPy_HdG7QjuOF9Nj0UuP3GqHagy8KX0n3wpI4oWtROL7Tc4hmRMluvb8CPTKSLEfjSOys4OkuSbdUWMWYQGATs8weBxWA7JdKW8",
      features: ["Vị trí chiến lược", "Dịch vụ chuyển phát thư"]
    },
    {
      id: "srv-2",
      title: "Văn phòng riêng",
      category: "office",
      tag: "Bán chạy",
      description: "Không gian riêng tư, trọn gói tiện ích hiện đại.",
      image: "https://lh3.googleusercontent.com/aida/AP1WRLvMLcJNu8yJtyKm2nZ3ANDPSqM2ZWigjuLd4Pv50XfhCjiSZM4fXLk7fb7Ncl2ndw83z9u84kCXBPptXJd5OExktdzWidMpaOeu_OTascFG0mQn085TbdchUBT31-QGYebrzQ8YK8pHaVNuRAIv9UN4DbvZoXmUEiQ9L_n80KC_6zebvhetNZIs0g2EtJ9GsiXn_sFbE0X-_3UNt3hTp0B_xg81eGbjThXesiOvdiRlQqd0hr0vIZW_Asv6",
      features: ["Truy cập 24/7", "Phòng họp miễn phí"]
    },
    {
      id: "srv-3",
      title: "Phòng họp",
      category: "meeting",
      price: "Từ 150k/giờ",
      description: "Trang bị đầy đủ thiết bị hội họp trực tuyến hiện đại.",
      image: "https://lh3.googleusercontent.com/aida/AP1WRLuPAXhAiAxJDAwIJmQTa2gIBjTs50jPEA99ByYlKCPtY7HsLovRXzmTBTxMJ20vTE9nxfUAHZfMxaZTRtcVZyih8qIaf4CB00cD34LjujstToOEu5L1Raq0mBtsz_93qwtcBbJR2x8UV7exAoaU6wwKldHackkrWGo97PKXpknE7YxRhefLVcmTeVgSMXyund3uPdL7zzGj98OutQk_zOMsNnBQVfGmfwoIwc8AfXBdu8F6-X__f3WMZxwy",
      features: ["Smart TV & Bảng trắng", "Trà & Cà phê miễn phí"]
    },
    {
      id: "srv-4",
      title: "Ghế ngồi linh hoạt",
      category: "office",
      tag: "Phổ biến",
      description: "Giải pháp tối ưu cho freelancer và các nhóm nhỏ.",
      features: ["Chỗ ngồi tự do", "Kết nối cộng đồng"]
    }
  ];

  const branches: BranchLocation[] = [
    {
      id: "branch-1",
      name: "Quận 1 - Trái tim Sài Gòn",
      address: "63A Nam Kỳ Khởi Nghĩa, Quận 1, TP. HCM",
      description: "Nằm ở vị trí trung tâm tài chính sầm uất nhất thành phố, chi nhánh Nam Kỳ Khởi Nghĩa mang lại không gian làm việc chuyên nghiệp, sang trọng cùng tầm nhìn bao quát thành phố.",
      image: "https://lh3.googleusercontent.com/aida/AP1WRLu27IFgc-e2h3wpxZ8b8-NovfuFDZ3UnE181FzEU-8qCQMtBImEja4bhYTNtcLBK65DTcWi01u9rhldf6KsTHQtO3inHng7x08Rq22LGhfSe-aGlSG-exJiCLgg_0Q_oPUMC396rMbf9XDirjjSos2-Kh2T-A1atqT_vDwMd4CdVRdAfNzBVz-4cys66s0uZ-Ofs0D0XpWOODU3DKF8v9mEiFmdB-Bf4f1t-Fk7AzSMDkWNqMVw0rawpS8_"
    },
    {
      id: "branch-2",
      name: "Quận 3 - Khu vực sầm uất",
      address: "222 Điện Biên Phủ, Quận 3, TP. HCM",
      description: "Khu vực biệt thự cổ kính giao thoa cùng nhịp sống hiện đại. Chi nhánh Điện Biên Phủ có khuôn viên nhiều cây xanh, kiến trúc mở ngập tràn ánh sáng tự nhiên giúp kích thích sáng tạo vượt trội.",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
    }
  ];

  const filteredServices = activeCategory === "all" 
    ? services 
    : services.filter(s => s.category === activeCategory);

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  const handleBookingRedirect = () => {
    if (isAuthenticated && user) {
      const defaultRoute =
        user.role === 'admin' ? (user.branchId ? "/branch-admin/dashboard" : "/admin/dashboard")
        : user.role === 'staff' ? "/staff/dashboard"
        : "/customer/explore";
      navigate(defaultRoute);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      <PublicNavbar />

      {/* ── Hero Section ── */}
      <section 
        className="relative min-h-[90vh] flex items-center overflow-hidden pt-20"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--primary) / 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 py-12">
          <div className="space-y-6">
            <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-semibold inline-block">
              Giải pháp văn phòng linh hoạt
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight tracking-tight">
              Nâng Tầm Doanh Nghiệp Với <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Không Gian</span> Hiện Đại
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed">
              Cho dù bạn đang tìm kiếm một bàn làm việc, văn phòng riêng hay văn phòng cả tầng, CoSpace cung cấp đa dạng giải pháp không gian làm việc đáp ứng mọi nhu cầu.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button 
                onClick={handleBookingRedirect}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/25 hover:scale-105 transition-all text-base"
              >
                Đặt chỗ ngay
                <FiArrowRight className="h-5 w-5" />
              </Button>
              <a href="#locations">
                <Button 
                  variant="outline" 
                  className="border-border text-foreground hover:bg-muted px-8 py-6 rounded-xl font-semibold text-base transition-colors"
                >
                  Xem các chi nhánh
                </Button>
              </a>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border-4 border-card">
              <img 
                className="w-full aspect-[4/3] object-cover" 
                alt="CoSpace Modern Co-working Space"
                src="https://lh3.googleusercontent.com/aida/AP1WRLuoL5ZBRA3LFvphV5XnOxW5YbTPXBgRiQYxCc9n_oRl7w2OLdC5-je73XZZIxAEDE7ajYJ-E_phFeYjLnqQeiWJdrgPFM6IpvPzgVjLI8E_U7yJIYHBz77MTqW0LVU5YO9PRQlXnBG26y7Ty7MB0soBFCAPA0d7JLB63QXp0NRgNnwmXGHW4_fIjQ35-nLZehesxN0jRxyAJqBce9wLGSkUDHeknAwlVkWKmEUT5yjW9RgqeoTkSpewJfmI"
              />
            </div>
            {/* Parallax Blobs */}
            <div className="blob-parallax absolute -bottom-8 -right-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 transition-transform duration-300 ease-out" />
            <div className="blob-parallax absolute -top-8 -left-8 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl -z-10 transition-transform duration-300 ease-out" />
          </div>
        </div>
      </section>

      {/* ── Features Grid (Bento Style) ── */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tính năng thông minh</h2>
          <p className="text-muted-foreground text-lg">Công nghệ dẫn đầu trong quản lý vận hành không gian</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Smart Booking */}
          <div className="glass-card p-8 hover:shadow-xl transition-all group border-b-4 border-b-primary flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                <FiCalendar className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Booking</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Hệ thống đặt chỗ thông minh thời gian thực, quản lý lịch trình linh hoạt chỉ với vài cú click chuột.
              </p>
            </div>
            <div className="mt-6 flex items-center text-primary text-xs font-bold gap-1 cursor-pointer hover:underline" onClick={handleBookingRedirect}>
              Trải nghiệm ngay <FiChevronRight />
            </div>
          </div>

          {/* Interactive Floorplan */}
          <div className="glass-card p-8 hover:shadow-xl transition-all group border-b-4 border-b-blue-500 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors duration-300">
                <FiGrid className="w-6 h-6 text-blue-500 group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-3">Interactive Floorplan</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sơ đồ mặt bằng tương tác 2D/3D trực quan giúp bạn chọn vị trí làm việc lý tưởng nhất theo sở thích.
              </p>
            </div>
            <div className="mt-6 flex items-center text-blue-500 text-xs font-bold gap-1 cursor-pointer hover:underline" onClick={handleBookingRedirect}>
              Xem sơ đồ phòng <FiChevronRight />
            </div>
          </div>

          {/* Partner Matching */}
          <div className="glass-card p-8 hover:shadow-xl transition-all group border-b-4 border-b-indigo-500 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-500 transition-colors duration-300">
                <FiUsers className="w-6 h-6 text-indigo-500 group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-bold mb-3">Partner Matching</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kết nối với mạng lưới hơn 200 startups và đối tác chiến lược trong cộng đồng năng động của CoSpace.
              </p>
            </div>
            <div className="mt-6 flex items-center text-indigo-500 text-xs font-bold gap-1 cursor-pointer hover:underline" onClick={() => navigate(isAuthenticated ? "/customer/profile" : "/login")}>
              Tham gia cộng đồng <FiChevronRight />
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section id="services" className="bg-muted/50 py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Khám phá giải pháp</h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                Đa dạng các gói dịch vụ linh hoạt phù hợp cho mọi quy mô doanh nghiệp.
              </p>
            </div>
            <div className="flex bg-card p-1.5 rounded-xl border border-border shadow-sm">
              <button 
                onClick={() => setActiveCategory("all")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setActiveCategory("office")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === "office" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Văn phòng
              </button>
              <button 
                onClick={() => setActiveCategory("meeting")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === "meeting" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Phòng họp
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-border flex flex-col group"
              >
                <div className="relative overflow-hidden h-48 bg-muted">
                  {service.image ? (
                    <img 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      src={service.image} 
                      alt={service.title} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                      <FiLayers className="w-16 h-16" />
                    </div>
                  )}
                  {service.price && (
                    <span className="absolute top-4 right-4 bg-background/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-primary shadow-sm">
                      {service.price}
                    </span>
                  )}
                  {service.tag && (
                    <span className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                      {service.tag}
                    </span>
                  )}
                </div>
                
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{service.title}</h4>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{service.description}</p>
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-foreground">
                          <FiCheckCircle className="text-green-500 w-4 h-4 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    onClick={handleBookingRedirect}
                    variant="outline" 
                    className="w-full justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300"
                  >
                    Đặt chỗ
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Strategic Locations ── */}
      <section id="locations" className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Vị trí chiến lược tại trung tâm thành phố
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tọa lạc ngay các quận trung tâm sầm uất bậc nhất như Quận 1 và Quận 3, giúp doanh nghiệp nâng tầm vị thế thương hiệu và thuận tiện giao dịch thương mại.
            </p>
            
            <div className="space-y-4">
              {branches.map((branch) => (
                <div 
                  key={branch.id}
                  onClick={() => setSelectedBranchId(branch.id)}
                  className={`flex gap-4 p-4 rounded-xl transition-all cursor-pointer border ${
                    selectedBranchId === branch.id 
                      ? "bg-card border-primary shadow-sm" 
                      : "border-transparent hover:bg-muted"
                  }`}
                >
                  <FiMapPin className={`h-6 w-6 shrink-0 mt-1 ${selectedBranchId === branch.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <h5 className={`font-semibold text-sm ${selectedBranchId === branch.id ? "text-primary" : "text-foreground"}`}>
                      {branch.name}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1">{branch.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-7">
            <div className="relative group overflow-hidden rounded-2xl shadow-xl border border-border bg-card">
              <img 
                className="w-full aspect-[16/10] object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
                alt={selectedBranch.name} 
                src={selectedBranch.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 text-white">
                <span className="text-primary-foreground bg-primary px-3 py-1 rounded-full text-xs font-semibold w-max mb-3">
                  Không gian cao cấp
                </span>
                <h4 className="text-xl font-bold">{selectedBranch.name}</h4>
                <p className="text-sm text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                  {selectedBranch.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Community & Networking ── */}
      <section id="community" className="py-20 bg-slate-950 text-white overflow-hidden border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="relative z-10 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
              <img 
                className="w-full aspect-[4/3] object-cover" 
                alt="CoSpace Community and Networking"
                src="https://lh3.googleusercontent.com/aida/AP1WRLvhlVZ5lwYRIN95Xx_LoydizvKvvJ9uTwGP-Okv-qNOK4vespvKyReEwRRaBbSXErMPv6vKVDMi8c1rz7RR1SuaEAmNLRXg4ds4aaJjoSi9vnJ8cGUqiZcYQ_ND3BCc9Xb_rh2RrdqlsRtK8Agw7lUaYbOi9P0uDT-dD2T2ZUyadqslcjAre17BA-VjGkkIudhzdnEauB1gRLjMOmhp-ps1e-13gdeW9xHnWLyeazkd2gRJ7UlQAwj3E0U"
              />
            </div>
            <div className="blob-parallax absolute -top-8 -right-8 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10 transition-transform duration-300 ease-out" />
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <span className="bg-primary/20 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-full text-xs font-semibold inline-block">
                Cộng đồng năng động
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Cộng đồng &amp; Kết nối sôi động
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                Với mạng lưới hơn 200 doanh nghiệp khởi nghiệp và thành viên tài năng, CoSpace đề cao tính kết nối qua các sự kiện networking, hội thảo chuyên sâu và giao lưu hoàn toàn miễn phí.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="text-3xl font-bold">200+</h4>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Startup &amp; Doanh nghiệp</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-3xl font-bold">50+</h4>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Sự kiện / Năm</p>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate(isAuthenticated ? "/customer/profile" : "/login")}
              className="bg-primary hover:bg-primary/95 text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
            >
              Tìm hiểu cộng đồng
            </Button>
          </div>
        </div>
      </section>

      {/* ── Call to Action ── */}
      <section className="py-24 relative overflow-hidden bg-muted/40">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="max-w-4xl mx-auto text-center px-6 space-y-8">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Bắt đầu hành trình phát triển ngay hôm nay
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Liên hệ với chúng tôi để được hỗ trợ tư vấn và lựa chọn giải pháp không gian tối ưu nhất cho doanh nghiệp của bạn.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-3 bg-card border border-border px-6 py-4 rounded-xl shadow-sm">
              <FiPhone className="text-primary text-2xl" />
              <span className="text-xl md:text-2xl font-bold text-foreground">1900 3384</span>
            </div>
            <Button 
              onClick={handleBookingRedirect}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-xl font-bold text-base shadow-xl shadow-primary/20 hover:scale-105 transition-all"
            >
              Nhận báo giá ngay
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-card border-t border-border py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-6 max-w-7xl mx-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/25">
                <FiMapPin className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                CoSpace
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Hệ thống quản lý không gian làm việc thông minh hàng đầu, cung cấp trải nghiệm làm việc chuyên nghiệp, linh hoạt và tiện nghi.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><FiGlobe className="h-5 w-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><FiHeart className="h-5 w-5" /></a>
            </div>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Giải pháp</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#services">Văn phòng ảo</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#services">Văn phòng riêng</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#services">Ghế ngồi linh hoạt</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Thông tin</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#about">Về CoSpace</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#community">Blog &amp; Sự kiện</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Tuyển dụng</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Pháp lý</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Chính sách bảo mật</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Điều khoản sử dụng</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© 2026 CoSpace Management System. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ngôn ngữ:</span>
            <span className="text-xs font-semibold text-foreground">Tiếng Việt</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
