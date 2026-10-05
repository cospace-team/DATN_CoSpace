import React from 'react';
import { FiSearch, FiX, FiClock, FiMapPin, FiCalendar, FiPhone, FiCheckCircle, FiRepeat, FiUserX, FiRotateCcw, FiFileText } from 'react-icons/fi';
import { bookingStatusLabel } from '../../../utils/formatters';
import { EmptyState } from '../../../components/ui/EmptyState';
import { getBookingPackageDisplay } from '../../../utils/bookingPackage';
import type { BranchTodayBookingDto } from '../../../api/staffApi';
import type { StaffNoteDto } from '../../../api/staffOpsApi';

interface TodayScheduleTabProps {
  scheduleTab: 'all' | 'incoming' | 'seated' | 'completed' | 'no_show';
  setScheduleTab: (tab: 'all' | 'incoming' | 'seated' | 'completed' | 'no_show') => void;
  todayCounts: {
    all: number;
    incoming: number;
    seated: number;
    completed: number;
    noShow: number;
  };
  scheduleSearch: string;
  setScheduleSearch: (s: string) => void;
  filteredTodayBookings: BranchTodayBookingDto[];
  branchBookingsTodayLength: number;
  onSelectBookingForCheckin: (bookingCode: string) => void;
  /** Minutes after the start time until a guest who has not checked in counts as missed. */
  checkinDeadlineMinutes?: number;
  /** Moves the booking to another seat or start time. */
  onMove?: (booking: BranchTodayBookingDto) => void;
  onNoShow?: (booking: BranchTodayBookingDto) => void;
  onUndoNoShow?: (booking: BranchTodayBookingDto) => void;
  /** Open notes about customers of this branch, by customer id. */
  customerNotes?: Record<string, StaffNoteDto[]>;
}

