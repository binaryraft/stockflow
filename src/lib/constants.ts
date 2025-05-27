
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Package, DollarSign, Users, Building } from 'lucide-react'; 

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/billing', label: 'Billing', icon: DollarSign },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/stores', label: 'Stores', icon: Building },
];

export const APP_NAME = "StockFlow";

export const DEFAULT_CATEGORIES: string[] = [
  "Electronics", "Groceries", "Clothing", "Books", "Home Goods", "Toys", "Sports", "Automotive", "Health", "Beauty", "Services", "Other"
];

export const COMPANY_NAME = "StockFlow Inc.";
export const COMPANY_ADDRESS = "123 Inventory Lane, Business City, ST 54321";
export const COMPANY_CONTACT = "Phone: (555) 123-4567 | Email: contact@stockflow.inc";
