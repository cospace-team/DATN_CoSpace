import React, { useState, useEffect } from 'react';
import {
  FiUser,
  FiBriefcase,
  FiMapPin,
  FiMail,
  FiPhone,
  FiGithub,
  FiLinkedin,
  FiGlobe,
  FiSettings,
  FiCheck,
  FiCheckCircle,
  FiX,
  FiInfo,
  FiUsers,
  FiStar,
  FiMessageCircle,
  FiEyeOff,
  FiEye,
  FiLock,
  FiCalendar,
  FiClock,
  FiAward,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiExternalLink,
  FiSearch,
  FiCamera,
  FiTrendingUp,
  FiShield,
  FiShare2,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { Spinner } from '../../components/ui/Spinner';

// ── BANNER THEMES ──
const BANNER_THEMES = [
  {
    id: 'indigo',
    name: 'Cyber Indigo',
    gradient: 'from-indigo-600 via-blue-600 to-sky-500',
    accent: 'bg-indigo-500',
  },
  {
    id: 'teal',
    name: 'Aurora Teal',
    gradient: 'from-teal-600 via-emerald-600 to-cyan-500',
    accent: 'bg-teal-500',
  },
  {
    id: 'sunset',
    name: 'Sunset Amber',
    gradient: 'from-amber-600 via-rose-600 to-orange-500',
    accent: 'bg-amber-500',
  },
  {
    id: 'violet',
    name: 'Cosmic Violet',
    gradient: 'from-purple-600 via-fuchsia-600 to-indigo-600',
    accent: 'bg-purple-500',
  },
];

// ── POPULAR SUGGESTED SKILLS ──
const SUGGESTED_SKILLS = [
  'React',
  'TypeScript',
  'Node.js',
  'Spring Boot',
  'UI/UX Design',
  'AI / Machine Learning',
  'Product Management',
  'Fintech',
  'Khởi nghiệp',
  'Marketing',
  'Đầu tư',
  'Data Science',
];

// ── MOCK DATA FOR CO-WORKING NETWORK ──
const MOCK_PARTNERS = [
  {
    id: 'p1',
    name: 'Trần Văn Bình',
    profession: 'Senior Frontend Developer',
    company: 'TechCorp Vietnam',
    avatar: 'B',
    matchScore: 92,
    commonTags: ['React', 'TypeScript', 'UI/UX Design', 'AI / Machine Learning'],
    contactPublic: true,
    email: 'binh.tran@techcorp.com',
    phone: '0901234567',
    bio: 'Đam mê xây dựng các sản phẩm web có trải nghiệm người dùng tuyệt vời với React, Next.js và Tailwind CSS.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
  },
  {
    id: 'p2',
    name: 'Lê Ngọc Mai',
    profession: 'Product Manager',
    company: 'Innovate VN Lab',
    avatar: 'M',
    matchScore: 84,
    commonTags: ['Product Management', 'Khởi nghiệp', 'UI/UX Design'],
    contactPublic: false,
    email: 'mai.le@innovate.vn',
    phone: '0912345678',
    bio: 'Đang tìm kiếm Co-founder kỹ thuật cho dự án mới trong mảng EdTech và AI Assistant cho doanh nghiệp.',
    linkedin: 'https://linkedin.com',
    github: '',
  },
  {
    id: 'p3',
    name: 'Phạm Đức Anh',
    profession: 'Data Scientist & AI Engineer',
    company: 'AI Next Solutions',
    avatar: 'A',
    matchScore: 78,
    commonTags: ['AI / Machine Learning', 'Data Science', 'Đầu tư'],
    contactPublic: true,
    email: 'anh.pham@aisolutions.dev',
    phone: '0987654321',
    bio: 'Chuyên gia xử lý dữ liệu lớn, LLM orchestration và triển khai giải pháp AI vào quản lý vận hành.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
  },
  {
    id: 'p4',
    name: 'Hoàng Minh Châu',
    profession: 'Marketing Lead & Growth',
    company: 'GrowthHub Media',
    avatar: 'C',
    matchScore: 71,
    commonTags: ['Marketing', 'Khởi nghiệp', 'Fintech'],
    contactPublic: true,
    email: 'chau.hoang@growthhub.io',
    phone: '0933445566',
    bio: 'Chiến lược gia truyền thông số và tối ưu tỷ lệ chuyển đổi (CRO) cho các nền tảng công nghệ B2B.',
    linkedin: 'https://linkedin.com',
    github: '',
  },
];

const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'network' | 'security'>('profile');
  const [selectedTheme, setSelectedTheme] = useState('indigo');

  // ── Tab 1: Personal & Professional Profile States ──
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    profession: '',
    company: '',
    bio: '',
    contactPublic: true,
  });

  // Skills & Social Links (Extended profile features)
  const [skills, setSkills] = useState<string[]>([
    'React',
    'TypeScript',
    'UI/UX Design',
    'Khởi nghiệp',
    'AI / Machine Learning',
  ]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    linkedin: 'https://linkedin.com/in/cospace-user',
    github: 'https://github.com/cospace-dev',
    website: 'https://cospace.vn',
  });

  // Avatar Modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // ── Tab 2: Networking States ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [partnersList, setPartnersList] = useState(MOCK_PARTNERS);
  const [selectedPartner, setSelectedPartner] = useState<typeof MOCK_PARTNERS[0] | null>(null);

  // ── Tab 3: Security & Password States ──
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);

  // ── Stats (Customer Mini Dashboard) ──
  const stats = {
    totalBookings: 12,
    totalHours: 48,
    matchedCount: partnersList.length,
    tier: 'Gold Member',
    memberSince: 'Tháng 01/2026',
  };

  // Sync user data when loaded
  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  // Fetch backend profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('workhub_access_token');
        if (!token) return;
        const response = await fetch('http://localhost:8080/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setProfileForm(prev => ({
            ...prev,
            profession: data.profession || prev.profession || 'Frontend Developer & Co-worker',
            company: data.company || prev.company || 'CoSpace Community',
            bio: data.bio || prev.bio || 'Thành viên năng động tại CoSpace. Đam mê công nghệ, chia sẻ kinh nghiệm và tìm kiếm cơ hội hợp tác kết nối.',
            contactPublic: data.contactPublic !== undefined ? data.contactPublic : true,
          }));
          if (data.avatarUrl) {
            setCustomAvatarUrl(data.avatarUrl);
          }
        }
      } catch (error) {
        console.error('Failed to load user profile details', error);
      }
    };
    fetchProfile();

    // Fetch partner matching suggestions
    const fetchPartners = async () => {
      setIsLoadingPartners(true);
      try {
        const token = localStorage.getItem('workhub_access_token');
        if (!token) return;
        const res = await fetch('http://localhost:8080/api/matching/suggestions', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setPartnersList(json.data);
          }
        }
      } catch (err) {
        console.warn('Cannot fetch partner suggestions, fallback to demo data:', err);
      } finally {
        setIsLoadingPartners(false);
      }
    };
    fetchPartners();
  }, [user]);

  // ── Save Profile Handler ──
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
        avatarUrl: customAvatarUrl || user?.avatarUrl,
        bio: profileForm.bio,
        profession: profileForm.profession,
        company: profileForm.company,
        contactPublic: profileForm.contactPublic,
        contactLink: socialLinks.website || socialLinks.linkedin,
      });
      setIsEditing(false);
      showToast('Cập nhật hồ sơ thông tin thành công!', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Có lỗi xảy ra khi lưu thông tin', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── Save Password Handler ──
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword(passwordForm);
      showToast('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.', 'success');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Có lỗi xảy ra khi đổi mật khẩu', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ── Skills Handlers ──
  const handleAddSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed]);
      setNewSkillInput('');
      showToast(`Đã thêm kỹ năng: ${trimmed}`, 'info');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
  };

  // ── Filtered Partners ──
  const filteredPartners = partnersList.filter(partner => {
    const matchesSearch =
      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.commonTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTagFilter
      ? partner.commonTags.includes(selectedTagFilter)
      : true;

    return matchesSearch && matchesTag;
  });

  const currentTheme = BANNER_THEMES.find(t => t.id === selectedTheme) || BANNER_THEMES[0];

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pb-24 font-sans animate-fade-in text-foreground">
      {/* ══════════════════════════════════════════════════════════════
          1. HERO COVER BANNER & PROFILE HEADER
          ══════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-3xl overflow-hidden bg-card border border-border shadow-md mb-8">
        {/* Cover Gradient Mesh Banner */}
        <div
          className={`h-44 sm:h-56 w-full bg-gradient-to-r ${currentTheme.gradient} relative overflow-hidden transition-all duration-700`}
        >
          {/* Glass / Mesh Overlay Glows */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-2xl transform translate-y-1/2 pointer-events-none" />

          {/* Banner Preset Switcher */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            <span className="text-[11px] font-medium text-white/80 hidden sm:inline mr-1">
              Chủ đề bìa:
            </span>
            {BANNER_THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                title={theme.name}
                className={`w-5 h-5 rounded-full ${theme.accent} border-2 transition-transform hover:scale-110 ${
                  selectedTheme === theme.id
                    ? 'border-white scale-110 shadow-sm'
                    : 'border-transparent opacity-75'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Profile Info Area Below Banner */}
        <div className="px-6 sm:px-10 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            {/* Avatar & Identifiers */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              <div className="relative group">
                <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl bg-card border-4 border-card shadow-xl flex items-center justify-center overflow-hidden relative">
                  {user?.avatarUrl || customAvatarUrl ? (
                    <img
                      src={customAvatarUrl || user?.avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white text-4xl sm:text-5xl font-bold">
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {/* Camera change avatar overlay */}
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    title="Đổi ảnh đại diện"
                  >
                    <FiCamera className="h-6 w-6 mb-1" />
                    <span className="text-[10px] font-semibold">Đổi ảnh</span>
                  </button>
                </div>

                {/* Online / Active badge */}
                <div
                  className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-card shadow-sm"
                  title="Đang hoạt động"
                />
              </div>

              <div className="space-y-1 sm:pb-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {user?.fullName || 'Khách hàng CoSpace'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    <FiAward className="h-3.5 w-3.5" />
                    {stats.tier}
                  </span>
                </div>

                <p className="text-sm font-medium text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                  <FiBriefcase className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {profileForm.profession || 'Chuyên viên'} @{' '}
                    <strong className="text-foreground">{profileForm.company || 'CoSpace'}</strong>
                  </span>
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <FiCalendar className="h-3.5 w-3.5" /> Tham gia: {stats.memberSince}
                  </span>
                  <span className="flex items-center gap-1">
                    <FiShield className="h-3.5 w-3.5 text-emerald-500" /> Tài khoản đã xác thực
                  </span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center justify-center gap-3 sm:pb-2">
              {activeTab === 'profile' && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <FiEdit2 className="h-4 w-4" />
                  Chỉnh sửa hồ sơ
                </button>
              )}
              {activeTab === 'profile' && isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-xl font-medium text-sm border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingProfile ? <Spinner size="sm" /> : <FiCheck className="h-4 w-4" />}
                    {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Đã sao chép liên kết hồ sơ vào clipboard!', 'success');
                }}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Chia sẻ hồ sơ"
              >
                <FiShare2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              2. MINI STATS DASHBOARD (4 IMPACT METRICS)
              ══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-4 border-t border-border/80">
            {/* Metric 1: Bookings */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiCalendar />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Lượt đặt chỗ</p>
                <p className="text-lg font-bold text-foreground">{stats.totalBookings} lượt</p>
              </div>
            </div>

            {/* Metric 2: Hours */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiClock />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Giờ làm việc</p>
                <p className="text-lg font-bold text-foreground">{stats.totalHours} giờ</p>
              </div>
            </div>

            {/* Metric 3: Network Matches */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiUsers />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Gợi ý đối tác</p>
                <p className="text-lg font-bold text-foreground">{stats.matchedCount} người</p>
              </div>
            </div>

            {/* Metric 4: Tier */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiAward />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Hạng thành viên</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.tier}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. TAB NAVIGATION PILLS
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 mb-8 bg-muted/50 p-1.5 rounded-2xl border border-border/80 w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-xl transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FiUser className="h-4 w-4 text-primary" />
          <span>Hồ sơ & Nghề nghiệp</span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-xl transition-all cursor-pointer ${
            activeTab === 'network'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FiUsers className="h-4 w-4 text-indigo-500" />
          <span>Mạng lưới kết nối</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            {partnersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-xl transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FiShield className="h-4 w-4 text-emerald-500" />
          <span>Tài khoản & Bảo mật</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          4. TAB CONTENT 1: PROFILE & BIO (BENTO GRID)
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Personal Info + Professional Bio */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bento Card 1: Personal & Contact Info */}
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Thông tin cá nhân</h2>
                    <p className="text-xs text-muted-foreground">Thông tin tài khoản và liên hệ trực tiếp của bạn</p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FiEdit2 className="h-3.5 w-3.5" /> Sửa
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Email đăng nhập
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full px-4 py-2.5 bg-muted/80 border border-border rounded-xl text-sm font-medium text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="0901234567"
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <FiUser className="h-3.5 w-3.5" /> Họ và tên
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {profileForm.fullName || 'Chưa cập nhật'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <FiMail className="h-3.5 w-3.5" /> Email
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate" title={profileForm.email}>
                      {profileForm.email || 'Chưa cập nhật'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                    <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                      <FiPhone className="h-3.5 w-3.5" /> Số điện thoại
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {profileForm.phone || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Bento Card 2: Professional & Bio */}
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm relative">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary">
                    <FiBriefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Nghề nghiệp & Giới thiệu</h2>
                    <p className="text-xs text-muted-foreground">Chia sẻ về công việc và chuyên môn để kết nối với đối tác</p>
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Chức danh / Nghề nghiệp
                      </label>
                      <input
                        type="text"
                        value={profileForm.profession}
                        onChange={e => setProfileForm({ ...profileForm, profession: e.target.value })}
                        placeholder="VD: Senior Product Designer, Freelancer..."
                        className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Công ty / Tổ chức
                      </label>
                      <input
                        type="text"
                        value={profileForm.company}
                        onChange={e => setProfileForm({ ...profileForm, company: e.target.value })}
                        placeholder="VD: FPT Software, Tự do..."
                        className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Bio (Giới thiệu ngắn về bản thân)
                    </label>
                    <textarea
                      rows={3}
                      value={profileForm.bio}
                      onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                      placeholder="Một vài dòng chia sẻ kinh nghiệm, sở thích làm việc hoặc dự án bạn đang tìm kiếm cộng sự..."
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <FiStar className="h-3.5 w-3.5 text-amber-500" /> Bio giới thiệu
                    </p>
                    <p className="text-sm font-normal text-foreground leading-relaxed">
                      "{profileForm.bio || 'Chưa cập nhật phần giới thiệu bản thân.'}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">Chức danh</p>
                      <p className="text-sm font-semibold text-foreground">
                        {profileForm.profession || 'Chưa cập nhật'}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">Công ty / Tổ chức</p>
                      <p className="text-sm font-semibold text-foreground">
                        {profileForm.company || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT 1 COLUMN: Skills & Social Links */}
          <div className="space-y-6">
            {/* Bento Card 3: Skills & Interest Tags */}
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FiStar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Kỹ năng & Lĩnh vực</h2>
                  <p className="text-xs text-muted-foreground">Tối ưu điểm số gợi ý kết nối</p>
                </div>
              </div>

              {/* Tag Input */}
              <div className="flex items-center gap-2 mb-3.5">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={e => setNewSkillInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(newSkillInput);
                    }
                  }}
                  placeholder="Thêm tag kỹ năng..."
                  className="flex-1 px-3.5 py-2 text-xs bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill(newSkillInput)}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Selected Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4 min-h-[48px] p-2.5 rounded-2xl bg-muted/30 border border-border/60">
                {skills.length === 0 ? (
                  <span className="text-xs text-muted-foreground py-1">Chưa chọn kỹ năng nào</span>
                ) : (
                  skills.map(skill => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 animate-scale-in"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-500 transition-colors cursor-pointer"
                        title="Xóa tag"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Suggested Quick Tags */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">Gợi ý phổ biến:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).slice(0, 6).map(s => (
                    <button
                      key={s}
                      onClick={() => handleAddSkill(s)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border/80 bg-card hover:bg-muted hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Bento Card 4: Social Links & Portfolio */}
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FiGlobe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Liên kết mạng xã hội</h2>
                  <p className="text-xs text-muted-foreground">Portfolio và kênh giao lưu chuyên nghiệp</p>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      LinkedIn URL
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl">
                      <FiLinkedin className="h-4 w-4 text-blue-600 shrink-0" />
                      <input
                        type="url"
                        value={socialLinks.linkedin}
                        onChange={e => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        className="bg-transparent text-xs w-full focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      GitHub URL
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl">
                      <FiGithub className="h-4 w-4 text-foreground shrink-0" />
                      <input
                        type="url"
                        value={socialLinks.github}
                        onChange={e => setSocialLinks({ ...socialLinks, github: e.target.value })}
                        placeholder="https://github.com/..."
                        className="bg-transparent text-xs w-full focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Website / Portfolio
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl">
                      <FiGlobe className="h-4 w-4 text-emerald-600 shrink-0" />
                      <input
                        type="url"
                        value={socialLinks.website}
                        onChange={e => setSocialLinks({ ...socialLinks, website: e.target.value })}
                        placeholder="https://mywebsite.com"
                        className="bg-transparent text-xs w-full focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {socialLinks.linkedin && (
                    <a
                      href={socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FiLinkedin className="h-4 w-4 text-blue-600" />
                        <span>LinkedIn Profile</span>
                      </div>
                      <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  )}

                  {socialLinks.github && (
                    <a
                      href={socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FiGithub className="h-4 w-4 text-foreground" />
                        <span>GitHub Repository</span>
                      </div>
                      <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  )}

                  {socialLinks.website && (
                    <a
                      href={socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FiGlobe className="h-4 w-4 text-emerald-600" />
                        <span>Portfolio / Website</span>
                      </div>
                      <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          5. TAB CONTENT 2: CO-WORKING NETWORKING COMMUNITY
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'network' && (
        <div className="space-y-6">
          {/* Network Header & Search / Filters */}
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FiUsers className="text-indigo-500" /> Gợi ý Đối tác & Đồng nghiệp
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Thuật toán đối sánh dựa trên kỹ năng và lĩnh vực bạn đang quan tâm
              </p>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, nghề nghiệp, skill..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {selectedTagFilter && (
                <button
                  onClick={() => setSelectedTagFilter(null)}
                  className="px-3 py-2 bg-muted text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground border border-border flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  Xóa lọc: {selectedTagFilter} <FiX className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Partner Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoadingPartners && [...Array(4)].map((_, i) => (
              <div key={`partner-skeleton-${i}`} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <Skeleton className="h-14 w-14 rounded-2xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-4/5 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
              </div>
            ))}
            {!isLoadingPartners && filteredPartners.map(partner => (
              <div
                key={partner.id}
                className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between relative group"
              >
                {/* Top Badge: Match Score */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
                      {partner.avatar}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {partner.name}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground">
                        {partner.profession}
                      </p>
                      <p className="text-[11px] font-semibold text-primary/90 mt-0.5">
                        @{partner.company}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                    {partner.matchScore}% Match
                  </div>
                </div>

                {/* Partner Bio */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4 bg-muted/30 p-3 rounded-2xl border border-border/40">
                  "{partner.bio}"
                </p>

                {/* Common Tags */}
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Kỹ năng tương đồng:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {partner.commonTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTagFilter(tag)}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                          selectedTagFilter === tag
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-foreground border-border/60 hover:bg-muted'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <button
                    onClick={() => setSelectedPartner(partner)}
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                  <button
                    onClick={() => {
                      if (partner.contactPublic) {
                        window.location.href = `mailto:${partner.email}?subject=Ket noi tu CoSpace`;
                      } else {
                        showToast(`${partner.name} đang ẩn thông tin liên hệ trực tiếp.`, 'info');
                      }
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FiMessageCircle className="h-3.5 w-3.5" /> Kết nối
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!isLoadingPartners && filteredPartners.length === 0 && (
            <div className="text-center py-16 bg-card rounded-3xl border border-border">
              <FiUsers className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-bold text-foreground">Không tìm thấy đối tác phù hợp</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tag.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          6. TAB CONTENT 3: ACCOUNT & SECURITY / PRIVACY
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Password Change Form */}
          <div className="lg:col-span-2">
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FiLock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Đổi mật khẩu tài khoản</h2>
                  <p className="text-xs text-muted-foreground">Đảm bảo tài khoản của bạn luôn được bảo vệ an toàn</p>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={passwordForm.oldPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showOldPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmNewPassword}
                    onChange={e =>
                      setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isSavingPassword && <Spinner size="sm" />}
                  {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </form>
            </section>
          </div>

          {/* Privacy & Account Settings */}
          <div className="space-y-6">
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <FiSettings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Quyền riêng tư</h2>
                  <p className="text-xs text-muted-foreground">Tùy chỉnh khả năng hiển thị hồ sơ</p>
                </div>
              </div>

              {/* Public Contact Switch */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Công khai liên hệ</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Cho phép người dùng khác trong CoSpace xem email và số điện thoại của bạn.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={profileForm.contactPublic}
                      onChange={async e => {
                        const nextVal = e.target.checked;
                        setProfileForm(prev => ({ ...prev, contactPublic: nextVal }));
                        try {
                          await updateProfile({
                            fullName: profileForm.fullName,
                            email: profileForm.email,
                            phone: profileForm.phone,
                            avatarUrl: customAvatarUrl || user?.avatarUrl,
                            bio: profileForm.bio,
                            profession: profileForm.profession,
                            company: profileForm.company,
                            contactPublic: nextVal,
                            contactLink: socialLinks.website,
                          });
                          showToast(
                            nextVal ? 'Đã bật công khai liên hệ' : 'Đã ẩn liên hệ cá nhân',
                            'info'
                          );
                        } catch (err) {
                          showToast('Không thể lưu cài đặt quyền riêng tư', 'error');
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {profileForm.contactPublic ? (
                    <>
                      <FiCheckCircle className="text-emerald-500 h-3.5 w-3.5 shrink-0" />
                      <span>Thông tin liên hệ của bạn đang hiển thị</span>
                    </>
                  ) : (
                    <>
                      <FiEyeOff className="text-amber-500 h-3.5 w-3.5 shrink-0" />
                      <span>Thông tin liên hệ của bạn đang được ẩn</span>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          7. MODAL: PARTNER DETAILS MODAL
          ══════════════════════════════════════════════════════════════ */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card rounded-3xl max-w-lg w-full border border-border shadow-2xl overflow-hidden animate-scale-in relative">
            {/* Header Banner */}
            <div className="h-28 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
              <button
                onClick={() => setSelectedPartner(null)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6 pt-0 relative">
              {/* Partner Avatar & % Match */}
              <div className="flex items-end justify-between -mt-12 mb-4">
                <div className="h-20 w-20 rounded-2xl bg-card border-4 border-card text-foreground shadow-lg flex items-center justify-center text-3xl font-bold">
                  {selectedPartner.avatar}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-sm">
                  {selectedPartner.matchScore}% Match
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">{selectedPartner.name}</h3>
                <p className="text-xs font-medium text-muted-foreground">
                  {selectedPartner.profession} @{' '}
                  <strong className="text-foreground">{selectedPartner.company}</strong>
                </p>
              </div>

              {/* Bio */}
              <div className="my-4 p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed">
                "{selectedPartner.bio}"
              </div>

              {/* Skills */}
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                  Điểm chung & Kỹ năng:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPartner.commonTags.map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact Info if Public */}
              {selectedPartner.contactPublic ? (
                <div className="space-y-2.5 pt-3 border-t border-border/60">
                  <p className="text-[11px] font-semibold text-muted-foreground">Thông tin liên hệ:</p>
                  <div className="flex items-center gap-3 text-xs">
                    <FiMail className="text-primary h-4 w-4 shrink-0" />
                    <a
                      href={`mailto:${selectedPartner.email}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {selectedPartner.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <FiPhone className="text-emerald-500 h-4 w-4 shrink-0" />
                    <a
                      href={`tel:${selectedPartner.phone}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {selectedPartner.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-muted/50 border border-dashed border-border text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <FiEyeOff className="h-4 w-4" />
                  <span>Đối tác chọn ẩn thông tin liên hệ trực tiếp</span>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => {
                    if (selectedPartner.contactPublic) {
                      window.location.href = `mailto:${selectedPartner.email}?subject=Ket noi tu CoSpace`;
                    } else {
                      showToast(`Đã gửi yêu cầu kết nối tới ${selectedPartner.name}!`, 'success');
                      setSelectedPartner(null);
                    }
                  }}
                  className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiMessageCircle className="h-4 w-4" /> Gửi lời chào kết nối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          8. MODAL: CHANGE AVATAR MODAL
          ══════════════════════════════════════════════════════════════ */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-card rounded-3xl max-w-md w-full border border-border shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FiCamera className="text-primary" /> Đổi ảnh đại diện
              </h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Đường dẫn ảnh (Avatar URL)
                </label>
                <input
                  type="url"
                  value={customAvatarUrl}
                  onChange={e => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                  Hoặc chọn ảnh avatar mẫu:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                  ].map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCustomAvatarUrl(url)}
                      className={`h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        customAvatarUrl === url
                          ? 'border-primary scale-105 shadow-md'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Avatar Preset ${idx}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  onClick={() => setShowAvatarModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-foreground cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={async () => {
                    await handleSaveProfile();
                    setShowAvatarModal(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
                >
                  Lưu ảnh đại diện
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
