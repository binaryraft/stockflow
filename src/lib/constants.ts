
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
  BASIC_ADMIN: 'plan_basic_admin',
  GROWTH_BUSINESS: 'plan_growth_business',
  SCALE_PRO: 'plan_scale_pro',
  ENTERPRISE: 'plan_enterprise_contact',
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN,
    name: 'Basic Admin',
    price: 199,
    priceSuffix: '/ month',
    features: [
        'Admin Access Only', 
        'Unlimited Products', 
        'Unlimited Bills', 
        'Basic Reporting'
    ],
    maxStores: 0,
    maxEmployees: 0,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.GROWTH_BUSINESS,
    name: 'Growth Business',
    price: 499,
    priceSuffix: '/ month',
    features: [
        'Up to 2 Stores', 
        'Up to 10 Employees', 
        'Full Admin Features',
        'Advanced Reporting', 
        'Priority Support'
    ],
    maxStores: 2,
    maxEmployees: 10,
    isPopular: true,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.SCALE_PRO,
    name: 'Scale Pro',
    price: 999,
    priceSuffix: '/ month',
    features: [
        'Up to 10 Stores', 
        'Up to 50 Employees',
        'All Growth Features',
        'Premium Support',
        'API Access (soon)'
    ],
    maxStores: 10,
    maxEmployees: 50,
  },
  {
    id: SUBSCRIPTION_PLAN_IDS.ENTERPRISE,
    name: 'Enterprise',
    price: -1, // Indicates "Contact Us"
    priceSuffix: 'Custom Pricing',
    features: [
        'Unlimited Stores', 
        'Unlimited Employees', 
        'All Scale Pro Features',
        'Dedicated Account Manager', 
        'Custom Integrations & Features'
    ],
    maxStores: Infinity,
    maxEmployees: Infinity,
  },
];

