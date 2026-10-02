import React, { useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCoffee,
  FiCopy,
  FiCreditCard,
  FiLayers,
  FiMapPin,
  FiMaximize,
  FiShield,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { formatVND } from "../../../utils/formatters";
import type { BookingResponse } from "../../../lib/bookingApi";

/** One booking as the history page holds it: display fields plus the raw API row. */
export interface CustomerBookingItem {
  id: string;
  code: string;
  branchId: string;
  workspaceName: string;
  branchName: string;
  date: Date;
  /** Last day of the booking; differs from `date` for day / week / month passes. */
  endDate: Date;
  status: string;
  totalAmount: number;
  paymentDeadlineAt?: string;
  unit?: string;
  unitCount?: number;
  cancellationReason?: string;
  refundPercent?: number;
  refundAmount?: number;
  penaltyAmount?: number;
  refundStatus?: string;
  policyName?: string;
  cancelledAt?: string;
  raw: BookingResponse;
}

/** Multi-day passes (several days, a week or longer) have no check-in deadline, matching the backend. */
export const hasCheckinDeadline = (unit?: string, unitCount?: number) =>
  unit === "hour" || (unit === "day" && (unitCount ?? 1) <= 1);

/** Remaining time as mm:ss. */
export const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const STATUS: Record<string, { label: string; className: string }> = {
  pending_payment: { label: "Chờ thanh toán", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  confirmed: { label: "Đã xác nhận", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  checked_in: { label: "Đang sử dụng", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  completed: { label: "Hoàn thành", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  checked_out: { label: "Hoàn thành", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  no_show: { label: "Không đến", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  expired: { label: "Hết hạn thanh toán", className: "bg-muted text-muted-foreground border-border" },
  canceled: { label: "Đã hủy", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  cancelled: { label: "Đã hủy", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" },
};

const PAID_VIA: Record<string, string> = {
  payos: "VietQR",
  momo: "MoMo",
  cash: "Tiền mặt tại quầy",
  bank_transfer: "Chuyển khoản tại quầy",
  bank: "Chuyển khoản",
};

const UNIT_TEXT: Record<string, string> = { hour: "giờ", day: "ngày", week: "tuần", month: "tháng" };

const dateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
const time = (d: Date) => d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const longDate = (d: Date) => d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

const pill = "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold";

interface BookingCardProps {
  booking: CustomerBookingItem;
  now: number;
  /** Minutes after the start within which the booking must be checked in. */
  checkinDeadlineMinutes: number;
  apiLoaded: boolean;
  paying: boolean;
  onPay: () => void;
  onCancel: () => void;
  onShowQr: () => void;
  onServices: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking, now, checkinDeadlineMinutes, apiLoaded, paying, onPay, onCancel, onShowQr, onServices,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const raw = booking.raw;
  const status = STATUS[booking.status] ?? STATUS.canceled;
  const isCancelled = booking.status === "canceled" || booking.status === "cancelled";
  const multiDay = booking.endDate.toDateString() !== booking.date.toDateString();
  const checkinDeadline = booking.date.getTime() + checkinDeadlineMinutes * 60_000;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(booking.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  /* ── Time-sensitive hint next to the status ── */
  let timingPill: React.ReactNode = null;
  if (booking.status === "pending_payment" && booking.paymentDeadlineAt) {
    timingPill = (
      <span className={`${pill} font-mono border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300`}
        title="Hết thời gian này, đơn sẽ tự động hủy và trả lại chỗ">
        <FiClock className="h-3 w-3" /> Giữ chỗ còn {formatCountdown(new Date(booking.paymentDeadlineAt).getTime() - now)}
      </span>
    );
  } else if (booking.status === "confirmed" && hasCheckinDeadline(booking.unit, booking.unitCount)) {
    if (now >= checkinDeadline) {
      timingPill = (
        <span className={`${pill} border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300`}
          title="Nếu bạn đã đến nhưng chưa được check-in, hãy liên hệ quầy để được hoàn điểm">
          Quá hạn check-in
        </span>
      );
    } else if (now >= booking.date.getTime()) {
      timingPill = (
        <span className={`${pill} font-mono border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300`}
          title="Quá hạn này mà chưa check-in sẽ bị trừ điểm uy tín">
          <FiClock className="h-3 w-3" /> Còn {formatCountdown(checkinDeadline - now)} để check-in
        </span>
      );
    } else {
      timingPill = (
        <span className={`${pill} border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300`}
          title="Check-in tại quầy từ 30 phút trước giờ bắt đầu">
          Check-in trước {time(new Date(checkinDeadline))}
        </span>
      );
    }
  }

  /* ── Progress: booked → paid → checked in → checked out ── */
  const steps: { label: string; at: string | null; done: boolean }[] = [
    { label: "Đặt chỗ", at: dateTime(raw.createdAt), done: true },
    {
      label: "Thanh toán",
      at: dateTime(raw.paidAt),
      done: !!raw.paidAt || ["confirmed", "checked_in", "completed", "checked_out", "no_show"].includes(booking.status),
    },
    { label: "Check-in", at: dateTime(raw.firstCheckinAt), done: !!raw.firstCheckinAt },
    { label: "Check-out", at: dateTime(raw.lastCheckoutAt), done: !!raw.lastCheckoutAt && booking.status !== "checked_in" },
  ];
  const showProgress = !isCancelled && booking.status !== "expired";

  /* ── Price breakdown ── */
  const priceLines: { label: string; value: number; tone?: "minus" | "plus" }[] = [];
  if (raw.pricePerUnit && booking.unitCount) {
    priceLines.push({
      label: `${formatVND(raw.pricePerUnit)} × ${booking.unitCount} ${UNIT_TEXT[booking.unit ?? ""] ?? ""}`.trim(),
      value: raw.subtotalAmount,
    });
  }
  if (raw.membershipDiscountAmount) {
    priceLines.push({ label: `Ưu đãi hạng ${raw.membershipTierCode ? raw.membershipTierCode.charAt(0).toUpperCase() + raw.membershipTierCode.slice(1) : "thành viên"}`, value: raw.membershipDiscountAmount, tone: "minus" });
  }
  if (raw.promotionDiscountAmount) {
    priceLines.push({ label: `Mã ${raw.promotionCode ?? "khuyến mãi"}`, value: raw.promotionDiscountAmount, tone: "minus" });
  }
  if (raw.addonAmount) priceLines.push({ label: "Dịch vụ", value: raw.addonAmount, tone: "plus" });
  if (raw.taxAmount) priceLines.push({ label: "Thuế", value: raw.taxAmount, tone: "plus" });
  if (raw.serviceFeeAmount) priceLines.push({ label: "Phí dịch vụ", value: raw.serviceFeeAmount, tone: "plus" });

  const paymentText =
    raw.paidVia
      ? `${PAID_VIA[raw.paidVia] ?? raw.paidVia}${raw.paidAt ? ` · ${dateTime(raw.paidAt)}` : ""}`
      : booking.status === "pending_payment"
        ? "Chưa thanh toán"
        : raw.totalAmount === 0
          ? "Không cần thanh toán"
          : ["confirmed", "checked_in", "completed", "no_show"].includes(booking.status)
            ? "Đã thanh toán"
            : "—";

  const spaceMeta = [
    raw.workspaceTypeName,
    raw.floorName ?? (raw.floorNo != null ? `Tầng ${raw.floorNo}` : null),
    raw.workspaceCapacity ? `${raw.workspaceCapacity} chỗ` : null,
  ].filter(Boolean);

  const canCancel =
    booking.status === "pending_payment" || (booking.status === "confirmed" && booking.date.getTime() > now);

  return (
    <article className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${pill} ${status.className}`}>{status.label}</span>
            {timingPill}
            {raw.isContract && <span className={`${pill} border-border bg-muted text-foreground`}>Hợp đồng</span>}
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-foreground truncate">{booking.workspaceName}</h3>
          {spaceMeta.length > 0 && (
            <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              {raw.workspaceTypeName && <span className="inline-flex items-center gap-1"><FiLayers className="h-3.5 w-3.5" />{raw.workspaceTypeName}</span>}
              {(raw.floorName || raw.floorNo != null) && <span>{raw.floorName ?? `Tầng ${raw.floorNo}`}</span>}
              {raw.workspaceCapacity ? <span className="inline-flex items-center gap-1"><FiUsers className="h-3.5 w-3.5" />{raw.workspaceCapacity} chỗ</span> : null}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="self-start inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1 font-mono text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
          title="Sao chép mã đặt chỗ"
        >
          {booking.code}
          {copied ? <FiCheck className="h-3.5 w-3.5 text-emerald-600" /> : <FiCopy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-y border-border bg-muted/30 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><FiCalendar className="h-3.5 w-3.5" /> Thời gian</p>
          <p className="text-sm font-semibold text-foreground">
            {longDate(booking.date)}{multiDay && ` → ${longDate(booking.endDate)}`}
          </p>
          <p className="text-sm text-foreground">
            {time(booking.date)} → {time(booking.endDate)}
            {booking.unitCount && booking.unit && (
              <span className="text-muted-foreground"> · {booking.unitCount} {UNIT_TEXT[booking.unit] ?? booking.unit}</span>
            )}
          </p>
        </div>
        <div className="p-4 space-y-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><FiMapPin className="h-3.5 w-3.5" /> Địa điểm</p>
          <p className="text-sm font-semibold text-foreground line-clamp-2">{booking.branchName}</p>
          {(raw.branchAddress || raw.branchCity) && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {[raw.branchAddress, raw.branchCity].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="p-4 space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5"><FiCreditCard className="h-3.5 w-3.5" /> Thanh toán</p>
          <p className="text-base font-semibold text-foreground font-mono">{formatVND(booking.totalAmount)}</p>
          <p className="text-sm text-muted-foreground">{paymentText}</p>
        </div>
      </div>

      {/* Progress */}
      {showProgress && (
        <ol className="px-5 py-4 grid grid-cols-4 gap-2" aria-label="Tiến trình đơn">
          {steps.map((s, i) => (
            <li key={s.label} className="relative min-w-0">
              {i > 0 && (
                <span aria-hidden className={`absolute top-[7px] right-1/2 w-full h-0.5 -translate-x-[8px] ${s.done ? "bg-emerald-500" : "bg-border"}`} />
              )}
              <div className="relative flex flex-col items-center text-center gap-1">
                <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  s.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-card border-border"
                }`}>
                  {s.done && <FiCheck className="h-2.5 w-2.5" />}
                </span>
                <span className={`text-xs font-medium ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{s.at ?? (s.done ? "" : "—")}</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Cancellation outcome — always visible on a cancelled booking */}
      {isCancelled && (
        <div className="mx-5 my-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm space-y-3">
          {booking.policyName === "PENDING_PAYMENT_CANCEL" ? (
            <p className="text-muted-foreground">Đơn được hủy khi chưa thanh toán: không phát sinh phí và chỗ đã được trả lại.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <FiShield className="h-4 w-4 text-rose-500" /> Hoàn tiền theo chính sách hủy
                </span>
                <span className="text-xs text-muted-foreground">{booking.cancelledAt ? `Hủy lúc ${dateTime(booking.cancelledAt)}` : ""}</span>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><dt className="text-muted-foreground">Chính sách</dt><dd className="font-semibold text-foreground truncate" title={booking.policyName}>{booking.policyName || "Chính sách hủy chuẩn"}</dd></div>
                <div><dt className="text-muted-foreground">Tỷ lệ hoàn</dt><dd className="font-semibold text-foreground">{booking.refundPercent != null ? `${booking.refundPercent}%` : "—"}</dd></div>
                <div><dt className="text-muted-foreground">Số tiền hoàn</dt><dd className="font-semibold font-mono text-emerald-700 dark:text-emerald-400">{formatVND(booking.refundAmount ?? 0)}</dd></div>
                <div><dt className="text-muted-foreground">Phí hủy</dt><dd className="font-semibold font-mono text-rose-700 dark:text-rose-400">{formatVND(booking.penaltyAmount ?? booking.totalAmount)}</dd></div>
              </dl>
              {(booking.refundAmount ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Trạng thái hoàn tiền:{" "}
                  <strong className="text-foreground">
                    {booking.refundStatus === "processed" || booking.refundStatus === "confirmed"
                      ? "Đã hoàn"
                      : booking.refundStatus === "rejected"
                        ? "Bị từ chối"
                        : "Đang xử lý"}
                  </strong>
                </p>
              )}
              {booking.cancellationReason && <p className="text-xs text-muted-foreground">Lý do: {booking.cancellationReason}</p>}
            </>
          )}
        </div>
      )}

      {/* Expandable details */}
      {expanded && (
        <div className="px-5 pb-4 grid gap-4 md:grid-cols-2 text-sm">
          <section className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="font-semibold text-foreground">Chi tiết giá</h4>
            <dl className="space-y-1.5">
              {priceLines.map((l) => (
                <div key={l.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{l.label}</dt>
                  <dd className={`font-mono ${l.tone === "minus" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                    {l.tone === "minus" ? "-" : l.tone === "plus" ? "+" : ""}{formatVND(l.value)}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 pt-2 border-t border-border font-semibold">
                <dt className="text-foreground">Tổng cộng</dt>
                <dd className="font-mono text-foreground">{formatVND(booking.totalAmount)}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="font-semibold text-foreground">Thông tin khác</h4>
            <dl className="space-y-1.5">
              {raw.workspaceCode && (
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Mã chỗ</dt><dd className="font-mono text-foreground">{raw.workspaceCode}</dd></div>
              )}
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Đặt lúc</dt><dd className="text-foreground">{dateTime(raw.createdAt)}</dd></div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Kênh đặt</dt>
                <dd className="text-foreground">{raw.source === "counter" || raw.source === "walkin" ? "Tại quầy" : "Online"}</dd>
              </div>
              {!!raw.checkinCount && raw.checkinCount > 1 && (
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Số lượt đến</dt><dd className="text-foreground">{raw.checkinCount}</dd></div>
              )}
              {raw.reputationDelta != null && raw.reputationDelta !== 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Điểm uy tín</dt>
                  <dd className={`font-semibold ${raw.reputationDelta > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                    {raw.reputationDelta > 0 ? `+${raw.reputationDelta}` : raw.reputationDelta} điểm
                  </dd>
                </div>
              )}
              {spaceMeta.length === 0 && !raw.workspaceCode && (
                <p className="text-muted-foreground">Không có thêm thông tin.</p>
              )}
            </dl>
          </section>
        </div>
      )}

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          aria-expanded={expanded}
        >
          <FiChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Thu gọn" : "Chi tiết giá & thông tin"}
        </button>
        <div className="flex flex-wrap gap-2">
          {canCancel && (
            <button type="button" onClick={onCancel}
              className="btn btn-ghost btn-sm hover:!text-red-700 hover:!bg-red-50 dark:hover:!bg-red-950/30">
              <FiX className="h-4 w-4" /> Hủy đặt chỗ
            </button>
          )}
          {(booking.status === "confirmed" || booking.status === "checked_in") && (
            <button type="button" onClick={onServices} className="btn btn-secondary btn-sm">
              <FiCoffee className="h-4 w-4" /> Dịch vụ & gia hạn
            </button>
          )}
          {booking.status === "confirmed" && (
            <button type="button" onClick={onShowQr} className="btn btn-primary btn-sm">
              <FiMaximize className="h-4 w-4" /> Mã QR check-in
            </button>
          )}
          {booking.status === "pending_payment" && (
            <button type="button" onClick={onPay} disabled={!apiLoaded || paying} className="btn btn-primary btn-sm disabled:opacity-60">
              <FiCreditCard className="h-4 w-4" /> {paying ? "Đang chuyển..." : "Thanh toán ngay"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default BookingCard;
