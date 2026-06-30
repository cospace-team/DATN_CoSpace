import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiPhone, 
  FiEye, 
  FiEyeOff, 
  FiLoader, 
  FiArrowLeft, 
  FiZap, 
  FiShield, 
  FiMapPin,
  FiX
} from "react-icons/fi";

const LoginPage: React.FC = () => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    verifyEmailCode, 
    resetPasswordForEmail, 
    isLoading, 
    devLoginAs, 
    devLoginAsBranchAdmin 
  } = useAuth();

  const [view, setView] = useState<"login" | "forgot" | "register" | "verify_otp">("login");
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsSubmittingGoogle(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message ? error.message : "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) { 
      setErrorMessage("Vui lòng điền đầy đủ thông tin."); 
      return; 
    }
    if (password !== confirmPassword) { 
      setErrorMessage("Mật khẩu xác nhận không khớp."); 
      return; 
    }
    if (password.length < 8) { 
      setErrorMessage("Mật khẩu phải có ít nhất 8 ký tự."); 
      return; 
    }
    if (!termsAccepted) {
      setErrorMessage("Bạn phải đồng ý với Điều khoản và Điều kiện để tiếp tục.");
      return;
    }
    setErrorMessage(null); 
    setSuccessMessage(null); 
    setIsSubmittingRegister(true);
    try {
      await registerWithEmail(email, password, fullName, confirmPassword, phone);
      setSuccessMessage("Đăng ký thành công! Đang đăng nhập...");
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message ? error.message : "Đăng ký thất bại.");
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otpCode) { 
      setErrorMessage("Vui lòng nhập mã xác nhận."); 
      return; 
    }
    setErrorMessage(null); 
    setSuccessMessage(null); 
    setIsSubmittingOtp(true);
    try {
      await verifyEmailCode(email, otpCode);
      setSuccessMessage("Xác thực thành công!");
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message ? error.message : "Mã xác nhận không hợp lệ hoặc đã hết hạn.");
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { 
      setErrorMessage("Vui lòng nhập email và mật khẩu."); 
      return; 
    }
    setErrorMessage(null); 
    setIsSubmittingEmail(true);
    try {
      await loginWithEmail(email, password);
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message ? error.message : "Đăng nhập thất bại.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { 
      setErrorMessage("Vui lòng nhập email của bạn."); 
      return; 
    }
    setErrorMessage(null); 
    setSuccessMessage(null); 
    setIsSubmittingForgot(true);
    try {
      await resetPasswordForEmail(email);
      setSuccessMessage("Hướng dẫn khôi phục mật khẩu đã được gửi đến email của bạn.");
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message ? error.message : "Không thể gửi yêu cầu.");
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const switchView = (v: "login" | "forgot" | "register" | "verify_otp") => {
    setView(v); 
    setErrorMessage(null); 
    setSuccessMessage(null);
  };

  // Dynamic content configuration based on view state
  const isRegisterView = view === "register";

  const leftPanelContent = {
    bgImage: isRegisterView 
      ? "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAVtB2_C8za3TFo5CPdXHtv9R5a27S_hfJ-e4GoCJ2SNxakyFmMvLJuu0lAAEZ8drB1k1qQBNZZH3m86vBuP0vI2Mgu5cwE22jpR4-Szskve_6sc6QT6Cbbv3Px3hNA8039yvYroOkArEUJ7wzIkBmxhO2zsERoS0_3d2bQfi8MnLHB-T_KAQOqGYRv08XC3vgcNbalMzyyah_2HtTVA5ODImfL37egXqZmrSkRwRh-yGJTRspfM2Ta2uJGKnlzOnYHutQJmSAyUE24')"
      : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDEy9LrJ4k0aCV_Lr27vCrOSfPtfvvIsfHof9I-Q6gjv2EoAqDT-zfWmeQRpFEcw84A20Eu-TXTp0GLzrg9TDWR5-5DA9vZ-z3y_PQMxC0E7gMgQNPm7oqVMgUfw_jo7Hc0O6kUAHz25bFTovX37C4bbd699ku6W_Wm2C3_BJlRLd13jUQ8WhpkXbL5AS2DKXFh1VtOOx3yoKKPQRSGIb59PtTjrwnsMHidsLCaP5W0gS2SPGUiQhUL-odG8TzeXC1LaA2m4yIDf06n')",
    title: isRegisterView 
      ? "Tham gia cộng đồng những người đổi mới"
      : "Giải pháp không gian làm việc tối ưu cho doanh nghiệp.",
    description: isRegisterView
      ? "Hệ sinh thái tối ưu cho các startup, freelancer và doanh nghiệp đang phát triển. Trải nghiệm làm việc chưa từng có."
      : "Hàng ngàn doanh nghiệp đã tin tưởng sử dụng nền tảng của chúng tôi để tối ưu không gian làm việc và tăng trưởng hiệu quả."
  };

  return (
    <div className="flex min-h-screen lg:h-screen lg:max-h-screen w-full flex-col lg:flex-row overflow-hidden bg-background">
      {/* ── Left Column: Visual Brand Section ── */}
      <div className="relative hidden w-full lg:flex lg:w-1/2 xl:w-7/12 flex-col justify-between p-12 overflow-hidden h-full">
        {/* Background Image with Dark Indigo and Brand Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700" 
          style={{ backgroundImage: leftPanelContent.bgImage }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950/95 to-indigo-900/85" />
        
        {/* Brand Logo/Header */}
        <div className="relative z-20 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"></path>
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">CoSpace</span>
        </div>

        {/* Dynamic Value Prop */}
        <div className="relative z-20 mt-auto max-w-lg space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-white">
            {isRegisterView ? (
              <>
                Tham gia cộng đồng <span className="text-indigo-300">những người đổi mới</span>
              </>
            ) : (
              leftPanelContent.title
            )}
          </h1>
          <p className="text-lg text-white/80 font-medium leading-relaxed">
            {leftPanelContent.description}
          </p>
          
          {/* Dynamic Footer stats/avatars */}
          {isRegisterView ? (
            <div className="grid grid-cols-3 gap-8 pt-4">
              <div>
                <div className="text-3xl font-extrabold text-white">25+</div>
                <div className="text-xs text-gray-400 font-medium">Trung tâm toàn cầu</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white">10k+</div>
                <div className="text-xs text-gray-400 font-medium">Thành viên</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white">24/7</div>
                <div className="text-xs text-gray-400 font-medium">Truy cập</div>
              </div>
            </div>
          ) : (
            <div className="mt-10 flex items-center gap-4 pt-4">
              <div className="flex -space-x-3">
                <div className="h-10 w-10 rounded-full border-2 border-primary bg-white overflow-hidden">
                  <img className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQjjGTsi9DxSykN6jXCVhFIyxAvZI_BuWDkEQbKwFKcrelpwMyqM4_blADd9LRq22xMD0B1iGtD4Pg6HguKv_qj_PTHSpVoL5ke1xXy1j_9O1HsI4pe-HSGYj0PmocmP-61TWISx6M96ut3Kl_rrWG63EJ7Fi7t-jTvWX_ree5RSvAWoW_izQmKG7hovtbsmg_LR3J1DWyx_TgpyhHG1AjLQR4eG9-wdKdlK4LBcwECqwtJviT2Nig9esi-wrWgRQUe64wZwxCXefL" alt="User portrait" />
                </div>
                <div className="h-10 w-10 rounded-full border-2 border-primary bg-white overflow-hidden">
                  <img className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsupOKSJbwMvblpxoHKMeyNQrwEICCOj8eeF1OI0wSPQWzLoN1I76m9Lxmb8i3Aq3RsTkP-ytQCu8jwSxfcY44XnWz79AkC0b1isZljxTFGPPdNfLovsPOeeOy1GdmjfuVsxAo4F0NMpo0NMN0CTwsd84RH6jNZnsy9iyFjplm6VUMmiNZmmoqQYGUTfSQ6KwvGabQAcmMixMMTk7_WgasKAcuk-Naa_U95cVs3HQaB72Cqq-LkQ24PXWwpINVJVCyPETRcINJdvb1" alt="User portrait" />
                </div>
                <div className="h-10 w-10 rounded-full border-2 border-primary bg-white overflow-hidden">
                  <img className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8tHGYvERFrf-4AC0ad5q7TLrK7Wb3Ugh6PhfODP3xh-Z0Bxr7Wx-wUGUPdLSwnF4FeHVXYIusJ6MfCn8ZXv9WDU8pZK2gDsEZ_zt9Mbbco9bF7LmjLCxt_xChbp78fLdzK3hJQcOwkw0c-J9M5rKdXZXj_ARA5A76anVa6h96t76dvFwRh6mGg2LrqevVa-PF_HWbcRp4RfsBTYLsjBIS6nUMErKGUjt_RRNiLg4-SNBrdjYaJr63nBNbUlco-wxvULsW-VfphGbJ" alt="User portrait" />
                </div>
              </div>
              <span className="text-sm font-semibold text-white/90">Tham gia cùng hơn 10,000+ thành viên</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Column: Form Panel Section ── */}
      <div className="flex flex-1 flex-col justify-between bg-card px-6 py-8 sm:px-12 lg:w-1/2 xl:w-5/12 items-center min-h-screen lg:min-h-0 lg:h-screen lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-md my-auto space-y-6">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"></path>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">CoSpace</span>
          </div>

          {/* View Headers */}
          <div>
            {view === "forgot" ? (
              <>
                <button 
                  onClick={() => switchView("login")} 
                  className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
                </button>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Khôi phục mật khẩu</h2>
                <p className="mt-2 text-sm text-muted-foreground">Vui lòng nhập email của bạn để nhận liên kết khôi phục.</p>
              </>
            ) : isRegisterView ? (
              <>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Tạo tài khoản mới</h2>
                <p className="mt-2 text-sm text-muted-foreground">Bắt đầu hành trình làm việc chung của bạn ngay hôm nay.</p>
              </>
            ) : view === "verify_otp" ? (
              <>
                <button 
                  onClick={() => switchView("register")} 
                  className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FiArrowLeft className="w-4 h-4" /> Quay lại đăng ký
                </button>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Xác thực OTP</h2>
                <p className="mt-2 text-sm text-muted-foreground">Nhập mã xác nhận 8 chữ số đã được gửi tới email của bạn.</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Chào mừng bạn trở lại</h2>
                <p className="mt-2 text-sm text-muted-foreground">Vui lòng đăng nhập để truy cập tài khoản CoSpace của bạn.</p>
              </>
            )}
          </div>

          {/* Success/Error Alerts */}
          {successMessage && (
            <div className="rounded-xl border border-green-200 bg-green-50/50 dark:bg-green-950/20 px-4 py-3 text-xs text-green-700 dark:text-green-400">
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 px-4 py-3 text-xs text-red-700 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* ── Form Views ── */}
          {view === "forgot" ? (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2" htmlFor="email">Địa chỉ Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <FiMail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email" 
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3.5 pl-11 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-sm"
                    placeholder="ten@congty.com" 
                    required 
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmittingForgot || isLoading} 
                className="w-full py-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
              >
                {isSubmittingForgot && <FiLoader className="w-4 h-4 animate-spin" />}
                {isSubmittingForgot ? "Đang gửi..." : "Gửi liên kết khôi phục"}
              </Button>
            </form>
          ) : isRegisterView ? (
            <div className="space-y-6">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5" htmlFor="fullName">Họ và Tên</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <FiUser className="w-4 h-4" />
                    </span>
                    <input 
                      type="text" 
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3 pl-11 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                      placeholder="Nguyễn Văn A" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-1.5" htmlFor="reg-email">Địa chỉ Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <FiMail className="w-4 h-4" />
                    </span>
                    <input 
                      type="email" 
                      id="reg-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3 pl-11 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                      placeholder="ten@congty.com" 
                      required 
                    />
                  </div>
                </div>

                {/* 2-column grid for passwords */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5" htmlFor="reg-password">Mật khẩu</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <FiLock className="w-4 h-4" />
                      </span>
                      <input 
                        type="password" 
                        id="reg-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3 pl-11 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                        placeholder="••••••••" 
                        required 
                        minLength={8}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5" htmlFor="confirm-password">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <FiLock className="w-4 h-4" />
                      </span>
                      <input 
                        type="password" 
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3 pl-11 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                        placeholder="••••••••" 
                        required 
                        minLength={8}
                      />
                    </div>
                  </div>
                </div>

                {/* Terms agreement checkbox */}
                <div className="flex items-center pt-2">
                  <input 
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded" 
                    id="terms" 
                    name="terms" 
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required 
                  />
                  <label className="ml-2.5 block text-xs text-muted-foreground font-semibold" htmlFor="terms">
                    Tôi đồng ý với <a className="text-primary hover:underline font-bold" href="#">Điều khoản và Điều kiện</a>
                  </label>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmittingRegister || isLoading} 
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmittingRegister && <FiLoader className="w-4 h-4 animate-spin" />}
                  {isSubmittingRegister ? "Đang xử lý..." : "Đăng ký"}
                </Button>
              </form>

              {/* Toggle to Login */}
              <div className="text-center text-sm font-medium text-muted-foreground">
                Đã có tài khoản?
                <button 
                  type="button" 
                  onClick={() => switchView("login")} 
                  className="font-bold text-primary hover:underline ml-1"
                >
                  Đăng nhập
                </button>
              </div>

              {/* Separator */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">HOẶC</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Google signup button */}
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmittingGoogle || isSubmittingRegister || isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingGoogle ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                )}
                <span className="text-sm font-bold">Đăng ký với Google</span>
              </button>
            </div>
          ) : view === "verify_otp" ? (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Mã OTP (8 chữ số)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                    <FiShield className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    pattern="[0-9]*" 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))} 
                    className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3.5 pl-11 text-foreground font-mono tracking-widest text-lg placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
                    placeholder="••••••••" 
                    maxLength={8} 
                    required 
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Vui lòng kiểm tra hộp thư điện tử của bạn để lấy mã xác nhận.</p>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmittingOtp || isLoading || otpCode.length !== 8} 
                className="w-full py-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
              >
                {isSubmittingOtp && <FiLoader className="w-4 h-4 animate-spin" />}
                {isSubmittingOtp ? "Đang xác thực..." : "Xác nhận mã OTP"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2" htmlFor="login-email">Địa chỉ Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <FiMail className="w-4 h-4" />
                    </span>
                    <input 
                      type="email" 
                      id="login-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3.5 pl-11 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                      placeholder="ten@congty.com" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-foreground" htmlFor="login-password">Mật khẩu</label>
                    <button 
                      type="button" 
                      onClick={() => switchView("forgot")} 
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                      <FiLock className="w-4 h-4" />
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      id="login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-muted/20 px-4 py-3.5 pl-11 pr-12 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-sm"
                      placeholder="••••••••" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmittingEmail || isSubmittingGoogle || isLoading} 
                  className="w-full py-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                >
                  {isSubmittingEmail && <FiLoader className="w-4 h-4 animate-spin" />}
                  {isSubmittingEmail ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </form>

              {/* Toggle Register */}
              <div className="text-center text-sm font-medium text-muted-foreground">
                Chưa có tài khoản?
                <button 
                  type="button" 
                  onClick={() => switchView("register")} 
                  className="font-bold text-primary hover:underline ml-1"
                >
                  Đăng ký ngay
                </button>
              </div>

              {/* Separator */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">HOẶC</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Google Login button */}
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmittingGoogle || isSubmittingEmail || isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingGoogle ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <svg height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                )}
                <span className="text-sm font-bold">Tiếp tục với Google</span>
              </button>
            </div>
          )}

          {/* ── DEV: Quick role switcher ── */}
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-4 mt-6">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <FiZap className="w-3.5 h-3.5 text-amber-500" /> Dev Quick Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => devLoginAs("customer")} className="w-full text-xs cursor-pointer"><FiUser className="h-3.5 w-3.5" /> Customer</Button>
              <Button variant="outline" size="sm" onClick={() => devLoginAs("staff")} className="w-full text-xs cursor-pointer"><FiShield className="h-3.5 w-3.5" /> Staff</Button>
              <Button variant="outline" size="sm" onClick={() => devLoginAs("admin")} className="w-full text-xs cursor-pointer"><FiLock className="h-3.5 w-3.5" /> Admin</Button>
              <Button variant="outline" size="sm" onClick={() => devLoginAsBranchAdmin()} className="w-full text-xs cursor-pointer"><FiMapPin className="h-3.5 w-3.5" /> Branch Admin</Button>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="w-full text-center lg:text-left mt-8 border-t border-border pt-6">
          <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
            <a className="hover:text-primary transition-colors" href="#">Điều khoản dịch vụ</a>
            <a className="hover:text-primary transition-colors" href="#">Chính sách bảo mật</a>
            <a className="hover:text-primary transition-colors" href="#">Trợ giúp</a>
            <span className="text-border hidden sm:inline">•</span>
            <span className="w-full sm:w-auto mt-2 sm:mt-0 text-muted-foreground/80">© 2026 CoSpace Inc. All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
