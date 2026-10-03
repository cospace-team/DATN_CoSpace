import React from 'react';
import type { IconType } from 'react-icons';
import { FiCoffee, FiHome, FiMonitor, FiPackage, FiPrinter, FiShoppingBag } from 'react-icons/fi';

const BY_TYPE: Record<string, IconType> = {
  drink: FiCoffee,
  meal: FiShoppingBag,
  printing: FiPrinter,
  equipment: FiMonitor,
  facility: FiHome,
};

const TYPE_LABEL: Record<string, string> = {
  drink: 'Đồ uống',
  meal: 'Đồ ăn',
  printing: 'In ấn',
  equipment: 'Thiết bị',
  facility: 'Tiện ích phòng',
};

/** Vietnamese name of a service type; custom types are shown as entered. */
export const serviceTypeLabel = (type?: string): string => TYPE_LABEL[(type || '').toLowerCase()] || type || 'Khác';

/** Icon for an extra service, from its type, or guessed from its name when the type is missing. */
export const serviceIconFor = (type?: string, name?: string): IconType => {
  const byType = BY_TYPE[(type || '').toLowerCase()];
  if (byType) return byType;
  const n = (name || '').toLowerCase();
  if (/cà phê|trà|nước|latte/.test(n)) return FiCoffee;
  if (/\bin ấn\b|\bin màu\b|scan/.test(n)) return FiPrinter;
  if (/bánh|cơm|ăn|combo/.test(n)) return FiShoppingBag;
  if (/màn hình|máy chiếu|bảng/.test(n)) return FiMonitor;
  return FiPackage;
};

export const ServiceIcon: React.FC<{ type?: string; name?: string; className?: string }> = ({ type, name, className = 'h-4 w-4' }) => {
  const Icon = serviceIconFor(type, name);
  return <Icon className={className} aria-hidden="true" />;
};
