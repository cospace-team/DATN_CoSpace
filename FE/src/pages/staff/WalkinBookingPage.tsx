import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  FiUser, FiClock, FiMapPin,
  FiDollarSign, FiSearch, FiCheckCircle,
  FiCheck, FiUserPlus, FiMaximize, FiCreditCard, FiZap,
  FiMap, FiList, FiAlertCircle, FiRefreshCw, FiChevronDown, FiPhone, FiTag,
  FiArrowRight, FiInfo, FiCopy, FiX, FiExternalLink, FiSmartphone, FiLayers,
  FiFileText, FiShield
} from 'react-icons/fi';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { staffApi, WorkspaceBookingStatusDto } from '../../api/staffApi';
import { customerSpaceApi, BranchResponse, FloorResponse } from '../../lib/spaceApi';
import { bookingApi } from '../../lib/bookingApi';
import { API_BASE_URL } from '../../config/api';
import { formatVND } from '../../utils/formatters';
import FloorPlanViewer from '../../components/floor-plan/FloorPlanViewer';
import type { FloorLayout, LayoutElement } from '../../types/floorPlan';
import { useStableCallback } from '../../hooks/useStableCallback';
import { Spinner } from '../../components/ui/Spinner';
import { Skeleton } from '../../components/ui/Skeleton';

const QUICK_DURATIONS = [
  { hours: 1, label: '1 Giờ' },
  { hours: 2, label: '2 Giờ' },
  { hours: 3, label: '3 Giờ' },
  { hours: 4, label: '4 Giờ' },
  { hours: 8, label: '8 Giờ (Cả ngày)' },
];

const BANK_INFO = {
  bankName: 'MB Bank (Ngân hàng TMCP Quân Đội)',
  bankBin: '970422',
  accountNumber: '0386868888',
  accountName: 'COSPACE COWORKING VIETNAM',
};

interface QrModalState {
  isOpen: boolean;
  bookingId: string;
  bookingCode: string;
  amount: number;
  orderCode?: number | string;
  checkoutUrl?: string;
  qrCode?: string;
}

