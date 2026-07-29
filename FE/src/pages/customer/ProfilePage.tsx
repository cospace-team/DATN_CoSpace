import React, { useState, useEffect } from 'react';
import { FiUser, FiBriefcase, FiMapPin, FiMail, FiPhone, FiGithub, FiLinkedin, FiSettings, FiCheck, FiCheckCircle, FiX, FiInfo, FiUsers, FiStar, FiMessageCircle, FiEyeOff } from 'react-icons/fi';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';

// MOCK DATA FOR CONNECTIONS
const MOCK_PARTNERS = [
  {
    id: 'p1',
    name: 'Trần Văn Bình',
    profession: 'Senior Frontend Developer',
    company: 'TechCorp',
    avatar: 'B',
    matchScore: 85,
    commonTags: ['React', 'UI/UX Design', 'AI'],
    contactPublic: true,
    email: 'binh.tran@techcorp.com',
    phone: '0901234567',
    bio: 'Đam mê xây dựng các sản phẩm web có trải nghiệm người dùng tuyệt vời.'
  },
  {
    id: 'p2',
    name: 'Lê Ngọc Mai',
    profession: 'Product Manager',
    company: 'Innovate VN',
    avatar: 'M',
    matchScore: 72,
    commonTags: ['UI/UX Design', 'Khởi nghiệp'],
    contactPublic: false,
    email: 'mai.le@innovate.vn',
    phone: '0912345678',
    bio: 'Đang tìm kiếm Co-founder kỹ thuật cho dự án mới trong mảng EdTech.'
  },
  {
    id: 'p3',
    name: 'Phạm Đức Anh',
    profession: 'Data Scientist',
    company: 'AI Solutions',
    avatar: 'A',
    matchScore: 68,
    commonTags: ['AI', 'Python', 'Đầu tư'],
    contactPublic: true,
    email: 'anh.pham@aisolutions.dev',
    phone: '0987654321',
    bio: 'Chuyên gia xử lý dữ liệu và xây dựng mô hình học máy.'
  }
];

