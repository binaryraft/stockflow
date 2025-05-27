
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Package, DollarSign, Users, Building, User as UserIcon, Settings as SettingsIcon, MessageSquare } from 'lucide-react';
import type { SubscriptionPlan } from '@/types';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/billing', label: 'Billing', icon: DollarSign },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/staff', label: 'Staff', icon: Users },
  { href: '/admin/stores', label: 'Stores', icon: Building },
  { href: '/admin/chat', label: 'Chat', icon: MessageSquare },
  { href: '/admin/profile', label: 'Profile', icon: UserIcon },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

export const APP_NAME = "StockFlow";

export const DEFAULT_CATEGORIES: string[] = [
  "Electronics", "Groceries", "Clothing", "Books", "Home Goods", "Toys", "Sports", "Automotive", "Health", "Beauty", "Services", "Other"
];

export const DEFAULT_COMPANY_NAME = "StockFlow Solutions";
export const COMPANY_ADDRESS = "123 Commerce Way, Business City, ST 54321";
export const COMPANY_CONTACT = "Phone: (555) 123-4567 | Email: support@stockflow.app";


export const SUBSCRIPTION_PLAN_IDS = {
  ADMIN_ONLY: 'plan_admin_only',
  MULTI_STORE: 'plan_multi_store',
  UNLIMITED: 'plan_unlimited',
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY,
    name: 'Basic Admin',
    price: 199,
    priceSuffix: '/ month',
    features: ['Admin Access Only', 'Unlimited Products', 'Unlimited Bills', 'Basic Reporting'],
    maxStores: 0,
    maxEmployees: 0,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.MULTI_STORE,
    name: 'Growth Business',
    price: 399,
    priceSuffix: '/ month',
    features: ['Up to 2 Stores', 'Up to 20 Employees', 'Advanced Reporting', 'Priority Support'],
    maxStores: 2,
    maxEmployees: 20,
    isPopular: true,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.UNLIMITED,
    name: 'Enterprise Unlimited',
    price: 4999,
    priceSuffix: '/ month',
    features: ['Unlimited Stores', 'Unlimited Employees', 'Dedicated Account Manager', 'Custom Integrations'],
    maxStores: Infinity,
    maxEmployees: Infinity,
  },
];
