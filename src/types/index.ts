
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
  purchaseBillId: string; // ID of the bill that created this layer
  purchaseDate: string; // ISO Date string
  initialQuantity: number;
  quantity: number; // Current remaining quantity in this layer
  costPrice: number; // Cost per unit for this layer
  sellPrice: number; // Original intended sell price for this layer (set at purchase time)
  storeId?: string; // To track stock per store if applicable
}

export interface ProductSKU {
  id: string;
  optionValues: Record<string, string>; // e.g., { "Color": "Red", "Size": "M" }
  skuIdentifier?: string; // e.g., "T-Shirt Red M"
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
  sku?: string; // Base SKU/product code if any
  expiryDate?: string; // ISO Date string
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
  productSKUs: ProductSKU[];
  companyId: string;
  sgstRate?: number; // Percentage, e.g., 9 for 9%
  cgstRate?: number; // Percentage
  additionalChargeDefinitions?: AdditionalChargeDefinition[];
}

export type BillMode = 'buy' | 'sell' | 'return';

export interface BillItem {
  id: string; // Unique ID for this item within the bill
  productId: string; // Reference to the Product
  productName: string; // Denormalized for display
  quantity: number;
  costPrice: number; // COGS for this item in this bill (for sales/returns), or purchase cost (for buys)
  sellPrice: number; // Actual sell price for this item in this bill
  isDefective?: boolean; // For return bills
  selectedVariantOptions?: Record<string, string>;
  sgstAmount?: number; // Calculated SGST for this line item
  cgstAmount?: number; // Calculated CGST for this line item
  isAdditionalCharge?: boolean;
  sourceChargeDefinitionId?: string;
}

export interface Bill {
  id: string; // Unique bill ID
  type: BillMode;
  date: string; // ISO Date string of bill creation
  timestamp: number; // For sorting
  vendorOrCustomerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subTotal?: number; // Sum of (item.sellPrice * item.quantity) PRE-TAX
  totalSGST?: number;
  totalCGST?: number;
  totalAmount: number; // Grand total (subTotal + totalSGST + totalCGST for sales, or just sum of costs for buys)
  isEstimate?: boolean; // If true, it's a sales estimate, not an actual invoice
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid'; // For sell and buy bills
  billedByStaffId?: string;
  billedByStaffName?: string; // Denormalized
  storeId?: string;
  storeName?: string; // Denormalized
  companyId: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  token: string; // Placeholder for API key / secret for company-level API access
  activeSubscriptionId: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email?: string; // Required for admins, optional for employees
  employeeId?: string; // For employees
  password?: string; // Hashed password
  role: 'admin' | 'employee';
  assignedStoreIds?: string[]; // For employees, stores they can access
}

export interface Store {
  id: string;
  companyId: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  passkey: string; // For store terminal login
  allowedStaffIds: string[]; // Staff specifically allowed in this store. Empty means any assigned staff.
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

export interface UserProfile { // Primarily client-side preferences for the logged-in admin
  companyName: string; // Denormalized from Company for display
  companyLogoUrl?: string;
  companySlogan?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyGstNo?: string;
  activeSubscriptionId: string; // Client-side cache of company's plan
  dataMode: 'local' | 'global'; // Placeholder for future data source switching
  defaultBillNotes?: string;
  defaultSalesPaymentStatus?: 'paid' | 'unpaid';
  defaultPurchasePaymentStatus?: 'paid' | 'unpaid';
}

export interface ChatMessage {
  id: string;
  storeId: string;
  senderId: 'admin' | string; // 'admin' or employee User.id
  senderName: string;
  text: string;
  timestamp: number;
}

// --- Reporting & Summary Types ---
export interface FinancialSummary {
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number; // From 'buy' bills
  netProfit: number;
}

export interface TodaysFinancialSummary extends FinancialSummary {
  transactionsToday: number; // Count of all bill types today
  defectivesToday: number; // Count of items marked defective in returns today
}

export interface ProductLedgerEntry {
  productId: string;
  productName: string;
  category?: string;
  totalPurchased: number;
  totalSold: number;
  totalRestockedReturns: number; // Non-defective returns
  totalDefectiveReturns: number;
  currentStock: number | 'N/A'; // N/A if not tracked
}
