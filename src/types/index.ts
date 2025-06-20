
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

export interface AdditionalChargeDefinition {
  id: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  trackQuantity: boolean;
  sku?: string;
  expiryDate?: string;
  imageUrl?: string | null;
  description?: string;
  variants?: ProductVariant[];
  productSKUs: ProductSKU[];
  companyId: string;
  sgstRate?: number;
  cgstRate?: number;
  additionalChargeDefinitions?: AdditionalChargeDefinition[];
}

export type BillMode = 'buy' | 'sell' | 'return';

export interface BillItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  isDefective?: boolean;
  selectedVariantOptions?: Record<string, string>;
  sgstAmount?: number;
  cgstAmount?: number;
  isAdditionalCharge?: boolean;
  sourceChargeDefinitionId?: string;
}

export interface Bill {
  id: string;
  type: BillMode;
  date: string;
  timestamp: number;
  vendorOrCustomerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subTotal?: number;
  totalSGST?: number;
  totalCGST?: number;
  totalAmount: number;
  isEstimate?: boolean;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  billedByStaffId?: string;
  billedByStaffName?: string;
  storeId?: string;
  storeName?: string;
  companyId: string;
}

export interface Category {
  id: string;
  name: string;
  companyId: string;
}

export interface Company {
  id: string;
  name: string;
  token: string;
  activeSubscriptionId: string;
  logoUrl?: string | null;
  slogan?: string;
  phone?: string;
  address?: string;
  gstNo?: string;
  defaultBillNotes?: string;
  defaultSalesPaymentStatus?: 'paid' | 'unpaid';
  defaultPurchasePaymentStatus?: 'paid' | 'unpaid';
  currency?: string; // Added currency field
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  employeeId?: string;
  password?: string;
  role: 'admin' | 'employee';
  assignedStoreIds?: string[];
}

export interface Store {
  id: string;
  companyId: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  passkey: string;
  allowedStaffIds: string[];
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
  companyLogoUrl?: string | null;
  companySlogan?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyGstNo?: string;
  activeSubscriptionId: string;
  dataMode: 'local' | 'global';
  defaultBillNotes?: string;
  defaultSalesPaymentStatus?: 'paid' | 'unpaid';
  defaultPurchasePaymentStatus?: 'paid' | 'unpaid';
  companyCurrency?: string; // Added currency field
}

export interface ChatMessage {
  id: string;
  storeId: string;
  companyId: string;
  senderId: 'admin' | string;
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

// Represents a currency option for the settings dropdown
export interface CurrencyOption {
  code: string; // e.g., "INR", "USD"
  symbol: string; // e.g., "₹", "$"
  name: string; // e.g., "Indian Rupee", "US Dollar"
}
