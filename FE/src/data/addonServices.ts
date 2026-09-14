import React from 'react';
import { FiCoffee, FiMonitor, FiPrinter } from 'react-icons/fi';

export interface AddonService {
  id: string;
  name: string;
  price: number;
  icon: React.ReactElement;
}

/**
 * Single source of truth for bookable add-on services and their prices, shared by the space
 * picker (ExplorePage's BookingPanel) and the checkout page — previously duplicated in both
 * files, which risked the checkout total silently disagreeing with what was selected.
 */
export const ADDON_SERVICES: AddonService[] = [
  { id: 'coffee', name: 'Cà phê rang xay', price: 35000, icon: React.createElement(FiCoffee) },
  { id: 'lunch', name: 'Cơm trưa văn phòng', price: 55000, icon: React.createElement(FiCoffee) },
  { id: 'monitor', name: 'Màn hình phụ 24"', price: 50000, icon: React.createElement(FiMonitor) },
  { id: 'printing', name: 'In ấn (50 trang)', price: 20000, icon: React.createElement(FiPrinter) },
];
