
export interface ProductOption {
  id: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: ProductOption[];
}

export interface StockLayer {
  id: string;
  purchaseBillId: string;
  purchaseDate: string;
  initialQuantity: number;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  storeId?: string;
}

export interface ProductSKU {
  id: string;
  optionValues: Record<string, string>;
  skuIdentifier?: string;
  stockLayers: StockLayer[];
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  trackQuantity: boolean;
  sku?: string; // Base/Global SKU for the product, if applicable
  expiryDate?: string;
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
  productSKUs: ProductSKU[];
  companyId: string;
  sgstRate?: number; // e.g., 9 for 9%
  cgstRate?: number; // e.g., 9 for 9%
}

export type BillMode = 'buy' | 'sell' | 'return';

export interface BillItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number; // For 'buy' it's purchase cost, for 'sell' it's COGS
  sellPrice: number; // For 'sell'/'return' it's transaction price, for 'buy' it's the intended sell price of the batch
  isDefective?: boolean;
  selectedVariantOptions?: Record<string, string>;
  sgstAmount?: number;
  cgstAmount?: number;
}

export interface Bill {
  id:string;
  type: BillMode;
  date: string; // ISO Date string
  timestamp: number; // Unix timestamp
  vendorOrCustomerName?: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number; // This should be the grand total including taxes
  subTotal?: number; // Total before taxes
  totalSGST?: number;
  totalCGST?: number;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  billedByStaffId?: string; // User ID of the employee
  billedByStaffName?: string; // Name of the employee for display
  storeId?: string;
  storeName?: string;
  companyId: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  token: string; // Unique secret or identifier for the company
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email?: string; // Required for admin
  employeeId?: string; // Required for employee
  password?: string; // Plaintext for prototype, should be hashed
  role: 'admin' | 'employee';
  assignedStoreIds?: string[]; // Employee: list of store IDs they are assigned to work at
  // 'passkey' field removed, using 'password' for direct employee login now.
  // Employee passkey for billing operations will be their main password.
}

export interface Store {
  id: string;
  companyId: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  passkey: string; // For store terminal login
  allowedStaffIds: string[]; // User IDs of employees explicitly allowed to operate this terminal after their own login. If empty, any employee of the company might be able to (logic TBD).
  allowedOperations: BillMode[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceSuffix: string;
  features: string[];
  maxStores: number;
  maxEmployees: number;
  isPopular?: boolean;
}

export interface UserProfile {
  companyName: string;
  activeSubscriptionId: string;
  dataMode: 'local' | 'global';
}

export interface ChatMessage {
  id: string;
  storeId: string;
  senderId: 'admin' | string; // 'admin' or a User ID
  senderName: string;
  text: string;
  timestamp: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

export interface TodaysFinancialSummary extends FinancialSummary {
  transactionsToday: number;
  defectivesToday: number;
}

export interface ProductLedgerEntry {
  productId: string;
  productName: string;
  category?: string;
  totalPurchased: number;
  totalSold: number;
  totalRestockedReturns: number;
  totalDefectiveReturns: number;
  currentStock: number | 'N/A';
}
