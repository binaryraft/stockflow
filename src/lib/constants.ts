import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Package, DollarSign, History as HistoryIcon } from 'lucide-react'; // Renamed History

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/billing', label: 'Billing', icon: DollarSign }, // This now leads to history by default with an option for new bill
  { href: '/products', label: 'Products', icon: Package },
  // { href: '/settings', label: 'Settings', icon: Settings }, // Settings page can be added later
];

export const APP_NAME = "StockFlow";

export const DEFAULT_CATEGORIES: string[] = [
  "Electronics", "Groceries", "Clothing", "Books", "Home Goods", "Toys", "Sports", "Automotive", "Health", "Beauty", "Services", "Other"
];
