import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiChevronLeft, FiMapPin, FiCalendar, FiClock,
  FiCheckCircle, FiAlertTriangle, FiMaximize, FiLock, FiExternalLink, FiX, FiCreditCard, FiGift, FiAward, FiShield
} from 'react-icons/fi';
import { formatVND, durationUnitLabel } from '../../utils/formatters';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { bookingApi, bookingGroupApi, type BookingGroupQuote } from '../../lib/bookingApi';
import { useToast } from '../../components/Toast';
import { customerSpaceApi, type ExtraServiceResponse } from '../../lib/spaceApi';
import { describePromotion, promotionApi, reputationApi, type BookingQuoteDto, type MyReputationDto, type PromotionDto } from '../../api/loyaltyApi';
import { resolveBranchId } from '../../data/branchAliases';
import { QuantityStepper } from '../../components/ui/QuantityStepper';
import { ServiceIcon } from '../../components/ui/ServiceIcon';
import { HoldCountdown } from '../../components/HoldCountdown';


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

const BookingCheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const state = location.state as any;
  const workspace = state?.workspace;
  const workspaceType = state?.workspaceType;
  // Seats booked together with the main one (đặt nhiều chỗ): same time, one payment.
  const extraWorkspaces: { workspace: any; price: { price: number } }[] = state?.extraWorkspaces || [];
  const isGroup = extraWorkspaces.length > 0;
  const seatIds: string[] = workspace ? [workspace.id, ...extraWorkspaces.map((e) => e.workspace.id)] : [];
  const date = (state?.date ? new Date(state.date) : new Date());
  const startHour = state?.hour || 9;
  const endHour = state?.endHour || 11;
  // Multi-day support: endDate and durationUnit passed from BookingPanel
  const rawEndDate = state?.endDate ? new Date(state.endDate) : null;
  const bookingDurationUnit: 'hour' | 'day' | 'week' = state?.durationUnit || 'hour';
  const endDate = rawEndDate && bookingDurationUnit !== 'hour' ? rawEndDate : new Date(date);
  // Add-ons picked on the explore screen (real catalogue ids); the server prices them again.
  // Quantities can still be changed here; every change is re-priced by the server quote.
  const [addons, setAddons] = useState<{ serviceId: string; quantity: number; name: string; price: number; unit: string }[]>(
    state?.addons || [],
  );
  const addonRequest = addons.map(a => ({ serviceId: a.serviceId, quantity: a.quantity }));
  const addonKey = addonRequest.map(a => `${a.serviceId}:${a.quantity}`).join(',');
  const changeAddonQuantity = (serviceId: string, quantity: number) =>
    setAddons(prev => prev.map(a => (a.serviceId === serviceId ? { ...a, quantity } : a)));
  const removeAddon = (serviceId: string) => setAddons(prev => prev.filter(a => a.serviceId !== serviceId));
  const services: Record<string, number> = state?.services || {};
  const basePrice = state?.price?.price || 0;
  const subtotal = state?.subtotal || 0;
  const addonTotal = addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
  const total = subtotal + addonTotal;

  // Booked time span. A day pass is used during opening hours: from opening time on the first day
  // (or the current hour when that day is today) to closing time on the last day. endDate is the
  // day after the last one, so "5 → 6" is a one-day pass for the 5th. Week bookings run from the
  // start hour on the first date to the same hour on the end date. The backend prices this span
  // itself (a started unit counts in full); the unit count below only mirrors that for display.
  const isMultiDay = bookingDurationUnit !== 'hour';
  const dayHours: { open: number; close: number } | null =
    bookingDurationUnit === 'day' && typeof state?.openHour === 'number' && typeof state?.closeHour === 'number'
      ? { open: state.openHour, close: state.closeHour }
      : null;
  const isDayPass = dayHours !== null;
  const isStartToday = date.toDateString() === new Date().toDateString();
  const effectiveStartHour = dayHours
    ? (isStartToday ? Math.max(dayHours.open, new Date().getHours()) : dayHours.open)
    : startHour;
  const lastDay = new Date(endDate);
  if (isDayPass) lastDay.setDate(lastDay.getDate() - 1);
  const startAtDate = new Date(date);
  startAtDate.setHours(effectiveStartHour, 0, 0, 0);
  const endAtDate = new Date(isMultiDay ? lastDay : date);
  endAtDate.setHours(dayHours ? dayHours.close : isMultiDay ? startHour : endHour, 0, 0, 0);
  const unitMs = bookingDurationUnit === 'week' ? 7 * 86_400_000 : bookingDurationUnit === 'day' ? 86_400_000 : 3_600_000;
  const estimatedUnitCount = Math.max(1, Math.ceil((endAtDate.getTime() - startAtDate.getTime()) / unitMs));

  const [serviceDetails, setServiceDetails] = useState<ExtraServiceResponse[]>(state?.serviceDetails || []);

  // Check-in rule and any booking restriction from the customer's reputation score. Multi-day
  // passes (several days, a week or longer) are exempt from the check-in deadline.
  const [reputation, setReputation] = useState<MyReputationDto | null>(null);
  useEffect(() => {
    reputationApi.me().then(setReputation).catch(() => setReputation(null));
  }, []);
  const checkinDeadlineApplies = bookingDurationUnit === 'hour' || (bookingDurationUnit === 'day' && estimatedUnitCount <= 1);
  const checkinDeadlineText = reputation
    ? new Date(startAtDate.getTime() + reputation.checkinDeadlineMinutes * 60_000)
        .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  useEffect(() => {
    if (serviceDetails.length === 0 && Object.keys(services).length > 0 && workspace) {
      const branchId = resolveBranchId(workspace.branch_id || workspace.branchId);
      customerSpaceApi.listExtraServices(branchId).then(data => {
        if (data) setServiceDetails(data);
      }).catch(err => console.error("Failed to load extra services in checkout", err));
    }
  }, [workspace, services, serviceDetails.length]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  // Cash is a counter-only method (SYSTEM_SPEC §4.3): staff collect it and confirm the booking.
  // Offering it here created a booking on a 15-minute hold that expired long before the guest
  // arrived to pay, so the seat was given away under them.
  const [paymentMethod, setPaymentMethod] = useState<'payos' | 'momo'>('payos');
  const [holdExpired, setHoldExpired] = useState(false);

  // Before a booking is created there's no hold yet: the badge shows the full 15 minutes the hold
  // will last and nothing counts down (a client-only countdown used to reach 00:00 while the guest
  // was still reading the page and then disabled "Thanh toán ngay" for good). Once the booking
  // exists the countdown follows activeBooking.paymentDeadlineAt, the deadline the backend enforces.
  // The ticking itself lives in <HoldCountdown> so this page doesn't re-render every second.
  const holdDeadlineMs: number | null = activeBooking?.paymentDeadlineAt
    ? new Date(activeBooking.paymentDeadlineAt).getTime()
    : null;

  // Server-side price quote: applies the membership-tier discount and the promotion code, so the
  // invoice shows exactly what createBooking will charge.
  const branchId = workspace ? resolveBranchId(workspace.branch_id || workspace.branchId) : '';
  const workspaceTypeId: string = workspace ? (workspace.workspace_type_id || workspace.workspaceTypeId || '') : '';
  const [quote, setQuote] = useState<BookingQuoteDto | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [availablePromos, setAvailablePromos] = useState<PromotionDto[]>([]);

  const [groupQuote, setGroupQuote] = useState<BookingGroupQuote | null>(null);

  // A group is priced seat by seat on the server; folded into the single-booking quote shape so
  // the invoice below renders it the same way (no promotion codes on groups).
  const requestGroupQuote = async (): Promise<BookingQuoteDto> => {
    const g = await bookingGroupApi.quote({
      workspaceIds: seatIds,
      unit: bookingDurationUnit,
      startAt: startAtDate.toISOString(),
      endAt: endAtDate.toISOString(),
      addons: addonRequest,
    });
    setGroupQuote(g);
    return {
      pricePerUnit: g.seats[0]?.pricePerUnit ?? 0,
      unitCount: g.seats[0]?.unitCount ?? 1,
      subtotalAmount: g.subtotalAmount,
      membershipTierCode: null,
      membershipTierName: g.membershipTierName,
      membershipDiscountPercent: g.membershipDiscountPercent,
      membershipDiscountAmount: g.discountAmount,
      promotionCode: null,
      promotionName: null,
      promotionDiscountAmount: 0,
      discountAmount: g.discountAmount,
      addonAmount: g.addonAmount,
      totalAmount: g.totalAmount,
    };
  };

  const requestQuote = (promotionCode: string | null) =>
    isGroup ? requestGroupQuote() : promotionApi.quote({
      workspaceId: workspace.id,
      unit: bookingDurationUnit,
      startAt: startAtDate.toISOString(),
      endAt: endAtDate.toISOString(),
      promotionCode,
      addons: addonRequest,
    });

  useEffect(() => {
    if (!workspace || !UUID_RE.test(workspace.id)) return;
    // The quote is the server's verdict: price, discounts, add-ons, and whether the slot is bookable
    // at all (opening hours, past time). Without it the customer cannot pay.
    // Quantities can change faster than quotes come back: only the latest request may update the page.
    let active = true;
    (async () => {
      try {
        const q = await requestQuote(appliedPromoCode);
        if (!active) return;
        setQuote(q);
        setQuoteError('');
      } catch (e: any) {
        if (!active) return;
        // A promotion can stop qualifying when add-ons change (minimum order). Retry without it: if
        // that works the code was the problem, otherwise the slot itself is (keep the code applied).
        if (appliedPromoCode) {
          try {
            const q = await requestQuote(null);
            if (!active) return;
            setQuote(q);
            setQuoteError('');
            setAppliedPromoCode(null);
            setPromoError(e.message || 'Mã khuyến mãi không còn áp dụng được.');
            return;
          } catch {
            /* fall through: report the original error */
          }
        }
        if (!active) return;
        setQuote(null);
        setQuoteError(e.message || 'Không thể tính giá đơn đặt chỗ.');
      }
    })();
    return () => {
      active = false;
    };
  }, [workspace?.id, seatIds.join(','), bookingDurationUnit, startAtDate.getTime(), endAtDate.getTime(), addonKey]);

  useEffect(() => {
    if (!workspace || !UUID_RE.test(workspace.id) || isGroup) return;
    if (UUID_RE.test(branchId)) {
      promotionApi
        .available(branchId, UUID_RE.test(workspaceTypeId) ? workspaceTypeId : undefined)
        .then(setAvailablePromos)
        .catch(() => setAvailablePromos([]));
    }
  }, [workspace?.id, bookingDurationUnit, startAtDate.getTime(), endAtDate.getTime()]);

  const applyPromo = async (code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setIsApplyingPromo(true);
    setPromoError('');
    try {
      const q = await requestQuote(normalized);
      setQuote(q);
      setAppliedPromoCode(q.promotionCode);
      setPromoInput('');
    } catch (e: any) {
      setPromoError(e.message || 'Mã khuyến mãi không hợp lệ');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const removePromo = async () => {
    setAppliedPromoCode(null);
    setPromoError('');
    try {
      setQuote(await requestQuote(null));
    } catch {
      setQuote(null);
    }
  };

  const unitCount = quote ? quote.unitCount : estimatedUnitCount;
  const rentalSubtotal = quote ? quote.subtotalAmount : subtotal;
  const displayBasePrice = quote ? quote.pricePerUnit : basePrice;
  const addonAmount = quote ? quote.addonAmount : addonTotal;
  const grandTotal = quote ? quote.totalAmount : total;

  // Once the server-side hold actually expires, the backend's BookingExpiryScheduler releases the
  // workspace within ~60s — send the customer back to Explore instead of leaving them on a stale
  // checkout page for a booking that no longer holds the seat.
  useEffect(() => {
    if (!holdExpired) return;
    showToast('Thời gian giữ chỗ đã hết hạn. Vui lòng chọn lại chỗ ngồi.', 'error');
    const redirect = setTimeout(() => navigate('/customer/explore'), 3000);
    return () => clearTimeout(redirect);
  }, [holdExpired]);

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FiAlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-medium  mb-2">Chưa chọn chỗ ngồi</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Vui lòng quay lại trang Khám phá để chọn không gian và thời gian làm việc.
        </p>
        <Button onClick={() => navigate('/customer/explore')} className="bg-primary">
          <FiChevronLeft className="mr-2" /> Quay lại Khám phá
        </Button>
      </div>
    );
  }

  const handleCreateBooking = async () => {
    if (holdExpired) return;
    setIsProcessing(true);
    try {
      const now = new Date();
      now.setMinutes(0, 0, 0); // Allow booking for the current hour even if minutes have passed
      
      if (startAtDate < now) {
        showToast('Không thể đặt chỗ trong quá khứ. Vui lòng chọn thời gian khác.', 'error');
        setIsProcessing(false);
        return;
      }

      if (isGroup) {
        // All seats are booked in one step (all or nothing), then paid with a single VietQR.
        let group = activeBooking;
        if (!group) {
          const created = await bookingGroupApi.create({
            workspaceIds: seatIds,
            startAt: startAtDate.toISOString(),
            endAt: endAtDate.toISOString(),
            unit: bookingDurationUnit,
            addons: addonRequest,
          });
          group = {
            id: created.id,
            isGroup: true,
            bookingCode: created.groupCode,
            totalAmount: created.amountDue,
            paymentDeadlineAt: created.paymentDeadlineAt,
          };
          setActiveBooking(group);
        }
        const doneState = {
          state: {
            message: `Đặt ${seatIds.length} chỗ thành công! Mã đơn nhóm của bạn là ${group.bookingCode}.`,
            newBookingCode: group.bookingCode,
            branchName: state.branchName || "CoSpace Chi nhánh",
          },
        };
        if (group.totalAmount <= 0) {
          showToast(`Đặt ${seatIds.length} chỗ thành công!`, 'success');
          navigate('/customer/history', doneState);
          return;
        }
        showToast('Đang kết nối cổng thanh toán VietQR (PayOS)…', 'info');
        const payRes = await bookingGroupApi.payPayos(group.id);
        if (payRes.checkoutUrl && payRes.checkoutUrl.startsWith('http')) {
          window.location.href = payRes.checkoutUrl;
        } else {
          navigate('/customer/history', doneState);
        }
        return;
      }

      let bookingRes = activeBooking;
      if (!bookingRes) {
        bookingRes = await bookingApi.createBooking({
          branchId,
          workspaceId: workspace.id,
          workspaceTypeId,
          startAt: startAtDate.toISOString(),
          endAt: endAtDate.toISOString(),
          unit: bookingDurationUnit,
          unitCount: unitCount,
          addons: addonRequest,
          source: 'web',
          promotionCode: appliedPromoCode,
        });
        setActiveBooking(bookingRes);
      }

      // Discounts covered the whole booking: the backend already confirmed it, nothing to pay.
      if (bookingRes.totalAmount <= 0 && bookingRes.status?.toString().toLowerCase() === 'confirmed') {
        showToast(`Đặt chỗ thành công! Đơn ${bookingRes.bookingCode} được miễn phí nhờ ưu đãi.`, 'success');
        navigate('/customer/history', {
          state: {
            message: `Đặt chỗ thành công! Mã đơn của bạn là ${bookingRes.bookingCode}.`,
            newBookingCode: bookingRes.bookingCode,
            branchName: state.branchName || "CoSpace Chi nhánh",
          }
        });
        setIsProcessing(false);
        return;
      }

      // 2. Handle Payment Flow
      if (paymentMethod === 'payos') {
        showToast('Đang kết nối cổng thanh toán VietQR (PayOS)…', 'info');
        const payosRes = await bookingApi.createPayosPayment(bookingRes.id, bookingRes.totalAmount);

        if (payosRes.checkoutUrl && payosRes.checkoutUrl.startsWith('http')) {
          window.location.href = payosRes.checkoutUrl;
        } else {
          showToast('Tạo yêu cầu thanh toán VietQR thành công!', 'success');
          navigate('/customer/history', { 
            state: { 
              message: `Đặt chỗ thành công! Mã đơn của bạn là ${bookingRes.bookingCode}.`,
              newBookingCode: bookingRes.bookingCode,
              branchName: state.branchName || "CoSpace Chi nhánh",
            } 
          });
        }
        setIsProcessing(false);
        return;
      }

      // 3. Request MoMo Sandbox Payment API & redirect to MoMo Gateway
      showToast('Đang chuyển hướng sang cổng thanh toán MoMo Sandbox…', 'info');
      const momoRes = await bookingApi.createMomoPayment(bookingRes.id, bookingRes.totalAmount);

      if (momoRes.payUrl && momoRes.payUrl.startsWith('http')) {
        window.location.href = momoRes.payUrl;
      } else {
        showToast('Đặt chỗ thành công!', 'success');
        navigate('/customer/history', { 
          state: { 
            message: `Đặt chỗ thành công! Mã đơn của bạn là ${bookingRes.bookingCode}.`,
            newBookingCode: bookingRes.bookingCode,
            branchName: state.branchName || "CoSpace Chi nhánh",
          } 
        });
      }

    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý đặt chỗ / thanh toán', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 font-sans animate-fade-in space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 px-4 py-2 font-semibold text-sm tracking-tight rounded-3xl border border-border bg-card text-foreground shadow-sm hover:shadow-sm transition"
        >
          <FiChevronLeft className="h-5 w-5" /> Quay lại chọn chỗ
        </button>

        {/* Live Countdown Badge */}
        <HoldCountdown
          deadlineMs={holdDeadlineMs}
          onExpire={() => setHoldExpired(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-3xl text-sm font-semibold font-mono tabular-nums border border-border shadow-sm bg-muted text-foreground"
          urgentClassName="flex items-center gap-2 px-4 py-2 rounded-3xl text-sm font-semibold font-mono tabular-nums border shadow-sm bg-rose-500 text-white motion-safe:animate-pulse border-rose-600"
        >
          {(time) => (
            <>
              <FiClock className="h-5 w-5" aria-hidden="true" />
              <span>Giữ chỗ: {time}</span>
            </>
          )}
        </HoldCountdown>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 border border-border shadow-sm relative overflow-hidden">
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold  text-white tracking-tight ">
              Thanh toán Đặt chỗ
            </h1>
            <p className="text-sm font-medium bg-muted text-foreground px-3 py-1.5 rounded-lg border border-border inline-block mt-3 shadow-sm">
              Kiểm tra thông tin và hoàn tất thanh toán.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Add-ons */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Workspace Summary Card */}
          <section className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              
              <div className="relative z-10">
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-white">
                  <FiMapPin className="text-slate-300 h-6 w-6" /> {isGroup ? `Đặt ${seatIds.length} chỗ cùng lúc` : workspace.name}
                </h2>
                <p className="text-sm font-medium text-slate-300 mt-2 flex flex-wrap gap-2 items-center">
                  {isGroup ? (
                    <span>{state?.branchName} · tổng sức chứa {[workspace, ...extraWorkspaces.map((e) => e.workspace)].reduce((n, w) => n + (w.capacity || 0), 0)} người</span>
                  ) : (
                    <>
                      <span className="bg-card/10 text-white px-2 py-1 rounded border border-white/10 text-[10px] tracking-tight">{workspaceType?.name || 'Không gian'}</span>
                      <span>·</span>
                      <span>Sức chứa: {workspace.capacity} chỗ</span>
                    </>
                  )}
                </p>
              </div>
              <span className="px-4 py-2 rounded-3xl text-lg font-semibold font-mono bg-card/10 text-white border border-white/10 relative z-10">
                {isGroup ? `${seatIds.length} chỗ` : workspace.code}
              </span>
            </div>

            {isGroup && (
              <div className="p-6 pb-0 bg-card">
                <p className="text-sm font-semibold text-foreground mb-3">Các chỗ trong đơn ({seatIds.length})</p>
                <ul className="divide-y divide-border rounded-2xl border border-border">
                  {[{ workspace }, ...extraWorkspaces].map(({ workspace: seat }) => {
                    const sq = groupQuote?.seats.find((x) => x.workspaceId === seat.id);
                    return (
                      <li key={seat.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <span className="min-w-0">
                          <span className="font-semibold text-foreground block truncate">{seat.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {seat.workspaceTypeName} · {seat.capacity} chỗ · {seat.code}
                          </span>
                        </span>
                        <span className="font-mono text-foreground shrink-0">
                          {sq ? formatVND(sq.totalAmount) : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Mỗi chỗ là một đơn riêng với mã check-in riêng; bạn thanh toán tất cả một lần.
                </p>
              </div>
            )}

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-card">
              <div className="space-y-2 p-4 bg-muted/50 rounded-3xl border border-border shadow-inner">
                <p className="text-[10px] text-foreground tracking-tight font-semibold">
                  {isMultiDay ? 'Từ ngày' : 'Ngày sử dụng'}
                </p>
                <p className="flex items-center gap-3 font-semibold text-lg text-foreground">
                  <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiCalendar className="text-foreground h-5 w-5" /></div>
                  {date.toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-3xl border border-border shadow-inner">
                {isMultiDay ? (
                  <>
                    <p className="text-[10px] text-foreground tracking-tight font-semibold">{isDayPass ? 'Đến hết ngày' : 'Đến ngày'}</p>
                    <p className="flex items-center gap-3 font-semibold text-lg text-foreground">
                      <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiCalendar className="text-foreground h-5 w-5" /></div>
                      {lastDay.toLocaleDateString('vi-VN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {unitCount} {bookingDurationUnit === 'week' ? 'tuần' : 'ngày'}
                      {dayHours && ` · ${hh(effectiveStartHour)} – ${hh(dayHours.close)}${unitCount > 1 && effectiveStartHour !== dayHours.open ? ` (các ngày sau từ ${hh(dayHours.open)})` : ''}`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-foreground tracking-tight font-semibold">Khung giờ</p>
                    <div className="flex items-center gap-3 font-semibold text-lg text-foreground">
                      <div className="p-2 bg-card border border-border rounded-lg shadow-sm"><FiClock className="text-foreground h-5 w-5" /></div>
                      <span>{String(startHour).padStart(2, '0')}:00 → {String(endHour).padStart(2, '0')}:00</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{unitCount} giờ</p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Add-ons List */}
          {addons.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-xl text-foreground flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm">{addons.length}</div>
                Dịch vụ bổ sung
              </h3>
              <div className="space-y-4">
                {addons.map(addon => {
                  return (
                    <div key={addon.serviceId} className="flex items-center justify-between p-4 rounded-3xl border border-border bg-muted/50 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-card border border-border text-muted-foreground flex items-center justify-center">
                          <ServiceIcon name={addon.name} className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-foreground">{addon.name}</p>
                          <p className="text-xs font-medium text-foreground/70">{formatVND(addon.price)} / {addon.unit}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <QuantityStepper
                              value={addon.quantity}
                              onChange={q => changeAddonQuantity(addon.serviceId, q)}
                              disabled={!!activeBooking || isProcessing}
                              label={`Số lượng ${addon.name}`}
                            />
                            {!activeBooking && (
                              <button
                                type="button"
                                onClick={() => removeAddon(addon.serviceId)}
                                disabled={isProcessing}
                                className="text-xs font-medium text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                Bỏ
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-lg font-mono font-semibold px-4 py-2 rounded-3xl bg-slate-900 text-white border border-border shadow-sm">
                        + {formatVND(addon.price * addon.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Dịch vụ đặt kèm được thanh toán cùng đơn. Dịch vụ gọi thêm tại quầy sẽ thanh toán trước khi check-out.</p>
            </section>
          )}

          {/* Promotion code */}
          {isGroup ? (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-semibold text-xl text-foreground flex items-center gap-2">
                <FiGift className="text-foreground" /> Mã khuyến mãi
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Mã khuyến mãi chỉ áp dụng cho đơn 1 chỗ. Đơn nhiều chỗ vẫn được giảm giá theo hạng thành viên của bạn.
              </p>
            </section>
          ) : (
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-xl text-foreground flex items-center gap-2">
              <FiGift className="text-foreground" /> Mã khuyến mãi
            </h3>

            {appliedPromoCode ? (
              <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                <div>
                  <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">{appliedPromoCode}</p>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80">
                    {quote?.promotionName} · giảm {formatVND(quote?.promotionDiscountAmount || 0)}
                  </p>
                </div>
                {!activeBooking && (
                  <button onClick={removePromo} className="p-2 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40" aria-label="Bỏ mã khuyến mãi">
                    <FiX className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="input-field flex-1 font-mono uppercase"
                    aria-label="Mã khuyến mãi"
                    name="promo-code"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Nhập mã khuyến mãi…"
                    value={promoInput}
                    disabled={!!activeBooking || !quote}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyPromo(promoInput); }}
                  />
                  <Button onClick={() => applyPromo(promoInput)} disabled={!promoInput.trim() || isApplyingPromo || !!activeBooking || !quote}>
                    {isApplyingPromo ? 'Đang kiểm tra…' : 'Áp dụng'}
                  </Button>
                </div>
                {promoError && <p role="alert" className="text-sm text-destructive">{promoError}</p>}
                {!quote && <p className="text-xs text-muted-foreground">Mã khuyến mãi chỉ áp dụng khi kết nối được máy chủ.</p>}
              </div>
            )}

            {!appliedPromoCode && !activeBooking && availablePromos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Ưu đãi dành cho bạn</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {availablePromos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPromo(p.code)}
                      disabled={isApplyingPromo}
                      className="text-left p-3 rounded-2xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <p className="font-mono text-sm font-semibold text-primary">
                        {p.code}
                        {p.ownerUserId && (
                          <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 font-sans text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Voucher của bạn
                          </span>
                        )}
                      </p>
                      <p className="text-sm font-medium">{describePromotion(p, formatVND)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.name}{p.minOrderAmount > 0 ? ` · đơn từ ${formatVND(p.minOrderAmount)}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          )}

          {/* Payment Method Selector */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-xl   text-foreground flex items-center gap-2">
              <FiCreditCard className="text-foreground" /> Phương thức thanh toán
            </h3>
            
            <div className="space-y-4">
              {/* PayOS VietQR Option */}
              <label className={`flex items-center justify-between p-4 rounded-3xl border-4 cursor-pointer transition ${
                paymentMethod === 'payos' ? 'border-[#0052cc] bg-blue-50/20 dark:bg-blue-950/20 shadow-sm' : 'border-border hover:shadow-sm'
              }`}>
                <div className="flex items-center gap-4">
                  <input 
                    type="radio" 
                    name="payment" 
                    value="payos" 
                    checked={paymentMethod === 'payos'} 
                    onChange={() => setPaymentMethod('payos')} 
                    className="w-5 h-5 accent-[#0052cc]" 
                  />
                  <div className="h-12 w-12 rounded-3xl bg-[#0052cc] flex items-center justify-center shadow-sm text-white font-bold text-xs tracking-tight">
                    VietQR
                  </div>
                  <div>
                    <span className="font-semibold text-lg block text-foreground">Chuyển khoản VietQR</span>
                    <span className="text-xs font-medium text-foreground/70">Quét mã QR qua mọi ứng dụng ngân hàng (NAPAS 247) · Tự động xác nhận</span>
                  </div>
                </div>
                <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${paymentMethod === 'payos' ? 'bg-[#0052cc] border-[#0052cc] text-white' : 'border-border/50 text-transparent'}`}>
                  <FiCheckCircle className="h-5 w-5 font-semibold" />
                </div>
              </label>

              {/* MoMo pays one booking per order; a group is paid with one VietQR instead. */}
              {!isGroup && (
              <label className={`flex items-center justify-between p-4 rounded-3xl border-4 cursor-pointer transition ${
                paymentMethod === 'momo' ? 'border-[#A50064] bg-muted/5 shadow-sm' : 'border-border hover:shadow-sm'
              }`}>
                <div className="flex items-center gap-4">
                  <input 
                    type="radio" 
                    name="payment" 
                    value="momo" 
                    checked={paymentMethod === 'momo'} 
                    onChange={() => setPaymentMethod('momo')} 
                    className="w-5 h-5 accent-[#A50064]" 
                  />
                  <div className="h-12 w-12 rounded-3xl bg-[#A50064] flex items-center justify-center shadow-sm">
                    <span className="text-white font-semibold text-[10px] tracking-tight">MoMo</span>
                  </div>
                  <div>
                    <span className="font-semibold text-lg block text-foreground">Ví MoMo</span>
                    <span className="text-xs font-medium text-foreground/70">Thanh toán qua mã QR</span>
                  </div>
                </div>
                <div className={`h-8 w-8 rounded-full border flex items-center justify-center ${paymentMethod === 'momo' ? 'bg-[#A50064] border-[#A50064] text-white' : 'border-border/50 text-transparent'}`}>
                  <FiCheckCircle className="h-5 w-5 font-semibold" />
                </div>
              </label>
              )}

              <div className="p-4 rounded-3xl bg-muted/50 border border-border text-sm font-medium text-foreground flex items-start gap-3 shadow-inner">
                <FiLock className="h-6 w-6 shrink-0 text-foreground mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-foreground ">Bảo vệ giao dịch:</strong> Đơn đặt chỗ của bạn được giữ tự động trong <strong className="text-rose-500 text-base">15 phút</strong>. Vui lòng thanh toán trước khi hết giờ.
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Order Summary Telemetry */}
        <div>
          <div className="rounded-3xl border border-border bg-card sticky top-24 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-slate-900 flex items-center justify-between relative">
              
              <h3 className="font-semibold text-xl tracking-tight text-white relative z-10">
                Hóa đơn
              </h3>
              <span className="px-3 py-1 bg-rose-500 text-white font-semibold font-mono text-xs tracking-tight rounded-lg shadow-sm animate-pulse relative z-10">LIVE</span>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-3xl border border-border">
                <div className="flex justify-between items-center text-sm font-medium text-foreground/70">
                  <span className="">
                    {isGroup
                      ? `Tiền thuê ${seatIds.length} chỗ × ${unitCount}${bookingDurationUnit === 'week' ? ' tuần' : bookingDurationUnit === 'day' ? ' ngày' : 'h'}`
                      : <>Tiền thuê ({formatVND(displayBasePrice)}) × {unitCount}{bookingDurationUnit === 'week' ? ' tuần' : bookingDurationUnit === 'day' ? ' ngày' : 'h'}</>}
                  </span>
                  <span className="font-semibold text-foreground font-mono text-lg">{formatVND(rentalSubtotal)}</span>
                </div>

                {quote && quote.membershipDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm font-medium text-emerald-700 dark:text-emerald-400 border-t border-border/10 pt-2 mt-2">
                    <span className="flex items-center gap-1.5">
                      <FiAward className="h-4 w-4" /> Hạng {quote.membershipTierName} (-{quote.membershipDiscountPercent}%)
                    </span>
                    <span className="font-semibold font-mono text-lg">-{formatVND(quote.membershipDiscountAmount)}</span>
                  </div>
                )}

                {quote && quote.promotionDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm font-medium text-emerald-700 dark:text-emerald-400 border-t border-border/10 pt-2 mt-2">
                    <span className="flex items-center gap-1.5">
                      <FiGift className="h-4 w-4" /> Mã {quote.promotionCode}
                    </span>
                    <span className="font-semibold font-mono text-lg">-{formatVND(quote.promotionDiscountAmount)}</span>
                  </div>
                )}
                
                {addonAmount > 0 && (
                  <div className="flex justify-between items-center text-sm font-medium text-foreground/70 border-t border-border/10 pt-2 mt-2">
                    <span className="">Dịch vụ cộng thêm</span>
                    <span className="font-semibold text-foreground font-mono text-lg">+{formatVND(addonAmount)}</span>
                  </div>
                )}
              </div>
              
              <div className="pt-6 border-t border-border border-dashed">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="font-semibold text-lg block text-foreground ">Tổng cộng</span>
                    <span className="text-[10px] font-medium text-foreground/50 tracking-tight">Đã bao gồm VAT</span>
                  </div>
                  <span className="font-semibold text-3xl text-foreground font-mono">{formatVND(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900 space-y-4">
              {reputation && reputation.restriction !== 'none' && !activeBooking && (
                <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex gap-2">
                  <FiAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Điểm uy tín của bạn là {reputation.score}/{reputation.maxScore}.{' '}
                    {reputation.restriction === 'blocked'
                      ? 'Bạn tạm thời không thể đặt chỗ online, vui lòng đặt trực tiếp tại quầy.'
                      : 'Bạn chỉ được giữ 1 đơn chưa sử dụng tại một thời điểm.'}
                  </span>
                </p>
              )}
              {reputation && checkinDeadlineApplies && (
                <p className="text-xs text-white/80 bg-white/5 border border-white/10 rounded-2xl p-3 flex gap-2 leading-relaxed">
                  <FiShield className="h-4 w-4 shrink-0 mt-0.5 text-sky-300" />
                  <span>
                    Vui lòng check-in tại quầy trước <strong className="text-white">{checkinDeadlineText}</strong>{' '}
                    ({reputation.checkinDeadlineMinutes} phút sau giờ bắt đầu). Quá hạn sẽ bị trừ {reputation.missedCheckinPenalty} điểm uy tín;
                    check-in đúng giờ được cộng {reputation.onTimeCheckinReward} điểm. Chúng tôi sẽ nhắc bạn trước giờ bắt đầu.
                  </span>
                </p>
              )}
              {!activeBooking && quoteError && (
                <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3">{quoteError}</p>
              )}
              <button 
                onClick={handleCreateBooking} 
                disabled={isProcessing || holdExpired || (!activeBooking && !quote)}
                className={`w-full py-5 text-lg font-semibold tracking-tight border border-border rounded-3xl shadow-sm hover:shadow-sm transition flex justify-center items-center gap-3 ${
                  isProcessing || holdExpired || (!activeBooking && !quote) ? 'bg-gray-600 text-white opacity-50 cursor-not-allowed' : 'bg-[#A50064] text-white hover:bg-[#8A0053]'
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full border-4 border-white border-t-transparent animate-spin" />
                    <span>Đang xử lý…</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="h-6 w-6 font-semibold" />
                    <span>Thanh toán ngay</span>
                  </div>
                )}
              </button>
              <p className="text-xs text-center font-medium text-white/60 leading-relaxed px-4">
                Bằng việc thanh toán, bạn đồng ý với <span className="text-[#A50064] underline decoration-2 underline-offset-2">Chính sách CoSpace</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCheckoutPage;
