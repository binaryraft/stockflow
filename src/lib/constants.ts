import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, ShoppingCart, Package, History, Settings, DollarSign } from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/billing', label: 'Billing', icon: DollarSign },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/history', label: 'Bill History', icon: History },
  // { href: '/settings', label: 'Settings', icon: Settings },
];

export const APP_NAME = "StockFlow";

export const DEFAULT_CATEGORIES: string[] = [
  "Electronics", "Groceries", "Clothing", "Books", "Home Goods", "Toys", "Sports", "Automotive", "Health", "Beauty", "Other"
];