export const TodayScheduleTab: React.FC<TodayScheduleTabProps> = ({
  scheduleTab,
  setScheduleTab,
  todayCounts,
  scheduleSearch,
  setScheduleSearch,
  filteredTodayBookings,
  branchBookingsTodayLength,
  onSelectBookingForCheckin,
  checkinDeadlineMinutes = 30,
  onMove,
  onNoShow,
  onUndoNoShow,
  customerNotes = {},
}) => {
  const now = Date.now();
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-full sm:w-auto border border-border/50">
          <button
            onClick={() => setScheduleTab('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              scheduleTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Tất cả</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15 font-mono">
              {todayCounts.all}
            </span>
          </button>
          <button
            onClick={() => setScheduleTab('incoming')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              scheduleTab === 'incoming'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Sắp đến</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
              {todayCounts.incoming}
            </span>
          </button>
          <button
            onClick={() => setScheduleTab('seated')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              scheduleTab === 'seated'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Đang ngồi</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              {todayCounts.seated}
            </span>
          </button>
          <button
            onClick={() => setScheduleTab('completed')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              scheduleTab === 'completed'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Hoàn tất</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15 font-mono">
              {todayCounts.completed}
            </span>
          </button>
          {todayCounts.noShow > 0 && (
            <button
              onClick={() => setScheduleTab('no_show')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                scheduleTab === 'no_show'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Không đến</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono font-bold">
                {todayCounts.noShow}
              </span>
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, mã vé, bàn…"
            value={scheduleSearch}
            onChange={e => setScheduleSearch(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition text-foreground"
          />
          {scheduleSearch && (
            <button
              onClick={() => setScheduleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Danh sách thẻ đặt chỗ hôm nay */}
      {filteredTodayBookings.length === 0 ? (
        <EmptyState
          icon={FiClock}
          title={
            branchBookingsTodayLength === 0
              ? 'Hôm nay chưa có lượt đặt nào'
              : 'Không tìm thấy khách phù hợp'
          }
          description="Các lượt đặt chỗ trực tuyến và tại quầy trong ngày sẽ hiển thị tại đây."
          className="py-12"
        />
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredTodayBookings.map(b => {
            const pkg = getBookingPackageDisplay(b);
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 ${
                  b.status === 'CONFIRMED'
                    ? 'bg-card border-border/80 hover:border-primary/50 shadow-xs'
                    : b.status === 'CHECKED_IN'
                    ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-500/20'
                    : 'bg-muted/30 border-border/40 opacity-75'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Cột trái: Thông tin gói hoặc Avatar */}
                  {pkg.isMultiDay ? (
                    <div className="text-center shrink-0 w-20 bg-amber-500/10 py-1.5 px-1 rounded-xl border border-amber-500/20">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 leading-tight">
                        {pkg.progressText}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-mono">
                        {pkg.dateRangeText}
                      </p>
                      <span
                        className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.2 rounded border ${pkg.badgeClass}`}
                      >
                        {pkg.packageType}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                        b.status === 'CONFIRMED'
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : b.status === 'CHECKED_IN'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {b.customerName ? b.customerName.trim().charAt(0).toUpperCase() : 'K'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-foreground truncate">
                        {b.customerName || 'Khách vãng lai'}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : b.status === 'CHECKED_IN'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {bookingStatusLabel[b.status?.toLowerCase()] || b.status}
                      </span>
                      {(customerNotes[b.userId] ?? []).length > 0 && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center gap-1"
                          title={(customerNotes[b.userId] ?? []).map((n) => n.title).join(' · ')}
                        >
                          <FiFileText className="w-3 h-3" /> Có ghi chú
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pkg.badgeClass}`}
                      >
                        {pkg.packageType}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="font-mono text-primary font-medium">#{b.bookingCode}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-3 h-3 text-primary shrink-0" />{' '}
                        {b.workspaceName || 'Không gian'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <FiClock className="w-3 h-3 text-muted-foreground shrink-0" />{' '}
                        {pkg.timeSlotText}
                      </span>
                      {pkg.isMultiDay && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <FiCalendar className="w-3 h-3 shrink-0" /> {pkg.dateRangeText} (
                            {pkg.progressText})
                          </span>
                        </>
                      )}
                      {b.customerPhone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FiPhone className="w-3 h-3 shrink-0" /> {b.customerPhone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto shrink-0">
                  {b.status === 'CONFIRMED' ? (
                    <>
                      {onMove && (
                        <button
                          onClick={() => onMove(b)}
                          className="btn btn-outline btn-sm rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          title="Đổi sang chỗ khác hoặc dời giờ bắt đầu"
                        >
                          <FiRepeat className="w-3.5 h-3.5" />
                          <span>Đổi chỗ/giờ</span>
                        </button>
                      )}
                      {onNoShow && !pkg.isMultiDay && now >= new Date(b.startAt).getTime() + checkinDeadlineMinutes * 60000 && (
                        <button
                          onClick={() => onNoShow(b)}
                          className="btn btn-ghost btn-sm rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          title="Khách không đến: nhả chỗ cho người khác"
                        >
                          <FiUserX className="w-3.5 h-3.5" />
                          <span>Không đến</span>
                        </button>
                      )}
                      <button
                        onClick={() => onSelectBookingForCheckin(b.bookingCode)}
                        className="btn btn-primary btn-sm rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5  transition-transform cursor-pointer"
                        title="Điền mã và chuẩn bị Check-in"
                      >
                        <FiCheckCircle className="w-3.5 h-3.5" />
                        <span>{pkg.isMultiDay ? 'Check-in hôm nay' : 'Check-in ngay'}</span>
                      </button>
                    </>
                  ) : b.status === 'CHECKED_IN' ? (
                    <>
                      {onMove && (
                        <button
                          onClick={() => onMove(b)}
                          className="btn btn-outline btn-sm rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          title="Chuyển khách sang chỗ khác (chỗ hỏng giữa chừng)"
                        >
                          <FiRepeat className="w-3.5 h-3.5" />
                          <span>Đổi chỗ</span>
                        </button>
                      )}
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đang
                        ngồi
                      </span>
                    </>
                  ) : b.status === 'NO_SHOW' ? (
                    <>
                      {onUndoNoShow && new Date(b.endAt).getTime() > now && (
                        <button
                          onClick={() => onUndoNoShow(b)}
                          className="btn btn-outline btn-sm rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          title="Khách thực ra có đến: khôi phục đơn và hoàn điểm uy tín"
                        >
                          <FiRotateCcw className="w-3.5 h-3.5" />
                          <span>Hoàn tác</span>
                        </button>
                      )}
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400 px-3 py-1 bg-rose-500/10 rounded-xl">
                        Không đến
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground px-3 py-1 bg-muted rounded-xl">
                      {b.status === 'COMPLETED' ? 'Đã hoàn tất' : bookingStatusLabel[b.status?.toLowerCase()] || b.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
