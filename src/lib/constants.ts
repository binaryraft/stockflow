
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
    name: 'Starter',
    price: 199,
    priceSuffix: '/ month',
    features: [
        '1 Store',
        'Up to 2 Employees',
        'Unlimited Products',
        'Unlimited Bills',
        'Basic Reporting'
    ],
    maxStores: 1,
    maxEmployees: 2,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.GROWTH,
    name: 'Growth',
    price: 1999,
    priceSuffix: '/ month',
    features: [
        'Up to 3 Stores',
        'Up to 10 Employees',
        'All Starter Features',
        'Advanced Reporting',
        'Priority Support'
    ],
    maxStores: 3,
    maxEmployees: 10,
    isPopular: true,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.PRO,
    name: 'Pro',
    price: 9999,
    priceSuffix: '/ month',
    features: [
        'Unlimited Stores',
        'Unlimited Employees',
        'All Growth Features',
        'Premium Support',
        'API Access (soon)'
    ],
    maxStores: Infinity,
    maxEmployees: Infinity,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.ENTERPRISE,
    name: 'Enterprise',
    price: -1, // Indicates "Contact Us"
    priceSuffix: 'Custom Pricing',
    features: [
        'Custom Store & Employee Limits',
        'All Pro Features',
        'Dedicated Account Manager',
        'Custom Integrations & Features'
    ],
    maxStores: Infinity, // Represented as Infinity, but truly custom
    maxEmployees: Infinity, // Represented as Infinity, but truly custom
  },
];
