// Built once: constructing an Intl formatter is far slower than calling format(), and these run
// for every row of every list.
const vndFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const formatVND = (amount: number): string => vndFormatter.format(amount);

export const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));

export const formatTime = (iso: string): string => timeFormatter.format(new Date(iso));

/**
 * Local calendar date as "YYYY-MM-DD" for <input type="date">. Not toISOString(): that is UTC,
 * so local midnight in Vietnam (UTC+7) came out as the previous day.
 */
export const toDateInputValue = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatDateTime = (iso: string): string => {
  return `${formatDate(iso)} ${formatTime(iso)}`;
};

export const formatDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};


export const generateBookingCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'WH-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

export const durationUnitLabel: Record<string, string> = {
  hour: 'Giờ',
  day: 'Ngày',
  week: 'Tuần',
  month: 'Tháng',
};

export const bookingStatusLabel: Record<string, string> = {
  pending_payment: 'Chờ thanh toán',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã check-in',
  completed: 'Hoàn thành',
  canceled: 'Đã hủy',
  cancelled: 'Đã hủy',
  expired: 'Hết hạn',
  no_show: 'Không đến',
};

export const bookingStatusColor: Record<string, string> = {
  pending_payment: 'badge-warning',
  confirmed: 'badge-info',
  checked_in: 'badge-success',
  completed: 'badge-neutral',
  canceled: 'badge-danger',
  expired: 'badge-danger',
};

export const paymentStatusLabel: Record<string, string> = {
  initiated: 'Khởi tạo',
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  expired: 'Hết hạn',
  canceled: 'Đã hủy',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

export const paymentStatusColor: Record<string, string> = {
  initiated: 'badge-neutral',
  pending: 'badge-warning',
  paid: 'badge-success',
  failed: 'badge-danger',
  expired: 'badge-danger',
  canceled: 'badge-danger',
  refunded: 'badge-info',
};

export const workspaceTypeLabel: Record<string, string> = {
  desk: 'Bàn làm việc',
  meeting_room: 'Phòng họp',
  private_office: 'Văn phòng riêng',
};

export const maintenanceStatusLabel: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  active: 'Đang bảo trì',
  in_progress: 'Đang bảo trì',
  done: 'Hoàn tất',
  completed: 'Hoàn tất',
  canceled: 'Đã hủy',
  cancelled: 'Đã hủy',
};
