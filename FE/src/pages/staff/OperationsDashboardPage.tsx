import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiUsers, FiClock, FiDollarSign, FiTrendingUp, FiLayers, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { formatTime, formatVND, bookingStatusLabel, bookingStatusColor } from '../../utils/formatters';
import { EmptyState } from '../../components/ui/EmptyState';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { staffApi, StaffDashboardStatsDto } from '../../api/staffApi';

const OperationsDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const branchId = user?.branchId || '33333333-3333-3333-3333-333333333333';
  const branchName = branchId === '33333333-3333-3333-3333-333333333333' ? 'WorkHub Quận 1' : 'WorkHub Chi nhánh';

  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'seated'>('all');
  const [stats, setStats] = useState<StaffDashboardStatsDto | null>(null);
  const [branchBookingsToday, setBranchBookingsToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, bookingsData] = await Promise.all([
          staffApi.getDashboardStats(branchId),
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
  }, [branchId]);

  // Dữ liệu biểu đồ lượng khách theo khung giờ - Giữ nguyên mock cho biểu đồ hiện tại
  const chartData = useMemo(() => {
    return [
      { hour: '08:00', guests: 5, revenue: 350000 },
      { hour: '10:00', guests: 12, revenue: 1200000 },
      { hour: '12:00', guests: 8, revenue: 800000 },
      { hour: '14:00', guests: 15, revenue: 1500000 },
      { hour: '16:00', guests: 10, revenue: 950000 },
      { hour: '18:00', guests: 4, revenue: 400000 },
    ];
  }, []);

  // Lọc danh sách hiển thị theo tab
  const filteredBookings = useMemo(() => {
    if (activeTab === 'incoming') return branchBookingsToday.filter(b => b.status === 'CONFIRMED');
    if (activeTab === 'seated') return branchBookingsToday.filter(b => b.status === 'CHECKED_IN');
    return branchBookingsToday;
  }, [branchBookingsToday, activeTab]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24 lg:pb-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-heading">Dashboard Trực ban</h1>
          <span className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">{branchName}</span>
        </div>
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 text-primary px-5 py-3 rounded-xl shadow-inner">
          <FiUsers className="h-6 w-6 text-primary" />
          <div>
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Đang phục vụ</p>
            <p className="font-bold text-xl leading-tight">{stats?.activeCheckinsCount || 0} khách hàng</p>
          </div>
        </div>
      </div>

      {/* Thẻ Chỉ Số Kinh Doanh & Vận Hành */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
            <FiDollarSign className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Doanh thu hôm nay</p>
            <p className="text-2xl font-bold text-foreground mt-1 truncate">{formatVND(stats?.revenue || 0)}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1 font-medium">
              <FiTrendingUp /> Đã bao gồm dịch vụ
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center shrink-0">
            <FiTrendingUp className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tỷ lệ lấp đầy</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats?.occupancyRate || 0}%</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stats?.occupancyRate || 0}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <FiUsers className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Khách đang ngồi</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats?.activeCheckinsCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Trên tổng số bàn đang mở</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
          <div className="h-14 w-14 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <FiLayers className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bàn Trống / Bảo trì</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats?.availableWs || 0} <span className="text-sm font-normal text-muted-foreground">/ {stats?.maintenanceWs || 0}</span></p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">Sẵn sàng đón khách</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Biểu đồ kinh doanh */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-primary" /> Lượng khách theo khung giờ
            </h2>
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontSize: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="guests" name="Khách hàng" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Lịch trình hôm nay */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FiClock className="text-primary" /> Lịch trình Khách đến hôm nay ({filteredBookings.length})
              </h2>
              <div className="flex gap-1 bg-muted p-1 rounded-xl w-full sm:w-auto">
                <button 
                  onClick={() => setActiveTab('all')} 
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Tất cả
                </button>
                <button 
                  onClick={() => setActiveTab('incoming')} 
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'incoming' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Sắp đến
                </button>
                <button 
                  onClick={() => setActiveTab('seated')} 
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'seated' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Đang ngồi
                </button>
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {filteredBookings.length === 0 ? (
                <EmptyState 
                  icon={FiCalendar} 
                  title="Không có lịch đặt" 
                  description={activeTab === 'incoming' ? "Không có khách nào sắp đến." : activeTab === 'seated' ? "Không có khách nào đang ngồi." : "Chưa có khách hàng nào đặt trước trong ngày hôm nay."}
                  className="py-16"
                />
              ) : filteredBookings.map(b => {
                const statusStr = b.status?.toLowerCase() || '';
                const isIncoming = b.status === 'CONFIRMED';
                const statusColor = (bookingStatusColor as any)[statusStr] || 'bg-gray-100 text-gray-700';
                const statusLabel = (bookingStatusLabel as any)[statusStr] || b.status;

                return (
                  <div key={b.id} className="flex items-center gap-4 rounded-xl bg-muted/40 p-4 border border-border transition-all hover:bg-muted/80 hover:border-border/80">
                    <div className="text-center shrink-0 w-16">
                      <p className="text-lg font-bold text-primary">{formatTime(b.startAt)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(b.endAt)}</p>
                    </div>
                    <div className="h-10 w-px bg-border hidden sm:block" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base truncate">User: {b.userId?.substring(0, 8)}...</p>
                        <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border text-muted-foreground">{b.bookingCode}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">WS: {b.workspaceId?.substring(0, 8)}... <span className="opacity-50">·</span> {formatVND(b.totalAmount)}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3 text-right">
                      <span className={`badge ${statusColor}`}>{statusLabel}</span>
                      {isIncoming && (
                        <button 
                          onClick={() => navigate('/staff/checkin', { state: { bookingCode: b.bookingCode } })}
                          className="btn btn-primary btn-sm shadow-md shadow-primary/20 hidden md:inline-flex items-center gap-1.5"
                        >
                          Check-in <FiArrowRight />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboardPage;
