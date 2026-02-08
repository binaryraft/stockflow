
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Package, DollarSign, Users, Building, User as UserIcon, Settings as SettingsIcon, MessageSquare, Contact, BarChartHorizontal, BookOpen } from 'lucide-react';
import type { SubscriptionPlan, CurrencyOption } from '@/types';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavLinkGroup {
  title?: string;
  links: NavLink[];
}

export const NAV_LINK_GROUPS: NavLinkGroup[] = [
  {
    links: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/billing', label: 'Billing', icon: DollarSign },
      { href: '/admin/products', label: 'Products', icon: Package },
    ],
  },
  {
    links: [
      { href: '/admin/accounting', label: 'Accounting', icon: BookOpen },
    ],
  },
  {
    links: [
      { href: '/admin/customers', label: 'Customers', icon: Contact },
      { href: '/admin/staff', label: 'Staff', icon: Users },
      { href: '/admin/stores', label: 'Stores', icon: Building },
    ],
  },
  {
    links: [
      { href: '/admin/chat', label: 'Chat', icon: MessageSquare },
    ],
  },
  {
    links: [
      { href: '/admin/profile', label: 'Profile', icon: UserIcon },
      { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];


export const APP_NAME = "EcBills";
export const DEFAULT_CATEGORIES: string[] = [
  "Electronics", "Groceries", "Clothing", "Books", "Home Goods", "Toys", "Sports", "Automotive", "Health", "Beauty", "Services", "Other"
];

export const DEFAULT_COMPANY_NAME = "EcBills Solutions";
export const COMPANY_ADDRESS = "123 Commerce Way, Business City, ST 54321";
export const COMPANY_CONTACT = "Phone: (555) 123-4567 | Email: support@ecbills.app";


export const SUBSCRIPTION_PLAN_IDS = {
  ADMIN_ONLY: 'plan_admin_only_basic',
  STARTER: 'plan_starter',
  BASIC: 'plan_basic',
  GROWTH: 'plan_growth',
  PRO: 'plan_pro',
  ENTERPRISE: 'plan_enterprise_contact',
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY,
    name: 'Basic Admin',
    price: 0,
    priceSuffix: '/ month',
    features: [
      'Admin Dashboard Access',
      'Product Management',
      'Billing Management',
      'Limited Reporting',
      'No Store or Staff Management',
    ],
    maxStores: 0,
    maxEmployees: 0,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.STARTER,
    name: 'Starter',
    price: 499,
    priceSuffix: '/ month',
    features: [
      '1 Store',
      'Up to 2 Employees',
      'Unlimited Products',
      'Unlimited Bills',
      'Basic Reporting',
      'Store Chat with Admin'
    ],
    maxStores: 1,
    maxEmployees: 2,
  },
  {
    id: 'plan_basic',
    name: 'Basic',
    price: 999,
    priceSuffix: '/ month',
    features: [
      'Up to 2 Stores',
      'Up to 5 Employees',
      'All Starter Features',
      'Standard Reporting',
      'Email Support'
    ],
    maxStores: 2,
    maxEmployees: 5,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.GROWTH,
    name: 'Growth',
    price: 2999,
    priceSuffix: '/ month',
    features: [
      'Up to 5 Stores',
      'Up to 15 Employees',
      'All Basic Features',
      'Advanced Reporting',
      'Priority Support'
    ],
    maxStores: 5,
    maxEmployees: 15,
    isPopular: true,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.ENTERPRISE,
    name: 'Enterprise',
    price: -1,
    priceSuffix: 'Contact Us',
    features: [
      'Unlimited Stores',
      'Unlimited Employees',
      'All Growth Features',
      'Dedicated Account Manager',
      'Custom Integrations'
    ],
    maxStores: Infinity,
    maxEmployees: Infinity,
  },
];

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export const DEFAULT_CURRENCY_CODE = 'INR';

export const LOW_STOCK_THRESHOLD = 10;
