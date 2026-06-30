import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import PublicNavbar from "../components/PublicNavbar";
import { 
  FiMapPin, 
  FiCalendar, 
  FiUsers, 
  FiPhone, 
  FiCheckCircle, 
  FiGlobe, 
  FiHeart, 
  FiChevronLeft, 
  FiChevronRight,
  FiSend,
  FiMap,
  FiAward,
  FiMail,
  FiX
} from "react-icons/fi";

interface BranchCard {
  id: string;
  name: string;
  tag: string;
  address: string;
  image: string;
  features: string[];
}

const LocationsPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
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
      name: "Quận 1 - Trái Tim Thành Phố",
      tag: "TRUNG TÂM",
      address: "63A Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkB1q3caQrd-1L76qR-uELGT_zFGIG00--SpVFIU75PM-0b-xJXhI9fHQHPJ1JhU9PawaCir580R_6xgkBRkjKJ0LKMCkn4eVRqVRVig77r5Aa1Hn0jk1xhJElkTOiNeW0y4TpyTMeCV3vQej3x_VAJox06Th6ofOCakIowlOdmWc1fumVL1RfzrOyzSgRUPse17XPvBZLN8j0YDNFtr6TPqpTNFBOi86GU141jdo-O7aBHpVE48M_5NY0BAimNCQeXRDuXbNeiZ5w",
      features: ["Vị trí đắc địa nhất", "Giao thông thuận tiện", "Khu vực sầm uất"]
    },
    {
      id: "branch-2",
      name: "Quận 3 - Không Gian Sáng Tạo",
      tag: "SÁNG TẠO",
      address: "222 Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBagoEuMqV4-6BiWQ5kP0-0hbuYzsNZZ8O6Yem4oXxmEbdTk1ScIsTFGgWgS-oYC2jdulcs7cV7fDPCeEBRSTv4u3G9H151HJRzFX4uW9UQPaGnNkjRF6tXy4Avaue_M9rzLC6iihJLQSF3TAGAkrSai0OEeR3VFvm93IH4_4PMdzekCbQHrn0HKyX9wIcKPH_bFncb0M69AsdRkqiYdlBO1niPlhFBBdTDFKX40cn3xsaKi1P2VY6MpEdbQLAGyJYW_i5b7ynvop5Q",
      features: ["Khu biệt thự yên tĩnh", "Phòng họp hiện đại", "Cộng đồng năng động"]
    },
    {
      id: "branch-3",
      name: "Quận 4 - Kết Nối Đa Chiều",
      tag: "KẾT NỐI",
      address: "384 Hoàng Diệu, Phường 6, Quận 4",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pNef20HZXlPQGDLUTw8uK_8WAxZorT-N6rk0sfSjK3O7hCl4GFeJIpMZBv58OzXV8r3MjMzy1nY8PL_oAO7VXzW6CSArcxGrt4Jq9kzpP1TFxi75vx829Hm939NtC694heTkdG_gBGSr3fzxYQMRk15SvSYiRv7tOgU_bO3nX7b2EGgeVrD0tN-9ezIDykor5HFm6l6aRl58GMvl7qHz0CI8rbRp2mNx_AghWMT8mlGA-yQI2cm_24kvK48AQHmSAI8EGgT5Igqa",
      features: ["Cận kề trung tâm tài chính", "Chi phí tối ưu", "Tòa nhà chuyên nghiệp"]
    },
    {
      id: "branch-4",
      name: "Đà Nẵng - Thành Phố Đáng Sống",
      tag: "MỚI",
      address: "17 Quang Trung, Quận Hải Châu, Đà Nẵng",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAFrwr4AU7yMds9lmlUKVKBODPHIHkJJtNyJc32MvR_TnsTZZtEvpbGTkv8L3LaSNm9JZmjmfw_EOhmycON3gmBPlvhijW2OLeHayc1pNXqGMkBEaYn00Z5FuwC9DU0YvB6169hoE6r5wUGEswr7CGUfioqLApd8SISO6qsb-V2kaCCqWVGJE2BWLpzOQA79kaOWNvVJWLT9ncquUE0fTTZI8mg6jNLOXkolZ0nlhffVzUEvQ1uWnA1zM6OWuAVz-NRY6rm7Bj9tL2P",
      features: ["Tầm nhìn hướng sông Hàn", "Môi trường xanh sạch", "Hỗ trợ startup địa phương"]
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
        <section className="relative h-[600px] min-h-[400px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div 
              className="w-full h-full bg-cover bg-center" 
              style={{ 
                backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCTNC6Z-ScgFg3oay_u69Cq2lhxc34VpswrBeMbMQUIZTAaSzTaMMPURikfk45IO785aUuPAOVm0k-5wdL-gocwklSRAuAHhbmPY26FVDinc3zOMwBT3KMynoioK1JhUL8tBKXMadkd-z9Qm3DAEJMYbed9T0LF3qccdOliy773pMfPDmXVG0qVIUGIkw7UskyMgE5z7G3rSlVMaQVtzPO6zKG9TPdH4h5isSBbHLnpx5EugE-N_yIEZcnCUQQYPNvBJ5wz72oxzTLh')" 
              }}
            />
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
            <div className="max-w-2xl bg-background/80 backdrop-blur-md p-8 md:p-10 rounded-2xl border border-border shadow-2xl">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 text-primary">
                Vị Trí Chiến Lược Cho Doanh Nghiệp Của Bạn
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mb-6 leading-relaxed">
                Tọa lạc ngay tại các trung tâm tài chính và thương mại sầm uất bậc nhất. CoSpace mang đến không gian làm việc chuyên nghiệp, giúp doanh nghiệp nâng tầm vị thế và kết nối không giới hạn.
              </p>
              <div className="flex gap-4">
                <a href="#branches-list">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-5 rounded-xl font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                    Khám phá ngay
                  </Button>
                </a>
                <Button 
                  variant="outline" 
                  onClick={() => setIsTourModalOpen(true)}
                  className="border-primary text-primary hover:bg-primary/5 px-6 py-5 rounded-xl font-semibold transition-all"
                >
                  Liên hệ tư vấn
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Location Cards Grid ── */}
        <section id="branches-list" className="py-20 bg-muted/30 border-y border-border">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-12">
              <div>
                <span className="text-primary font-bold tracking-widest text-xs uppercase">Mạng lưới của chúng tôi</span>
                <h2 className="text-3xl font-bold mt-1">Các Chi Nhánh Tại Việt Nam</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {branches.map((branch, index) => (
                <div 
                  key={branch.id}
                  ref={(el) => (cardRefs.current[index] = el)}
                  className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
                >
                  <div className="relative h-56 overflow-hidden bg-muted">
                    <img 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      src={branch.image} 
                      alt={branch.name}
                    />
                    <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-primary shadow-sm">
                      {branch.tag}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                        {branch.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
                        <FiMapPin className="text-primary shrink-0" />
                        <span>{branch.address}</span>
                      </p>
                      
                      <ul className="space-y-2 mb-6">
                        {branch.features.map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FiCheckCircle className="text-primary w-4.5 h-4.5 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <Button 
                        onClick={() => handleBookingRedirect(branch.id)}
                        className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
                      >
                        Đặt chỗ ngay
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => openTourModal(branch.id)}
                        className="w-full py-2 border-primary text-primary hover:bg-primary/5 transition-all text-xs"
                      >
                        Đặt lịch tham quan
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why Choose Section ── */}
        <section className="py-24 bg-card relative overflow-hidden">
          <div className="absolute -right-24 top-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -left-24 bottom-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-16 space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Tại sao nên chọn vị trí CoSpace?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base">
                Chúng tôi không chỉ cung cấp chỗ ngồi, chúng tôi mang đến một nền tảng để doanh nghiệp phát triển bền vững và hiệu quả.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-muted/40 border border-border hover:translate-y-[-8px] transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                    <FiMap className="text-primary-foreground text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Vị Trí Chiến Lược</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Tọa lạc tại các quận trung tâm nhộn nhịp, thuận tiện cho mọi giao dịch với khách hàng và đối tác, nâng tầm uy tín thương hiệu.
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-muted/40 border border-border hover:translate-y-[-8px] transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                    <FiUsers className="text-primary-foreground text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Kết Nối Cộng Đồng</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Tiếp cận mạng lưới hơn 200 doanh nghiệp startup và tập đoàn lớn, mở ra vô vàn cơ hội hợp tác và phát triển kinh doanh.
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-muted/40 border border-border hover:translate-y-[-8px] transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                    <FiAward className="text-primary-foreground text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Tiện Ích Cao Cấp</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Tận hưởng dịch vụ lễ tân chuyên nghiệp, phòng họp hiện đại, trà cafe miễn phí và không gian thư giãn đẳng cấp quốc tế.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="py-20 max-w-7xl mx-auto px-6">
          <div className="bg-primary rounded-[32px] p-8 md:p-20 relative overflow-hidden text-center text-primary-foreground shadow-2xl">
            <div 
              className="absolute inset-0 opacity-10" 
              style={{ 
                backgroundImage: "radial-gradient(circle, white 2px, transparent 2px)", 
                backgroundSize: "32px 32px" 
              }} 
            />
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                Sẵn Sàng Trải Nghiệm Không Gian Mới?
              </h2>
              <p className="text-primary-foreground/80 text-base md:text-lg">
                Hãy để đội ngũ của chúng tôi dẫn bạn tham quan và tìm ra giải pháp văn phòng phù hợp nhất cho nhu cầu của bạn.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <Button 
                  onClick={() => openTourModal()}
                  className="bg-background text-primary hover:bg-background/90 px-8 py-6 rounded-xl font-bold text-base shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <FiCalendar className="w-5 h-5" />
                  Đặt Lịch Tham Quan
                </Button>
                <a href="tel:19003384" className="w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    className="border-2 border-primary-foreground hover:bg-primary-foreground hover:text-primary text-primary-foreground px-8 py-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 w-full"
                  >
                    <FiPhone className="w-5 h-5" />
                    Liên Hệ Ngay
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

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
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hệ thống quản lý không gian làm việc thông minh và hiện đại cho doanh nghiệp Việt.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><FiGlobe className="h-5 w-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><FiHeart className="h-5 w-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><FiMail className="h-5 w-5" /></a>
            </div>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Dịch vụ</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#services">Văn phòng ảo</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#services">Văn phòng riêng</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#services">Phòng họp</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Sảnh sự kiện</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Kết nối</h5>
            <ul className="space-y-2">
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#about">Về CoSpace</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="/#community">Sự kiện cộng đồng</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Tuyển dụng</a></li>
              <li><a className="text-xs text-muted-foreground hover:text-primary transition-colors" href="#">Liên hệ</a></li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h5 className="font-semibold text-sm">Bản tin</h5>
            <p className="text-xs text-muted-foreground">Đăng ký để nhận thông tin ưu đãi mới nhất.</p>
            <div className="flex gap-2 pt-2">
              <input 
                className="w-full bg-muted px-4 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary text-xs" 
                placeholder="Email của bạn" 
                type="email"
              />
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground p-2 rounded-lg shrink-0">
                <FiSend className="w-4.5 h-4.5" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">© 2026 CoSpace Management System. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a className="hover:text-primary" href="#">Privacy Policy</a>
            <a className="hover:text-primary" href="#">Terms of Service</a>
            <a className="hover:text-primary" href="#">Cookie Policy</a>
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
              <FiCalendar className="w-5 h-5" />
              Đặt Lịch Tham Quan
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Vui lòng điền thông tin bên dưới để đặt lịch tham quan văn phòng CoSpace mong muốn.
            </p>

            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                  <FiCheckCircle className="w-6 h-6" />
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
    </div>
  );
};

export default LocationsPage;
