import { formatTime } from './formatters';

export interface BookingPackageDisplay {
  isMultiDay: boolean;
  packageType: string;
  badgeClass: string;
  progressText?: string;
  dateRangeText?: string;
  timeSlotText: string;
}

/**
 * Derives display metadata for a booking's package type (hourly, daily, weekly, monthly, contract).
 * Used by both CheckInPage and OperationsDashboardPage.
 */
export const getBookingPackageDisplay = (b: any): BookingPackageDisplay => {
  const isContract = !!b?.isContract;
  const unit = b?.unit;
  const unitCount = b?.unitCount || 1;
  const isMultiDay = isContract || unit === 'week' || unit === 'month' || (unit === 'day' && unitCount > 1);

  let packageType = 'Theo giờ';
  let badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';

  if (isContract) {
    packageType = 'Hợp đồng';
    badgeClass = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  } else if (unit === 'month') {
    packageType = unitCount > 1 ? `Gói ${unitCount} tháng` : 'Gói tháng';
    badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  } else if (unit === 'week') {
    packageType = unitCount > 1 ? `Gói ${unitCount} tuần` : 'Gói tuần';
    badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  } else if (unit === 'day' && unitCount > 1) {
    packageType = `Gói ${unitCount} ngày`;
    badgeClass = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  } else if (unit === 'day') {
    packageType = 'Vé ngày';
    badgeClass = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
  } else {
    packageType = unitCount > 1 ? `Theo giờ (${unitCount}h)` : 'Theo giờ';
    badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  }

  let progressText: string | undefined;
  let dateRangeText: string | undefined;
  let timeSlotText = `${formatTime(b?.startAt)} - ${formatTime(b?.endAt)}`;

  if (isMultiDay && b?.startAt && b?.endAt) {
    const start = new Date(b.startAt);
    const end = new Date(b.endAt);
    const now = new Date();

    const msPerDay = 86400000;
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const totalDays = Math.max(1, Math.round((endMidnight - startMidnight) / msPerDay) + 1);
    const dayPassed = Math.floor((nowMidnight - startMidnight) / msPerDay) + 1;
    const currentDay = Math.min(Math.max(1, dayPassed), totalDays);

    progressText = `Ngày ${currentDay}/${totalDays}`;

    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    dateRangeText = `${fmt(start)} - ${fmt(end)}`;
    timeSlotText = '08:00 - 20:00 (Cả ngày)';
  }

  return { isMultiDay, packageType, badgeClass, progressText, dateRangeText, timeSlotText };
};
