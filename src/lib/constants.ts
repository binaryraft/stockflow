
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
  STARTER: 'plan_starter',
  GROWTH: 'plan_growth',
  PRO: 'plan_pro',
  ENTERPRISE: 'plan_enterprise_contact',
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: SUBSCRIPTION_PLAN_IDS.STARTER,
    name: 'Offline',
    price: 299,
    priceSuffix: '/ month',
    features: [
        'Admin Only',
        'Offline Access',
        'Unlimited Products',
        'Unlimited Bills',
        'Stock Tracking',
        'Variant Tracking',
        'Purchase Bill Tracking'
    ],
    maxStores: 1,
    maxEmployees: 0,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.GROWTH,
    name: 'Starter',
    price: 1999,
    priceSuffix: '/ month',
    features: [
        '1 Stores',
        '2 Staffs',
        'Unlimited Products',
        'Unlimited Bills',
        'Stock Tracking',
        'Variant Tracking',
        'Purchase Bill Tracking'
    ],
    maxStores: 1,
    maxEmployees: 2,
    isPopular: true,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.PRO,
    name: 'Pro',
    price: 5999,
    priceSuffix: '/ month',
    features: [
        '3 Stores',
        '10 Employees',
        'Unlimited Products',
        'Unlimited Bills',
        'Stock Tracking',
        'Variant Tracking',
        'Purchase Bill Tracking'
    ],
    maxStores: Infinity,
    maxEmployees: Infinity,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.ENTERPRISE,
    name: 'Unlimited',
    price: 99999, // Indicates "Contact Us"
    priceSuffix: 'Price may vary, condact sales',
    features: [
      'Unlimited Stores',
      'Unlimited Employees',
      'Unlimited Products',
      'Unlimited Bills',
      'Stock Tracking',
      'Variant Tracking',
      'Purchase Bill Tracking'
    ],
    maxStores: Infinity, // Represented as Infinity, but truly custom
    maxEmployees: Infinity, // Represented as Infinity, but truly custom
  },
];
