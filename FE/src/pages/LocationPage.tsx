import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import PublicNavbar from "../components/PublicNavbar";
import { Logo } from "../components/ui/Logo";
import { 
  FiGlobe, 
  FiHeart, 
  FiMail,
  FiX
} from "react-icons/fi";

interface Feature {
  text: string;
  icon: string;
}

interface BranchCard {
  id: string;
  name: string;
  tag: string;
  address: string;
  description: string;
  badges: string[];
  image: string;
  features: Feature[];
}

const LocationsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [selectedBranchForDetail, setSelectedBranchForDetail] = useState<BranchCard | null>(null);
  const [tourForm, setTourForm] = useState({
    name: user?.fullName || "",
    email: user?.email || "",
    phone: "",
    branchId: "branch-1",
    date: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Intersection Observer for scroll animations
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-10");
        }
      });
    }, observerOptions);
    cardRefs.current.forEach((card) => {
      if (card) {
        card.classList.add("transition-all", "duration-700", "opacity-0", "translate-y-10");
        observer.observe(card);
      }
    });
    return () => { observer.disconnect(); };
  }, []);

  const branches: BranchCard[] = [
    {
      id: "branch-1",
      name: "Chi nhánh Quận 1",
      tag: "TRUNG TÂM QUẬN 1",
      address: "63A Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1",
      description: "63A Nam Kỳ Khởi Nghĩa, Bến Thành. Trái tim tài chính của thành phố.",
      badges: ["Trái tim thành phố", "Sang trọng"],
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBvIBcN1nan22Rc3S3a8yfr1bf2RnqPlvG-lwgYWbWFxKKmuVMYxwaJY3uGTITkBTXlHAGYmBG-0UBxPi_9Q-WK3k7Cga1Vl1jvNkVFeHRxeJLuiiPphsncYxT2Ssu6SeO8BYXzj2YZm8tal1Npj8oOkyXcSnT6-N59-ZYkC9qpwoDLO7EnNXUpUpTyLXvTf_YZtIcjyS7XBwb3hS1ms2jmAtuHT4Q2jISkUv17hP8EJxoSpmyanpqwRRicOr49_DKDUzkhuiaHFIjl",
      features: [
        { text: "Vị trí đắc địa nhất", icon: "verified" },
        { text: "Giao thông thuận tiện", icon: "commute" },
        { text: "Khu vực sầm uất", icon: "coffee" }
      ]
    },
    {
      id: "branch-2",
      name: "Chi nhánh Quận 3",
      tag: "KẾT NỐI QUẬN 3",
      address: "222 Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3",
      description: "222 Điện Biên Phủ, Võ Thị Sáu. Không gian biệt thự cổ kiến trúc Pháp.",
      badges: ["Giao thông thuận tiện", "Yên tĩnh"],
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDqmf-wvL3IcfcRREJJpPNJ5YyacWGeQ0SJc1XL_nOH8c2-9GYk85MD3C4KFkMPkZF3p_pVw9UTfvSfM_acDrjfen9SvxApeuQv_T8lVDrqscyAO6cZHLGmSwRMUd_QrOxxIR3uA4cvqVS9sCwe7Y2TM_PVZ0C3-1tH2AOE35J-QHTppH7ieOiQNjAFqpLSpfunsJh275Ut9tWyhGQWvBR1yDaM8azoQuLG132tUR6-o07dkW5kSrYW9x9vZ1bQ2n0baLg7cpOlTASq",
      features: [
        { text: "Khu biệt thự yên tĩnh", icon: "verified" },
        { text: "Phòng họp hiện đại", icon: "lightbulb" },
        { text: "Cộng đồng năng động", icon: "group" }
      ]
    },
    {
      id: "branch-3",
      name: "Chi nhánh Quận 4",
      tag: "SÁNG TẠO QUẬN 4",
      address: "384 Hoàng Diệu, Phường 6, Quận 4",
      description: "384 Hoàng Diệu, Phường 6. Trụ sở chính sôi động và hiện đại.",
      badges: ["Không gian sáng tạo", "Sôi động"],
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDp7pUAlonebgYsnycl2l08mpfERB5P1-OpjG9wwt06sE81Rq83L53uROocj7Y56PPOqUwi-T7iNHPxfJ53B_jFLmQUhOiLWwKE4_dcP2pkhn7h_fy4LTWJjI1v2QsTGYejLDtJhT423LjZzMCbw3VKdpfvwJ1QDKqz5hHH1FxWVaIiwolpaTJlwQrm0PTvkHhlP2XFOGC3f9Ci48e7HDil4DKnUjGBEgmzXWyFczWYlxJeVQAHakJP4LR3pItWr7KEfoZEj1-4Fgo2",
      features: [
        { text: "Cận kề trung tâm tài chính", icon: "verified" },
        { text: "Chi phí tối ưu", icon: "payments" },
        { text: "Tòa nhà chuyên nghiệp", icon: "apartment" }
      ]
    },
    {
      id: "branch-4",
      name: "Chi nhánh Đà Nẵng",
      tag: "TRUNG TÂM ĐÀ NẴNG",
      address: "17 Quang Trung, Quận Hải Châu, Đà Nẵng",
      description: "17 Quang Trung, Hải Châu. Vị trí đắc địa ven sông Hàn thơ mộng.",
      badges: ["View sông Hàn", "Tiện nghi cao cấp"],
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAeHA8VSRr1HibZ1LdFZNZQzaZOYFAARecp3pQpChRVYfbjkryedf9fFMMlVp2od4V8hH1jQPKvbI7OV0aUUUiX5F6xxNJdvMuELRF-ZulCfAfAFAaCQnV-opgFEQsrw7av3dukHMahgjg_LuaMURogA3kJutKSI6DiOppsuQVIQFWg_s59cW_RdKd_NUpuXaRFP7q1lXi1-yZz1-IDrpOpG3b85ndpOovuNWMTvtWdaYuERt-TR9l139FNQD3G3sqcu3QKSfFa1hGk",
      features: [
        { text: "Tầm nhìn hướng sông Hàn", icon: "verified" },
        { text: "Môi trường xanh sạch", icon: "park" },
        { text: "Hỗ trợ startup địa phương", icon: "rocket_launch" }
      ]
    }
  ];

  const handleBookingRedirect = (branchId?: string) => {
    if (isAuthenticated && user) {
      const defaultRoute =
        user.role === 'admin' ? (user.branchId ? "/branch-admin/dashboard" : "/admin/dashboard")
        : user.role === 'staff' ? "/staff/dashboard"
        : `/customer/explore${branchId ? `?branchId=${branchId}` : ''}`;
      navigate(defaultRoute, { state: { branchId } });
    } else {
      navigate(`/login?redirect=/customer/explore${branchId ? `&branchId=${branchId}` : ''}`, {
        state: { redirect: `/customer/explore`, branchId }
      });
    }
  };

  const openTourModal = (branchId?: string) => {
    if (branchId) {
      setTourForm(prev => ({ ...prev, branchId }));
    }
    setIsTourModalOpen(true);
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
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      <PublicNavbar />

      {/* ── Hero Section ── */}
      <main className="pt-20">
        <section className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center" 
            style={{ 
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAFAhwogOkAXVV46JmdWGmQM0TfHy2ivaHBnGQnp1yhiI6kMHQr36Zk6leoueUmGqUEqub7qz7Tl5wJGJNusC8jw5lug2kr-Caj6yrz6vwyN4YIDML1WdQl28_xb28riOw_ryzST4ZHNuQwD9qbBb8Mx23nX9-3FWDHuvQcwqFcNFgVxaRg9J2MbAzyViF89K3kvxbPWJhELqTocm8b3FWM4ZgrRHh9tEePyL_asu34Mz_Ojnm2cvNBwMgNMcELWfKu-iQiitOsJE7l')" 
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e1b]/60 to-[#0f0e1b]/80 z-10" />
          
          <div className="relative z-20 text-center px-6 max-w-4xl">
            <h1 className="text-white text-4xl md:text-6xl font-black mb-6 leading-tight">
              Địa điểm Chiến lược của Chúng tôi
            </h1>
            <p className="text-white/90 text-lg md:text-xl font-normal leading-relaxed">
              Tọa lạc ngay các quận trung tâm như Quận 1, Quận 3 và Quận 4, các chi nhánh của CoSpace nằm liền kề những khu vực sôi động bậc nhất, giúp doanh nghiệp nâng tầm vị thế và kết nối không giới hạn.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a href="#branches-list">
                <Button className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:translate-y-[-2px] transition-all">
                  Khám phá ngay
                </Button>
              </a>
              <Button 
                onClick={() => setIsTourModalOpen(true)}
                className="bg-white/10 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
              >
                Đặt lịch tham quan
              </Button>
            </div>
          </div>
        </section>

        {/* ── Location Cards Grid ── */}
        <section id="branches-list" className="max-w-[1280px] mx-auto px-6 py-20 w-full">
          <div className="mb-12 text-center">
            <span className="text-primary font-bold tracking-widest uppercase text-sm">Hệ thống mạng lưới</span>
            <h2 className="text-foreground text-3xl font-bold mt-2">Các chi nhánh CoSpace</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {branches.map((branch, index) => (
              <div 
                key={branch.id}
                ref={(el) => (cardRefs.current[index] = el)}
                className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300"
              >
                <div className="h-56 overflow-hidden relative bg-muted">
                  <div className="absolute top-4 left-4 z-10 bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {branch.tag}
                  </div>
                  <img 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    src={branch.image} 
                    alt={branch.name}
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-foreground text-xl font-bold mb-2">{branch.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{branch.description}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {branch.badges.map((badge, idx) => (
                      <span key={idx} className="bg-muted text-primary text-[11px] font-bold px-2 py-1 rounded">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={() => setSelectedBranchForDetail(branch)}
                    className="mt-auto w-full py-3 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why Choose Section ── */}
        <section className="bg-muted/40 py-24 px-6">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-foreground text-3xl md:text-4xl font-bold mb-4">
                Tại sao chọn địa điểm CoSpace?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Chúng tôi không chỉ cung cấp chỗ ngồi, chúng tôi mang đến một hệ sinh thái hỗ trợ tối đa sự phát triển doanh nghiệp.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center p-8 bg-card rounded-2xl shadow-sm hover:translate-y-[-8px] transition-transform duration-300">
                <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl">location_on</span>
                </div>
                <h3 className="text-foreground text-xl font-bold mb-3">Vị trí Chiến lược</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Toàn bộ các chi nhánh đều nằm tại các tuyến đường huyết mạch, trung tâm kinh tế của thành phố, giúp doanh nghiệp dễ dàng giao dịch và tuyển dụng.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-8 bg-card rounded-2xl shadow-sm hover:translate-y-[-8px] transition-transform duration-300">
                <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl">hub</span>
                </div>
                <h3 className="text-foreground text-xl font-bold mb-3">Kết nối Cộng đồng</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Gia nhập mạng lưới hơn 200 startup và doanh nghiệp hàng đầu. Cơ hội networking và tìm kiếm đối tác ngay tại không gian làm việc.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-8 bg-card rounded-2xl shadow-sm hover:translate-y-[-8px] transition-transform duration-300">
                <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl">high_quality</span>
                </div>
                <h3 className="text-foreground text-xl font-bold mb-3">Tiện ích Cao cấp</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Trang bị hiện đại từ phòng họp, khu vực giải trí, quầy bar, đến hệ thống internet tốc độ cao và dịch vụ lễ tân chuyên nghiệp.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="relative py-24 px-6 overflow-hidden">
          {/* Decorative Glowing Orbs in Background */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[300px] h-[300px] bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative max-w-[1100px] mx-auto bg-gradient-to-br from-primary via-[#4F46E5] to-secondary border border-white/10 rounded-[32px] p-10 md:p-20 text-center shadow-2xl overflow-hidden">
            {/* Ambient overlay */}
            <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />
            
            {/* Radial Dot Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-[0.05] mix-blend-overlay pointer-events-none" 
              style={{ 
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", 
                backgroundSize: "24px 24px" 
              }} 
            />

            {/* Glowing Brand Tag */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold mb-8 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Khởi đầu thành công cùng CoSpace
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              Bạn đã sẵn sàng để <br className="hidden sm:inline" />
              <span className="text-yellow-300">nâng cấp không gian làm việc?</span>
            </h2>
            
            <p className="text-white/90 text-sm md:text-base mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              Hãy liên hệ với đội ngũ chuyên gia của chúng tôi để nhận tư vấn và thiết kế giải pháp văn phòng linh hoạt, tối ưu chi phí nhất cho doanh nghiệp của bạn.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button 
                onClick={() => openTourModal()}
                className="w-full sm:w-auto bg-white text-primary hover:bg-white/95 px-8 py-6 rounded-xl font-bold text-base shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">calendar_today</span>
                Đặt lịch tham quan
              </Button>
              
              <a href="tel:19003384" className="w-full sm:w-auto">
                <Button 
                  variant="ghost"
                  className="w-full sm:w-auto border border-white/30 text-white hover:bg-white/10 hover:border-white px-8 py-6 rounded-xl font-bold text-base hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                  Nhận báo giá ngay
                </Button>
              </a>
            </div>

            {/* Credibility / Trust Indicators */}
            <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white/95 text-[18px]">verified</span>
                <span>Hơn 500+ doanh nghiệp đã tin tưởng</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white/95 text-[18px]">support_agent</span>
                <span>Tư vấn giải pháp miễn phí 24/7</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-card border-t border-border py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-6 max-w-7xl mx-auto">
          <div className="space-y-4">
            <Logo iconClassName="h-8 w-8" textClassName="text-lg font-bold tracking-tight" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hệ thống văn phòng chia sẻ hàng đầu Việt Nam, cung cấp giải pháp không gian linh hoạt cho sự phát triển của mọi doanh nghiệp.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                <span className="material-symbols-outlined text-[20px]">public</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </a>
              <a href="tel:19003384" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
                <span className="material-symbols-outlined text-[20px]">call</span>
              </a>
            </div>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Giải pháp</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#services">Văn phòng ảo</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#services">Văn phòng riêng</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#services">Ghế ngồi linh hoạt</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#services">Phòng họp</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Không gian sự kiện</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Chi nhánh</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#branches-list">CoSpace Quận 1</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#branches-list">CoSpace Quận 3</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#branches-list">CoSpace Quận 4</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#branches-list">CoSpace Đà Nẵng</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Kết nối</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#about">Về CoSpace</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Tuyển dụng</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Sự kiện</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Chính sách bảo mật</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© 2026 CoSpace. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a className="hover:text-primary" href="#">Điều khoản sử dụng</a>
            <a className="hover:text-primary" href="#">Chính sách Cookies</a>
          </div>
        </div>
      </footer>

      {/* ── Interactive Tour Modal ── */}
      {isTourModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-card border border-border w-full max-w-md p-6 rounded-2xl shadow-2xl animate-scale-in">
            <button 
              onClick={() => setIsTourModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <FiX className="w-5 h-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-2 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">calendar_today</span>
              Đặt Lịch Tham Quan
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Vui lòng điền thông tin bên dưới để đặt lịch tham quan văn phòng CoSpace mong muốn.
            </p>

            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-green-500 text-[24px]">check_circle</span>
                </div>
                <h4 className="font-bold text-foreground">Đăng ký thành công!</h4>
                <p className="text-xs text-muted-foreground">Chúng tôi sẽ liên hệ xác nhận lịch hẹn trong vòng 15 phút.</p>
              </div>
            ) : (
              <form onSubmit={handleTourSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Họ và tên</label>
                  <input 
                    type="text" 
                    value={tourForm.name}
                    onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })}
                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Nguyễn Văn A" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                  <input 
                    type="email" 
                    value={tourForm.email}
                    onChange={(e) => setTourForm({ ...tourForm, email: e.target.value })}
                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="nguyenvana@gmail.com" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Số điện thoại</label>
                  <input 
                    type="tel" 
                    value={tourForm.phone}
                    onChange={(e) => setTourForm({ ...tourForm, phone: e.target.value })}
                    className="w-full bg-muted border border-border p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="0901234567" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Chi nhánh</label>
                    <select 
                      value={tourForm.branchId}
                      onChange={(e) => setTourForm({ ...tourForm, branchId: e.target.value })}
                      className="w-full bg-muted border border-border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="branch-1">Quận 1</option>
                      <option value="branch-2">Quận 3</option>
                      <option value="branch-3">Quận 4</option>
                      <option value="branch-4">Đà Nẵng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Ngày tham quan</label>
                    <input 
                      type="date" 
                      value={tourForm.date}
                      onChange={(e) => setTourForm({ ...tourForm, date: e.target.value })}
                      className="w-full bg-muted border border-border p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-primary"
                      required 
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold mt-4"
                >
                  Xác nhận đặt lịch
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ── Branch Details Modal ── */}
      {selectedBranchForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative bg-card border border-border w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl animate-scale-in">
            <button 
              onClick={() => setSelectedBranchForDetail(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all"
            >
              <FiX className="w-5 h-5" />
            </button>
            
            <div className="relative h-64 w-full bg-muted">
              <img 
                src={selectedBranchForDetail.image} 
                alt={selectedBranchForDetail.name} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <span className="bg-primary/95 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {selectedBranchForDetail.tag}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold mt-3">
                  {selectedBranchForDetail.name}
                </h3>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Địa chỉ chi nhánh</h4>
                <p className="text-sm text-foreground flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                  {selectedBranchForDetail.address}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tiện ích đi kèm</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedBranchForDetail.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs text-foreground">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0">{feat.icon}</span>
                      <span className="font-semibold">{feat.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button 
                  onClick={() => {
                    handleBookingRedirect(selectedBranchForDetail.id);
                    setSelectedBranchForDetail(null);
                  }}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:scale-[1.01] transition-all"
                >
                  Đặt chỗ ngay
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    openTourModal(selectedBranchForDetail.id);
                    setSelectedBranchForDetail(null);
                  }}
                  className="flex-1 py-3 border-primary text-primary hover:bg-primary/5 font-bold rounded-xl hover:scale-[1.01] transition-all"
                >
                  Đặt lịch tham quan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationsPage;
