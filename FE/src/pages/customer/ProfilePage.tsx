import React, { useState, useEffect, useRef } from 'react';
import {
  FiUser,
  FiBriefcase,
  FiMapPin,
  FiMail,
  FiPhone,
  FiGithub,
  FiLinkedin,
  FiFacebook,
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
  FiUploadCloud,
  FiImage,
  FiChevronDown,
  FiRefreshCw,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { Spinner } from '../../components/ui/Spinner';
import { bookingApi } from '../../lib/bookingApi';
import { membershipApi, type MyMembershipDto } from '../../api/loyaltyApi';
import { formatVND } from '../../utils/formatters';
import { API_BASE_URL } from '../../config/api';
import { PartnerDetailsModal, type PartnerSuggestion } from './profile/PartnerDetailsModal';
import { AvatarModal } from './profile/AvatarModal';
import { ProfileSecurityTab } from './profile/ProfileSecurityTab';
import { ProfileNetworkTab } from './profile/ProfileNetworkTab';

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

  // Skills & Social Links (Real Database Networking Profile)
  const [skills, setSkills] = useState<{ tagId?: string; tagName: string; level?: number }[]>([]);
  const [availableMasterTags, setAvailableMasterTags] = useState<{ id: string; name: string; category?: string }[]>([]);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    linkedin: '',
    github: '',
    facebook: '',
    email: '',
    website: '',
  });
  const [isEditingSocial, setIsEditingSocial] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);

  // Networking list display filters
  const [networkFilterMode, setNetworkFilterMode] = useState<'best' | 'all'>('best');
  const [visiblePartnersCount, setVisiblePartnersCount] = useState<number>(6);

  // Avatar Modal & Upload States
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Dung lượng ảnh tối đa là 5MB', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 360;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
            setCustomAvatarUrl(dataUrl);
            showToast('Tải ảnh thành công! Bấm "Lưu ảnh đại diện" để áp dụng.', 'success');
          }
        } catch {
          showToast('Có lỗi khi xử lý định dạng ảnh', 'error');
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      img.onerror = () => {
        showToast('Không thể đọc dữ liệu ảnh này', 'error');
        setIsUploadingAvatar(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      showToast('Lỗi khi đọc file từ thiết bị', 'error');
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Tab 2: Networking States ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  // Only real suggestions from the matching service; an empty list is shown as such.
  const [partnersList, setPartnersList] = useState<PartnerSuggestion[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerSuggestion | null>(null);

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

  // ── Real Customer Stats (Calculated from actual bookings) ──
  const [realStats, setRealStats] = useState({
    totalBookings: 0,
    totalHours: 0,
    tier: 'Bronze Member',
    memberSince: 'Năm 2026',
  });
  // Server-side membership tier; realStats.tier stays as the offline fallback.
  const [membership, setMembership] = useState<MyMembershipDto | null>(null);
  const tierLabel = membership?.currentTier ? `${membership.currentTier.name} Member` : realStats.tier;

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

  // Fetch backend profile data, master tags & real booking stats
  useEffect(() => {
    const token = localStorage.getItem('workhub_access_token');
    if (!token) return;

    // 1. Fetch Master Tags from Database
    const fetchMasterTags = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAvailableMasterTags(data);
          }
        }
      } catch (err) {
        console.warn('Cannot fetch master tags:', err);
      }
    };
    fetchMasterTags();

    // 2. Fetch Networking Profile (Skills, Bio, Links) from Database
    const fetchNetworkingProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/profiles/me/networking`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
            setSkills(
              data.skills.map((s: { tagId?: string; tagName: string; level?: number }) => ({
                tagId: s.tagId,
                tagName: s.tagName,
                level: s.level || 3,
              }))
            );
          } else {
            // Default initial suggestions if empty
            setSkills([
              { tagName: 'UI/UX Design' },
              { tagName: 'Frontend Dev' },
              { tagName: 'Khởi nghiệp' },
            ]);
          }

          if (data.contactLink) {
            const raw = data.contactLink.trim();
            if (raw.startsWith('{')) {
              try {
                const parsed = JSON.parse(raw);
                setSocialLinks({
                  linkedin: parsed.linkedin || '',
                  github: parsed.github || '',
                  facebook: parsed.facebook || '',
                  email: parsed.email || '',
                  website: parsed.website || '',
                });
              } catch {
                setSocialLinks(prev => ({ ...prev, website: raw }));
              }
            } else if (raw.includes('linkedin.com')) {
              setSocialLinks(prev => ({ ...prev, linkedin: raw }));
            } else if (raw.includes('github.com')) {
              setSocialLinks(prev => ({ ...prev, github: raw }));
            } else if (raw.includes('facebook.com')) {
              setSocialLinks(prev => ({ ...prev, facebook: raw }));
            } else if (raw.includes('@')) {
              setSocialLinks(prev => ({ ...prev, email: raw }));
            } else {
              setSocialLinks(prev => ({ ...prev, website: raw }));
            }
          }
        }
      } catch (err) {
        console.warn('Cannot fetch networking profile:', err);
      }
    };
    fetchNetworkingProfile();

    // 3. Fetch User profile details
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
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
            bio:
              data.bio ||
              prev.bio ||
              'Thành viên năng động tại CoSpace. Đam mê công nghệ, chia sẻ kinh nghiệm và tìm kiếm cơ hội hợp tác kết nối.',
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

    // 4. Calculate real stats from user bookings
    const loadRealStats = async () => {
      try {
        const bookings = await bookingApi.getMyBookings();
        if (bookings && Array.isArray(bookings)) {
          const valid = bookings.filter(
            b => b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'completed'
          );
          const totalBookings = valid.length;
          let totalHours = 0;
          valid.forEach(b => {
            if (b.unit === 'hour') totalHours += b.unitCount || 1;
            else if (b.unit === 'day') totalHours += (b.unitCount || 1) * 8;
            else if (b.unit === 'week') totalHours += (b.unitCount || 1) * 40;
            else if (b.unit === 'month') totalHours += (b.unitCount || 1) * 160;
            else if (b.startAt && b.endAt) {
              const diff = new Date(b.endAt).getTime() - new Date(b.startAt).getTime();
              totalHours += Math.max(1, Math.round(diff / 3600000));
            }
          });

          let tier = 'Bronze Member';
          if (totalBookings >= 20 || totalHours >= 80) tier = 'Platinum Member';
          else if (totalBookings >= 10 || totalHours >= 40) tier = 'Gold Member';
          else if (totalBookings >= 3 || totalHours >= 10) tier = 'Silver Member';

          let memberSince = 'Năm 2026';
          if (user?.createdAt) {
            const d = new Date(user.createdAt);
            memberSince = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
          } else if (valid.length > 0 && valid[0].createdAt) {
            const d = new Date(valid[0].createdAt);
            memberSince = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
          }

          setRealStats({ totalBookings, totalHours, tier, memberSince });
        }
      } catch (e) {
        console.warn('Failed to calculate real booking stats:', e);
      }
    };
    loadRealStats();
    membershipApi.me().then(setMembership).catch(() => setMembership(null));

    // 5. Fetch partner matching suggestions
    const fetchPartners = async () => {
      setIsLoadingPartners(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/matching/suggestions`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          setPartnersList(Array.isArray(json.data) ? json.data : []);
        }
      } catch (err) {
        console.warn('Cannot fetch partner suggestions:', err);
      } finally {
        setIsLoadingPartners(false);
      }
    };
    fetchPartners();
  }, [user]);

  // Re-fetch partners helper
  const reloadPartnerSuggestions = async () => {
    try {
      const token = localStorage.getItem('workhub_access_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/matching/suggestions`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setPartnersList(json.data);
        }
      }
    } catch {
      // quiet
    }
  };

  // ── Save Entire Profile Handler (User Details + Networking + Skills + Social Links) ──
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const contactLinkJson = JSON.stringify({
        linkedin: (socialLinks.linkedin || '').trim(),
        github: (socialLinks.github || '').trim(),
        facebook: (socialLinks.facebook || '').trim(),
        email: (socialLinks.email || '').trim(),
        website: (socialLinks.website || '').trim(),
      });

      // 1. Update basic user profile
      await updateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
        avatarUrl: customAvatarUrl || user?.avatarUrl,
        bio: profileForm.bio,
        profession: profileForm.profession,
        company: profileForm.company,
        contactPublic: profileForm.contactPublic,
        contactLink: contactLinkJson,
      });

      // 2. Persist networking profile with real skills into database
      const token = localStorage.getItem('workhub_access_token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/profiles/me/networking`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bio: profileForm.bio,
            profession: profileForm.profession,
            company: profileForm.company,
            contactEmail: profileForm.email,
            contactPhone: profileForm.phone,
            contactLink: contactLinkJson,
            contactPublic: profileForm.contactPublic,
            skills: skills.map(s => ({
              tagId: s.tagId || null,
              tagName: s.tagName,
              level: s.level || 3,
            })),
            interests: [],
          }),
        });

        // 3. Refresh partner suggestions in background
        void reloadPartnerSuggestions().catch(e => console.warn('Partner suggestions background refresh:', e));
      }

      setIsEditing(false);
      showToast('Cập nhật toàn bộ thông tin hồ sơ và kỹ năng thành công!', 'success');
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

  const handleToggleContactPublic = async (nextVal: boolean) => {
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
    } catch {
      showToast('Không thể lưu cài đặt quyền riêng tư', 'error');
    }
  };

  const handleConnectPartner = (partner: PartnerSuggestion) => {
    if (partner.contactPublic) {
      window.location.href = `mailto:${partner.email}?subject=Ket noi tu CoSpace`;
    } else {
      showToast(`Đã gửi yêu cầu kết nối tới ${partner.name}!`, 'success');
      setSelectedPartner(null);
    }
  };

  // ── Auto-save or Manual-save Skills into Database (Optimized & Non-blocking) ──
  const saveSkillsToBackend = async (
    skillsToSave: { tagId?: string; tagName: string; level?: number }[]
  ) => {
    setIsSavingSkills(true);
    try {
      const token = localStorage.getItem('workhub_access_token');
      if (!token) {
        showToast('Vui lòng đăng nhập để lưu kỹ năng', 'error');
        return;
      }
      const contactLinkJson = JSON.stringify({
        linkedin: (socialLinks.linkedin || '').trim(),
        github: (socialLinks.github || '').trim(),
        facebook: (socialLinks.facebook || '').trim(),
        email: (socialLinks.email || '').trim(),
        website: (socialLinks.website || '').trim(),
      });
      const res = await fetch(`${API_BASE_URL}/api/profiles/me/networking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: profileForm.bio,
          profession: profileForm.profession,
          company: profileForm.company,
          contactEmail: profileForm.email,
          contactPhone: profileForm.phone,
          contactLink: contactLinkJson,
          contactPublic: profileForm.contactPublic,
          skills: skillsToSave.map(s => ({
            tagId: s.tagId || null,
            tagName: s.tagName,
            level: s.level || 3,
          })),
          interests: [],
        }),
      });

      if (res.ok) {
        // Run partner suggestions in the background so tag editing feels instantaneous
        void reloadPartnerSuggestions().catch(e => console.warn('Partner suggestions background refresh:', e));
      } else {
        showToast('Không thể lưu kỹ năng lên máy chủ', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi kết nối máy chủ', 'error');
    } finally {
      setIsSavingSkills(false);
    }
  };

  // ── Skills Handlers ──
  const handleAddSkill = async (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (skills.some(s => s.tagName.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Kỹ năng "${trimmed}" đã có trong danh sách`, 'info');
      return;
    }
    const matchedMaster = availableMasterTags.find(
      t => t.name.toLowerCase() === trimmed.toLowerCase()
    );
    const newSkill = {
      tagId: matchedMaster?.id,
      tagName: matchedMaster?.name || trimmed,
      level: 3,
    };
    const updated = [...skills, newSkill];
    setSkills(updated);
    setNewSkillInput('');
    await saveSkillsToBackend(updated);
  };

  const handleRemoveSkill = async (skillNameToRemove: string) => {
    const updated = skills.filter(
      s => s.tagName.toLowerCase() !== skillNameToRemove.toLowerCase()
    );
    setSkills(updated);
    await saveSkillsToBackend(updated);
  };

  // ── Save Social Links Separately ──
  const handleSaveSocialLinks = async () => {
    setIsSavingSocial(true);
    try {
      const contactLinkJson = JSON.stringify({
        linkedin: (socialLinks.linkedin || '').trim(),
        github: (socialLinks.github || '').trim(),
        facebook: (socialLinks.facebook || '').trim(),
        email: (socialLinks.email || '').trim(),
        website: (socialLinks.website || '').trim(),
      });
      // 1. Update basic profile
      await updateProfile({
        fullName: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
        avatarUrl: customAvatarUrl || user?.avatarUrl,
        bio: profileForm.bio,
        profession: profileForm.profession,
        company: profileForm.company,
        contactPublic: profileForm.contactPublic,
        contactLink: contactLinkJson,
      });

      // 2. Update networking profile in DB
      const token = localStorage.getItem('workhub_access_token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/profiles/me/networking`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bio: profileForm.bio,
            profession: profileForm.profession,
            company: profileForm.company,
            contactEmail: profileForm.email,
            contactPhone: profileForm.phone,
            contactLink: contactLinkJson,
            contactPublic: profileForm.contactPublic,
            skills: skills.map(s => ({
              tagId: s.tagId || null,
              tagName: s.tagName,
              level: s.level || 3,
            })),
            interests: [],
          }),
        });
      }

      setIsEditingSocial(false);
      showToast('Cập nhật liên kết mạng xã hội thành công!', 'success');
    } catch {
      showToast('Lỗi khi lưu liên kết mạng xã hội', 'error');
    } finally {
      setIsSavingSocial(false);
    }
  };

  // ── Filtered & Sorted Partners ──
  const sortedAndFilteredPartners = partnersList
    .filter(partner => {
      const matchesSearch =
        partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.commonTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag = selectedTagFilter
        ? partner.commonTags.includes(selectedTagFilter)
        : true;

      const matchesMode =
        networkFilterMode === 'best'
          ? partner.matchScore >= 50
          : true;

      return matchesSearch && matchesTag && matchesMode;
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const getTierBadgeStyle = (tier: string) => {
    if (tier.includes('Platinum')) {
      return 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-800';
    }
    if (tier.includes('Gold')) {
      return 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700';
    }
    if (tier.includes('Silver')) {
      return 'bg-slate-200 text-slate-900 border-slate-350 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700';
    }
    // Bronze Member: Rõ nét, độ tương phản cao, dịu mắt trên cả Light và Dark theme
    return 'bg-orange-100 text-orange-950 border-orange-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/80';
  };

  const renderAvatarElement = (
    avatarString: string | undefined,
    name: string,
    sizeClass = 'h-14 w-14',
    textClass = 'text-xl'
  ) => {
    const isUrl =
      avatarString &&
      (avatarString.startsWith('http://') ||
        avatarString.startsWith('https://') ||
        avatarString.startsWith('data:image/') ||
        avatarString.startsWith('/'));

    if (isUrl) {
      return (
        <div
          className={`${sizeClass} rounded-2xl overflow-hidden border border-border/60 shadow-md shrink-0 bg-muted/30 relative`}
        >
          <img
            src={avatarString}
            alt={name}
            className="h-full w-full object-cover"
            onError={e => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="h-full w-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold ${textClass}">${
                  name ? name.charAt(0).toUpperCase() : 'U'
                }</div>`;
              }
            }}
          />
        </div>
      );
    }

    const letter =
      avatarString && avatarString.length <= 3
        ? avatarString
        : name
        ? name.charAt(0).toUpperCase()
        : 'U';

    return (
      <div
        className={`${sizeClass} rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shrink-0 ${textClass}`}
      >
        {letter}
      </div>
    );
  };

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
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 -mt-14 sm:-mt-16 mb-6">
            {/* Avatar & Identifiers */}
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 text-center sm:text-left">
              <div className="relative group shrink-0">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl bg-card p-1 ring-4 ring-card/90 shadow-xl overflow-hidden relative">
                  {user?.avatarUrl || customAvatarUrl ? (
                    <img
                      src={customAvatarUrl || user?.avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover rounded-2xl"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {/* Camera change avatar overlay */}
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute inset-1 rounded-2xl bg-black/55 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                    title="Đổi ảnh đại diện"
                  >
                    <FiCamera className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-semibold">Đổi ảnh</span>
                  </button>
                </div>

                {/* Online / Active badge */}
                <div
                  className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-card shadow-sm"
                  title="Đang hoạt động"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {user?.fullName || 'Khách hàng CoSpace'}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold border shadow-xs ${getTierBadgeStyle(
                      tierLabel
                    )}`}
                  >
                    <FiAward className="h-3.5 w-3.5" />
                    {tierLabel}
                  </span>
                </div>

                <p className="text-sm font-medium text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                  <FiBriefcase className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <span className="text-foreground font-semibold">
                      {profileForm.profession || 'Chuyên viên'}
                    </span>
                    {profileForm.company ? ` @ ${profileForm.company}` : ''}
                  </span>
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <FiMail className="h-3.5 w-3.5" /> {profileForm.email || user?.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiCalendar className="h-3.5 w-3.5" /> Tham gia: {realStats.memberSince}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center justify-center lg:justify-end gap-3 shrink-0">
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
              2. MINI STATS DASHBOARD (REAL METRICS)
              ══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-4 border-t border-border/80">
            {/* Metric 1: Bookings */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiCalendar />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Lượt đặt chỗ</p>
                <p className="text-lg font-bold text-foreground">{realStats.totalBookings} lượt</p>
              </div>
            </div>

            {/* Metric 2: Hours */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiClock />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Giờ làm việc</p>
                <p className="text-lg font-bold text-foreground">{realStats.totalHours} giờ</p>
              </div>
            </div>

            {/* Metric 3: Network Matches */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiUsers />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Gợi ý đối tác</p>
                <p className="text-lg font-bold text-foreground">{partnersList.length} người</p>
              </div>
            </div>

            {/* Metric 4: Tier */}
            <div className="bg-muted/40 hover:bg-muted/70 p-3.5 rounded-2xl border border-border/60 transition-all flex items-center gap-3.5 group">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <FiAward />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">Hạng thành viên</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {tierLabel}
                  {!!membership?.currentTier?.discountPercent && (
                    <span className="ml-1.5 text-xs font-semibold">(-{membership.currentTier.discountPercent}%)</span>
                  )}
                </p>
                {membership?.nextTier && (
                  <div className="mt-1 space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${membership.progressPercent}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Lên {membership.nextTier.name}:{' '}
                      {[
                        membership.spendToNextTier > 0 ? `chi tiêu thêm ${formatVND(membership.spendToNextTier)}` : null,
                        membership.bookingsToNextTier > 0 ? `${membership.bookingsToNextTier} đơn nữa` : null,
                      ].filter(Boolean).join(' hoặc ')}
                    </p>
                  </div>
                )}
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
            {/* Bento Card 3: Skills & Professional Expertise */}
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <FiStar className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Kỹ năng & Chuyên môn</h2>
                    <p className="text-xs text-muted-foreground">Tối ưu gợi ý kết nối đối tác phù hợp</p>
                  </div>
                </div>
                {isSavingSkills && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                    <Spinner className="h-3 w-3" />
                    <span>Đang cập nhật...</span>
                  </span>
                )}
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
                  placeholder="Thêm chuyên môn (VD: React, Spring Boot, AI...)"
                  className="flex-1 px-3.5 py-2 text-xs bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium text-foreground"
                />
                <button
                  type="button"
                  disabled={isSavingSkills || !newSkillInput.trim()}
                  onClick={() => handleAddSkill(newSkillInput)}
                  className="px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              {/* Selected Skills List */}
              <div className="flex flex-wrap gap-1.5 mb-4 min-h-[48px] p-2.5 rounded-2xl bg-muted/30 border border-border/60">
                {skills.length === 0 ? (
                  <span className="text-xs text-muted-foreground py-1">Chưa chọn kỹ năng nào</span>
                ) : (
                  skills.map(s => (
                    <span
                      key={s.tagName}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/25 animate-scale-in"
                    >
                      {s.tagName}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s.tagName)}
                        className="hover:text-red-500 transition-colors cursor-pointer p-0.5 rounded-full"
                        title={`Xóa ${s.tagName}`}
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
                  {(availableMasterTags.length > 0
                    ? availableMasterTags.map(t => t.name)
                    : SUGGESTED_SKILLS
                  )
                    .filter(
                      name => !skills.some(s => s.tagName.toLowerCase() === name.toLowerCase())
                    )
                    .slice(0, 8)
                    .map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleAddSkill(name)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-border/80 bg-card hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary transition-all cursor-pointer flex items-center gap-1"
                      >
                        + {name}
                      </button>
                    ))}
                </div>
              </div>
            </section>

            {/* Bento Card 4: Social Links & Portfolio */}
            <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <FiGlobe className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Liên kết mạng xã hội</h2>
                    <p className="text-xs text-muted-foreground">Portfolio và kênh kết nối chuyên nghiệp</p>
                  </div>
                </div>
                {!isEditing && !isEditingSocial && (
                  <button
                    type="button"
                    onClick={() => setIsEditingSocial(true)}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FiEdit2 className="h-3.5 w-3.5" /> Chỉnh sửa
                  </button>
                )}
              </div>

              {isEditing || isEditingSocial ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      LinkedIn Profile URL
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl focus-within:ring-2 focus-within:ring-blue-500/30">
                      <FiLinkedin className="h-4 w-4 text-blue-600 shrink-0" />
                      <input
                        type="url"
                        value={socialLinks.linkedin}
                        onChange={e => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                        className="bg-transparent text-xs w-full focus:outline-none font-medium text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      GitHub Profile URL
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl focus-within:ring-2 focus-within:ring-gray-500/30">
                      <FiGithub className="h-4 w-4 text-foreground shrink-0" />
                      <input
                        type="url"
                        value={socialLinks.github}
                        onChange={e => setSocialLinks({ ...socialLinks, github: e.target.value })}
                        placeholder="https://github.com/username"
                        className="bg-transparent text-xs w-full focus:outline-none font-medium text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Facebook Profile URL
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl focus-within:ring-2 focus-within:ring-blue-600/30">
                      <FiFacebook className="h-4 w-4 text-blue-600 shrink-0" />
                      <input
                        type="url"
                        value={socialLinks.facebook}
                        onChange={e => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                        placeholder="https://facebook.com/username"
                        className="bg-transparent text-xs w-full focus:outline-none font-medium text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Email / Gmail liên hệ công việc
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl focus-within:ring-2 focus-within:ring-rose-500/30">
                      <FiMail className="h-4 w-4 text-rose-500 shrink-0" />
                      <input
                        type="email"
                        value={socialLinks.email}
                        onChange={e => setSocialLinks({ ...socialLinks, email: e.target.value })}
                        placeholder="name@example.com"
                        className="bg-transparent text-xs w-full focus:outline-none font-medium text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Website / Portfolio cá nhân
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/30">
                      <FiGlobe className="h-4 w-4 text-emerald-600 shrink-0" />
                      <input
                        type="url"
                        value={socialLinks.website}
                        onChange={e => setSocialLinks({ ...socialLinks, website: e.target.value })}
                        placeholder="https://yourportfolio.dev"
                        className="bg-transparent text-xs w-full focus:outline-none font-medium text-foreground"
                      />
                    </div>
                  </div>

                  {/* Direct Action buttons for Social Links editing */}
                  {isEditingSocial && !isEditing && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => setIsEditingSocial(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={isSavingSocial}
                        onClick={handleSaveSocialLinks}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingSocial ? (
                          <Spinner className="h-3 w-3 text-white" />
                        ) : (
                          <FiCheck className="h-3.5 w-3.5" />
                        )}
                        <span>Lưu liên kết</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {socialLinks.linkedin || socialLinks.github || socialLinks.facebook || socialLinks.email || socialLinks.website ? (
                    <>
                      {socialLinks.linkedin && (
                        <a
                          href={
                            socialLinks.linkedin.startsWith('http')
                              ? socialLinks.linkedin
                              : `https://${socialLinks.linkedin}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all text-xs font-semibold text-foreground group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                              <FiLinkedin className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">LinkedIn</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {socialLinks.linkedin
                                  .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\/?/, '@')
                                  .replace(/\/$/, '')}
                              </p>
                            </div>
                          </div>
                          <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                        </a>
                      )}

                      {socialLinks.github && (
                        <a
                          href={
                            socialLinks.github.startsWith('http')
                              ? socialLinks.github
                              : `https://${socialLinks.github}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-foreground/5 hover:border-foreground/20 transition-all text-xs font-semibold text-foreground group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-foreground/10 text-foreground">
                              <FiGithub className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">GitHub</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {socialLinks.github
                                  .replace(/^https?:\/\/(www\.)?github\.com\/?/, '@')
                                  .replace(/\/$/, '')}
                              </p>
                            </div>
                          </div>
                          <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </a>
                      )}

                      {socialLinks.facebook && (
                        <a
                          href={
                            socialLinks.facebook.startsWith('http')
                              ? socialLinks.facebook
                              : `https://${socialLinks.facebook}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-blue-600/5 hover:border-blue-600/30 transition-all text-xs font-semibold text-foreground group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600">
                              <FiFacebook className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Facebook</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {socialLinks.facebook
                                  .replace(/^https?:\/\/(www\.)?facebook\.com\/?/, '@')
                                  .replace(/\/$/, '')}
                              </p>
                            </div>
                          </div>
                          <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                        </a>
                      )}

                      {socialLinks.email && (
                        <a
                          href={`mailto:${socialLinks.email}`}
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-rose-500/5 hover:border-rose-500/30 transition-all text-xs font-semibold text-foreground group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                              <FiMail className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Email / Gmail</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {socialLinks.email}
                              </p>
                            </div>
                          </div>
                          <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-rose-500 transition-colors" />
                        </a>
                      )}

                      {socialLinks.website && (
                        <a
                          href={
                            socialLinks.website.startsWith('http')
                              ? socialLinks.website
                              : `https://${socialLinks.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all text-xs font-semibold text-foreground group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                              <FiGlobe className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Portfolio / Website</p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {socialLinks.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </p>
                            </div>
                          </div>
                          <FiExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-dashed border-border/80 text-center flex flex-col items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
                        <FiGlobe className="h-5 w-5 opacity-60" />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">
                        Chưa có liên kết mạng xã hội
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-xs mb-3">
                        Thêm LinkedIn, GitHub, Facebook, Gmail hoặc Portfolio cá nhân để đối tác và đồng nghiệp dễ dàng kết nối với bạn.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsEditingSocial(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <FiPlus className="h-3.5 w-3.5" /> Thêm liên kết ngay
                      </button>
                    </div>
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
        <ProfileNetworkTab
          networkFilterMode={networkFilterMode}
          setNetworkFilterMode={setNetworkFilterMode}
          visiblePartnersCount={visiblePartnersCount}
          setVisiblePartnersCount={setVisiblePartnersCount}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTagFilter={selectedTagFilter}
          setSelectedTagFilter={setSelectedTagFilter}
          partnersList={partnersList}
          sortedAndFilteredPartners={sortedAndFilteredPartners}
          isLoadingPartners={isLoadingPartners}
          renderAvatar={renderAvatarElement}
          onSelectPartner={setSelectedPartner}
          onConnect={handleConnectPartner}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          6. TAB CONTENT 3: ACCOUNT & SECURITY / PRIVACY
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'security' && (
        <ProfileSecurityTab
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          showOldPassword={showOldPassword}
          setShowOldPassword={setShowOldPassword}
          showNewPassword={showNewPassword}
          setShowNewPassword={setShowNewPassword}
          isSavingPassword={isSavingPassword}
          onPasswordChange={handlePasswordChange}
          contactPublic={profileForm.contactPublic}
          onToggleContactPublic={handleToggleContactPublic}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          7. MODALS
          ══════════════════════════════════════════════════════════════ */}
      <PartnerDetailsModal
        partner={selectedPartner}
        onClose={() => setSelectedPartner(null)}
        renderAvatar={renderAvatarElement}
        onConnect={handleConnectPartner}
      />

      <AvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        customAvatarUrl={customAvatarUrl}
        setCustomAvatarUrl={setCustomAvatarUrl}
        userAvatarUrl={user?.avatarUrl}
        userFullName={user?.fullName}
        onSave={handleSaveProfile}
        isUploading={isUploadingAvatar}
        onFileUpload={handleAvatarFileUpload}
        fileInputRef={fileInputRef}
      />
    </div>
  );
};

export default ProfilePage;