const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'profile' | 'network'>('personal');

  // Tab 1: Personal Info States
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  // Tab 1: Password Change States
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Tab 2: Profile Info States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: '',
    profession: '',
    company: '',
    contactPublic: false,
    contactLink: ''
  });

  // Tab 3: Networking State
  const [selectedPartner, setSelectedPartner] = useState<typeof MOCK_PARTNERS[0] | null>(null);

  // Fetch complete profile on mount or when user changes
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("workhub_access_token");
        if (!token) return;
        const response = await fetch(`http://localhost:8080/api/users/profile`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setProfileData({
            bio: data.bio || '',
            profession: data.profession || '',
            company: data.company || '',
            contactPublic: data.contactPublic || false,
            contactLink: data.contactLink || ''
          });
        }
      } catch (error) {
        console.error("Failed to load user profile details", error);
      }
    };
    fetchProfile();
  }, [user]);

  // Sync personal form when user loads
  useEffect(() => {
    if (user) {
      setPersonalForm({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleSavePersonal = async () => {
    try {
      await updateProfile({
        fullName: personalForm.fullName,
        email: personalForm.email,
        phone: personalForm.phone,
        avatarUrl: user?.avatarUrl,
        bio: profileData.bio,
        profession: profileData.profession,
        company: profileData.company,
        contactPublic: profileData.contactPublic,
        contactLink: profileData.contactLink
      });
      setIsEditingPersonal(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Có lỗi xảy ra khi lưu thông tin cá nhân");
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        fullName: user?.fullName,
        email: user?.email,
        phone: user?.phone,
        avatarUrl: user?.avatarUrl,
        bio: profileData.bio,
        profession: profileData.profession,
        company: profileData.company,
        contactPublic: profileData.contactPublic,
        contactLink: profileData.contactLink
      });
      setIsEditingProfile(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Có lỗi xảy ra khi lưu thông tin profile");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsSavingPassword(true);
    try {
      await changePassword(passwordForm);
      setPasswordSuccess("Đổi mật khẩu thành công!");
      setPasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 pb-24 font-sans animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-muted h-48 md:h-64 mb-20 border border-border shadow-sm">
        {/* Geometric Patterns */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-muted rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-y-1/3"></div>
        
        {/* Retro Dots */}
        

        {/* Avatar */}
        <div className="absolute -bottom-14 left-6 md:left-12 flex items-end z-10">
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl bg-muted/50 border border-border flex items-center justify-center shadow-sm overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-6xl md:text-7xl font-semibold text-foreground">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
              </span>
            )}
          </div>
          <div className="ml-6 mb-14 md:mb-16 text-white drop-shadow-md hidden md:block">
            <h1 className="text-4xl font-semibold tracking-tight">{user?.fullName}</h1>
            <p className="text-xl font-medium bg-secondary text-slate-100 px-3 py-1 rounded-lg border border-slate-700 inline-block mt-2 shadow-sm">
              {profileData.profession || 'Thành viên'} @ {profileData.company || 'CoSpace'}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Title */}
      <div className="px-2 mb-10 md:hidden mt-16 text-center">
        <h1 className="text-3xl font-semibold text-foreground">{user?.fullName}</h1>
        <p className="text-sm font-medium bg-secondary text-slate-100 px-3 py-1 rounded-lg border border-slate-700 inline-block mt-3 shadow-sm">
          {profileData.profession || 'Thành viên'} @ {profileData.company || 'CoSpace'}
        </p>
      </div>

      {/* Block-based Tabs */}
      <div className="flex flex-wrap gap-4 px-2 md:px-12 mb-10">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm tracking-tight rounded-full border border-border transition-all ${
            activeTab === 'personal' 
              ? 'bg-slate-900 text-white shadow-sm -translate-y-1' 
              : 'bg-card text-foreground shadow-sm hover:-translate-y-1 hover:shadow-sm'
          }`}
        >
          <FiUser className="h-5 w-5" /> Cá nhân
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm tracking-tight rounded-full border border-border transition-all ${
            activeTab === 'profile' 
              ? 'bg-slate-900 text-white shadow-sm -translate-y-1' 
              : 'bg-card text-foreground shadow-sm hover:-translate-y-1 hover:shadow-sm'
          }`}
        >
          <FiBriefcase className="h-5 w-5" /> Profile
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm tracking-tight rounded-full border border-border transition-all ${
            activeTab === 'network' 
              ? 'bg-slate-900 text-white shadow-sm -translate-y-1' 
              : 'bg-card text-foreground shadow-sm hover:-translate-y-1 hover:shadow-sm'
          }`}
        >
          <FiUsers className="h-5 w-5" /> Kết nối
        </button>
      </div>

      <div className="px-2 md:px-12">
        {/* ==================== TAB 1: PERSONAL INFO ==================== */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <section className="bg-card rounded-2xl border border-border p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <h2 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-muted rounded-lg border border-border"><FiUser className="text-muted-foreground" /></div>
                    Liên hệ
                  </h2>
                  {!isEditingPersonal ? (
                    <button 
                      onClick={() => setIsEditingPersonal(true)}
                      className="px-5 py-2 bg-muted text-foreground font-medium tracking-tight text-xs border border-border rounded-full shadow-sm hover:-translate-y-0.5 hover:shadow-sm transition-all"
                    >
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          setIsEditingPersonal(false);
                          if (user) {
                            setPersonalForm({
                              fullName: user.fullName || '',
                              email: user.email || '',
                              phone: user.phone || ''
                            });
                          }
                        }}
                        className="px-5 py-2 bg-card text-foreground font-medium tracking-tight text-xs border border-border rounded-full shadow-sm hover:bg-muted transition-all"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={handleSavePersonal}
                        className="px-5 py-2 bg-slate-900 text-white font-medium tracking-tight text-xs border border-slate-800 rounded-full shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                      >
                        Lưu lại
                      </button>
                    </div>
                  )}
                </div>

                {isEditingPersonal ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold text-foreground tracking-tight mb-2">Họ và tên</label>
                      <input
                        type="text"
                        value={personalForm.fullName}
                        onChange={e => setPersonalForm({ ...personalForm, fullName: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground tracking-tight mb-2">Email</label>
                      <input
                        type="email"
                        value={personalForm.email}
                        onChange={e => setPersonalForm({ ...personalForm, email: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground tracking-tight mb-2">Số điện thoại</label>
                      <input
                        type="text"
                        value={personalForm.phone}
                        onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-b border-border/10 gap-2">
                      <span className="w-40 text-xs font-semibold tracking-tight text-foreground/60">Họ và tên</span>
                      <span className="font-medium text-lg text-foreground">{user?.fullName || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center py-4 border-b border-border/10 gap-2">
                      <span className="w-40 text-xs font-semibold tracking-tight text-foreground/60">Email</span>
                      <span className="font-medium text-lg text-foreground">{user?.email || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center py-4 gap-2">
                      <span className="w-40 text-xs font-semibold tracking-tight text-foreground/60">Số điện thoại</span>
                      <span className="font-medium text-lg text-foreground">{user?.phone || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="lg:col-span-1">
              <section className="bg-muted/50 rounded-2xl border border-border p-6 shadow-sm">
                <h2 className="text-xl font-semibold   mb-6 text-foreground">Đổi mật khẩu</h2>
                <form onSubmit={handlePasswordChange} className="space-y-5">
                  {!user?.email.endsWith("@dev.local") && !localStorage.getItem("workhub_access_token")?.startsWith("eyJhbGciOiJIUzI1NiJ") && (
                    <div className="p-4 bg-card border border-border rounded-full shadow-sm flex items-start gap-3">
                      <FiInfo className="text-foreground h-5 w-5 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground leading-relaxed">Tài khoản Google/Mạng xã hội. Thiết lập mật khẩu không cần nhập mật khẩu cũ.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-semibold text-foreground tracking-tight mb-2">Mật khẩu cũ</label>
                    <input
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-foreground tracking-tight mb-2">Mật khẩu mới</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Ít nhất 8 ký tự"
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-foreground tracking-tight mb-2">Xác nhận MK mới</label>
                    <input
                      type="password"
                      value={passwordForm.confirmNewPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                      required
                    />
                  </div>

                  {passwordError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 dark:border-red-900/50 rounded-xl text-xs font-medium text-red-700">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 dark:border-emerald-900/50 rounded-xl text-xs font-medium text-emerald-700">
                      {passwordSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="w-full py-4 bg-slate-900 text-white font-semibold tracking-tight text-sm border border-border rounded-full shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                  >
                    {isSavingPassword ? "Đang xử lý..." : "Lưu mật khẩu"}
                  </button>
                </form>
              </section>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: PROFILE INFO ==================== */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <section className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <h2 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
                    <div className="p-2 bg-muted rounded-lg border border-border"><FiBriefcase className="text-muted-foreground" /></div>
                    Công việc
                  </h2>
                  {!isEditingProfile ? (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="px-5 py-2 bg-muted text-foreground font-medium tracking-tight text-xs border border-border rounded-full shadow-sm hover:-translate-y-0.5 hover:shadow-sm transition-all"
                    >
                      Chỉnh sửa
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="px-5 py-2 bg-card text-foreground font-medium tracking-tight text-xs border border-border rounded-full shadow-sm hover:bg-muted transition-all"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        className="px-5 py-2 bg-slate-900 text-white font-medium tracking-tight text-xs border border-border rounded-full shadow-sm hover:-translate-y-0.5 hover:shadow-sm transition-all"
                      >
                        Lưu lại
                      </button>
                    </div>
                  )}
                </div>

                {isEditingProfile ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-foreground tracking-tight mb-2">Chức danh</label>
                        <input
                          type="text"
                          value={profileData.profession}
                          onChange={e => setProfileData({ ...profileData, profession: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground tracking-tight mb-2">Công ty</label>
                        <input
                          type="text"
                          value={profileData.company}
                          onChange={e => setProfileData({ ...profileData, company: e.target.value })}
                          className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground tracking-tight mb-2">Bio (Giới thiệu)</label>
                      <textarea
                        value={profileData.bio}
                        onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl font-medium text-foreground min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                        placeholder="Một vài dòng về bản thân bạn..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-muted/50 p-5 rounded-2xl border border-border relative">
                      <div className="absolute -top-3 left-6 bg-card border border-border px-2 py-0.5 rounded text-[10px] font-semibold text-muted-foreground">Bio</div>
                      <p className="font-medium text-foreground leading-relaxed text-base pt-2">
                        {profileData.bio || 'Bạn chưa cập nhật thông tin giới thiệu bản thân. Hãy thêm vài dòng để kết nối với mọi người tốt hơn nhé!'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border border-border rounded-2xl">
                        <p className="text-[10px] font-semibold text-muted-foreground tracking-tight mb-1">Chức danh</p>
                        <p className="font-semibold text-xl text-foreground break-words">{profileData.profession || '—'}</p>
                      </div>
                      <div className="p-4 border border-border rounded-full bg-slate-900 text-white shadow-sm">
                        <p className="text-[10px] font-semibold text-white/60 tracking-tight mb-1">Công ty</p>
                        <p className="font-semibold text-xl break-words">{profileData.company || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="lg:col-span-1">
              <section className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h2 className="text-xl font-semibold   mb-6 flex items-center gap-2"><FiSettings /> Hiển thị</h2>
                
                <div className="p-5 rounded-2xl border border-border bg-muted/50">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Public Liên hệ</h3>
                      <p className="text-xs font-semibold text-foreground/70 leading-relaxed">
                        Cho phép người dùng khác nhìn thấy email và số điện thoại của bạn trên tab kết nối.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={profileData.contactPublic}
                        onChange={async (e) => {
                          const nextVal = e.target.checked;
                          setProfileData(prev => ({ ...prev, contactPublic: nextVal }));
                          try {
                            await updateProfile({
                              fullName: user?.fullName,
                              email: user?.email,
                              phone: user?.phone,
                              avatarUrl: user?.avatarUrl,
                              bio: profileData.bio,
                              profession: profileData.profession,
                              company: profileData.company,
                              contactPublic: nextVal,
                              contactLink: profileData.contactLink
                            });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      />
                      <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-card after:border-2 after:border-border/80 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 border border-border/80"></div>
                    </label>
                  </div>
                  
                  {profileData.contactPublic && (
                    <div className="mt-4 p-3 border-t border-border/10 text-xs font-medium text-foreground flex items-center gap-2">
                      <FiCheckCircle className="h-4 w-4" /> Mọi người có thể thấy thông tin của bạn
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: NETWORKING ==================== */}
        {activeTab === 'network' && (
          <div>
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold   text-foreground">
                  Gợi ý kết nối
                </h2>
                <p className="text-sm font-medium bg-slate-900 text-white px-3 py-1 rounded-lg border border-border inline-block mt-3 shadow-sm">
                  Dựa trên kỹ năng & sở thích của bạn
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {MOCK_PARTNERS.map(partner => (
                <div key={partner.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:-translate-y-2 hover:shadow-sm transition-all flex flex-col h-full relative">
                  {/* Match Score Badge */}
                  <div className="absolute -top-4 -right-4 px-4 py-2 bg-blue-600 text-white font-semibold text-sm border border-blue-700 rounded-full shadow-sm rotate-3">
                    {partner.matchScore}% Match
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6 mt-2">
                    <div className="h-16 w-16 rounded-2xl bg-muted/50 border border-border text-foreground flex items-center justify-center text-2xl font-semibold shadow-sm">
                      {partner.avatar}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{partner.name}</h3>
                      <p className="text-xs font-medium text-foreground/70 tracking-tight">{partner.profession}</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-2xl border border-border mb-6 flex-1">
                    <p className="text-sm font-medium text-foreground leading-relaxed line-clamp-3">
                      "{partner.bio}"
                    </p>
                  </div>

                  <div className="mb-6">
                    <p className="text-[10px] font-semibold text-foreground tracking-tight mb-3">Điểm chung</p>
                    <div className="flex flex-wrap gap-2">
                      {partner.commonTags.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-lg border border-border bg-slate-900 text-white text-xs font-semibold shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    className="w-full py-4 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:bg-muted/50 transition-colors mt-auto"
                    onClick={() => setSelectedPartner(partner)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ==================== PARTNER DETAIL MODAL ==================== */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">
          <div className="bg-card rounded-3xl max-w-lg w-full border border-border shadow-sm overflow-hidden animate-scale-in relative">
            <div className="h-32 bg-muted relative border-b border-border overflow-hidden">
              
              <button
                className="absolute top-4 right-4 h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center shadow-sm hover:bg-muted hover:text-white transition-colors z-10"
                onClick={() => setSelectedPartner(null)}
              >
                <FiX className="h-5 w-5 font-semibold" />
              </button>
            </div>

            <div className="px-8 pb-8 relative">
              <div className="h-24 w-24 rounded-2xl bg-muted/50 border border-border flex items-center justify-center shadow-sm absolute -top-12 text-4xl font-semibold text-foreground">
                {selectedPartner.avatar}
              </div>
              
              <div className="absolute -top-6 right-8 px-4 py-2 bg-blue-600 text-white font-semibold text-sm border border-blue-700 rounded-full shadow-sm">
                {selectedPartner.matchScore}% Match
              </div>

              <div className="pt-16 mb-8">
                <h2 className="text-3xl font-semibold   text-foreground">{selectedPartner.name}</h2>
                <p className="text-sm font-medium text-foreground flex items-center gap-2 mt-2 bg-muted inline-flex px-3 py-1.5 rounded-lg border border-border">
                  <FiBriefcase className="h-4 w-4 text-foreground" /> {selectedPartner.profession} @ {selectedPartner.company}
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-semibold tracking-tight text-foreground mb-3">Giới thiệu</h3>
                  <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">{selectedPartner.bio}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold tracking-tight text-foreground mb-3">Điểm chung</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPartner.commonTags.map(tag => (
                      <span key={tag} className="px-4 py-1.5 rounded-full border border-border bg-slate-900 text-white text-xs font-semibold shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-8">
                  {selectedPartner.contactPublic ? (
                    <div className="space-y-4">
                      <h3 className="text-xs font-semibold tracking-tight text-foreground mb-4">Thông tin liên hệ</h3>
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-sm"><FiMail className="h-5 w-5" /></div>
                        <a href={`mailto:${selectedPartner.email}`} className="font-semibold text-lg text-foreground hover:text-foreground transition-colors">{selectedPartner.email}</a>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-muted border border-border flex items-center justify-center text-foreground shadow-sm"><FiPhone className="h-5 w-5" /></div>
                        <a href={`tel:${selectedPartner.phone}`} className="font-semibold text-lg text-foreground hover:text-foreground transition-colors">{selectedPartner.phone}</a>
                      </div>
                      <div className="mt-6">
                        <button className="w-full py-4 bg-slate-900 text-white font-semibold tracking-tight text-lg border border-border rounded-full shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all flex items-center justify-center gap-3">
                          <FiMessageCircle className="h-6 w-6" /> Gửi tin nhắn
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 px-6 rounded-2xl bg-muted border border-border border-dashed">
                      <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mx-auto mb-4 text-foreground">
                        <FiEyeOff className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-semibold  text-foreground mb-2">Liên hệ đang ẩn</h3>
                      <p className="text-sm font-medium text-foreground/70">Người dùng này chưa bật tính năng công khai thông tin liên hệ.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
