import React, { useEffect, useState } from 'react';
import { FiLogOut, FiX, FiAlertTriangle, FiCheck, FiClock } from 'react-icons/fi';
import { formatTime, formatDate, formatVND } from '../../../utils/formatters';
import BookingTabPanel from '../../../components/staff/BookingTabPanel';
import { addonApi, type BookingTabDto, type LateFeeDto } from '../../../api/addonApi';
import type { BookingWithMeta } from '../CheckInPage';

interface CheckoutModalProps {
  selectedCheckoutItem: BookingWithMeta | null;
  onClose: () => void;
  checkoutSubmitting: boolean;
  checkoutNote: string;
  setCheckoutNote: (note: string) => void;
  checkoutTab: BookingTabDto | null;
  setCheckoutTab: (tab: BookingTabDto | null) => void;
  onConfirmCheckout: () => void;
  branchId: string;
  formatMinutes: (min: number) => string;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  selectedCheckoutItem,
  onClose,
  checkoutSubmitting,
  checkoutNote,
  setCheckoutNote,
  checkoutTab,
  setCheckoutTab,
  onConfirmCheckout,
  branchId,
  formatMinutes,
}) => {
  const bookingId: string | undefined = selectedCheckoutItem?.booking?.id;
  const [lateFee, setLateFee] = useState<LateFeeDto | null>(null);
  const [lateFeeBusy, setLateFeeBusy] = useState(false);
  const [lateFeeError, setLateFeeError] = useState('');
  const [tabRefresh, setTabRefresh] = useState(0);

  useEffect(() => {
    setLateFee(null);
    setLateFeeError('');
    if (!bookingId) return;
    let active = true;
    addonApi.lateFee(bookingId)
      .then((fee) => { if (active) setLateFee(fee); })
      .catch((e: Error) => { if (active) setLateFeeError(e.message); });
    return () => { active = false; };
  }, [bookingId]);

  const chargeLateFee = async () => {
    if (!bookingId) return;
    setLateFeeBusy(true);
    setLateFeeError('');
    try {
      setCheckoutTab(await addonApi.chargeLateFee(bookingId));
      setLateFee(await addonApi.lateFee(bookingId));
      setTabRefresh((k) => k + 1);
    } catch (e: any) {
      setLateFeeError(e.message || 'Không thể tính phụ phí');
    } finally {
      setLateFeeBusy(false);
    }
  };

  const lateFeePending = !!lateFee && lateFee.due && !lateFee.alreadyCharged;

  if (!selectedCheckoutItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-scale-up space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                selectedCheckoutItem.meta?.timeStatus === 'overdue'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <FiLogOut className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {selectedCheckoutItem.meta?.pkg?.isMultiDay
                  ? 'Xác nhận Check-out ca hôm nay'
                  : 'Xác nhận Check-out'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedCheckoutItem.meta?.pkg?.isMultiDay
                  ? `Giải phóng vị trí hôm nay. Khách vẫn còn ${
                      selectedCheckoutItem.meta.pkg.progressText || 'ngày tiếp theo'
                    } trong gói và có thể check-in tiếp các ngày sau.`
                  : 'Giải phóng vị trí và hoàn tất phiên sử dụng không gian'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={checkoutSubmitting}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Đóng"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Overdue Warning Alert */}
        {selectedCheckoutItem.meta?.timeStatus === 'overdue' && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3">
            <FiAlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-300">
                Khách hàng ngồi quá giờ dự kiến!
              </p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 leading-relaxed">
                Khách đã sử dụng quá thời gian đăng ký{' '}
                <strong>{formatMinutes(selectedCheckoutItem.meta.overdueMinutes)}</strong>. Vui lòng
                tính và thu phụ phí check-out muộn trước khi giải phóng bàn.
              </p>
            </div>
          </div>
        )}

        {/* Late check-out surcharge */}
        {lateFeePending && lateFee && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <FiClock className="h-4 w-4 text-amber-600" /> Phụ phí check-out muộn: {formatVND(lateFee.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              Trễ {lateFee.lateMinutes} phút (miễn phí {lateFee.graceMinutes} phút đầu) → tính {lateFee.billableHours} giờ ×{' '}
              {formatVND(lateFee.pricePerHour)} × {lateFee.multiplierPercent / 100}. Sau khi tính, phí nằm trong danh sách
              dịch vụ bên dưới; có thể hủy dòng phí để miễn cho khách.
            </p>
            <button type="button" onClick={chargeLateFee} disabled={lateFeeBusy} className="btn btn-primary btn-sm text-xs">
              Tính phụ phí vào đơn
            </button>
          </div>
        )}
        {lateFeeError && <p className="text-xs text-destructive">{lateFeeError}</p>}

        {/* Session Summary Card */}
        <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-3 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-border/50">
            <span className="text-muted-foreground">Khách hàng:</span>
            <span className="font-bold text-foreground text-sm">
              {selectedCheckoutItem.customer?.fullName || 'Khách vãng lai'}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/50">
            <span className="text-muted-foreground">Vị trí không gian:</span>
            <span className="font-bold text-primary">{selectedCheckoutItem.workspace?.name}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/50">
            <span className="text-muted-foreground">Mã đặt chỗ:</span>
            <span className="font-mono font-bold">
              #{selectedCheckoutItem.booking?.bookingCode}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/50">
            <span className="text-muted-foreground">Gói dịch vụ:</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] border ${selectedCheckoutItem.meta?.pkg?.badgeClass}`}
              >
                {selectedCheckoutItem.meta?.pkg?.packageType}
              </span>
              {selectedCheckoutItem.meta?.pkg?.progressText && (
                <span className="text-amber-600 font-bold text-xs">
                  {selectedCheckoutItem.meta.pkg.progressText}
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/50">
            <span className="text-muted-foreground">Giờ vào thực tế:</span>
            <span className="font-medium">
              {formatTime(selectedCheckoutItem.activeCheckin?.checkinAt || '')}
              {!selectedCheckoutItem.meta?.isCheckedInToday && (
                <span className="text-amber-600 font-semibold ml-1.5">
                  ({formatDate(selectedCheckoutItem.activeCheckin?.checkinAt || '')})
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-border/50">
            <span className="text-muted-foreground">Khung giờ sử dụng:</span>
            <span className="font-medium">
              {selectedCheckoutItem.meta?.pkg?.isMultiDay
                ? `Hôm nay: ${selectedCheckoutItem.meta.pkg.timeSlotText} (Hạn: ${selectedCheckoutItem.meta.pkg.dateRangeText})`
                : `${formatTime(selectedCheckoutItem.booking?.startAt)} - ${formatTime(
                    selectedCheckoutItem.booking?.endAt
                  )}`}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground font-semibold">
              {selectedCheckoutItem.meta?.isCheckedInToday
                ? 'Thời gian ngồi hôm nay:'
                : 'Thời gian phiên chưa đóng:'}
            </span>
            <span className="font-bold text-primary text-sm">
              {selectedCheckoutItem.meta?.durationFormatted}
            </span>
          </div>
        </div>

        {/* Dịch vụ gọi thêm: phải thu hết trước khi check-out */}
        <BookingTabPanel
          bookingId={selectedCheckoutItem.booking?.id}
          branchId={selectedCheckoutItem.booking?.branchId || branchId}
          onTabChange={setCheckoutTab}
          refreshKey={tabRefresh}
          compact
        />

        {/* Ghi chú Check-out */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            Ghi chú khi Check-out (Tùy chọn)
          </label>
          <textarea
            value={checkoutNote}
            onChange={e => setCheckoutNote(e.target.value)}
            rows={2}
            placeholder="Ví dụ: Khách trả trễ 15p, bàn giao thiết bị đầy đủ, đã thu phụ phí..."
            className="input-field text-xs resize-none w-full !h-auto py-2.5"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={checkoutSubmitting}
            className="btn btn-secondary btn-sm text-xs font-semibold px-4 py-2"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirmCheckout}
            disabled={checkoutSubmitting || lateFeePending || (checkoutTab?.unpaidAmount ?? 0) > 0}
            title={
              lateFeePending
                ? 'Tính phụ phí check-out muộn trước khi check-out'
                : (checkoutTab?.unpaidAmount ?? 0) > 0
                  ? 'Thu tiền dịch vụ / phụ phí trước khi check-out'
                  : undefined
            }
            className="btn btn-primary btn-sm text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            {checkoutSubmitting ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiCheck className="h-4 w-4" />
                <span>
                  {selectedCheckoutItem.meta?.pkg?.isMultiDay
                    ? 'Xác nhận Check-out ca hôm nay'
                    : 'Xác nhận Check-out'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
