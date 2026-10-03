import React, { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import { Link, useLocation } from "react-router-dom";
import {
  FiCalendar,
  FiClock,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiMaximize,
  FiDownload,
  FiCopy,
  FiCheck,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import { formatVND } from "../../utils/formatters";
import { bookingApi, bookingGroupApi } from "../../lib/bookingApi";
import { startPayment } from "../../lib/startPayment";
import { useAuth } from "../../context/AuthContext";
import BookingServicesModal from "./history/BookingServicesModal";
import { reputationApi } from "../../api/loyaltyApi";
import MyVouchersStrip from "./history/MyVouchersStrip";
import BookingCard, { type CustomerBookingItem, hasCheckinDeadline } from "./history/BookingCard";

/** "Bắt đầu sau 2 giờ 15 phút" / "Đã bắt đầu" for the next-booking banner. */
const relativeStart = (ms: number) => {
  if (ms <= 0) return "Đã bắt đầu";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `Bắt đầu sau ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Bắt đầu sau ${hours} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ""}`;
  return `Bắt đầu sau ${Math.floor(hours / 24)} ngày`;
};

const TAB_STATUSES: Record<"upcoming" | "past" | "canceled", string[]> = {
  upcoming: ["pending_payment", "confirmed", "checked_in"],
  past: ["completed", "checked_out"],
  canceled: ["canceled", "cancelled", "expired", "no_show"],
};

const BookingHistoryPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;
  const { user } = useAuth();
  const [servicesBooking, setServicesBooking] = useState<CustomerBookingItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "canceled">(
    "upcoming",
  );
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  // The check-in QR is drawn here rather than by a third-party QR service: the booking code never
  // leaves the app, and "Tải ảnh QR" works (the CSP blocks fetching another host's image).
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    state?.message || null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState<CustomerBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const hasPendingHold = bookings.some((b) => b.status === "pending_payment" && b.paymentDeadlineAt);

  // Minutes after the start within which a booking must be checked in (server setting).
  const [checkinDeadlineMinutes, setCheckinDeadlineMinutes] = useState(30);
  useEffect(() => {
    reputationApi.me().then((r) => setCheckinDeadlineMinutes(r.checkinDeadlineMinutes)).catch(() => {});
  }, []);
  const checkinDeadlineOf = (b: { date: Date }) => b.date.getTime() + checkinDeadlineMinutes * 60_000;
  // A confirmed booking whose check-in window is open (or opens within the hour) needs a live countdown.
  const hasOpenCheckinWindow = bookings.some(
    (b) =>
      b.status === "confirmed" &&
      hasCheckinDeadline(b.unit, b.unitCount) &&
      b.date.getTime() - 3_600_000 <= now &&
      checkinDeadlineOf(b) > now,
  );

  // Tick once a second while an unpaid booking is being held or a check-in window is running.
  useEffect(() => {
    if (!hasPendingHold && !hasOpenCheckinWindow) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasPendingHold, hasOpenCheckinWindow]);

  // When a hold runs out the server releases the slot; mirror that locally right away.
  useEffect(() => {
    const expiredIds = bookings
      .filter(
        (b) =>
          b.status === "pending_payment" &&
          b.paymentDeadlineAt &&
          new Date(b.paymentDeadlineAt).getTime() <= now,
      )
      .map((b) => b.id);
    if (expiredIds.length === 0) return;
    setBookings((prev) =>
      prev.map((b) => (expiredIds.includes(b.id) ? { ...b, status: "expired" } : b)),
    );
    if (showCancelModal && expiredIds.includes(showCancelModal)) setShowCancelModal(null);
    setErrorMessage("Đơn chờ thanh toán đã quá 15 phút nên đã tự động hủy và trả lại chỗ.");
  }, [now, bookings, showCancelModal]);

  const handlePayNow = async (bookingId: string, amount: number) => {
    setPayingId(bookingId);
    setErrorMessage(null);
    try {
      // A seat of a booking group is paid together with the rest of its group.
      const groupId = bookings.find((b) => b.id === bookingId)?.raw.groupId;
      let redirected: boolean;
      if (groupId) {
        const res = await bookingGroupApi.payPayos(groupId);
        redirected = !!res.checkoutUrl && res.checkoutUrl.startsWith("http");
        if (redirected) window.location.href = res.checkoutUrl;
      } else {
        redirected = await startPayment("payos", bookingId, amount);
      }
      if (!redirected) {
        setSuccessMessage(
          "Đã tạo yêu cầu thanh toán VietQR. Vui lòng hoàn tất thanh toán để giữ chỗ.",
        );
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không tạo được yêu cầu thanh toán.",
      );
    } finally {
      setPayingId(null);
    }
  };

  // Escape closes the QR pass or the cancel dialog (not while a cancellation is being sent).
  useEffect(() => {
    if (!showQrModal && !showCancelModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowQrModal(null);
      if (!isCancelingRef.current) setShowCancelModal(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showQrModal, showCancelModal]);

  const qrCode: string | undefined = showQrModal?.code;
  useEffect(() => {
    setQrDataUrl(null);
    if (!qrCode) return;
    let active = true;
    QRCode.toDataURL(`CHECKIN_${qrCode}`, { width: 440, margin: 1 })
      .then((url) => { if (active) setQrDataUrl(url); })
      .catch((err) => console.error("Failed to draw check-in QR", err));
    return () => { active = false; };
  }, [qrCode]);

  const handleDownloadQr = (code: string) => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `cospace-qr-${code}.png`;
    link.click();
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
  };

  // Parse MoMo & PayOS Return URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resultCode = params.get("resultCode");
    const status = params.get("status");
    const message = params.get("message");

    if (resultCode !== null) {
      if (resultCode === "0") {
        setSuccessMessage(message || "Thanh toán MoMo thành công!");
      } else {
        setErrorMessage(
          message ||
            "Thanh toán MoMo thất bại hoặc người dùng đã hủy giao dịch.",
        );
      }
      window.history.replaceState({}, document.title, location.pathname);
    } else if (status !== null) {
      if (status === "PAID") {
        setSuccessMessage(message || "Thanh toán VietQR qua PayOS thành công!");
      } else {
        setErrorMessage(
          message || "Giao dịch PayOS đã kết thúc hoặc bị hủy.",
        );
      }
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.search]);

  // Load real API bookings if available
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const apiBookings = await bookingApi.getMyBookings(reloadKey > 0);
        // Always replace with API data (even empty array) so real state is shown
        const mapped: CustomerBookingItem[] = (apiBookings || []).map((b) => ({
          id: b.id,
          code: b.bookingCode,
          branchId: b.branchId,
          workspaceName: b.workspaceName || `Chỗ ngồi ${b.workspaceId?.slice(0, 6) ?? ""}`,
          branchName: b.branchName || "CoSpace",
          date: new Date(b.startAt),
          endDate: new Date(b.endAt),
          // Normalize: Java enum serializes as UPPERCASE → lowercase for filter
          status: b.status ? (b.status as string).toLowerCase() : "pending_payment",
          totalAmount: b.totalAmount,
          cancellationReason: b.cancellationReason,
          refundPercent: b.refundPercent,
          refundAmount: b.refundAmount,
          penaltyAmount: b.penaltyAmount,
          refundStatus: b.refundStatus,
          policyName: b.policyName,
          cancelledAt: b.cancelledAt,
          paymentDeadlineAt: b.paymentDeadlineAt,
          unit: b.unit,
          unitCount: b.unitCount,
          raw: b,
        }));
        setBookings(mapped);
        setApiLoaded(true);
      } catch (err: any) {
        setBookings([]);
        setApiLoaded(false);
        setErrorMessage(err?.message || "Không tải được lịch sử đặt chỗ. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [reloadKey]);

  const tabCount = (tab: keyof typeof TAB_STATUSES) =>
    bookings.filter((b) => TAB_STATUSES[tab].includes(b.status)).length;

  // Memoized: the page re-renders every second while a hold or check-in countdown is running.
  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = bookings.filter(
      (b) =>
        TAB_STATUSES[activeTab].includes(b.status) &&
        (!q ||
          b.code.toLowerCase().includes(q) ||
          (b.raw.groupCode ?? "").toLowerCase().includes(q) ||
          b.workspaceName.toLowerCase().includes(q) ||
          b.branchName.toLowerCase().includes(q)),
    );
    // Upcoming: soonest first (what the customer needs next); history: most recent first.
    return list.sort((x, y) =>
      activeTab === "upcoming" ? x.date.getTime() - y.date.getTime() : y.date.getTime() - x.date.getTime(),
    );
  }, [bookings, search, activeTab]);

  // The next booking to show up for: in use now, or the soonest confirmed one still ahead.
  const nextBooking =
    bookings.find((b) => b.status === "checked_in") ??
    bookings
      .filter((b) => b.status === "confirmed" && b.endDate.getTime() > now)
      .sort((x, y) => x.date.getTime() - y.date.getTime())[0];

  const [isCanceling, setIsCanceling] = useState(false);
  const isCancelingRef = useRef(false);
  isCancelingRef.current = isCanceling;
  const selectedCancelBooking = bookings.find((b) => b.id === showCancelModal);

  const handleCancel = async () => {
    if (!showCancelModal) return;
    setIsCanceling(true);

    try {
      const result = await bookingApi.cancelBooking(showCancelModal);

      setBookings((prev) =>
        prev.map((b) =>
          b.id === showCancelModal
            ? {
                ...b,
                status: "canceled",
                refundPercent: result.refundPercent,
                refundAmount: result.refundAmount,
                penaltyAmount: result.penaltyAmount,
                refundStatus: result.refundStatus,
                cancelledAt: new Date().toISOString(),
              }
            : b,
        ),
      );

      setShowCancelModal(null);
      setActiveTab("canceled");

      if (selectedCancelBooking?.status === "pending_payment") {
        setSuccessMessage(
          "Đã hủy đơn chưa thanh toán. Chỗ đã được trả lại ngay, bạn không mất phí nào.",
        );
      } else if (result.refundAmount > 0) {
        setSuccessMessage(
          `Hủy đơn thành công! Bạn được hoàn ${formatVND(result.refundAmount)} (${result.refundPercent}% giá trị đơn) theo chính sách hủy.`,
        );
      } else {
        setSuccessMessage(
          `Hủy đơn thành công. Theo chính sách áp dụng tại thời điểm hủy, đơn này không thuộc diện hoàn phí (0%).`,
        );
      }
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: any) {
      console.error("Failed to cancel booking:", err);
      setShowCancelModal(null);
      setErrorMessage(err.message || "Không thể hủy đơn đặt chỗ. Vui lòng thử lại sau.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 font-sans animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">Đặt chỗ của tôi</h1>
          <p className="mt-1 text-sm text-muted-foreground">Thời gian, địa điểm, thanh toán và tiến trình của từng đơn.</p>
        </div>
        <Link to="/customer/explore" className="btn btn-primary btn-sm self-start sm:self-auto">
          <FiPlus className="h-4 w-4" /> Đặt chỗ mới
        </Link>
      </div>

      {successMessage && (
        <div role="status" className="mb-8 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-3 animate-fade-scale-in shadow-sm">
          <FiCheckCircle className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
          <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-400 tracking-tight">
            {successMessage}
          </span>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="mb-8 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 flex items-center gap-3 animate-fade-scale-in shadow-sm">
          <FiAlertCircle className="h-6 w-6 shrink-0 text-rose-600" aria-hidden="true" />
          <span className="font-semibold text-sm text-rose-800 dark:text-rose-400 tracking-tight">
            {errorMessage}
          </span>
        </div>
      )}

      <MyVouchersStrip reloadKey={reloadKey} />

      {/* Next booking */}
      {nextBooking && (
        <section className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">
              {nextBooking.status === "checked_in" ? "Đang sử dụng" : "Đơn sắp tới gần nhất"}
            </p>
            <p className="font-semibold text-foreground truncate">
              {nextBooking.workspaceName} · {nextBooking.branchName}
            </p>
            <p className="text-sm text-muted-foreground">
              {nextBooking.status === "checked_in"
                ? `Kết thúc lúc ${nextBooking.endDate.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`
                : `${relativeStart(nextBooking.date.getTime() - now)} · ${nextBooking.date.toLocaleString("vi-VN", { weekday: "short", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`}
            </p>
          </div>
          {nextBooking.status === "confirmed" && (
            <button type="button" onClick={() => setShowQrModal(nextBooking)} className="btn btn-primary btn-sm self-start sm:self-auto">
              <FiMaximize className="h-4 w-4" /> Mã QR check-in
            </button>
          )}
        </section>
      )}

      {/* Tabs + search */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="grid grid-cols-3 md:flex gap-1 rounded-xl border border-border bg-muted/50 p-1 w-full md:w-fit" role="tablist">
          {([
            { id: "upcoming", label: "Sắp tới", icon: FiClock },
            { id: "past", label: "Hoàn thành", icon: FiCheckCircle },
            { id: "canceled", label: "Đã hủy", icon: FiX },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                title={tab.id === "canceled" ? "Đơn đã hủy, hết hạn thanh toán hoặc không đến" : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap px-2 md:px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                  isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 hidden sm:block" />
                {tab.label}
                <span className={`rounded-full px-1.5 text-[11px] ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {tabCount(tab.id)}
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative md:w-72">
          <span className="sr-only">Tìm đơn</span>
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, mã nhóm, chỗ ngồi, chi nhánh"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm"
          />
        </label>
      </div>

      {/* Bookings List */}
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/30 p-6">
            <FiCalendar className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="font-semibold text-foreground">
              {search.trim() ? "Không tìm thấy đơn phù hợp" : "Chưa có đơn nào ở mục này"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search.trim() ? "Thử tìm với mã đơn hoặc tên chi nhánh khác." : "Các đơn đặt chỗ của bạn sẽ hiện ở đây."}
            </p>
            {activeTab === "upcoming" && !search.trim() && (
              <Link to="/customer/explore" className="btn btn-primary btn-sm mt-4 inline-flex">
                <FiPlus className="h-4 w-4" /> Đặt chỗ mới
              </Link>
            )}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              now={now}
              checkinDeadlineMinutes={checkinDeadlineMinutes}
              apiLoaded={apiLoaded}
              paying={payingId === booking.id}
              onPay={() => void handlePayNow(booking.id, booking.totalAmount)}
              onCancel={() => setShowCancelModal(booking.id)}
              onShowQr={() => setShowQrModal(booking)}
              onServices={() => setServicesBooking(booking)}
            />
          ))
        )}
      </div>

      {servicesBooking && (
        <BookingServicesModal
          bookingId={servicesBooking.id}
          bookingCode={servicesBooking.code}
          branchId={servicesBooking.branchId}
          currentUserId={user?.id || ""}
          onClose={() => setServicesBooking(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}

      {/* QR Check-in Pass Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-scale-in">
          <div role="dialog" aria-modal="true" aria-labelledby="qr-pass-title" className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-sm p-8 text-center relative">
            <button
              onClick={() => setShowQrModal(null)}
              aria-label="Đóng mã QR"
              className="absolute -top-4 -right-4 h-12 w-12 rounded-full border border-border bg-slate-900 text-white flex items-center justify-center shadow-sm  transition-transform z-10"
            >
              <FiX className="h-6 w-6 font-semibold" aria-hidden="true" />
            </button>

            <div className="mb-6">
              <span className="px-4 py-2 rounded-full text-xs font-mono font-semibold bg-slate-900 text-white border border-border inline-block mb-4 shadow-sm -rotate-2">
                MÃ CHECK-IN: {showQrModal.code}
              </span>
              <h3 id="qr-pass-title" className="text-2xl font-semibold  text-foreground ">
                {showQrModal.workspaceName}
              </h3>
              <p className="text-sm font-medium text-foreground/70 mt-2 bg-muted/50 inline-flex px-3 py-1 rounded-lg border border-border">
                {showQrModal.branchName}
              </p>
            </div>

            {/* QR Image */}
            <div className="p-4 bg-card rounded-2xl border border-border inline-block shadow-sm mb-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Mã QR check-in ${showQrModal.code}`}
                  width={192}
                  height={192}
                  className="w-48 h-48 mx-auto rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 mx-auto rounded-lg bg-muted motion-safe:animate-pulse" aria-hidden="true" />
              )}
            </div>

            {/* Quick Actions: Download & Copy */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleDownloadQr(showQrModal.code)}
                disabled={!qrDataUrl}
                className="btn btn-secondary text-xs py-2 px-3 justify-center border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 font-bold"
              >
                <FiDownload className="h-3.5 w-3.5" />
                <span>Tải ảnh QR</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyCode(showQrModal.code)}
                className="btn btn-secondary text-xs py-2 px-3 justify-center border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 font-bold"
              >
                {copiedCode ? (
                  <>
                    <FiCheck className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-600">Đã chép mã!</span>
                  </>
                ) : (
                  <>
                    <FiCopy className="h-3.5 w-3.5" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-muted/50 p-3.5 rounded-2xl border border-border border-dashed mb-4 text-left">
              <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                Đưa mã này cho lễ tân quét khi đến. Lễ tân cũng có thể dán ảnh chụp mã QR
                (<kbd className="px-1 font-mono text-[10px] bg-card border border-border rounded">Ctrl + V</kbd>) vào ô quét ở quầy.
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-3.5 rounded-full bg-slate-900 text-white font-semibold tracking-tight border border-border shadow-sm hover:translate-y-0.5 hover:shadow-none transition text-sm"
            >
              Đóng thẻ
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedCancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-scale-in">
          <div role="alertdialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="bg-card rounded-3xl max-w-md w-full border border-border shadow-sm p-8 relative overflow-hidden">
            {/* Warning Tape Decoration */}
            <div className="absolute top-0 left-0 w-full h-4 bg-[repeating-linear-gradient(45deg,#F59E0B,#F59E0B_10px,#0F172A_10px,#0F172A_20px)] border-b border-border"></div>

            <div className="flex items-center gap-4 text-foreground mt-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border shadow-sm flex items-center justify-center shrink-0 text-white ">
                <FiAlertCircle className="h-8 w-8 font-semibold" />
              </div>
              <h2 id="cancel-booking-title" className="text-2xl font-semibold   text-foreground">
                Hủy đặt chỗ?
              </h2>
            </div>

            <p className="text-sm font-medium text-foreground leading-relaxed mb-6">
              Bạn đang yêu cầu hủy đơn{" "}
              <span className="bg-slate-900 text-white px-2 py-0.5 rounded border border-border font-mono">
                {selectedCancelBooking.code}
              </span>{" "}
              tại <strong>{selectedCancelBooking.workspaceName}</strong>.
            </p>

            <div className="bg-muted/50 rounded-2xl p-5 border border-border space-y-3 mb-8 shadow-inner relative">
              <div className="absolute -top-3 right-4 bg-card border border-border px-2 py-0.5 rounded text-[10px] font-semibold  text-foreground">
                Chính sách
              </div>
              <div className="flex justify-between text-sm font-medium text-foreground/80 pt-2">
                <span>Tổng giá trị đơn:</span>
                <span className="font-mono">
                  {formatVND(selectedCancelBooking.totalAmount)}
                </span>
              </div>
              {selectedCancelBooking.status === "pending_payment" ? (
                <p className="text-xs font-medium text-foreground/70 leading-relaxed">
                  Đơn chưa được thanh toán nên bạn không mất phí. Đơn sẽ bị hủy và chỗ được trả lại
                  ngay khi bạn xác nhận, không cần chờ hết 15 phút giữ chỗ.
                </p>
              ) : (
                <p className="text-xs font-medium text-foreground/70 leading-relaxed">
                  Số tiền hoàn lại sẽ được tính theo chính sách hủy đang áp dụng tại chi nhánh
                  (phụ thuộc thời điểm hủy so với giờ nhận chỗ) và hiển thị ngay sau khi bạn xác nhận.
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                className="flex-1 py-4 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:bg-muted/50 transition-colors"
                onClick={() => setShowCancelModal(null)}
              >
                Quay lại
              </button>
              <button
                className={`flex-1 py-4 text-white font-semibold tracking-tight border rounded-full shadow-sm transition ${
                  isCanceling 
                    ? "bg-red-400 border-red-400 cursor-not-allowed opacity-70" 
                    : "bg-red-600 border-red-700 hover:shadow-md"
                }`}
                onClick={handleCancel}
                disabled={isCanceling}
              >
                {isCanceling ? "Đang hủy…" : "Đồng ý Hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistoryPage;
