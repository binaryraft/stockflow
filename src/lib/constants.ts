
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Package, DollarSign, Users, Building, User as UserIcon, Settings as SettingsIcon } from 'lucide-react'; 
import type { SubscriptionPlan } from '@/types';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean; // For subscription-based disabling
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/billing', label: 'Billing', icon: DollarSign },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/stores', label: 'Stores', icon: Building },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

export const APP_NAME = "StockFlow";

export const DEFAULT_CATEGORIES: string[] = [
  "Electronics", "Groceries", "Clothing", "Books", "Home Goods", "Toys", "Sports", "Automotive", "Health", "Beauty", "Services", "Other"
];

// Company details (will be editable in Profile)
export const DEFAULT_COMPANY_NAME = "StockFlow Inc.";
export const COMPANY_ADDRESS = "123 Inventory Lane, Business City, ST 54321";
export const COMPANY_CONTACT = "Phone: (555) 123-4567 | Email: contact@stockflow.inc";


// Subscription Plans
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
    maxStores: 0, // Effectively 0, as this plan doesn't include store management
    maxEmployees: 0, // Effectively 0, as this plan doesn't include staff management
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
