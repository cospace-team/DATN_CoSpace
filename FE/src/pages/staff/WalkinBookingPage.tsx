import React, { useState, useEffect } from 'react';
import {
  FiUser, FiClock, FiMapPin,
  FiDollarSign, FiSearch, FiCheckCircle,
  FiCheck, FiUserPlus, FiMaximize, FiCreditCard, FiZap,
  FiMap, FiList
} from 'react-icons/fi';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { staffApi, WorkspaceBookingStatusDto } from '../../api/staffApi';
import { formatVND, formatDateTimeLocal } from '../../utils/formatters';
import type { FloorResponse } from '../../lib/spaceApi';
import FloorPlanViewer from '../../components/floor-plan/FloorPlanViewer';
import type { FloorLayout } from '../../types/floorPlan';

const WalkinBookingPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const currentBranchId = user?.branchId || 'branch-0001';

  // State: Data
  const [floors, setFloors] = useState<FloorResponse[]>([]);
  const [workspacesStatus, setWorkspacesStatus] = useState<WorkspaceBookingStatusDto[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Step 1: Customer Info
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Step 2: Time & Space
  const [durationHours, setDurationHours] = useState<number>(1);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [autoCheckIn, setAutoCheckIn] = useState(true);

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'card'>('cash');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBookingCode, setCreatedBookingCode] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [floorsRes, statusRes] = await Promise.all([
        staffApi.getFloors(currentBranchId),
        staffApi.getWorkspaceBookingStatus(currentBranchId)
      ]);
      setFloors(floorsRes);
      if (floorsRes.length > 0 && !selectedFloorId) {
        setSelectedFloorId(floorsRes[0].id);
      }
      setWorkspacesStatus(statusRes);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải dữ liệu', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentBranchId]);

  // Customer search logic
  const handleSearchUser = async () => {
    if (!phoneSearch.trim()) return;
    try {
      const results = await staffApi.searchUsers(phoneSearch);
      if (results.length > 0) {
        setSearchResults(results);
        setSelectedUser(null);
        setIsNewUser(false);
        if (results.length === 1) {
            handleSelectUser(results[0]);
        }
      } else {
        setSearchResults([]);
        setSelectedUser(null);
        setIsNewUser(true);
        const isPhone = /^\d+$/.test(phoneSearch.trim());
        if (isPhone) {
          setNewUserPhone(phoneSearch);
          setNewUserName('');
        } else {
          setNewUserName(phoneSearch);
          setNewUserPhone('');
        }
        showToast('Không tìm thấy khách hàng, vui lòng tạo hồ sơ mới', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tìm kiếm khách hàng', 'error');
    }
  };

  const handleSelectUser = (user: any) => {
      setSelectedUser(user);
      setSearchResults([]);
      setIsNewUser(false);
      showToast(`Đã chọn khách hàng: ${user.fullName}`, 'info');
  };

  const handleCreateNewUserClick = () => {
      setSelectedUser(null);
      setSearchResults([]);
      setIsNewUser(true);
      const isPhone = /^\d+$/.test(phoneSearch.trim());
      if (isPhone) {
        setNewUserPhone(phoneSearch);
        setNewUserName('');
      } else {
        setNewUserName(phoneSearch);
        setNewUserPhone('');
      }
  };

  // Pricing calculations
  const duration = durationHours;
  const wsPrice = selectedWorkspaceId ? 50000 : 0; // TODO: Get price from pricing endpoint
  const subtotal = wsPrice * duration;
  const total = subtotal;

  const currentFloor = floors.find((f) => f.id === selectedFloorId);
  
  const currentLayout = React.useMemo<FloorLayout | null>(() => {
    if (!currentFloor?.layoutJson) return null;
    try { return JSON.parse(currentFloor.layoutJson) as FloorLayout; }
    catch { return null; }
  }, [currentFloor?.layoutJson]);

  const checkOverlap = (wsId: string, checkStart: Date, checkEnd: Date) => {
    const ws = workspacesStatus.find(w => w.workspaceId === wsId);
    if (!ws) return false;
    if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) return true;

    return ws.todayBookings.some(b => {
      if (['canceled', 'completed', 'expired'].includes(b.status?.toLowerCase())) return false;
      const bStart = new Date(b.startAt);
      const bEnd = new Date(b.endAt);
      return checkStart < bEnd && bStart < checkEnd;
    });
  };

  const getAvailability = React.useCallback((wsId: string) => {
    const ws = workspacesStatus.find(w => w.workspaceId === wsId);
    if (!ws) return 'unassigned';
    
    if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) return 'maintenance';
    
    const now = new Date();
    const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    const isBooked = checkOverlap(wsId, now, end);
    if (isBooked) return 'booked';
    
    return 'available';
  }, [workspacesStatus, durationHours]);

  const handleSelectWorkspace = (wsId: string | null) => {
    if (!wsId) return;
    const ws = workspacesStatus.find(w => w.workspaceId === wsId);
    if (!ws) return;
    
    if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) {
      showToast('Vị trí này đang bảo trì!', 'error');
      return;
    }
    
    const now = new Date();
    const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    if (checkOverlap(wsId, now, end)) {
      showToast('Vị trí này đã có người đặt trong khung giờ này!', 'error');
      return;
    }

    setSelectedWorkspaceId(wsId);
  };

  const handleConfirm = async () => {
    if ((!selectedUser && !newUserName) || !selectedWorkspaceId) {
      showToast('Vui lòng nhập thông tin khách hàng và chọn bàn làm việc!', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const st = new Date();
      const et = new Date(st.getTime() + durationHours * 60 * 60 * 1000);

      const wsStatus = workspacesStatus.find(w => w.workspaceId === selectedWorkspaceId);
      const wsTypeId = wsStatus?.workspaceTypeId;

      if (!wsTypeId) {
        showToast('Không tìm thấy thông tin loại bàn (Workspace Type) hợp lệ!', 'error');
        setIsSubmitting(false);
        return;
      }

      const bookingPayload = {
        branchId: currentBranchId,
        workspaceId: selectedWorkspaceId,
        workspaceTypeId: wsTypeId,
        startAt: st.toISOString(),
        endAt: et.toISOString(),
        unit: 'hour',
        unitCount: duration,
        customerId: selectedUser?.id,
        customerName: isNewUser ? newUserName : undefined,
        customerPhone: isNewUser ? newUserPhone : undefined,
      };
      
      const booking = await staffApi.createWalkinBooking(bookingPayload);
      
      if (paymentMethod === 'cash') {
        await staffApi.createCashPayment(booking.id);
      } else {
        showToast("Hiện tại Walk-in chỉ hỗ trợ Tiền mặt, hệ thống tự động ghi nhận thanh toán Tiền mặt", "info");
        await staffApi.createCashPayment(booking.id);
      }
      
      if (autoCheckIn) {
        await staffApi.checkin(booking.id, "Auto check-in từ quầy");
      }
      
      setCreatedBookingCode(booking.bookingCode);
      setIsSuccess(true);
      showToast(`Đã tạo booking tại quầy thành công: ${booking.bookingCode}`, 'success');
      
      // Refresh status
      await fetchData();

    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tạo booking. Có thể đã trùng lịch!', 'error');
      // Refresh status just in case
      await fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPhoneSearch('');
    setSearchResults([]);
    setSelectedUser(null);
    setIsNewUser(false);
    setNewUserName('');
    setNewUserPhone('');
    setDurationHours(1);
    setSelectedWorkspaceId(null);
    setPaymentMethod('cash');
    setIsSuccess(false);
  };

  if (isSuccess) {
    const wsName = workspacesStatus.find(w => w.workspaceId === selectedWorkspaceId)?.name || 'Chỗ ngồi';
    const customerName = selectedUser?.fullName || newUserName || 'Khách vãng lai';

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-fade-scale-in">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-3xl flex items-center justify-center mb-4 border border-emerald-500/30 shadow-xl">
          <FiCheckCircle className="h-10 w-10" />
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
          MÃ ĐƠN: {createdBookingCode}
        </span>
        <h1 className="text-2xl font-bold font-heading text-foreground mt-2">
          Tạo Đặt chỗ & Thu tiền thành công!
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          Khách hàng <strong className="text-foreground">{customerName}</strong> đã được xếp chỗ tại <strong className="text-primary">{wsName}</strong> ({duration} giờ).
        </p>

        {autoCheckIn && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <FiZap className="h-4 w-4" /> Đã tự động kích hoạt Check-in nhận vị trí ngay.
          </div>
        )}

        <div className="flex items-center gap-3 mt-6">
          <button onClick={handleReset} className="btn btn-primary px-6 py-2.5 rounded-xl font-bold">
            + Tạo đơn Walk-in khác
          </button>
        </div>
      </div>
    );
  }

  // Lọc workspace của tầng hiện tại cho list view
  const currentFloorWorkspaces = workspacesStatus.filter(ws => {
    // Ideally we should have floorId in WorkspaceBookingStatusDto, 
    // but for now let's just show all or match by layout logic.
    // Since we don't have floorId in DTO, list view might show all workspaces,
    // which is fine for branch level, or we need to add floorId to the backend.
    // For now, let's just show all in list view.
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Banner Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold font-heading text-foreground">Tạo Booking Walk-in Tại Quầy</h1>
        <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
          {currentBranchId.substring(0, 8).toUpperCase()} POS
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          
          {/* STEP 1: Customer Information */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="font-bold flex items-center gap-2 text-base text-foreground font-heading border-b border-border pb-3">
              <FiUser className="text-primary h-5 w-5" /> 1. Khách hàng
            </h2>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  value={phoneSearch}
                  onChange={e => {
                    setPhoneSearch(e.target.value);
                    if (e.target.value === '') {
                        setSearchResults([]);
                    }
                  }}
                  placeholder="Nhập SĐT hoặc Tên khách hàng để tìm..."
                  className="input-field !pl-10 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                />
              </div>
              <button onClick={handleSearchUser} className="btn btn-secondary px-4 text-xs font-bold">
                Tìm kiếm
              </button>
              <button onClick={handleCreateNewUserClick} className="btn border border-border bg-card hover:bg-muted text-foreground px-4 text-xs font-bold whitespace-nowrap">
                + Tạo mới
              </button>
            </div>

            {searchResults.length > 1 && !selectedUser && (
              <div className="border border-border rounded-xl overflow-hidden mt-2 bg-card">
                <div className="bg-muted/50 px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border">
                  Tìm thấy {searchResults.length} kết quả. Vui lòng chọn khách hàng:
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map(user => (
                    <button 
                      key={user.id} 
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-primary/5 transition text-left"
                    >
                      <div>
                        <p className="font-bold text-sm text-foreground">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{user.phone} · {user.email}</p>
                      </div>
                      <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg">Chọn</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex justify-between items-center animate-fade-scale-in mt-2 relative">
                <div>
                  <p className="font-bold text-sm text-primary">{selectedUser.fullName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedUser.phone} · {selectedUser.email}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="badge badge-success text-[10px] font-bold">Hồ sơ có sẵn</span>
                  <button onClick={() => setSelectedUser(null)} className="text-xs font-bold text-muted-foreground hover:text-destructive underline">Hủy chọn</button>
                </div>
              </div>
            )}

            {isNewUser && !selectedUser && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 text-amber-700 dark:text-amber-400 space-y-2 animate-fade-scale-in mt-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold flex items-center gap-2">
                    <FiUserPlus className="h-4 w-4" /> Tạo mới khách vãng lai:
                  </p>
                  <button onClick={() => setIsNewUser(false)} className="text-[10px] font-bold underline hover:text-amber-800">Hủy</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="Họ và Tên đầy đủ..."
                    className="input-field text-sm bg-card text-foreground border-amber-200 focus:border-amber-500"
                  />
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="Số điện thoại..."
                    className="input-field text-sm bg-card text-foreground border-amber-200 focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Time & Floor Space Selection */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold flex items-center gap-2 text-base text-foreground font-heading">
                <FiClock className="text-primary h-5 w-5" /> 2. Thời gian & Vị trí làm việc
              </h2>
              <div className="flex bg-muted p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('map')}
                  className={`flex items-center justify-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'map' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <FiMap /> Bản đồ
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`flex items-center justify-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <FiList /> Bảng
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Giờ bắt đầu</label>
                <div className="input-field text-sm font-semibold flex items-center text-muted-foreground bg-muted/50 h-10">
                  Ngay lúc này (Real-time)
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Thời lượng (Giờ)</label>
                <select value={durationHours} onChange={e => {setDurationHours(parseInt(e.target.value)); setSelectedWorkspaceId(null);}} className="input-field text-sm font-semibold h-10">
                  {[1, 2, 3, 4, 5, 8, 12].map(h => (
                    <option key={h} value={h}>{h} giờ (Đến khoảng {new Date(new Date().getTime() + h * 60 * 60 * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FiMapPin className="text-primary" /> Chọn vị trí ({viewMode === 'map' ? 'Sơ đồ Tầng' : 'Danh sách'})
                </label>
                {viewMode === 'map' && (
                  <div className="flex gap-1.5 overflow-x-auto">
                    {floors.map(f => (
                      <button 
                        key={f.id} 
                        onClick={() => { setSelectedFloorId(f.id); setSelectedWorkspaceId(null); }}
                        className={`px-3 py-1 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                          selectedFloorId === f.id ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {viewMode === 'map' ? (
                <div className="rounded-xl border border-border bg-card h-[450px] overflow-hidden">
                  {currentLayout ? (
                    <FloorPlanViewer
                      layout={currentLayout}
                      selectedWsId={selectedWorkspaceId}
                      onSelectWorkspace={handleSelectWorkspace}
                      onElementClick={(el) => handleSelectWorkspace(el.workspaceId || null)}
                      getAvailability={getAvailability}
                      isAdmin={false}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Tầng này chưa có bản đồ.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="data-table text-sm">
                    <thead>
                      <tr>
                        <th>Tên Không gian</th>
                        <th>Trạng thái</th>
                        <th className="text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentFloorWorkspaces.map(ws => {
                        const avail = getAvailability(ws.workspaceId);
                        const isSelected = selectedWorkspaceId === ws.workspaceId;
                        return (
                          <tr key={ws.workspaceId} className={isSelected ? 'bg-primary/5' : ''}>
                            <td className="font-medium text-foreground">{ws.name}</td>
                            <td>
                              {avail === 'available' ? (
                                <span className="badge badge-success">Trống</span>
                              ) : avail === 'booked' ? (
                                <span className="badge badge-warning">Đã đặt</span>
                              ) : (
                                <span className="badge badge-outline text-red-500">Bảo trì</span>
                              )}
                            </td>
                            <td className="text-right">
                              <button
                                disabled={avail !== 'available'}
                                onClick={() => handleSelectWorkspace(ws.workspaceId)}
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'} ${avail !== 'available' ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isSelected ? 'Đã chọn' : 'Chọn'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: POS Payment & Checkout Summary */}
        <div className="lg:block">
          <div className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24 shadow-lg space-y-5 lg:max-h-[calc(100vh-120px)] overflow-y-auto">
            <h2 className="font-bold text-base uppercase tracking-wider text-muted-foreground font-heading">
              Tóm tắt POS & Thu tiền
            </h2>
            
            <div className="p-3 bg-muted/40 rounded-xl border border-border mb-4">
              <p className="text-xs text-muted-foreground font-bold mb-1">Vị trí đang chọn:</p>
              <p className="text-sm font-bold text-primary">
                {workspacesStatus.find(w => w.workspaceId === selectedWorkspaceId)?.name || 'Chưa chọn'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tiền chỗ ({duration} giờ)</span>
                <span className="font-mono font-semibold text-foreground">{formatVND(subtotal)}</span>
              </div>
              
              <div className="pt-3 border-t border-border flex justify-between items-end">
                <span className="font-bold text-sm">Tổng thu khách</span>
                <span className="font-extrabold text-2xl text-primary font-mono">{formatVND(total)}</span>
              </div>
            </div>

            {/* Payment Method Option */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hình thức thanh toán</p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3.5 rounded-xl border text-sm font-bold transition flex items-center justify-between gap-3 ${
                    paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'border-border text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FiDollarSign className="h-5 w-5" />
                    <span>Tiền mặt</span>
                  </div>
                  {paymentMethod === 'cash' && <FiCheckCircle className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`p-3.5 rounded-xl border text-sm font-bold transition flex items-center justify-between gap-3 opacity-50 cursor-not-allowed ${
                    paymentMethod === 'momo' ? 'border-[#A50064] bg-[#A50064]/10 text-[#A50064]' : 'border-border text-muted-foreground'
                  }`}
                  disabled
                  title="MoMo currently disabled for MVP Walk-in"
                >
                  <div className="flex items-center gap-3">
                    <FiMaximize className="h-5 w-5" />
                    <span>Ví điện tử MoMo</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-xl border text-sm font-bold transition flex items-center justify-between gap-3 opacity-50 cursor-not-allowed ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                  }`}
                  disabled
                  title="Card currently disabled for MVP Walk-in"
                >
                  <div className="flex items-center gap-3">
                    <FiCreditCard className="h-5 w-5" />
                    <span>Thẻ ATM / Tín dụng</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Auto Check-in Toggle */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border cursor-pointer">
              <input
                type="checkbox"
                checked={autoCheckIn}
                onChange={e => setAutoCheckIn(e.target.checked)}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-xs font-semibold text-foreground">Kích hoạt Check-in ngay cho khách</span>
            </label>

            <button 
              disabled={(!selectedUser && !newUserName) || !selectedWorkspaceId || isSubmitting} 
              onClick={handleConfirm}
              className="btn btn-primary w-full py-4 text-sm font-bold shadow-lg shadow-primary/25 rounded-xl"
            >
              <FiCheck className="h-4 w-4 mr-1.5" />
              <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận & Thu tiền POS'}</span>
            </button>

            {((!selectedUser && !newUserName) || !selectedWorkspaceId) && (
              <p className="text-[11px] text-center text-destructive font-semibold">
                Vui lòng điền tên khách và chọn bàn trước khi thu tiền.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkinBookingPage;
