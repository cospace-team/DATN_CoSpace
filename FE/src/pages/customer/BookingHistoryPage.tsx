import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiMaximize,
  FiCoffee,
  FiDownload,
  FiRefreshCw,
  FiCopy,
  FiCheck,
  FiCreditCard,
  FiShield,
} from "react-icons/fi";
import { Button } from "../../components/ui/button";
import { formatVND } from "../../utils/formatters";
import { bookingApi, type BookingResponse } from "../../lib/bookingApi";
import { startPayment } from "../../lib/startPayment";
import { useAuth } from "../../context/AuthContext";
import BookingServicesModal from "./history/BookingServicesModal";

export interface CustomerBookingItem {
  id: string;
  code: string;
  branchId: string;
  workspaceName: string;
  branchName: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  cancellationReason?: string;
  refundPercent?: number;
  refundAmount?: number;
  penaltyAmount?: number;
  refundStatus?: string;
  policyName?: string;
  cancelledAt?: string;
  paymentDeadlineAt?: string;
}

/** Remaining hold time as mm:ss. */
const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const BookingHistoryPage: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;
  const { user } = useAuth();
  const [servicesBooking, setServicesBooking] = useState<CustomerBookingItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [activeTab, setActiveTab] = useState<"upcoming" | "past" | "canceled">(
    "upcoming",
  );
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
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

  // Tick once a second while an unpaid booking is being held.
  useEffect(() => {
    if (!hasPendingHold) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasPendingHold]);

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
      const redirected = await startPayment("payos", bookingId, amount);
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

  const handleDownloadQr = async (code: string) => {
    setDownloadingQr(true);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=CHECKIN_${code}`;
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `cospace-qr-${code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrUrl, "_blank");
    } finally {
      setDownloadingQr(false);
    }
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
        const apiBookings = await bookingApi.getMyBookings(true);
        // Always replace with API data (even empty array) so real state is shown
        const mapped = (apiBookings || []).map((b) => {
          return {
            id: b.id,
            code: b.bookingCode,
            branchId: b.branchId,
            workspaceName: b.workspaceName || `Chỗ ngồi ${b.workspaceId?.slice(0, 6) ?? ''}`,
            branchName: b.branchName || "CoSpace",
          date: new Date(b.startAt),
          startTime: new Date(b.startAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          endTime: new Date(b.endAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
            // Normalize: Java enum serializes as UPPERCASE → lowercase for filter
            status: b.status ? (b.status as string).toLowerCase() : "pending_payment",
            totalAmount: b.totalAmount,
            paymentMethod: "momo",
            cancellationReason: b.cancellationReason,
            refundPercent: b.refundPercent,
            refundAmount: b.refundAmount,
            penaltyAmount: b.penaltyAmount,
            refundStatus: b.refundStatus,
            policyName: b.policyName,
            cancelledAt: b.cancelledAt,
            paymentDeadlineAt: b.paymentDeadlineAt,
          };
        });
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

  const getFilteredBookings = () => {
    return bookings.filter((b) => {
      if (activeTab === "canceled")
        return b.status === "canceled" || b.status === "cancelled" || b.status === "expired" || b.status === "no_show";
      if (activeTab === "upcoming")
        return (
          b.status === "confirmed" ||
          b.status === "checked_in" ||
          b.status === "pending_payment"
        );
      return b.status === "completed" || b.status === "checked_out";
    });
  };

  const [isCanceling, setIsCanceling] = useState(false);
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
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-8 mb-10 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-700 rounded-full mix-blend-screen filter blur-3xl opacity-30 translate-x-1/3 -translate-y-1/3"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Quản lý Đặt chỗ
            </h1>
            <p className="text-sm font-medium bg-card/10 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 inline-block mt-3">
              Theo dõi mã QR, lịch sử và trạng thái booking của bạn.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mb-8 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-3 animate-fade-scale-in shadow-sm">
          <FiCheckCircle className="h-6 w-6 shrink-0 text-emerald-600" />
          <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-400 tracking-tight">
            {successMessage}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-8 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 flex items-center gap-3 animate-fade-scale-in shadow-sm">
          <FiAlertCircle className="h-6 w-6 shrink-0 text-rose-600" />
          <span className="font-semibold text-sm text-rose-800 dark:text-rose-400 tracking-tight">
            {errorMessage}
          </span>
        </div>
      )}

      {/* Block-based Navigation Tabs */}
      <div className="flex flex-wrap gap-4 mb-8">
        {[
          { id: "upcoming", label: "Sắp tới", icon: FiClock, color: "#F59E0B" },
          {
            id: "past",
            label: "Hoàn thành",
            icon: FiCheckCircle,
            color: "#22C55E",
          },
          { id: "canceled", label: "Đã hủy", icon: FiX, color: "#EF4444" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm tracking-tight rounded-full border border-border transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm -translate-y-1"
                  : "bg-card text-foreground shadow-sm hover:-translate-y-1 hover:shadow-sm"
              }`}
            >
              <Icon
                className="h-5 w-5"
                style={{ color: isActive ? tab.color : "inherit" }}
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      <div className="space-y-6">
        {loading ? (
          /* Loading skeleton */
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : getFilteredBookings().length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-muted/50 p-6">
            <div className="w-20 h-20 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mx-auto text-foreground mb-6 ">
              <FiCalendar className="h-10 w-10" />
            </div>
            <p className="text-lg font-semibold  text-foreground">
              Chưa có dữ liệu
            </p>
            <p className="text-sm font-medium text-foreground/70 mt-2">
              Không có đơn đặt chỗ nào trong danh mục này.
            </p>
          </div>
        ) : (
          getFilteredBookings().map((booking) => (
            <div
              key={booking.id}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row gap-6 transition-all shadow-sm hover:-translate-y-1 hover:shadow-sm"
            >
              {/* Left Details */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 text-xs font-semibold font-mono rounded-lg bg-slate-900 text-white border border-border shadow-sm">
                    {booking.code}
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-semibold  rounded-lg border border-border shadow-sm ${
                      booking.status === "confirmed" || booking.status === "pending_payment" || booking.status === "checked_in"
                        ? "bg-muted text-foreground"
                        : booking.status === "completed" || booking.status === "checked_out"
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-rose-100 text-rose-900"
                    }`}
                  >
                    {booking.status === "confirmed"
                      ? "● Đã xác nhận"
                      : booking.status === "pending_payment"
                        ? "⏳ Chờ thanh toán"
                        : booking.status === "checked_in"
                          ? "🔑 Đã check-in"
                          : booking.status === "completed" || booking.status === "checked_out"
                            ? "✓ Hoàn thành"
                            : booking.status === "no_show"
                              ? "× Không đến"
                              : booking.status === "expired"
                                ? "⌛ Hết hạn thanh toán"
                                : "× Đã hủy"}
                  </span>
                  {booking.status === "pending_payment" && booking.paymentDeadlineAt && (
                    <span
                      className="px-3 py-1 text-xs font-semibold font-mono rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm"
                      title="Hết thời gian này, đơn sẽ tự động hủy và trả lại chỗ"
                    >
                      Giữ chỗ còn {formatCountdown(new Date(booking.paymentDeadlineAt).getTime() - now)}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl md:text-2xl font-semibold  text-foreground">
                    {booking.workspaceName}
                  </h3>
                  <p className="text-sm font-medium text-foreground/70 flex items-center gap-2 mt-1">
                    <FiMapPin className="h-4 w-4 text-foreground" />{" "}
                    {booking.branchName}
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm bg-muted/50 p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-card border border-border rounded-md">
                      <FiCalendar className="text-muted-foreground h-4 w-4" />
                    </div>
                    <span className="font-semibold text-foreground">
                      {booking.date instanceof Date
                        ? booking.date.toLocaleDateString("vi-VN")
                        : String(booking.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-card border border-border rounded-md">
                      <FiClock className="text-muted-foreground h-4 w-4" />
                    </div>
                    <span className="font-semibold text-foreground">
                      {booking.startTime} → {booking.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full mt-2 pt-2 border-t border-border">
                    <span className="font-semibold text-xs tracking-tight text-muted-foreground">
                      Tổng tiền:
                    </span>
                    <span className="font-semibold text-foreground font-mono text-lg ml-auto">
                      {formatVND(booking.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Modern Cancellation Breakdown Card */}
                {(booking.status === "canceled" || booking.status === "cancelled") &&
                  booking.policyName === "PENDING_PAYMENT_CANCEL" && (
                  <div className="p-4 rounded-2xl bg-muted/50 border border-border text-xs text-muted-foreground">
                    Đơn được hủy khi chưa thanh toán: không phát sinh phí và chỗ đã được trả lại.
                  </div>
                )}
                {(booking.status === "canceled" || booking.status === "cancelled") &&
                  booking.policyName !== "PENDING_PAYMENT_CANCEL" && (
                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-3 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-rose-500/15">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <FiShield className="h-4 w-4 text-rose-500" />
                        Chi tiết hoàn tiền & chính sách hủy
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          (booking.refundAmount ?? 0) > 0
                            ? booking.refundStatus === "processed" || booking.refundStatus === "confirmed"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : booking.refundStatus === "rejected"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {(booking.refundAmount ?? 0) > 0
                          ? booking.refundStatus === "processed" || booking.refundStatus === "confirmed"
                            ? "✓ Đã hoàn tiền"
                            : booking.refundStatus === "rejected"
                              ? "× Yêu cầu hoàn tiền bị từ chối"
                              : "⏳ Đang xử lý hoàn tiền"
                          : "× Không áp dụng hoàn tiền"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                      <div className="bg-card/70 p-2.5 rounded-xl border border-border/70">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Chính sách áp dụng</span>
                        <span className="font-bold text-foreground truncate block text-xs" title={booking.policyName || "Chính sách hủy tiêu chuẩn"}>
                          {booking.policyName || "Chính sách hủy chuẩn"}
                        </span>
                      </div>
                      <div className="bg-card/70 p-2.5 rounded-xl border border-border/70">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Tỷ lệ hoàn</span>
                        <span className="font-bold text-foreground text-xs">
                          {booking.refundPercent !== undefined ? `${booking.refundPercent}%` : "—"}
                        </span>
                      </div>
                      <div className="bg-card/70 p-2.5 rounded-xl border border-border/70">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Số tiền hoàn lại</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {booking.refundAmount !== undefined ? formatVND(booking.refundAmount) : formatVND(0)}
                        </span>
                      </div>
                      <div className="bg-card/70 p-2.5 rounded-xl border border-border/70">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Phí hủy giữ lại</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-xs">
                          {booking.penaltyAmount !== undefined
                            ? formatVND(booking.penaltyAmount)
                            : formatVND(booking.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Quick Actions */}
              <div className="flex flex-row md:flex-col items-center justify-center gap-3 border-t-4 md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-6 min-w-[180px]">
                {(booking.status === "confirmed" || booking.status === "checked_in") && (
                  <button
                    onClick={() => setServicesBooking(booking)}
                    className="w-full py-3 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all flex justify-center items-center gap-2 text-xs"
                  >
                    <FiCoffee className="h-4 w-4" /> Dịch vụ & gia hạn
                  </button>
                )}
                {booking.status === "confirmed" && (
                  <>
                    <button
                      onClick={() => setShowQrModal(booking)}
                      className="w-full py-3 bg-slate-900 text-white font-semibold tracking-tight border border-border rounded-full shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all flex justify-center items-center gap-2 text-xs"
                    >
                      <FiMaximize className="h-4 w-4" /> Mã QR Pass
                    </button>
                    <button
                      className="w-full py-3 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:bg-red-50 dark:bg-red-950/30 dark:bg-red-950/30 hover:text-red-700 hover:border-red-200 dark:border-red-900/50 dark:border-red-900/50 transition-colors flex justify-center items-center gap-2 text-xs"
                      onClick={() => setShowCancelModal(booking.id)}
                    >
                      <FiX className="h-4 w-4" /> Hủy đặt chỗ
                    </button>
                  </>
                )}
                {booking.status === "pending_payment" && (
                  <>
                    <button
                      onClick={() => void handlePayNow(booking.id, booking.totalAmount)}
                      disabled={!apiLoaded || payingId === booking.id}
                      className="w-full py-3 bg-slate-900 text-white font-semibold tracking-tight border border-border rounded-full shadow-sm hover:-translate-y-1 hover:shadow-sm transition-all flex justify-center items-center gap-2 text-xs disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      <FiCreditCard className="h-4 w-4" />
                      {payingId === booking.id ? "Đang chuyển..." : "Thanh toán ngay"}
                    </button>
                    <button
                      className="w-full py-3 bg-card text-foreground font-semibold tracking-tight border border-border rounded-full shadow-sm hover:bg-red-50 dark:bg-red-950/30 hover:text-red-700 hover:border-red-200 dark:border-red-900/50 transition-colors flex justify-center items-center gap-2 text-xs"
                      onClick={() => setShowCancelModal(booking.id)}
                    >
                      <FiX className="h-4 w-4" /> Hủy đặt chỗ
                    </button>
                  </>
                )}
                {(booking.status === "completed" || booking.status === "checked_out") && (
                  <div className="py-2.5 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 w-full">
                    <FiCheckCircle className="h-4 w-4" /> Đã hoàn thành
                  </div>
                )}
                {booking.status === "expired" && (
                  <div className="py-2.5 px-4 rounded-xl bg-muted text-muted-foreground border border-border text-xs font-semibold flex items-center justify-center gap-1.5 w-full">
                    <FiClock className="h-4 w-4" /> Hết hạn thanh toán
                  </div>
                )}
                {(booking.status === "canceled" || booking.status === "cancelled") && (
                  <div className="py-2.5 px-4 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 w-full">
                    <FiX className="h-4 w-4" /> Đơn đã hủy
                  </div>
                )}
              </div>
            </div>
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
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-sm p-8 text-center relative">
            <button
              onClick={() => setShowQrModal(null)}
              className="absolute -top-4 -right-4 h-12 w-12 rounded-full border border-border bg-slate-900 text-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
            >
              <FiX className="h-6 w-6 font-semibold" />
            </button>

            <div className="mb-6">
              <span className="px-4 py-2 rounded-full text-xs font-mono font-semibold bg-slate-900 text-white border border-border inline-block mb-4 shadow-sm -rotate-2">
                MÃ CHECK-IN: {showQrModal.code}
              </span>
              <h3 className="text-2xl font-semibold  text-foreground ">
                {showQrModal.workspaceName}
              </h3>
              <p className="text-sm font-medium text-foreground/70 mt-2 bg-muted/50 inline-flex px-3 py-1 rounded-lg border border-border">
                {showQrModal.branchName}
              </p>
            </div>

            {/* QR Image */}
            <div className="p-4 bg-card rounded-2xl border border-border inline-block shadow-sm mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=CHECKIN_${showQrModal.code}`}
                alt="QR Pass"
                className="w-48 h-48 mx-auto rounded-lg"
              />
            </div>

            {/* Quick Actions: Download & Copy */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleDownloadQr(showQrModal.code)}
                disabled={downloadingQr}
                className="btn btn-secondary text-xs py-2 px-3 justify-center border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5 font-bold"
              >
                <FiDownload className="h-3.5 w-3.5" />
                <span>{downloadingQr ? "Đang tải..." : "Tải ảnh QR"}</span>
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
                💡 <strong className="text-foreground">Mẹo Demo:</strong> Nhấn{" "}
                <kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold bg-card border border-border rounded shadow-xs">
                  Win + Shift + S
                </kbd>{" "}
                để chụp mã QR này, sau đó qua tab Lễ tân nhấn{" "}
                <kbd className="px-1.5 py-0.5 font-mono text-[10px] font-bold bg-card border border-border rounded shadow-xs">
                  Ctrl + V
                </kbd>{" "}
                để quét tức thì!
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-3.5 rounded-full bg-slate-900 text-white font-semibold tracking-tight border border-border shadow-sm hover:translate-y-0.5 hover:shadow-none transition-all text-sm"
            >
              Đóng thẻ
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedCancelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-scale-in">
          <div className="bg-card rounded-3xl max-w-md w-full border border-border shadow-sm p-8 relative overflow-hidden">
            {/* Warning Tape Decoration */}
            <div className="absolute top-0 left-0 w-full h-4 bg-[repeating-linear-gradient(45deg,#F59E0B,#F59E0B_10px,#0F172A_10px,#0F172A_20px)] border-b border-border"></div>

            <div className="flex items-center gap-4 text-foreground mt-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border shadow-sm flex items-center justify-center shrink-0 text-white ">
                <FiAlertCircle className="h-8 w-8 font-semibold" />
              </div>
              <h2 className="text-2xl font-semibold   text-foreground">
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
                className={`flex-1 py-4 text-white font-semibold tracking-tight border rounded-full shadow-sm transition-all ${
                  isCanceling 
                    ? "bg-red-400 border-red-400 cursor-not-allowed opacity-70" 
                    : "bg-red-600 border-red-700 hover:-translate-y-1 hover:shadow-md"
                }`}
                onClick={handleCancel}
                disabled={isCanceling}
              >
                {isCanceling ? "Đang hủy..." : "Đồng ý Hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistoryPage;
