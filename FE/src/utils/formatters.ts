export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
};

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatTime = (iso: string): string => {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (iso: string): string => {
  return `${formatDate(iso)} ${formatTime(iso)}`;
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
  expired: 'Hết hạn',
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
  done: 'Hoàn tất',
  canceled: 'Đã hủy',
};
