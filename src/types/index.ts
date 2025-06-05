
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
  storeId?: string; // Added storeId to stock layer
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
  sku?: string;
  expiryDate?: string;
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
  productSKUs: ProductSKU[];
  companyId?: string; // Assuming products belong to a company
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
}

export interface Bill {
  id:string;
  type: BillMode;
  date: string;
  timestamp: number;
  vendorOrCustomerName?: string;
  customerPhone?: string;
  items: BillItem[];
  totalAmount: number;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  billedByStaffId?: string; // Could be userId now
  billedByStaffName?: string; // User's name
  storeId?: string;
  storeName?: string;
  companyId?: string; // Assuming bills belong to a company
}

export interface Category {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  token?: string; // Conceptual company-specific token/secret
}

// Replaces Staff type
export interface User {
  id: string;
  companyId: string;
  name: string;
  email?: string; // For admin login
  employeeId?: string; // For employee login
  password?: string; // Hashed in a real app
  role: 'admin' | 'employee';
  passkey?: string; // Could be for specific operations or legacy
  assignedStoreIds?: string[]; // For employees
  accessibleStoreIds?: string[]; // Kept for compatibility, might merge with assignedStoreIds
}


export interface Store {
  id: string;
  companyId: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  passkey: string; // Store-specific passkey for terminal access
  allowedStaffIds: string[]; // Which user IDs (employees) can operate this terminal AFTER primary login
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

export interface UserProfile { // This represents the currently logged-in admin's profile view context
  companyName: string;       // Display name of the company
  activeSubscriptionId: string;
  dataMode: 'local' | 'global';
  // Admin user details (name, email) would be fetched from the User object after login
}

export interface ChatMessage {
  id: string;
  storeId: string;
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
  currentStock: number | 'N/A'; // 'N/A' for non-tracked items
}