const WalkinBookingPage: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);

  // Branch handling
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');

  const activeBranchId = user?.branchId || selectedBranchId;
  const isSuperAdmin = user?.role === 'super_admin';

  // State: Data
  const [floors, setFloors] = useState<FloorResponse[]>([]);
  const [workspacesStatus, setWorkspacesStatus] = useState<WorkspaceBookingStatusDto[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // List View specific filter
  const [listTableFloorFilter, setListTableFloorFilter] = useState<string>('all');
  const [listSearchQuery, setListSearchQuery] = useState<string>('');
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'available'>('all');

  // Step 1: Customer Info
  const [customerMode, setCustomerMode] = useState<'quick' | 'search' | 'create'>('quick');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newUserName, setNewUserName] = useState('Khách vãng lai');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Step 2: Time & Duration Mode
  const [timeMode, setTimeMode] = useState<'preset' | 'custom'>('preset');
  const [presetHours, setPresetHours] = useState<number>(1);
  const [customEndTime, setCustomEndTime] = useState<string>(() => {
    const d = new Date(Date.now() + 2 * 3600 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [autoCheckIn, setAutoCheckIn] = useState(true);

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vietqr' | 'momo'>('cash');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBookingCode, setCreatedBookingCode] = useState('');

  // QR Modal State
  const [qrModal, setQrModal] = useState<QrModalState | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isConfirmingQr, setIsConfirmingQr] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [pricePolicies, setPricePolicies] = useState<any[]>([]);

  // Realtime clock display
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio chime on payment success
  const playSuccessChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // Audio not permitted
    }
  }, []);

  // Copy helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Đã sao chép: ${fieldName}`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 1. Fetch branch list
  useEffect(() => {
    let isMounted = true;
    const loadBranches = async () => {
      try {
        const bList = await customerSpaceApi.listBranches();
        if (isMounted) {
          setBranches(bList);
          if (!selectedBranchId && bList.length > 0) {
            setSelectedBranchId(user?.branchId || bList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load branches for POS:', err);
      }
    };
    loadBranches();
    return () => { isMounted = false; };
  }, [user?.branchId]);

  // 2. Fetch floors, status & pricing when activeBranchId changes
  const fetchData = useCallback(async () => {
    if (!activeBranchId) {
      setIsLoadingSpaces(false);
      return;
    }

    setIsLoadingSpaces(true);
    try {
      const [floorsRes, statusRes, policiesRes] = await Promise.all([
        staffApi.getFloors(activeBranchId),
        staffApi.getWorkspaceBookingStatus(activeBranchId),
        staffApi.getPricePolicies().catch(() => [])
      ]);
      setFloors(floorsRes);
      if (floorsRes.length > 0) {
        setSelectedFloorId((prev) => (floorsRes.some((f) => f.id === prev) ? prev : floorsRes[0].id));
      } else {
        setSelectedFloorId('');
      }
      setWorkspacesStatus(statusRes);
      setPricePolicies(policiesRes || []);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tải dữ liệu sơ đồ', 'error');
    } finally {
      setIsLoadingSpaces(false);
    }
  }, [activeBranchId, showToast]);

  useEffect(() => {
    if (activeBranchId) {
      fetchData();
    }
  }, [activeBranchId, fetchData]);

  // Customer search logic
  const handleSearchUser = async () => {
    if (!phoneSearch.trim()) return;
    setIsSearchingUser(true);
    try {
      const results = await staffApi.searchUsers(phoneSearch.trim());
      if (results.length > 0) {
        setSearchResults(results);
        setSelectedUser(null);
        if (results.length === 1) {
          handleSelectUser(results[0]);
        }
      } else {
        setSearchResults([]);
        setSelectedUser(null);
        setCustomerMode('create');
        const isPhone = /^\d+$/.test(phoneSearch.trim());
        if (isPhone) {
          setNewUserPhone(phoneSearch.trim());
          setNewUserName('');
        } else {
          setNewUserName(phoneSearch.trim());
          setNewUserPhone('');
        }
        showToast('Không tìm thấy khách hàng. Đã chuyển sang đăng ký mới hồ sơ', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tìm kiếm khách hàng', 'error');
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleSelectUser = (u: any) => {
    setSelectedUser(u);
    setSearchResults([]);
    showToast(`Đã chọn khách hàng: ${u.fullName}`, 'info');
  };

  const currentFloor = floors.find((f) => f.id === selectedFloorId);

  const currentLayout = useMemo<FloorLayout | null>(() => {
    if (!currentFloor?.layoutJson) return null;
    try {
      return JSON.parse(currentFloor.layoutJson) as FloorLayout;
    } catch {
      return null;
    }
  }, [currentFloor?.layoutJson]);

  // Selected workspace lookup
  const selectedWsInfo = useMemo(() => {
    if (!selectedWorkspaceId) return null;
    return workspacesStatus.find((w) => w.workspaceId === selectedWorkspaceId);
  }, [selectedWorkspaceId, workspacesStatus]);

  // Get floor name for any workspace
  const getFloorNameForWs = useCallback((ws: WorkspaceBookingStatusDto | null | undefined) => {
    if (!ws) return '';
    if (ws.floorId) {
      const f = floors.find((item) => item.id === ws.floorId);
      if (f) return f.name;
    }
    return currentFloor?.name || 'Khu vực quầy';
  }, [floors, currentFloor]);

  // Timing & Duration Computations
  const timingInfo = useMemo(() => {
    const now = new Date();
    if (timeMode === 'preset') {
      const end = new Date(now.getTime() + presetHours * 3600 * 1000);
      return {
        start: now,
        end,
        totalMinutes: presetHours * 60,
        billableHours: presetHours,
        displayDuration: `${presetHours} giờ`,
        displayEnd: end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isExact: true
      };
    } else {
      let end = new Date(now);
      if (customEndTime) {
        const [h, m] = customEndTime.split(':').map(Number);
        end.setHours(h, m, 0, 0);
      }
      let diffMs = end.getTime() - now.getTime();
      if (diffMs <= 0) {
        // If chosen time is past today, default +1h
        diffMs = 3600 * 1000;
        end = new Date(now.getTime() + diffMs);
      }
      const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      // Core Rule 8: ceilDiv per hour
      const billableHours = Math.max(1, Math.ceil(totalMinutes / 60));
      const displayDuration = hours > 0
        ? (mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`)
        : `${mins} phút`;

      return {
        start: now,
        end,
        totalMinutes,
        billableHours,
        displayDuration,
        displayEnd: end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isExact: false
      };
    }
  }, [timeMode, presetHours, customEndTime]);

  // Pricing calculations
  const wsPrice = useMemo(() => {
    if (!selectedWsInfo) return 0;
    const typeId = (selectedWsInfo.workspaceTypeId || '').toLowerCase();

    if (pricePolicies && pricePolicies.length > 0) {
      const branchPolicy = pricePolicies.find((p: any) =>
        p.branchId === activeBranchId &&
        p.workspaceTypeId?.toLowerCase() === typeId &&
        p.durationUnit === 'hour' &&
        p.isActive !== false
      );
      if (branchPolicy && branchPolicy.price) return Number(branchPolicy.price);

      const globalPolicy = pricePolicies.find((p: any) =>
        !p.branchId &&
        p.workspaceTypeId?.toLowerCase() === typeId &&
        p.durationUnit === 'hour' &&
        p.isActive !== false
      );
      if (globalPolicy && globalPolicy.price) return Number(globalPolicy.price);
    }

    const wsName = (selectedWsInfo.name || '').toLowerCase();
    if (typeId.includes('meeting') || wsName.includes('meeting') || wsName.includes('phòng họp')) {
      return 150000;
    }
    if (typeId.includes('private') || wsName.includes('private') || wsName.includes('văn phòng')) {
      return 200000;
    }
    return 30000;
  }, [selectedWsInfo, activeBranchId, pricePolicies]);

  const subtotal = wsPrice * timingInfo.billableHours;
  const total = subtotal;

  const checkOverlap = (wsId: string, checkStart: Date, checkEnd: Date) => {
    const ws = workspacesStatus.find((w) => w.workspaceId === wsId);
    if (!ws) return false;
    if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) return true;

    return ws.todayBookings.some((b) => {
      if (['canceled', 'completed', 'expired'].includes(b.status?.toLowerCase())) return false;
      const bStart = new Date(b.startAt);
      const bEnd = new Date(b.endAt);
      return checkStart < bEnd && bStart < checkEnd;
    });
  };

  const getWorkspaceInfo = useCallback((wsId: string) => {
    const ws = workspacesStatus.find((w) => w.workspaceId === wsId);
    return ws ? { code: ws.code, capacity: ws.capacity } : null;
  }, [workspacesStatus]);

  // Avoid flashing unassigned/gray while spaces are loading
  const getAvailability = useCallback((wsId: string) => {
    const ws = workspacesStatus.find((w) => w.workspaceId === wsId);
    if (!ws) return isLoadingSpaces ? 'available' : 'unassigned';

    if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) return 'maintenance';

    const isBooked = checkOverlap(wsId, timingInfo.start, timingInfo.end);
    if (isBooked) return 'booked';

    return 'available';
  }, [workspacesStatus, timingInfo, isLoadingSpaces]);

  const handleSelectWorkspace = (wsId: string | null) => {
    if (!wsId) return;
    const ws = workspacesStatus.find((w) => w.workspaceId === wsId);
    if (!ws) return;

    if (ws.workspaceStatus === 'maintenance' || ws.activeMaintenance) {
      showToast('Vị trí này đang bảo trì!', 'error');
      return;
    }

    if (checkOverlap(wsId, timingInfo.start, timingInfo.end)) {
      showToast('Vị trí này đã có người đặt trong khung giờ này!', 'error');
      return;
    }

    setSelectedWorkspaceId(wsId);

    // Smoothly scroll down to receipt section so staff can review invoice immediately
    setTimeout(() => {
      receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  const onMapSelectWorkspace = useStableCallback(handleSelectWorkspace);
  const onMapElementClick = useStableCallback((el: LayoutElement) =>
    handleSelectWorkspace(el.workspaceId || null)
  );

  // Statistics calculation for the current floor
  const floorStats = useMemo(() => {
    if (!currentLayout) return { available: 0, booked: 0, maintenance: 0, total: 0 };
    const elements = currentLayout.elements.filter((e) => e.workspaceId);
    let available = 0;
    let booked = 0;
    let maintenance = 0;

    elements.forEach((e) => {
      const status = getAvailability(e.workspaceId!);
      if (status === 'available') available++;
      else if (status === 'booked') booked++;
      else if (status === 'maintenance') maintenance++;
    });

    return { available, booked, maintenance, total: elements.length };
  }, [currentLayout, getAvailability]);

  // Filtered workspaces for List View table
  const filteredListWorkspaces = useMemo(() => {
    return workspacesStatus.filter((ws) => {
      // 1. Floor filter
      if (listTableFloorFilter !== 'all' && ws.floorId && ws.floorId !== listTableFloorFilter) {
        return false;
      }
      // 2. Search query filter
      if (listSearchQuery.trim()) {
        const query = listSearchQuery.toLowerCase();
        const matchesCode = (ws.code || '').toLowerCase().includes(query);
        const matchesName = (ws.name || '').toLowerCase().includes(query);
        if (!matchesCode && !matchesName) return false;
      }
      // 3. Status filter
      if (listStatusFilter === 'available') {
        const avail = getAvailability(ws.workspaceId);
        if (avail !== 'available') return false;
      }
      return true;
    });
  }, [workspacesStatus, listTableFloorFilter, listSearchQuery, listStatusFilter, getAvailability]);

  // Helper for quick time additions in custom mode
  const handleAddMinutes = (extraMinutes: number) => {
    const base = new Date();
    const target = new Date(base.getTime() + extraMinutes * 60 * 1000);
    const val = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
    setCustomEndTime(val);
  };

  const handleSetExactHour = (hour: number) => {
    const val = `${String(hour).padStart(2, '0')}:00`;
    setCustomEndTime(val);
  };

  // Complete QR / Transfer payment handler
  const handleCompleteQrPayment = useCallback(async () => {
    if (!qrModal?.bookingId) return;
    setIsConfirmingQr(true);
    try {
      if (autoCheckIn) {
        await staffApi.checkin(qrModal.bookingId, 'Check-in tại quầy POS').catch(() => null);
      }

      playSuccessChime();
      setCreatedBookingCode(qrModal.bookingCode);
      setIsSuccess(true);
      showToast(`Đã nhận thanh toán thành công đơn hàng: ${qrModal.bookingCode}`, 'success');
      setQrModal(null);
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Lỗi hoàn tất đơn hàng', 'error');
    } finally {
      setIsConfirmingQr(false);
    }
  }, [qrModal, autoCheckIn, playSuccessChime, showToast, fetchData]);

  // Polling for PayOS payment confirmation
  useEffect(() => {
    if (!qrModal?.isOpen || !qrModal?.orderCode || isSuccess) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payments/payos/status/${qrModal.orderCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'PAID') {
            handleCompleteQrPayment();
          }
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [qrModal, isSuccess, handleCompleteQrPayment]);

  // Simulate payment confirmation (Demo mode)
  const handleSimulatePayment = async () => {
    if (!qrModal?.orderCode) return;
    setIsConfirmingQr(true);
    try {
      const token = localStorage.getItem('workhub_access_token');
      const res = await fetch(`${API_BASE_URL}/api/payments/payos/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ orderCode: qrModal.orderCode })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Không thể mô phỏng thanh toán');
      }

      await handleCompleteQrPayment();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi mô phỏng thanh toán', 'error');
      setIsConfirmingQr(false);
    }
  };

  // Receptionist manual bank transfer confirmation
  const handleManualBankConfirm = async () => {
    if (!qrModal?.bookingId) return;
    setIsConfirmingQr(true);
    try {
      await staffApi.createCashPayment(qrModal.bookingId, 'bank_transfer');
      await handleCompleteQrPayment();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xác nhận chuyển khoản', 'error');
      setIsConfirmingQr(false);
    }
  };

  // Main submission
  const handleConfirm = async () => {
    let finalCustomerName = '';
    let finalCustomerPhone = '';

    if (selectedUser) {
      finalCustomerName = selectedUser.fullName;
      finalCustomerPhone = selectedUser.phone;
    } else if (customerMode === 'quick') {
      finalCustomerName = newUserName.trim() || 'Khách vãng lai';
      finalCustomerPhone = newUserPhone.trim() || '0900000000';
    } else {
      finalCustomerName = newUserName.trim();
      finalCustomerPhone = newUserPhone.trim();
    }

    if (!finalCustomerName) {
      showToast('Vui lòng nhập tên khách hàng!', 'error');
      return;
    }
    if (!selectedUser && !finalCustomerPhone) {
      showToast('Vui lòng nhập số điện thoại khách hàng!', 'error');
      return;
    }
    if (!selectedWorkspaceId) {
      showToast('Vui lòng chọn vị trí làm việc trên sơ đồ!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const wsStatus = workspacesStatus.find((w) => w.workspaceId === selectedWorkspaceId);
      const wsTypeId = wsStatus?.workspaceTypeId;

      if (!wsTypeId) {
        showToast('Không tìm thấy loại không gian hợp lệ!', 'error');
        setIsSubmitting(false);
        return;
      }

      const bookingPayload = {
        branchId: activeBranchId,
        workspaceId: selectedWorkspaceId,
        workspaceTypeId: wsTypeId,
        startAt: timingInfo.start.toISOString(),
        endAt: timingInfo.end.toISOString(),
        unit: 'hour',
        unitCount: timingInfo.billableHours,
        customerId: selectedUser?.id,
        customerName: !selectedUser ? finalCustomerName : undefined,
        customerPhone: !selectedUser ? finalCustomerPhone : undefined,
      };

      const booking = await staffApi.createWalkinBooking(bookingPayload);

      // Payment Flow Handling:
      if (paymentMethod === 'cash') {
        // 1. CASH
        await staffApi.createCashPayment(booking.id, 'cash');

        if (autoCheckIn) {
          await staffApi.checkin(booking.id, 'Check-in tại quầy POS').catch(() => null);
        }

        setCreatedBookingCode(booking.bookingCode);
        setIsSuccess(true);
        showToast(`Đã tạo đơn và thu tiền mặt thành công: ${booking.bookingCode}`, 'success');
        await fetchData();
      } else if (paymentMethod === 'vietqr') {
        // 2. VIETQR / BANK TRANSFER (Inherited from Customer side!)
        showToast('Đang tạo liên kết thanh toán VietQR (PayOS)...', 'info');
        let payosRes = null;
        try {
          payosRes = await bookingApi.createPayosPayment(booking.id, total);
        } catch (e: any) {
          console.warn('PayOS API call:', e.message);
        }

        setQrModal({
          isOpen: true,
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          amount: total,
          orderCode: payosRes?.orderCode,
          checkoutUrl: payosRes?.checkoutUrl,
          qrCode: payosRes?.qrCode
        });
      } else if (paymentMethod === 'momo') {
        // 3. MOMO E-WALLET
        showToast('Đang kết nối cổng MoMo...', 'info');
        const momoRes = await bookingApi.createMomoPayment(booking.id, total);
        if (momoRes.payUrl && momoRes.payUrl.startsWith('http')) {
          window.open(momoRes.payUrl, '_blank');
          showToast('Đã mở cổng thanh toán MoMo trong tab mới.', 'info');
          setQrModal({
            isOpen: true,
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            amount: total,
            checkoutUrl: momoRes.payUrl
          });
        } else {
          showToast('Tạo yêu cầu MoMo thành công!', 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi tạo booking tại quầy!', 'error');
      await fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCustomerMode('quick');
    setPhoneSearch('');
    setSearchResults([]);
    setSelectedUser(null);
    setNewUserName('Khách vãng lai');
    setNewUserPhone('');
    setTimeMode('preset');
    setPresetHours(1);
    setSelectedWorkspaceId(null);
    setPaymentMethod('cash');
    setIsSuccess(false);
    setQrModal(null);
  };

  const activeBranchName = useMemo(() => {
    const b = branches.find((item) => item.id === activeBranchId);
    return b ? `${b.name} (${b.city})` : 'Chi nhánh đang chọn';
  }, [branches, activeBranchId]);

  // SUCCESS SCREEN
  if (isSuccess) {
    const wsName = selectedWsInfo?.name || 'Vị trí làm việc';
    const customerDisplayName = selectedUser?.fullName || newUserName || 'Khách vãng lai';
    const paymentLabel = paymentMethod === 'cash' ? 'Tiền mặt' : paymentMethod === 'vietqr' ? 'Chuyển khoản VietQR' : 'Ví MoMo';

    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 animate-fade-in">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-primary"></div>
          
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-emerald-500/20 shadow-inner">
            <FiCheckCircle className="h-10 w-10 animate-bounce" />
          </div>

          <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 tracking-wider">
            POS RECEIPT: {createdBookingCode}
          </span>

          <h2 className="text-2xl font-bold font-heading text-foreground mt-3">
            Đặt Chỗ Thành Công!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Đã thanh toán ({paymentLabel}) và hoàn tất thủ tục xếp chỗ.
          </p>

          <div className="bg-muted/40 rounded-2xl p-4 mt-6 text-left space-y-2.5 text-xs border border-border/80">
            <div className="flex justify-between pb-2 border-b border-border/60">
              <span className="text-muted-foreground">Khách hàng:</span>
              <span className="font-bold text-foreground">{customerDisplayName}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border/60">
              <span className="text-muted-foreground">Vị trí:</span>
              <span className="font-bold text-primary">{wsName} ({selectedWsInfo?.code})</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border/60">
              <span className="text-muted-foreground">Khu vực:</span>
              <span className="font-bold text-foreground">{getFloorNameForWs(selectedWsInfo)}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border/60">
              <span className="text-muted-foreground">Thời lượng:</span>
              <span className="font-bold text-foreground">
                {timingInfo.displayDuration} (Đến ~{timingInfo.displayEnd})
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border/60">
              <span className="text-muted-foreground">Hình thức:</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                {paymentMethod === 'cash' ? <FiDollarSign className="text-emerald-500" /> : <FiCreditCard className="text-primary" />}
                {paymentLabel}
              </span>
            </div>
            <div className="flex justify-between pt-1 text-sm">
              <span className="font-bold text-muted-foreground">Tổng đã thu:</span>
              <span className="font-extrabold text-emerald-500 font-mono text-base">{formatVND(total)}</span>
            </div>
          </div>

          {autoCheckIn && (
            <div className="mt-4 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
              <FiZap className="h-4 w-4 shrink-0" />
              <span>Đã tự động kích hoạt Check-in nhận chỗ</span>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={handleReset}
              className="btn btn-primary w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <FiCheck className="h-4 w-4" /> Tạo Đơn Walk-in Mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic VietQR image URL
  const dynamicQrImageUrl = qrModal
    ? (qrModal.qrCode && qrModal.qrCode.startsWith('http'))
      ? qrModal.qrCode
      : `https://img.vietqr.io/image/${BANK_INFO.bankBin}-${BANK_INFO.accountNumber}-compact2.png?amount=${qrModal.amount}&addInfo=${encodeURIComponent(`BK ${qrModal.bookingCode}`)}&accountName=${encodeURIComponent(BANK_INFO.accountName)}`
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fade-in relative">
      
      {/* ── 1. COMPACT POS HEADER ── */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              POS Terminal • Quầy Lễ Tân
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black font-heading text-foreground mt-0.5 tracking-tight flex items-center gap-2.5">
            Đặt Chỗ Nhanh Tại Quầy
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Quy trình dọc 3 bước: 1. Khách & Thời gian ➔ 2. Chọn Chỗ (Sơ đồ / Danh sách) ➔ 3. Hóa đơn & Thu ngân POS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Clock Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-xl border border-border text-xs font-mono font-bold text-foreground">
            <FiClock className="text-primary h-3.5 w-3.5" />
            <span>{currentTimeStr}</span>
          </div>

          {/* Branch Selector */}
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 bg-muted/60 px-3 py-1 rounded-xl border border-border">
              <FiMapPin className="text-primary h-3.5 w-3.5 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] text-muted-foreground uppercase font-bold block">Chi nhánh</span>
                <select
                  value={activeBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setSelectedWorkspaceId(null);
                    setSelectedFloorId('');
                  }}
                  className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer pr-3"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground">
              <FiMapPin className="text-primary h-3.5 w-3.5" />
              <span>{activeBranchName}</span>
            </div>
          )}

          <button
            onClick={() => fetchData()}
            disabled={isLoadingSpaces}
            className="btn btn-ghost btn-sm p-2 rounded-xl text-muted-foreground hover:text-foreground"
            title="Tải lại dữ liệu"
          >
            <FiRefreshCw className={`h-4 w-4 ${isLoadingSpaces ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. TOP WORKFLOW RIBBON: STEP 1 (CUSTOMER) + STEP 2 (DURATION) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* CARD A: STEP 1 - CUSTOMER */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="font-bold text-sm text-foreground font-heading flex items-center gap-1.5">
                <FiUser className="text-primary h-3.5 w-3.5" /> Thông Tin Khách Hàng
              </h2>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-muted/60 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('quick');
                  setSelectedUser(null);
                  setNewUserName('Khách vãng lai');
                }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                  customerMode === 'quick' ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FiZap className="h-3 w-3" /> Vãng lai
              </button>
              <button
                type="button"
                onClick={() => { setCustomerMode('search'); setSelectedUser(null); }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                  customerMode === 'search' ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FiSearch className="h-3 w-3" /> Tìm SĐT
              </button>
              <button
                type="button"
                onClick={() => { setCustomerMode('create'); setSelectedUser(null); setNewUserName(''); setNewUserPhone(''); }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                  customerMode === 'create' ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FiUserPlus className="h-3 w-3" /> Khách mới
              </button>
            </div>
          </div>

          {/* Mode 1: Quick Walkin */}
          {customerMode === 'quick' && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  ⚡
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Khách vãng lai tại quầy (Mặc định)</p>
                  <p className="text-[11px] text-muted-foreground">Không cần nhập hồ sơ, xuất hóa đơn nhanh chóng.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Ghi chú SĐT (tùy chọn)..."
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="input-field text-xs h-8 w-36 rounded-lg font-mono bg-card"
                />
              </div>
            </div>
          )}

          {/* Mode 2: Search */}
          {customerMode === 'search' && (
            <div className="space-y-2.5 animate-fade-in">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                  <input
                    type="text"
                    value={phoneSearch}
                    onChange={(e) => {
                      setPhoneSearch(e.target.value);
                      if (e.target.value === '') setSearchResults([]);
                    }}
                    placeholder="Nhập SĐT hoặc họ tên khách quen..."
                    className="input-field !pl-9 text-xs h-9 rounded-xl"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                  />
                </div>
                <button
                  onClick={handleSearchUser}
                  disabled={isSearchingUser}
                  className="btn btn-primary px-3.5 text-xs font-bold gap-1 rounded-xl h-9"
                >
                  {isSearchingUser ? <Spinner size="sm" /> : <FiSearch className="h-3 w-3" />}
                  <span>Tìm</span>
                </button>
              </div>

              {searchResults.length > 1 && !selectedUser && (
                <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm max-h-36 overflow-y-auto divide-y divide-border/60">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="p-2.5 hover:bg-primary/5 transition cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">{u.fullName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{u.phone || 'Chưa có SĐT'}</p>
                      </div>
                      <span className="text-[11px] font-bold text-primary px-2.5 py-0.5 bg-primary/10 rounded-lg">
                        Chọn
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                      {selectedUser.fullName?.charAt(0) || 'K'}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        {selectedUser.fullName}
                        <span className="badge badge-success text-[9px] py-0 px-1.5">Đã chọn</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">{selectedUser.phone || 'Không có SĐT'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-destructive underline px-1.5"
                  >
                    Đổi
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Create New */}
          {customerMode === 'create' && (
            <div className="grid grid-cols-2 gap-2 animate-fade-in">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Tên khách hàng *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="input-field text-xs h-8 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Số điện thoại *</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="0912345678"
                  className="input-field text-xs h-8 rounded-lg font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* CARD B: STEP 2 - DURATION & END TIME */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="font-bold text-sm text-foreground font-heading flex items-center gap-1.5">
                <FiClock className="text-primary h-3.5 w-3.5" /> Thời Lượng & Giờ Trả Bàn
              </h2>
            </div>

            {/* Time Mode Switcher */}
            <div className="flex bg-muted/60 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTimeMode('preset')}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                  timeMode === 'preset' ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Gói Giờ Chẵn
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('custom')}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] ${
                  timeMode === 'custom' ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⏱️ Tùy Chỉnh Giờ Trả
              </button>
            </div>
          </div>

          {/* Time Selection Mode: Preset */}
          {timeMode === 'preset' ? (
            <div className="grid grid-cols-5 gap-1.5 animate-fade-in">
              {QUICK_DURATIONS.map((d) => {
                const isSelected = presetHours === d.hours;
                return (
                  <button
                    key={d.hours}
                    type="button"
                    onClick={() => {
                      setPresetHours(d.hours);
                      setSelectedWorkspaceId(null);
                    }}
                    className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                        : 'border-border bg-card text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span>{d.hours}h</span>
                    <span className={`text-[9px] font-normal ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {d.hours === 8 ? 'Cả ngày' : `+${d.hours} giờ`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Time Selection Mode: Custom End Time Picker */
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Trả bàn lúc:</span>
                <input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => {
                    setCustomEndTime(e.target.value);
                    setSelectedWorkspaceId(null);
                  }}
                  className="input-field text-xs font-mono font-bold h-8 px-2.5 rounded-lg w-28 bg-card border-primary/40 focus:border-primary"
                />

                {/* Quick Add Pills */}
                <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleAddMinutes(30)}
                    className="px-2 py-1 bg-muted/60 hover:bg-muted rounded-md font-medium text-foreground transition"
                  >
                    +30p
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMinutes(90)}
                    className="px-2 py-1 bg-muted/60 hover:bg-muted rounded-md font-medium text-foreground transition"
                  >
                    +1.5h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetExactHour(12)}
                    className="px-2 py-1 bg-muted/60 hover:bg-muted rounded-md font-medium text-foreground transition"
                  >
                    Đến 12h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetExactHour(17)}
                    className="px-2 py-1 bg-muted/60 hover:bg-muted rounded-md font-medium text-foreground transition"
                  >
                    Đến 17h
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timing Live Summary */}
          <div className="px-3 py-1.5 bg-muted/30 border border-border/60 rounded-xl flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              Bắt đầu: <strong className="text-foreground font-mono">{currentTimeStr}</strong>
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              Dự kiến trả bàn: <strong className="text-primary font-mono font-bold">~{timingInfo.displayEnd}</strong>
            </span>
            <span className="font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              {timingInfo.displayDuration} (~{timingInfo.billableHours}h cước)
            </span>
          </div>
        </div>

      </div>

      {/* ── 3. FULL-WIDTH INTERACTIVE FLOOR PLAN & LIST VIEW (HERO SECTION) ── */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
        
        {/* Floor Plan Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="font-bold text-sm md:text-base text-foreground font-heading">
                Sơ Đồ Mặt Bằng & Chọn Vị Trí Chỗ Ngồi
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Click vào chỗ ngồi trống (màu xanh lá) để chọn và lập hóa đơn thu tiền bên dưới.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Legend badges */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50"></span>
                <span>Trống ({floorStats.available})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block"></span>
                <span>Đã đặt ({floorStats.booked})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400 inline-block"></span>
                <span>Bảo trì ({floorStats.maintenance})</span>
              </span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-muted/60 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'map' ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FiMap className="h-3.5 w-3.5" /> Sơ đồ tầng
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FiList className="h-3.5 w-3.5" /> Dạng bảng danh sách
              </button>
            </div>
          </div>
        </div>

        {/* Floor Selection Pills (For Map Mode) */}
        {viewMode === 'map' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full animate-fade-in">
            {isLoadingSpaces && [...Array(3)].map((_, i) => (
              <Skeleton key={`f-skel-${i}`} className="h-9 w-28 rounded-xl" />
            ))}
            {!isLoadingSpaces && floors.map((f) => {
              const isSelected = selectedFloorId === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFloorId(f.id);
                    setSelectedWorkspaceId(null);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    isSelected
                      ? 'bg-foreground text-background shadow-md'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <FiMapPin className="h-3.5 w-3.5" />
                  <span>{f.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 3A. MAP CANVAS VIEW */}
        {viewMode === 'map' ? (
          <div className="rounded-2xl border border-border bg-card h-[540px] md:h-[580px] w-full overflow-hidden relative shadow-inner">
            {isLoadingSpaces ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Spinner size="lg" className="text-primary" />
                <span className="text-xs font-medium">Đang tải sơ đồ mặt bằng...</span>
              </div>
            ) : currentLayout ? (
              <>
                <FloorPlanViewer
                  layout={currentLayout}
                  selectedWsId={selectedWorkspaceId}
                  onSelectWorkspace={onMapSelectWorkspace}
                  onElementClick={onMapElementClick}
                  getAvailability={getAvailability}
                  getWorkspaceInfo={getWorkspaceInfo}
                  isAdmin={false}
                />
                <div className="absolute bottom-3 left-3 bg-background/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground pointer-events-none shadow-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Chạm vào vị trí màu xanh lá để chọn chỗ cho khách</span>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <FiMap className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-semibold">Tầng này chưa có sơ đồ mặt bằng</p>
                <button
                  onClick={() => setViewMode('list')}
                  className="btn btn-outline btn-xs mt-1"
                >
                  Chuyển sang dạng Bảng danh sách
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 3B. LIST / TABLE VIEW WITH FULL FLOOR INFORMATION & SEARCH */
          <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm space-y-3 p-3">
            
            {/* List View Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Floor filter for list */}
                <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs">
                  <FiLayers className="text-primary h-3.5 w-3.5" />
                  <span className="font-bold text-muted-foreground">Lọc theo tầng:</span>
                  <select
                    value={listTableFloorFilter}
                    onChange={(e) => setListTableFloorFilter(e.target.value)}
                    className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="all">Tất cả các tầng</option>
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Only available filter */}
                <button
                  type="button"
                  onClick={() => setListStatusFilter((prev) => (prev === 'all' ? 'available' : 'all'))}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                    listStatusFilter === 'available'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Chỉ hiện bàn trống</span>
                </button>
              </div>

              {/* Search input in list */}
              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  placeholder="Tìm mã hoặc tên bàn..."
                  className="input-field !pl-9 text-xs h-8 rounded-xl w-full"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="max-h-[460px] overflow-y-auto border border-border/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/95 backdrop-blur-md border-b border-border font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Mã vị trí</th>
                    <th className="p-3">Tên chỗ ngồi</th>
                    <th className="p-3">Số Tầng</th>
                    <th className="p-3">Sức chứa</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingSpaces && [...Array(5)].map((_, i) => (
                    <tr key={`skel-row-${i}`} className="p-3">
                      <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-12" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-20 rounded-full" /></td>
                      <td className="p-3 text-right"><Skeleton className="ml-auto h-7 w-16 rounded-lg" /></td>
                    </tr>
                  ))}
                  {!isLoadingSpaces && filteredListWorkspaces.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy chỗ ngồi nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                  {!isLoadingSpaces && filteredListWorkspaces.map((ws) => {
                    const avail = getAvailability(ws.workspaceId);
                    const isSelected = selectedWorkspaceId === ws.workspaceId;
                    const floorLabel = getFloorNameForWs(ws);

                    return (
                      <tr
                        key={ws.workspaceId}
                        className={`transition-colors ${
                          isSelected ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-primary">{ws.code}</td>
                        <td className="p-3 font-bold text-foreground">{ws.name}</td>
                        <td className="p-3">
                          <span className="badge badge-primary text-[10px] font-medium">
                            <FiMapPin className="h-2.5 w-2.5 mr-1 inline" />
                            {floorLabel}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{ws.capacity} người</td>
                        <td className="p-3">
                          {avail === 'available' ? (
                            <span className="badge badge-success text-[10px]">Trống</span>
                          ) : avail === 'booked' ? (
                            <span className="badge badge-error text-[10px]">Đang dùng</span>
                          ) : (
                            <span className="badge badge-outline text-slate-400 text-[10px]">Bảo trì</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            disabled={avail !== 'available'}
                            onClick={() => handleSelectWorkspace(ws.workspaceId)}
                            className={`btn btn-xs rounded-lg font-bold px-3 ${
                              isSelected
                                ? 'btn-primary'
                                : 'btn-outline border-border'
                            } ${avail !== 'available' ? 'opacity-40 cursor-not-allowed' : ''}`}
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
          </div>
        )}
      </div>

      {/* ── 4. FULL POS CHECKOUT & RECEIPT PANEL (BẢNG HÓA ĐƠN QUẦY POS ĐẦY ĐỦ) ── */}
      <div ref={receiptRef} className="rounded-3xl border border-border bg-card p-6 shadow-xl space-y-5 animate-fade-in">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
              <FiFileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base md:text-lg text-foreground font-heading">
                Hóa Đơn & Chốt Thanh Toán Quầy POS
              </h2>
              <p className="text-xs text-muted-foreground">
                Kiểm tra thông tin chi tiết và thu tiền tại quầy (Tiền mặt, VietQR hoặc MoMo).
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            REAL-TIME POS RECEIPT
          </span>
        </div>

        {selectedWsInfo ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Left Column: Booking & Space Details */}
            <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/80">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Vị trí được chọn:
                </span>
                <span className="badge badge-primary text-xs font-mono font-bold px-2.5 py-0.5">
                  {selectedWsInfo.code}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground">
                    {selectedWsInfo.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <FiMapPin className="text-primary h-3.5 w-3.5" />
                    <span>{getFloorNameForWs(selectedWsInfo)} • Sức chứa: <strong>{selectedWsInfo.capacity} người</strong></span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Đơn giá giờ</span>
                  <span className="text-sm font-mono font-bold text-foreground">{formatVND(wsPrice)}/h</span>
                </div>
              </div>

              {/* Detailed Breakdown List */}
              <div className="space-y-2 text-xs divide-y divide-border/50 pt-2">
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Khách hàng:</span>
                  <span className="font-bold text-foreground">
                    {selectedUser?.fullName || newUserName || 'Khách vãng lai'}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Số điện thoại:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedUser?.phone || newUserPhone || 'Chưa cung cấp'}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Thời gian sử dụng:</span>
                  <span className="font-bold text-foreground">
                    {timingInfo.displayDuration} (Từ {currentTimeStr} ➔ ~{timingInfo.displayEnd})
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Số giờ quy đổi cước:</span>
                  <span className="font-mono font-bold text-primary">
                    {timingInfo.billableHours} giờ
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Billing & Cashier Actions */}
            <div className="space-y-5 bg-card p-5 rounded-2xl border border-primary/20 shadow-sm">
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiền thuê không gian:</span>
                  <span className="font-mono font-semibold text-foreground">{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giảm giá / Ưu đãi:</span>
                  <span className="font-mono font-semibold text-emerald-500">0 đ</span>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-black text-foreground block">TỔNG CẦN THU:</span>
                    <span className="text-[10px] text-muted-foreground">Đã bao gồm mọi tiện ích tại chi nhánh</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-black text-emerald-500 font-mono tracking-tight">
                    {formatVND(total)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Hình thức thanh toán:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <FiDollarSign className="h-5 w-5" />
                    <span>Tiền mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'vietqr'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <FiSmartphone className="h-5 w-5" />
                    <span>Quét VietQR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === 'momo'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-600 dark:text-pink-400 shadow-sm'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <FiCreditCard className="h-5 w-5" />
                    <span>Ví MoMo</span>
                  </button>
                </div>
              </div>

              {/* Auto Check-in Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/80 cursor-pointer select-none hover:bg-muted/60 transition">
                <input
                  type="checkbox"
                  checked={autoCheckIn}
                  onChange={(e) => setAutoCheckIn(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Check-in nhận chỗ ngay
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Tự động kích hoạt trạng thái Checked-in cho khách mà không cần quét mã thêm.
                  </span>
                </div>
              </label>

              {/* Primary Action Button */}
              <button
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="btn btn-primary w-full py-4 text-sm font-black tracking-wide shadow-xl shadow-primary/25 rounded-2xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    <span>Đang xử lý xuất đơn...</span>
                  </>
                ) : (
                  <>
                    {paymentMethod === 'cash' ? (
                      <>
                        <FiCheck className="h-5 w-5" />
                        <span>Xác Nhận & Thu Tiền Mặt (POS)</span>
                      </>
                    ) : paymentMethod === 'vietqr' ? (
                      <>
                        <FiSmartphone className="h-5 w-5" />
                        <span>Tạo Đơn & Mở Mã VietQR</span>
                      </>
                    ) : (
                      <>
                        <FiExternalLink className="h-5 w-5" />
                        <span>Mở Cổng Thanh Toán MoMo</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>

          </div>
        ) : (
          /* Empty / Unselected State */
          <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border bg-muted/20 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl font-bold">
              💡
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base text-foreground">
                Chưa Chọn Vị Trí Chỗ Ngồi
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Vui lòng chạm vào một chỗ ngồi màu xanh còn trống trên sơ đồ mặt bằng ở trên (hoặc chọn từ bảng danh sách) để hệ thống tự động lập hóa đơn quầy POS.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ── 5. REAL-TIME VIETQR / TRANSFER MODAL AT POS COUNTER ── */}
      {qrModal && qrModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  <FiSmartphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground font-heading">
                    Thanh Toán VietQR Tại Quầy
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Khách dùng ứng dụng ngân hàng quét mã để thanh toán.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQrModal(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Đóng modal"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* QR Image & Dynamic Payment Info */}
            <div className="grid sm:grid-cols-[210px_1fr] gap-4 items-center bg-muted/30 p-4 rounded-2xl border border-border">
              {/* Left: Dynamic Official VietQR */}
              <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-2xl border border-border shadow-sm">
                <img
                  src={dynamicQrImageUrl}
                  alt={`VietQR ${qrModal.bookingCode}`}
                  className="w-44 h-44 object-contain rounded-lg"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-wider">
                  Chuẩn VietQR Quốc Gia
                </span>
              </div>

              {/* Right: Transfer Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Ngân hàng</span>
                  <span className="font-bold text-foreground block">{BANK_INFO.bankName}</span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Số tài khoản</span>
                  <div className="flex items-center justify-between font-mono font-bold text-primary text-sm bg-card p-1.5 rounded-lg border border-border">
                    <span>{BANK_INFO.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(BANK_INFO.accountNumber, 'Số tài khoản')}
                      className="text-xs p-1 hover:text-primary transition"
                      title="Sao chép"
                    >
                      {copiedField === 'Số tài khoản' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Chủ tài khoản</span>
                  <span className="font-semibold text-foreground block uppercase">{BANK_INFO.accountName}</span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Số tiền cần chuyển</span>
                  <div className="flex items-center justify-between font-mono font-black text-emerald-500 text-sm bg-card p-1.5 rounded-lg border border-border">
                    <span>{formatVND(qrModal.amount)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(qrModal.amount), 'Số tiền')}
                      className="text-xs p-1 hover:text-primary transition"
                      title="Sao chép"
                    >
                      {copiedField === 'Số tiền' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Nội dung chuyển khoản</span>
                  <div className="flex items-center justify-between font-mono font-bold text-foreground text-xs bg-card p-1.5 rounded-lg border border-border">
                    <span>BK {qrModal.bookingCode}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`BK ${qrModal.bookingCode}`, 'Nội dung CK')}
                      className="text-xs p-1 hover:text-primary transition"
                      title="Sao chép"
                    >
                      {copiedField === 'Nội dung CK' ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Realtime Detection Indicator */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Spinner size="sm" className="text-primary" />
                <span className="text-foreground font-medium">
                  Hệ thống đang tự động lắng nghe giao dịch chuyển khoản...
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">3s/lần</span>
            </div>

            {/* Quick Actions for Receptionist */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {/* Demo button (same as VietQrCheckoutPage simulation) */}
              <button
                type="button"
                disabled={isConfirmingQr}
                onClick={handleSimulatePayment}
                className="btn btn-outline btn-sm flex-1 text-xs py-2.5 rounded-xl border-primary/40 hover:bg-primary/10 text-primary font-bold flex items-center justify-center gap-1.5"
                title="Dùng cho Demo/Kiểm thử tức thì"
              >
                <FiZap className="h-3.5 w-3.5 text-amber-500" />
                <span>⚡ [Demo] Khách quét QR xong</span>
              </button>

              {/* Manual Confirmation button */}
              <button
                type="button"
                disabled={isConfirmingQr}
                onClick={handleManualBankConfirm}
                className="btn btn-primary btn-sm flex-1 text-xs py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
              >
                {isConfirmingQr ? <Spinner size="sm" /> : <FiCheck className="h-4 w-4" />}
                <span>✓ Tiền đã vào tài khoản</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default WalkinBookingPage;
