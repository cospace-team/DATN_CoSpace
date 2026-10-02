import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiUsers, FiClock, FiDollarSign, FiTrendingUp, 
  FiLayers, FiArrowRight, FiSearch, FiX, FiPhone, FiMapPin, FiCheckCircle 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { formatTime, formatVND, bookingStatusLabel, bookingStatusColor } from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { staffApi, StaffDashboardStatsDto, BranchTodayBookingDto } from '../../api/staffApi';
import { getBookingPackageDisplay } from '../../utils/bookingPackage';

const OperationsDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const branchId = user?.branchId || '';
  const branchName = user?.branchName || '';

  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'seated' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [stats, setStats] = useState<StaffDashboardStatsDto | null>(null);
  const [branchBookingsToday, setBranchBookingsToday] = useState<BranchTodayBookingDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, bookingsData] = await Promise.all([
          staffApi.getDashboardStats(branchId, timeFilter),
          staffApi.getBranchTodayBookings(branchId)
        ]);
        setStats(statsData);
        setBranchBookingsToday(bookingsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [branchId, timeFilter]);

  const chartData = useMemo(() => {
    return stats?.chartData || [];
  }, [stats]);

  const timeLabel = useMemo(() => {
    switch (timeFilter) {
      case 'day': return 'hôm nay';
      case 'week': return 'tuần này';
      case 'month': return 'tháng này';
      case 'year': return 'năm nay';
      default: return 'hôm nay';
    }
  }, [timeFilter]);

  const chartTitle = useMemo(() => {
    switch (timeFilter) {
      case 'day': return 'Lượng khách theo khung giờ';
      case 'week': return 'Lượng khách các ngày trong tuần';
      case 'month': return 'Lượng khách các ngày trong tháng';
      case 'year': return 'Lượng khách các tháng trong năm';
      default: return 'Lượng khách';
    }
  }, [timeFilter]);

  const totalGuestsInPeriod = useMemo(() => {
    return chartData.reduce((acc, cur) => acc + (cur.guests || 0), 0);
  }, [chartData]);

  // Đếm số lượng theo trạng thái
  const counts = useMemo(() => {
    return {
      all: branchBookingsToday.length,
      incoming: branchBookingsToday.filter(b => b.status === 'CONFIRMED').length,
      seated: branchBookingsToday.filter(b => b.status === 'CHECKED_IN').length,
      completed: branchBookingsToday.filter(b => b.status === 'COMPLETED').length,
    };
  }, [branchBookingsToday]);



  // Lọc danh sách hiển thị theo tab và từ khóa tìm kiếm
  const filteredBookings = useMemo(() => {
    return branchBookingsToday.filter(b => {
      if (activeTab === 'incoming' && b.status !== 'CONFIRMED') return false;
      if (activeTab === 'seated' && b.status !== 'CHECKED_IN') return false;
      if (activeTab === 'completed' && b.status !== 'COMPLETED') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const pkg = getBookingPackageDisplay(b);
        const matchName = b.customerName?.toLowerCase().includes(q);
        const matchPhone = b.customerPhone?.toLowerCase().includes(q);
        const matchCode = b.bookingCode?.toLowerCase().includes(q);
        const matchWs = b.workspaceName?.toLowerCase().includes(q);
        const matchType = pkg.packageType.toLowerCase().includes(q);
        return matchName || matchPhone || matchCode || matchWs || matchType;
      }
      return true;
    });
  }, [branchBookingsToday, activeTab, searchTerm]);

  // Helper lấy ký tự avatar
  const getAvatarInitials = (name?: string) => {
    if (!name || !name.trim()) return 'K';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Đang tải dữ liệu ca trực ban…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 lg:pb-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-foreground">Trực ban</h1>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full font-medium">
              {branchName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Khách đến hôm nay, chỗ trống và doanh thu của chi nhánh</p>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-xl border border-border/50">
          <button 
            onClick={() => setTimeFilter('day')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${timeFilter === 'day' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Hôm nay
          </button>
          <button 
            onClick={() => setTimeFilter('week')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${timeFilter === 'week' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Tuần này
          </button>
          <button 
            onClick={() => setTimeFilter('month')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${timeFilter === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Tháng này
          </button>
          <button 
            onClick={() => setTimeFilter('year')} 
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${timeFilter === 'year' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Năm nay
          </button>
        </div>

      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiDollarSign} label={`Doanh thu ${timeLabel}`} value={formatVND(stats?.revenue || 0)} sub="Đã gồm dịch vụ thêm" />
        <StatCard icon={FiTrendingUp} label="Tỷ lệ lấp đầy" value={`${stats?.occupancyRate || 0}%`}>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full transition-[width] duration-500" style={{ width: `${Math.min(stats?.occupancyRate || 0, 100)}%` }} />
          </div>
        </StatCard>
        <StatCard
          icon={FiUsers}
          label="Khách đang ngồi"
          value={<>{stats?.activeGuests || 0} <span className="text-sm font-normal text-muted-foreground">/ {stats?.totalCapacity || 0} chỗ</span></>}
        />
        <StatCard
          icon={FiLayers}
          label="Bàn trống"
          value={<>{stats?.availableWs || 0} <span className="text-sm font-normal text-muted-foreground">/ {stats?.totalWs || 0} bàn</span></>}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Biểu đồ kinh doanh & lượng khách */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-base flex items-center gap-2 text-foreground">
                  <FiTrendingUp className="text-primary" /> {chartTitle}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tổng cộng: <span className="font-semibold text-foreground">{totalGuestsInPeriod} lượt khách</span>
                </p>
              </div>
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="label" 
                    stroke="#888888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-border bg-popover p-3 shadow-lg text-xs space-y-1">
                            <p className="font-bold text-foreground">{label}</p>
                            <p className="text-primary flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                              Lượng khách: <span className="font-bold text-foreground">{data.guests} khách</span>
                            </p>
                            <p className="text-muted-foreground">
                              Doanh thu: <span className="font-semibold text-foreground">{formatVND(data.revenue || 0)}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="guests" 
                    name="Khách hàng" 
                    fill="hsl(var(--primary))" 
                    radius={[5, 5, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Lượng khách (lượt)
              </span>
              <span>Múi giờ: Asia/Ho_Chi_Minh</span>
            </div>
          </div>
        </div>

        {/* Lịch trình khách đến hôm nay */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm h-full flex flex-col">
            {/* Header Lịch Trình & Filter Tabs */}
            <div className="flex flex-col gap-4 mb-5 pb-4 border-b border-border">
              <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base flex items-center gap-2 text-foreground whitespace-nowrap">
                    <FiClock className="text-primary" /> Khách đến hôm nay
                    <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {counts.all}
                    </span>
                  </h2>
                  <button 
                    onClick={() => navigate('/staff/checkin')}
                    className="hidden sm:inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium ml-2"
                    title="Mở quầy check-in"
                  >
                    <span>Quầy Check-in</span>
                    <FiArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Tabs trạng thái có số lượng */}
                <div className="flex gap-1 bg-muted/60 p-1 rounded-xl w-full 2xl:w-auto border border-border/50 overflow-x-auto">
                  <button 
                    onClick={() => setActiveTab('all')} 
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      activeTab === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15 font-mono">{counts.all}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('incoming')} 
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      activeTab === 'incoming' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Sắp đến</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">{counts.incoming}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('seated')} 
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      activeTab === 'seated' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Đang ngồi</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">{counts.seated}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('completed')} 
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      activeTab === 'completed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Hoàn tất</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15 font-mono">{counts.completed}</span>
                  </button>
                </div>
              </div>

              {/* Ô tìm kiếm nhanh */}
              <div className="relative w-full">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Tìm kiếm theo tên khách, số điện thoại, mã vé (#WH-...), tên bàn…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <FiX className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách Bookings */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-[480px]">
              {filteredBookings.length === 0 ? (
                <EmptyState 
                  icon={FiCalendar} 
                  title="Không tìm thấy lịch đặt" 
                  description={
                    searchTerm 
                      ? "Không có khách hàng nào khớp với từ khóa tìm kiếm." 
                      : activeTab === 'incoming' 
                      ? "Không có khách nào sắp đến hôm nay." 
                      : activeTab === 'seated' 
                      ? "Không có khách nào đang ngồi tại không gian." 
                      : activeTab === 'completed'
                      ? "Chưa có lượt khách nào hoàn tất ca trong hôm nay."
                      : "Chưa có lượt đặt trước nào trong ngày hôm nay."
                  }
                  className="py-14"
                />
              ) : (
                filteredBookings.map(b => {
                  const statusStr = b.status?.toLowerCase() || '';
                  const isIncoming = b.status === 'CONFIRMED';
                  const isSeated = b.status === 'CHECKED_IN';
                  const statusColor = (bookingStatusColor as any)[statusStr] || 'badge-neutral';
                  const statusLabel = (bookingStatusLabel as any)[statusStr] || b.status;
                  const initials = getAvatarInitials(b.customerName);
                  const pkg = getBookingPackageDisplay(b);

                  return (
                    <div 
                      key={b.id} 
                      className="flex items-center gap-3.5 rounded-2xl bg-card p-3.5 border border-border/80 transition hover:border-primary/40 hover:shadow-sm"
                    >
                      {/* Cột 1: Thông tin gói & Giờ */}
                      {pkg.isMultiDay ? (
                        <div className="text-center shrink-0 w-20 bg-amber-500/5 dark:bg-amber-500/10 py-2 px-1 rounded-xl border border-amber-500/20">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 leading-tight">{pkg.progressText}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-mono">{pkg.dateRangeText}</p>
                          <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.2 rounded border ${pkg.badgeClass}`}>
                            {pkg.packageType}
                          </span>
                        </div>
                      ) : (
                        <div className="text-center shrink-0 w-20 bg-muted/40 py-2 px-1 rounded-xl border border-border/40">
                          <p className="text-sm font-bold text-primary leading-tight">{formatTime(b.startAt)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-mono">{formatTime(b.endAt)}</p>
                          <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.2 rounded border ${pkg.badgeClass}`}>
                            {pkg.packageType}
                          </span>
                        </div>
                      )}

                      {/* Cột 2: Avatar & Chi tiết khách */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 border border-primary/20">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-foreground truncate">
                              {b.customerName || 'Khách vãng lai'}
                            </p>
                            <span className="text-[11px] font-mono font-medium bg-muted px-2 py-0.5 rounded border border-border text-muted-foreground">
                              #{b.bookingCode}
                            </span>
                            {pkg.isMultiDay && (
                              <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.2 rounded-full">
                                {pkg.packageType} · {pkg.progressText}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-foreground/80 font-medium">
                              <FiMapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              {b.workspaceName || 'Bàn làm việc'}
                            </span>
                            {b.customerPhone && (
                              <span className="flex items-center gap-1">
                                <FiPhone className="w-3 h-3 text-muted-foreground shrink-0" />
                                {b.customerPhone}
                              </span>
                            )}
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              {formatVND(b.totalAmount)}
                            </span>
                            {pkg.isMultiDay && (
                              <span className="text-[11px] text-muted-foreground">
                                (Hiệu lực: {pkg.dateRangeText})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cột 3: Trạng thái & Nút thao tác nhanh */}
                      <div className="shrink-0 flex items-center gap-2.5">
                        <span className={`badge ${statusColor} text-xs font-semibold py-1 px-2.5`}>
                          {statusLabel}
                        </span>

                        {isIncoming && (
                          <button 
                            onClick={() => navigate('/staff/checkin', { state: { bookingCode: b.bookingCode } })}
                            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm text-xs py-1.5 px-3"
                            title="Xác nhận check-in cho khách"
                          >
                            <span>Check-in</span>
                            <FiArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isSeated && (
                          <button 
                            onClick={() => navigate('/staff/checkin', { state: { bookingCode: b.bookingCode } })}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1.5 shadow-sm"
                            title="Check-out kết thúc lượt sử dụng"
                          >
                            <span>Check-out</span>
                            <FiArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboardPage;
