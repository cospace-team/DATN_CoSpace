import React from 'react';
import {
  FiWifi, FiWind, FiZap, FiMonitor, FiEdit3, FiVideo, FiLock, FiCoffee, FiVolumeX, FiPrinter,
  FiSun, FiUsers, FiPhone, FiMic, FiSpeaker, FiTruck, FiDroplet, FiShield, FiBookOpen, FiStar,
} from 'react-icons/fi';

/** Icon keys an amenity can use; stored in amenities.icon_name. */
export const AMENITY_ICONS: { key: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'wifi', label: 'Wi-Fi', Icon: FiWifi },
  { key: 'wind', label: 'Điều hòa', Icon: FiWind },
  { key: 'zap', label: 'Ổ điện', Icon: FiZap },
  { key: 'monitor', label: 'Màn hình', Icon: FiMonitor },
  { key: 'edit-3', label: 'Bảng viết', Icon: FiEdit3 },
  { key: 'video', label: 'Hội nghị', Icon: FiVideo },
  { key: 'mic', label: 'Micro', Icon: FiMic },
  { key: 'speaker', label: 'Loa', Icon: FiSpeaker },
  { key: 'lock', label: 'Tủ khóa', Icon: FiLock },
  { key: 'coffee', label: 'Đồ uống', Icon: FiCoffee },
  { key: 'droplet', label: 'Nước uống', Icon: FiDroplet },
  { key: 'volume-x', label: 'Cách âm', Icon: FiVolumeX },
  { key: 'printer', label: 'Máy in', Icon: FiPrinter },
  { key: 'sun', label: 'Ánh sáng', Icon: FiSun },
  { key: 'users', label: 'Nhóm', Icon: FiUsers },
  { key: 'phone', label: 'Điện thoại', Icon: FiPhone },
  { key: 'truck', label: 'Gửi xe', Icon: FiTruck },
  { key: 'shield', label: 'An ninh', Icon: FiShield },
  { key: 'book-open', label: 'Thư viện', Icon: FiBookOpen },
  { key: 'star', label: 'Khác', Icon: FiStar },
];

const ICON_BY_KEY = Object.fromEntries(AMENITY_ICONS.map((i) => [i.key, i.Icon]));

export const AmenityIcon: React.FC<{ name?: string | null; className?: string }> = ({ name, className = 'h-4 w-4' }) => {
  const Icon = (name && ICON_BY_KEY[name]) || FiStar;
  return <Icon className={className} />;
};
