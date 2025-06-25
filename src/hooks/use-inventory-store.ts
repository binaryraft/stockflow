
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, User, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode, ChatMessage, StockLayer, ProductOption, FinancialSummary, TodaysFinancialSummary, ProductLedgerEntry, Company, Customer, DateRangeReportSummary, ProductAnalytics, AccountsReceivableSummary, AccountsPayableSummary, MonthlyProductFinancials, CashFlowSummary } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay, isToday, startOfMonth, endOfMonth, startOfYear, endOfYear, isThisWeek, isThisMonth, isThisYear, isWithinInterval } from 'date-fns';
import { DEFAULT_CATEGORIES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, DEFAULT_COMPANY_NAME, DEFAULT_CURRENCY_CODE, LOW_STOCK_THRESHOLD } from '@/lib/constants';
import { toast } from './use-toast';

const generateId = () => uuidv4();

interface ProductProfitabilityData {
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
}


interface InventoryState {
  products: Product[]; 
  bills: Bill[];
  categories: Category[];
  customers: Customer[];
  staffs: User[]; 
  stores: Store[];
  userProfile: UserProfile;
  messagesByStore: Record<string, ChatMessage[]>;

  fetchProducts: (companyId: string) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'companyId'> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number }, companyId: string) => Promise<Product | null>;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'companyId'>> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number }, companyId: string) => Promise<Product | null>;
  archiveProduct: (productId: string, companyId: string) => Promise<boolean>;
  unarchiveProduct: (productId: string, companyId: string) => Promise<boolean>;
  getProductById: (productId: string) => Product | undefined; 
  getProductByName: (name: string) => Product | undefined; 
  searchProducts: (searchTerm: string) => Product[]; 
  getLowStockProductCount: (threshold: number) => number; 

  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>) => ProductSKU | undefined; 
  getSkuDetails: (sku: ProductSKU | undefined, targetStoreId?: string) => { totalStock: number | null; currentSellPrice: number | null; averageCostPrice: number | null; skuIdentifier?: string; };
  getSkuIdentifier: (productName: string, optionValues: Record<string, string>) => string;

  fetchBills: (companyId: string) => Promise<void>;
  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName' | 'companyId' | 'subTotal' | 'totalSGST' | 'totalCGST'> & { billedByStaffId?: string; storeId?: string; companyId: string; isEstimate?: boolean },
    items: Omit<BillItem, 'id'|'productName'|'sgstAmount'|'cgstAmount'|'sourceChargeDefinitionId'| 'costPrice'>[] & {costPrice?:number}[]
  ) => Promise<Bill | null>;
  deleteBill: (billId: string, companyId: string) => Promise<boolean>;
  getBillById: (billId: string) => Bill | undefined;
  updateBillNonCriticalDetails: (billId: string, details: { paymentStatus?: Bill['paymentStatus'], notes?: string }, companyId: string) => Promise<Bill | null>;
  getRecentBills: (limit: number) => Bill[];
  getBillsForProduct: (productId: string) => Bill[];

  fetchCategories: (companyId: string) => Promise<void>;
  addCategory: (categoryName: string, companyId: string) => Promise<Category | null>;
  searchCategories: (searchTerm: string) => string[];

  fetchCustomers: (companyId: string) => Promise<void>;
  getCustomerById: (customerId: string) => Customer | undefined;
  getAllCustomers: (companyId?: string) => Customer[];


  fetchStaff: (companyId: string) => Promise<void>;
  addStaff: (staffData: Omit<User, 'id' | 'role' | 'companyId'|'password'> & {password:string}, companyId: string) => Promise<User | null>;
  updateStaff: (staffId: string, staffData: Partial<Omit<User, 'id' | 'role' | 'companyId'>>, companyId: string) => Promise<User | null>;
  deleteStaff: (staffId: string, companyId: string) => Promise<boolean>;
  getStaffById: (staffId: string) => User | undefined; 
  getAllStaff: () => User[]; 
  getStaffDetailsByIds: (staffIds: string[]) => User[]; 

  fetchStores: (companyId: string) => Promise<void>;
  addStore: (storeData: Omit<Store, 'id' | 'companyId'>, companyId: string) => Promise<Store | null>;
  updateStore: (storeId: string, storeData: Partial<Omit<Store, 'id' | 'companyId'>>, companyId: string) => Promise<Store | null>;
  deleteStore: (storeId: string, companyId: string) => Promise<boolean>;
  getStoreById: (storeId: string) => Store | undefined;
  getAllStores: () => Store[];

  fetchCompanyProfile: (companyId: string) => Promise<Company | null>;
  updateUserProfileFields: (data: Partial<Omit<Company, 'id'|'token'>>, companyId: string) => Promise<Company | null>; 
  getActiveSubscriptionPlan: () => SubscriptionPlan | undefined;
  canAddStore: () => boolean;
  canAddStaff: () => boolean;

  getDailySalesAndExpenses: (days: number, companyId?: string) => Array<{ date: string; sales: number; expenses: number }>;
  getTopSellingProductsByRevenue: (limit: number, companyId?: string) => Array<{ name: string; revenue: number }>;
  getRecentExpenseBillsWithPotentialCoverage: (limit: number, companyId?: string) => ExpenseBillWithCoverage[];
  getExpenseSummaryStats: (companyId?: string) => ExpenseSummary;
  getOverallFinancialSummary: (companyId?: string) => FinancialSummary;
  getTodaysFinancialSummary: (companyId?: string) => TodaysFinancialSummary;
  getTopProfitableProducts: (limit: number, companyId?: string) => ProductProfitabilityData[];
  getProductAnalytics: (productId: string) => ProductAnalytics;
  getProductLedgerSummary: (params?: { companyId?: string, startDate?: Date, endDate?: Date }) => ProductLedgerEntry[];
  getProductFinancialsByMonth: (productId: string) => MonthlyProductFinancials[];
  
  // New Reporting Functions
  getReportSummaryByDateRange: (startDate?: Date, endDate?: Date, companyId?: string) => DateRangeReportSummary;
  getSalesBillsByDateRange: (startDate?: Date, endDate?: Date, companyId?: string) => Bill[];
  getExpenseBillsByDateRange: (startDate?: Date, endDate?: Date, companyId?: string) => Bill[];
  getAccountsReceivableSummary: (companyId?: string) => AccountsReceivableSummary;
  getAccountsPayableSummary: (companyId?: string) => AccountsPayableSummary;
  getCashFlowSummaryByDateRange: (startDate?: Date, endDate?: Date, companyId?: string) => CashFlowSummary;


  fetchMessagesForStore: (storeId: string, companyId: string) => Promise<void>;
  addChatMessage: (storeId: string, senderId: 'admin' | string, senderName: string, text: string, companyId: string) => Promise<void>;
  getMessagesForStore: (storeId: string) => ChatMessage[];
  clearChatForStore: (storeId: string, companyId: string) => Promise<boolean>;

  _hydrate: () => void;
}

interface ExpenseBillWithCoverage extends Bill {
  totalCost: number;
  potentialRevenue: number;
  coverageStatus: 'Covered' | 'Uncovered';
}

interface ExpenseSummary {
  totalCoveredExpenseValue: number;
  totalUncoveredExpenseValue: number;
  totalPotentialProfitOnCoveredExpenses: number;
  totalOutstandingCostOnUncoveredExpenses: number;
  coveredBillCount: number;
  uncoveredBillCount: number;
}


const defaultUserProfile: UserProfile = {
  companyName: DEFAULT_COMPANY_NAME,
  companyLogoUrl: '',
  companySlogan: '',
  companyPhone: '',
  companyAddress: '',
  companyGstNo: '',
  activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.STARTER,
  defaultBillNotes: 'Thank you for your business!',
  defaultSalesPaymentStatus: 'paid',
  defaultPurchasePaymentStatus: 'paid',
  companyCurrency: DEFAULT_CURRENCY_CODE,
  dataMode: 'local', 
};

type InventoryPersist = (
  config: (set: any, get: any, api: any) => InventoryState,
  options: PersistOptions<InventoryState>
) => (set: any, get: any, api: any) => InventoryState;


export const useInventoryStore = create<InventoryState>()(
  (persist as InventoryPersist)(
    (set, get) => ({
      products: [],
      bills: [],
      categories: [], 
      customers: [],
      staffs: [],
      stores: [],
      userProfile: { ...defaultUserProfile },
      messagesByStore: {},
      
      getCashFlowSummaryByDateRange: (startDate, endDate, companyId) => {
        let billsToConsider = get().bills;
        if (companyId) {
            billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }

        if (startDate && endDate) {
            const start = startOfDay(startDate).getTime();
            const end = startOfDay(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
            billsToConsider = billsToConsider.filter(bill => {
                const billTimestamp = new Date(bill.timestamp).getTime();
                return billTimestamp >= start && billTimestamp <= end;
            });
        }
        
        const cashInflows = billsToConsider
            .filter(bill => bill.type === 'sell' && !bill.isEstimate && bill.paymentStatus === 'paid')
            .reduce((sum, bill) => sum + bill.totalAmount, 0);

        const cashOutflows = billsToConsider
            .filter(bill => bill.type === 'buy' && bill.paymentStatus === 'paid')
            .reduce((sum, bill) => sum + bill.totalAmount, 0);

        const netCashFlow = cashInflows - cashOutflows;

        return { cashInflows, cashOutflows, netCashFlow };
      },
      
      getProductFinancialsByMonth: (productId: string): MonthlyProductFinancials[] => {
        const bills = get().bills.filter(b => b.items.some(i => i.productId === productId));
        const monthlyData: Record<string, { revenue: number; cogs: number }> = {};
      
        bills.forEach(bill => {
          if (bill.type === 'sell' && !bill.isEstimate) {
            const monthKey = format(new Date(bill.date), 'MMM yyyy');
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { revenue: 0, cogs: 0 };
            }
            
            bill.items.forEach(item => {
              if (item.productId === productId) {
                monthlyData[monthKey].revenue += item.sellPrice * item.quantity;
                monthlyData[monthKey].cogs += (item.costPrice || 0) * item.quantity;
              }
            });
          }
        });
      
        const sortedKeys = Object.keys(monthlyData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        return sortedKeys.map(key => ({
          month: key,
          revenue: monthlyData[key].revenue,
          cogs: monthlyData[key].cogs,
          profit: monthlyData[key].revenue - monthlyData[key].cogs,
        }));
      },
      
      getProductLedgerSummary: (params?: { companyId?: string, startDate?: Date, endDate?: Date }): ProductLedgerEntry[] => { 
        const { companyId, startDate, endDate } = params || {};
        let productsToConsider = get().products.filter(p => !p.isArchived);
        let billsToConsider = get().bills; 

        if (companyId) {
          productsToConsider = productsToConsider.filter(p => p.companyId === companyId);
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        
        if (startDate && endDate) {
            const start = startOfDay(startDate).getTime();
            const end = startOfDay(endDate).getTime() + (24 * 60 * 60 * 1000 -1); 
            billsToConsider = billsToConsider.filter(bill => {
                const billTimestamp = new Date(bill.timestamp).getTime();
                return billTimestamp >= start && billTimestamp <= end;
            });
        }

        const ledgerMap: Record<string, Omit<ProductLedgerEntry, 'productId' | 'productName' | 'currentStock' | 'category'>> = {};

        billsToConsider.forEach(bill => {
          bill.items.forEach(item => {
            if (item.productId.startsWith('SERVICE_ITEM_') || item.isAdditionalCharge) return;
            
            const productRef = get().getProductById(item.productId);
            if(!productRef) return; 

            const baseProductId = productRef.id; 

            if (!ledgerMap[baseProductId]) {
              ledgerMap[baseProductId] = {
                totalPurchased: 0,
                totalSold: 0,
                totalRestockedReturns: 0,
                totalDefectiveReturns: 0,
              };
            }

            if (bill.type === 'buy') {
              ledgerMap[baseProductId].totalPurchased += item.quantity;
            } else if (bill.type === 'sell' && !bill.isEstimate) { 
              ledgerMap[baseProductId].totalSold += item.quantity;
            } else if (bill.type === 'return') {
              if (item.isDefective) {
                ledgerMap[baseProductId].totalDefectiveReturns += item.quantity;
              } else {
                ledgerMap[baseProductId].totalRestockedReturns += item.quantity;
              }
            }
          });
        });

        return productsToConsider.map(product => {
          const summary = ledgerMap[product.id] || {
            totalPurchased: 0, totalSold: 0, totalRestockedReturns: 0, totalDefectiveReturns: 0,
          };
          let currentStock: number | 'N/A' = 'N/A';
          if (product.trackQuantity) {
            currentStock = product.productSKUs.reduce((sum, sku) => {
                const skuDetails = get().getSkuDetails(sku, undefined); 
                return sum + (skuDetails.totalStock ?? 0);
            }, 0);
          }
          return {
            productId: product.id,
            productName: product.name, 
            category: product.category,
            ...summary,
            currentStock,
          };
        }).sort((a, b) => a.productName.localeCompare(b.productName));
      },

      getProductAnalytics: (productId: string): ProductAnalytics => {
        const { bills, products } = get();
        const product = products.find(p => p.id === productId);
        if (!product) {
            return {
                totalPurchased: 0,
                totalSold: 0,
                totalReturned: 0,
                totalRevenue: 0,
                totalCostOfGoodsSold: 0,
                grossProfit: 0,
                averageSellPrice: null,
                averageCostPrice: null,
            };
        }

        let totalPurchased = 0;
        let totalSold = 0;
        let totalReturned = 0;
        let totalRevenue = 0;
        let totalCostOfGoodsSold = 0;

        const productBills = bills.filter(bill => bill.items.some(item => item.productId === productId));

        productBills.forEach(bill => {
            bill.items.forEach(item => {
                if (item.productId !== productId) return;

                if (bill.type === 'buy') {
                    totalPurchased += item.quantity;
                } else if (bill.type === 'sell' && !bill.isEstimate) {
                    totalSold += item.quantity;
                    totalRevenue += item.sellPrice * item.quantity;
                    totalCostOfGoodsSold += (item.costPrice || 0) * item.quantity;
                } else if (bill.type === 'return') {
                    totalReturned += item.quantity;
                }
            });
        });
        
        const grossProfit = totalRevenue - totalCostOfGoodsSold;
        const averageSellPrice = totalSold > 0 ? totalRevenue / totalSold : null;
        const averageCostPrice = totalSold > 0 ? totalCostOfGoodsSold / totalSold : null;

        return {
            totalPurchased,
            totalSold,
            totalReturned,
            totalRevenue,
            totalCostOfGoodsSold,
            grossProfit,
            averageSellPrice,
            averageCostPrice,
        };
      },
      
      getReportSummaryByDateRange: (startDate, endDate, companyId) => {
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }

        if (startDate && endDate) {
            const start = startOfDay(startDate).getTime();
            const end = startOfDay(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
            billsToConsider = billsToConsider.filter(bill => {
                const billTimestamp = new Date(bill.timestamp).getTime();
                return billTimestamp >= start && billTimestamp <= end;
            });
        }
    
        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalExpenses = 0;
        let totalBills = 0;
        let totalItemsSold = 0;
        let totalSGST = 0;
        let totalCGST = 0;
    
        billsToConsider.forEach(bill => {
            totalBills++;
            if (bill.type === 'sell' && !bill.isEstimate) {
                totalRevenue += bill.subTotal ?? 0;
                totalSGST += bill.totalSGST ?? 0;
                totalCGST += bill.totalCGST ?? 0;
                bill.items.forEach(item => {
                    if (!item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
                        totalCOGS += (item.costPrice || 0) * item.quantity;
                        totalItemsSold += item.quantity;
                    }
                });
            } else if (bill.type === 'buy') {
                totalExpenses += bill.totalAmount;
            }
        });
    
        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpenses; 
        const totalTax = totalSGST + totalCGST;
    
        return { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit, totalBills, totalItemsSold, totalSGST, totalCGST, totalTax };
      },

      getSalesBillsByDateRange: (startDate, endDate, companyId) => {
          let billsToConsider = get().bills.filter(b => b.type === 'sell' && !b.isEstimate);
          if (companyId) {
            billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
          }

          if (startDate && endDate) {
              const start = startOfDay(startDate).getTime();
              const end = startOfDay(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
              billsToConsider = billsToConsider.filter(bill => {
                  const billTimestamp = new Date(bill.timestamp).getTime();
                  return billTimestamp >= start && billTimestamp <= end;
              });
          }
          return billsToConsider.sort((a, b) => b.timestamp - a.timestamp);
      },

      getExpenseBillsByDateRange: (startDate, endDate, companyId) => {
          let billsToConsider = get().bills.filter(b => b.type === 'buy');
          if (companyId) {
            billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
          }

           if (startDate && endDate) {
              const start = startOfDay(startDate).getTime();
              const end = startOfDay(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
              billsToConsider = billsToConsider.filter(bill => {
                  const billTimestamp = new Date(bill.timestamp).getTime();
                  return billTimestamp >= start && billTimestamp <= end;
              });
          }
          return billsToConsider.sort((a, b) => b.timestamp - a.timestamp);
      },
      
      getAccountsReceivableSummary: (companyId) => {
        let billsToConsider = get().bills;
        if (companyId) {
            billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const unpaidInvoices = billsToConsider.filter(
            bill => bill.type === 'sell' && !bill.isEstimate && bill.paymentStatus === 'unpaid'
        );
        const totalReceivable = unpaidInvoices.reduce((sum, bill) => sum + bill.totalAmount, 0);
        return {
            totalReceivable,
            unpaidInvoices: unpaidInvoices.sort((a,b) => b.timestamp - a.timestamp),
        };
      },
      getAccountsPayableSummary: (companyId) => {
          let billsToConsider = get().bills;
          if (companyId) {
              billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
          }
          const unpaidBills = billsToConsider.filter(
              bill => bill.type === 'buy' && bill.paymentStatus === 'unpaid'
          );
          const totalPayable = unpaidBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
          return {
              totalPayable,
              unpaidBills: unpaidBills.sort((a,b) => b.timestamp - a.timestamp),
          };
      },

      fetchProducts: async (companyId: string) => {
        if (!companyId) { console.warn("fetchProducts: companyId is required"); set({ products: [] }); return; }
        try {
          const response = await fetch(`/api/products?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) set({ products: result.data });
          else { console.error("Failed to fetch products or data format incorrect:", result.message); set({ products: [] }); }
        } catch (error) { console.error("Error fetching products:", error); set({ products: [] }); }
      },
      addProduct: async (productData, companyId) => {
        if (!companyId) { console.error("addProduct: companyId is required"); return null; }
        try {
          const response = await fetch('/api/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ products: [...state.products, result.data] }));
            if (productData.category) get().fetchCategories(companyId);
            return result.data;
          } else { console.error("Failed to add product via API:", result.message); return null; }
        } catch (error) { console.error("Error adding product via API:", error); return null; }
      },
      updateProduct: async (productId, productData, companyId) => {
        if (!companyId) { console.error("updateProduct: companyId is required"); return null; }
        try {
          const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ products: state.products.map((p) => (p.id === productId ? result.data : p)) }));
            if (productData.category) get().fetchCategories(companyId);
            return result.data;
          } else { console.error("Failed to update product via API:", result.message); return null; }
        } catch (error) { console.error("Error updating product via API:", error); return null; }
      },
      archiveProduct: async (productId: string, companyId: string) => {
        if (!companyId) { console.error("archiveProduct: companyId is required"); return false; }
        try {
          const response = await fetch(`/api/products/${productId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => ({
              products: state.products.map((p) =>
                p.id === productId ? { ...p, isArchived: true } : p
              ),
            }));
            return true;
          } else { console.error("Failed to archive product via API:", result.message); return false; }
        } catch (error) { console.error("Error archiving product via API:", error); return false; }
      },
      unarchiveProduct: async (productId: string, companyId: string) => {
        if (!companyId) { console.error("unarchiveProduct: companyId is required"); return false; }
        try {
          const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productData: { isArchived: false }, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({
              products: state.products.map((p) =>
                p.id === productId ? result.data : p
              ),
            }));
            return true;
          } else { console.error("Failed to unarchive product via API:", result.message); return false; }
        } catch (error) { console.error("Error unarchiving product via API:", error); return false; }
      },

      fetchStores: async (companyId: string) => {
        if (!companyId) { console.warn("fetchStores: companyId is required"); set({ stores: [] }); return; }
        try {
          const response = await fetch(`/api/stores?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch stores: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) set({ stores: result.data });
          else { console.error("Failed to fetch stores or data format incorrect:", result.message); set({ stores: [] }); }
        } catch (error) { console.error("Error fetching stores:", error); set({ stores: [] }); }
      },
      addStore: async (storeData, companyId) => {
        if (!companyId) { console.error("addStore: companyId is required"); return null; }
        try {
          const response = await fetch('/api/stores', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ stores: [...state.stores, result.data] }));
            return result.data;
          } else { console.error("Failed to add store via API:", result.message); toast({ variant: "destructive", title: "Add Failed", description: result.message || "Could not add store." }); return null; }
        } catch (error) { console.error("Error adding store via API:", error); return null; }
      },
      updateStore: async (storeId, storeData, companyId) => {
        if (!companyId) { console.error("updateStore: companyId is required"); return null; }
        try {
          const response = await fetch(`/api/stores/${storeId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ stores: state.stores.map((s) => (s.id === storeId ? result.data : s)) }));
            return result.data;
          } else { console.error("Failed to update store via API:", result.message); return null; }
        } catch (error) { console.error("Error updating store via API:", error); return null; }
      },
      deleteStore: async (storeId, companyId) => {
        if (!companyId) { console.error("deleteStore: companyId is required"); return false; }
        try {
          const response = await fetch(`/api/stores/${storeId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => ({ stores: state.stores.filter((s) => s.id !== storeId) }));
            return true;
          } else { console.error("Failed to delete store via API:", result.message); return false; }
        } catch (error) { console.error("Error deleting store via API:", error); return false; }
      },
      
      fetchStaff: async (companyId: string) => {
        if (!companyId) { console.warn("fetchStaff: companyId is required"); set({ staffs: [] }); return; }
        try {
          const response = await fetch(`/api/staff?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch staff: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) set({ staffs: result.data });
          else { console.error("Failed to fetch staff or data format incorrect:", result.message); set({ staffs: [] }); }
        } catch (error) { console.error("Error fetching staff:", error); set({ staffs: [] }); }
      },
      addStaff: async (staffData, companyId) => {
        if (!companyId) { console.error("addStaff: companyId is required"); return null; }
        try {
          const response = await fetch('/api/staff', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ staffs: [...state.staffs, result.data] }));
            return result.data;
          } else { console.error("Failed to add staff via API:", result.message); toast({ variant: "destructive", title: "Add Failed", description: result.message || "Could not add staff member." }); return null; }
        } catch (error) { console.error("Error adding staff via API:", error); return null; }
      },
      updateStaff: async (staffId, staffData, companyId) => {
        if (!companyId) { console.error("updateStaff: companyId is required"); return null; }
        try {
          const response = await fetch(`/api/staff/${staffId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ staffs: state.staffs.map((s) => (s.id === staffId ? result.data : s)) }));
            return result.data;
          } else { console.error("Failed to update staff via API:", result.message); return null; }
        } catch (error) { console.error("Error updating staff via API:", error); return null; }
      },
      deleteStaff: async (staffId, companyId) => {
        if (!companyId) { console.error("deleteStaff: companyId is required"); return false; }
        try {
          const response = await fetch(`/api/staff/${staffId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => ({ staffs: state.staffs.filter((s) => s.id !== staffId) }));
            return true;
          } else { console.error("Failed to delete staff via API:", result.message); return false; }
        } catch (error) { console.error("Error deleting staff via API:", error); return false; }
      },

      fetchCategories: async (companyId: string) => {
        if (!companyId) { console.warn("fetchCategories: companyId is required"); set({ categories: [] }); return; }
        try {
          const response = await fetch(`/api/categories?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch categories: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) set({ categories: result.data });
          else { console.error("Failed to fetch categories or data format incorrect:", result.message); set({ categories: [] }); }
        } catch (error) { console.error("Error fetching categories:", error); set({ categories: [] }); }
      },
      addCategory: async (categoryName, companyId) => {
        if (!companyId) { console.error("addCategory: companyId is required"); return null; }
        try {
          const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: categoryName, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ categories: [...state.categories, result.data].sort((a, b) => a.name.localeCompare(b.name)) }));
            return result.data;
          } else { console.error("Failed to add category via API:", result.message); return null; }
        } catch (error) { console.error("Error adding category via API:", error); return null; }
      },

      fetchCustomers: async (companyId: string) => {
        if (!companyId) { console.warn("fetchCustomers: companyId is required"); set({ customers: [] }); return; }
        try {
          const response = await fetch(`/api/customers?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch customers: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            set({ customers: result.data });
          } else {
            console.error("Failed to fetch customers or data format incorrect:", result.message);
            set({ customers: [] });
          }
        } catch (error) {
          console.error("Error fetching customers:", error);
          set({ customers: [] });
        }
      },
      getCustomerById: (customerId: string) => get().customers.find((c) => c.id === customerId),
      getAllCustomers: (companyId?: string) => {
        const state = get();
        if (companyId) {
          return state.customers.filter(c => c.companyId === companyId);
        }
        return state.customers;
      },

      fetchMessagesForStore: async (storeId, companyId) => {
        if (!storeId || !companyId) { console.warn("fetchMessages: storeId and companyId are required"); return; }
        try {
          const response = await fetch(`/api/chat/${storeId}?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch messages: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            set((state) => ({
              messagesByStore: { ...state.messagesByStore, [storeId]: result.data.sort((a,b) => a.timestamp - b.timestamp) },
            }));
          } else {
            console.error("Failed to fetch messages or data format incorrect:", result.message);
            set((state) => ({ messagesByStore: { ...state.messagesByStore, [storeId]: [] } }));
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
          set((state) => ({ messagesByStore: { ...state.messagesByStore, [storeId]: [] } }));
        }
      },
      addChatMessage: async (storeId, senderId, senderName, text, companyId) => {
        if (!storeId || !senderId || !text || !companyId) { console.error("addChatMessage: Missing required params"); return; }
        try {
          const response = await fetch(`/api/chat/${storeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId, senderName, text, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => {
              const existingMessages = state.messagesByStore[storeId] || [];
              return {
                messagesByStore: { ...state.messagesByStore, [storeId]: [...existingMessages, result.data].sort((a,b) => a.timestamp - b.timestamp) },
              };
            });
          } else { console.error("Failed to add chat message via API:", result.message); }
        } catch (error) { console.error("Error adding chat message via API:", error); }
      },
      clearChatForStore: async (storeId, companyId) => {
        if (!storeId || !companyId) { console.error("clearChatForStore: Missing required params"); return false; }
        try {
          const response = await fetch(`/api/chat/${storeId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => {
              const newMessagesByStore = { ...state.messagesByStore };
              delete newMessagesByStore[storeId]; 
              return { messagesByStore: newMessagesByStore };
            });
            return true;
          } else { console.error("Failed to clear chat via API:", result.message); return false; }
        } catch (error) { console.error("Error clearing chat via API:", error); return false; }
      },

      fetchBills: async (companyId: string) => {
        if (!companyId) { console.warn("fetchBills: companyId is required"); set({ bills: [] }); return; }
        try {
          const response = await fetch(`/api/bills?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch bills: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            set({ bills: result.data.sort((a: Bill, b: Bill) => b.timestamp - a.timestamp) });
          } else {
            console.error("Failed to fetch bills or data format incorrect:", result.message);
            set({ bills: [] });
          }
        } catch (error) {
          console.error("Error fetching bills:", error);
          set({ bills: [] });
        }
      },
      addBill: async (billData, itemsData) => {
        if (!billData.companyId) { console.error("addBill: companyId is required in billData"); throw new Error("Company ID missing."); }
        try {
          const response = await fetch('/api/bills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ billData, itemsData }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            const savedBill: Bill = result.data;
            set((state) => ({ bills: [savedBill, ...state.bills].sort((a,b) => b.timestamp - a.timestamp) }));
            get().fetchProducts(billData.companyId); 
            
            toast({ title: "Bill Saved", description: `Bill ${savedBill.id.slice(-6)} created successfully.` });

            if (savedBill.type === 'sell') {
              savedBill.items.forEach(item => {
                if (item.productId.startsWith('SERVICE_ITEM_') || item.isAdditionalCharge) return;
                const product = get().getProductById(item.productId);
                if (product && product.trackQuantity) {
                  const totalStock = product.productSKUs.reduce((sum, sku) => sum + (get().getSkuDetails(sku, savedBill.storeId).totalStock ?? 0), 0);
                  if (totalStock > 0 && totalStock < LOW_STOCK_THRESHOLD) {
                    toast({
                      variant: "destructive",
                      title: "Low Stock Warning",
                      description: `Stock for ${product.name} is now ${totalStock}. Consider reordering.`
                    });
                  }
                }
              });
            }

            return savedBill;
          } else {
            console.error("Failed to add bill via API:", result.message);
            throw new Error(result.message || "Failed to save bill.");
          }
        } catch (error) {
          console.error("Error adding bill via API:", error);
          throw error;
        }
      },
      deleteBill: async (billId: string, companyId: string) => {
        if (!companyId) { console.error("deleteBill: companyId is required"); return false; }
        try {
          const response = await fetch(`/api/bills/${billId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => ({ bills: state.bills.filter((b) => b.id !== billId) }));
            get().fetchProducts(companyId); 
            return true;
          } else {
            console.error("Failed to delete bill via API:", result.message);
            return false;
          }
        } catch (error) {
          console.error("Error deleting bill via API:", error);
          return false;
        }
      },
      updateBillNonCriticalDetails: async (billId, details, companyId) => {
        if (!companyId) { console.error("updateBillNonCriticalDetails: companyId is required"); return null; }
        try {
          const response = await fetch(`/api/bills/${billId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...details, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({
              bills: state.bills.map((b) => (b.id === billId ? result.data : b)),
            }));
            return result.data;
          } else {
            console.error("Failed to update bill details via API:", result.message);
            return null;
          }
        } catch (error) {
          console.error("Error updating bill details via API:", error);
          return null;
        }
      },

      fetchCompanyProfile: async (companyId: string): Promise<Company | null> => {
        if (!companyId) { console.warn("fetchCompanyProfile: companyId is required"); set({userProfile: defaultUserProfile}); return null; }
        try {
          const response = await fetch(`/api/companies/${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch company profile: ${response.statusText}`);
          const result = await response.json();
          if (result.success && result.data) {
            const companyData = result.data as Company;
            set({ userProfile: {
                companyName: companyData.name,
                companyLogoUrl: companyData.logoUrl,
                companySlogan: companyData.slogan,
                companyPhone: companyData.phone,
                companyAddress: companyData.address,
                companyGstNo: companyData.gstNo,
                activeSubscriptionId: companyData.activeSubscriptionId,
                defaultBillNotes: companyData.defaultBillNotes,
                defaultSalesPaymentStatus: companyData.defaultSalesPaymentStatus,
                defaultPurchasePaymentStatus: companyData.defaultPurchasePaymentStatus,
                companyCurrency: companyData.currency || DEFAULT_CURRENCY_CODE,
                dataMode: 'global',
            }});
            return companyData;
          } else { 
            console.error("Failed to fetch company profile or data format incorrect:", result.message); 
            set({userProfile: {...defaultUserProfile, dataMode: 'local'} }); 
            return null;
          }
        } catch (error) { 
          console.error("Error fetching company profile:", error); 
          set({userProfile: {...defaultUserProfile, dataMode: 'local'} }); 
          return null;
        }
      },
      updateUserProfileFields: async (dataToUpdate, companyId) => {
        if (!companyId) { console.error("updateUserProfileFields: companyId is required"); return null; }
        try {
          const response = await fetch(`/api/companies/${companyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToUpdate),
          });
          const result = await response.json();
          if (result.success && result.data) {
            const updatedCompany = result.data as Company;
            set((state) => ({
              userProfile: {
                ...state.userProfile, 
                companyName: updatedCompany.name,
                companyLogoUrl: updatedCompany.logoUrl,
                companySlogan: updatedCompany.slogan,
                companyPhone: updatedCompany.phone,
                companyAddress: updatedCompany.address,
                companyGstNo: updatedCompany.gstNo,
                activeSubscriptionId: updatedCompany.activeSubscriptionId,
                defaultBillNotes: updatedCompany.defaultBillNotes,
                defaultSalesPaymentStatus: updatedCompany.defaultSalesPaymentStatus,
                defaultPurchasePaymentStatus: updatedCompany.defaultPurchasePaymentStatus,
                companyCurrency: updatedCompany.currency || state.userProfile.companyCurrency || DEFAULT_CURRENCY_CODE,
                dataMode: 'global',
              }
            }));
            return updatedCompany;
          } else {
            console.error("Failed to update company profile on server:", result.message);
            return null;
          }
        } catch (error) {
          console.error("Error updating company profile on server:", error);
          return null;
        }
      },

      getSkuIdentifier: (productName, optionValues) => { 
        if (!productName) return "Unknown Product";
        if (!optionValues || Object.keys(optionValues).length === 0) return productName;
        const sortedOptionsString = Object.entries(optionValues)
          .filter(([, value]) => typeof value === 'string')
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([, value]) => value)
          .join(' - ');
        return sortedOptionsString ? `${productName} (${sortedOptionsString})` : productName;
      },
      findOrCreateProductSKU: (productId, optionValues) => { 
        const products = get().products;
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex === -1) return undefined;

        const product = products[productIndex];
        const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(optionValues).sort()));

        let sku = product.productSKUs.find(s =>
          JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === stringifiedTargetOptions
        );
        if (!sku) {
           const skuIdentifier = get().getSkuIdentifier(product.name, optionValues);
           return { id: generateId() + '_conceptual', optionValues: { ...optionValues }, skuIdentifier: skuIdentifier, stockLayers: [] };
        }
        return sku;
      },
      getSkuDetails: (sku, targetStoreId) => { 
        const products = get().products;
        const product = products.find(p => p.productSKUs.some(s => s.id === sku?.id));
        const skuIdentifier = sku?.skuIdentifier || (sku && product ? get().getSkuIdentifier(product.name, sku.optionValues) : undefined);

        if (!sku || !Array.isArray(sku.stockLayers) || !product) {
          return { totalStock: 0, currentSellPrice: null, averageCostPrice: null, skuIdentifier };
        }

        const relevantStockLayers = targetStoreId
            ? sku.stockLayers.filter(layer => layer.storeId === targetStoreId)
            : sku.stockLayers;

        if (product.trackQuantity === false) {
          const priceLayer = relevantStockLayers.find(layer => layer) || sku.stockLayers[0]; 
          return {
            totalStock: null,
            currentSellPrice: priceLayer?.sellPrice ?? null,
            averageCostPrice: priceLayer?.costPrice ?? null,
            skuIdentifier,
          };
        }

        const totalStock = relevantStockLayers.reduce((sum, layer) => sum + (typeof layer.quantity === 'number' ? layer.quantity : 0), 0);

        let currentSellPrice: number | null = null;
        if (totalStock > 0) {
          const oldestLayerWithStock = [...relevantStockLayers]
            .filter(layer => typeof layer.quantity === 'number' && layer.quantity > 0)
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())[0];
          if (oldestLayerWithStock && typeof oldestLayerWithStock.sellPrice === 'number') {
            currentSellPrice = oldestLayerWithStock.sellPrice;
          }
        } else if (relevantStockLayers.length > 0) { 
            const newestLayer = [...relevantStockLayers].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())[0];
            if (newestLayer && typeof newestLayer.sellPrice === 'number') {
                currentSellPrice = newestLayer.sellPrice;
            }
        }

        let averageCostPrice: number | null = null;
        if (totalStock > 0) {
            const totalCostValue = relevantStockLayers.reduce((sum, layer) => sum + ((typeof layer.costPrice === 'number' ? layer.costPrice : 0) * (typeof layer.quantity === 'number' ? layer.quantity : 0)), 0);
            averageCostPrice = totalCostValue / totalStock;
        } else if (relevantStockLayers.length > 0) { 
            const totalInitialCost = relevantStockLayers.reduce((sum, layer) => sum + ((typeof layer.costPrice === 'number' ? layer.costPrice : 0) * (typeof layer.initialQuantity === 'number' ? layer.initialQuantity : 0)), 0);
            const totalInitialQty = relevantStockLayers.reduce((sum, layer) => sum + (typeof layer.initialQuantity === 'number' ? layer.initialQuantity : 0), 0);
            if (totalInitialQty > 0) averageCostPrice = totalInitialCost / totalInitialQty;
        }
        return { totalStock, currentSellPrice, averageCostPrice, skuIdentifier };
      },
      getBillById: (billId) => get().bills.find((b) => b.id === billId),
      getRecentBills: (limit: number) => [...get().bills].sort((a,b)=> b.timestamp - a.timestamp).slice(0, limit),
      getBillsForProduct: (productId: string) => get().bills.filter(bill => bill.items.some(item => item.productId === productId)).sort((a, b) => b.timestamp - a.timestamp),
      searchCategories: (searchTerm: string) => { 
        const categories = get().categories;
        if (!searchTerm) return categories.map(c => c.name).sort((a,b) => a.localeCompare(b));
        const lowerSearchTerm = searchTerm.toLowerCase();
        return categories
          .filter(c => c.name.toLowerCase().includes(lowerSearchTerm))
          .map(c => c.name)
          .sort((a,b) => a.localeCompare(b));
      },
      getStaffById: (staffId) => get().staffs.find((s) => s.id === staffId),
      getAllStaff: () => get().staffs,
      getStaffDetailsByIds: (staffIds: string[]) => {
        const allStaff = get().staffs;
        return staffIds.map(id => allStaff.find(s => s.id === id)).filter(s => !!s) as User[];
      },
      getStoreById: (storeId) => get().stores.find((s) => s.id === storeId),
      getAllStores: () => get().stores,
      getActiveSubscriptionPlan: () => { 
        const { userProfile } = get();
        if (!userProfile || !userProfile.activeSubscriptionId) {
           return SUBSCRIPTION_PLANS.find(p => p.id === SUBSCRIPTION_PLAN_IDS.STARTER);
        }
        return SUBSCRIPTION_PLANS.find(plan => plan.id === userProfile.activeSubscriptionId) || SUBSCRIPTION_PLANS.find(p => p.id === SUBSCRIPTION_PLAN_IDS.STARTER);
      },
      canAddStore: () => { 
        const plan = get().getActiveSubscriptionPlan();
        if (!plan) return false;
        return get().stores.length < plan.maxStores;
      },
      canAddStaff: () => { 
        const plan = get().getActiveSubscriptionPlan();
        if (!plan) return false;
        return get().staffs.length < plan.maxEmployees;
      },
      getProductById: (productId: string) => get().products.find((p) => p.id === productId),
      getProductByName: (name: string) => get().products.find((p) => !p.isArchived && p.name.toLowerCase() === name.toLowerCase()),
      searchProducts: (searchTerm: string) => { 
        if (!searchTerm) return []; 
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().products.filter(
          (p) =>
            !p.isArchived &&
            (p.name.toLowerCase().includes(lowerSearchTerm) ||
            (p.category && p.category.toLowerCase().includes(lowerSearchTerm)) ||
            (p.sku && p.sku.toLowerCase().includes(lowerSearchTerm)) ||
            p.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(lowerSearchTerm)))
        );
      },
      getLowStockProductCount: (threshold: number) => { 
        return get().products.reduce((count, product) => {
          if (!product.isArchived && product.trackQuantity) {
            const totalStock = product.productSKUs.reduce((sum, sku) => sum + (get().getSkuDetails(sku, undefined).totalStock ?? 0), 0);
            if (totalStock > 0 && totalStock < threshold) {
              return count + 1;
            }
          }
          return count;
        }, 0);
      },
      getDailySalesAndExpenses: (days, companyId) => { 
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const dailyDataMap: Record<string, { sales: number; expenses: number }> = {};

        for (let i = 0; i < days; i++) {
          const targetDate = startOfDay(subDays(new Date(), i));
          const dateStr = format(targetDate, 'MMM d');
          dailyDataMap[dateStr] = { sales: 0, expenses: 0 };
        }

        billsToConsider.forEach(bill => {
          const billDate = new Date(bill.date);
          const endOfRange = startOfDay(new Date());
          const startOfRange = startOfDay(subDays(new Date(), days-1));
          
          if (!billDate || !isWithinInterval(startOfDay(billDate), {start: startOfRange, end: endOfRange } ) ) return;

          const billDateStr = format(startOfDay(billDate), 'MMM d');
          if (dailyDataMap[billDateStr]) {
            if (bill.type === 'sell' && !bill.isEstimate) { 
              dailyDataMap[billDateStr].sales += bill.totalAmount; 
            } else if (bill.type === 'buy') {
              dailyDataMap[billDateStr].expenses += bill.totalAmount;
            }
          }
        });
        return Object.entries(dailyDataMap).map(([date, data]) => ({ date, ...data })).reverse();
      },
      getTopSellingProductsByRevenue: (limit: number, companyId) => { 
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const productRevenue: Record<string, { name: string; revenue: number }> = {};

        billsToConsider.forEach(bill => {
          if (bill.type === 'sell' && !bill.isEstimate) { 
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_') || item.isAdditionalCharge) return;
              const productNameForItem = item.productName || 'Unknown Product';
              if (!productRevenue[productNameForItem]) {
                productRevenue[productNameForItem] = { name: productNameForItem, revenue: 0 };
              }
              productRevenue[productNameForItem].revenue += (item.sellPrice ?? 0) * item.quantity;
            });
          }
        });
        return Object.values(productRevenue)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      },
      getRecentExpenseBillsWithPotentialCoverage: (limit: number, companyId) => { 
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const expenseBills = billsToConsider.filter(bill => bill.type === 'buy')
          .sort((a, b) => b.timestamp - a.timestamp);
        return expenseBills.slice(0, limit).map(bill => {
          const totalCost = bill.totalAmount;
          const potentialRevenue = bill.items.reduce((acc, item) => {
             const product = get().getProductById(item.productId);
             if (product && product.trackQuantity === false) {
                const defaultSku = product.productSKUs.find(s => Object.keys(s.optionValues).length === 0);
                const skuDetails = get().getSkuDetails(defaultSku, bill.storeId);
                return acc + ((skuDetails.currentSellPrice ?? 0) * item.quantity);
             }
             return acc + ((item.sellPrice ?? 0) * item.quantity);
          }, 0);
          const coverageStatus = potentialRevenue >= totalCost ? 'Covered' : 'Uncovered';
          return { ...bill, totalCost, potentialRevenue, coverageStatus };
        });
      },
      getExpenseSummaryStats: (companyId): ExpenseSummary => { 
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const expenseBills = billsToConsider.filter(bill => bill.type === 'buy');
        let totalCoveredExpenseValue = 0;
        let totalUncoveredExpenseValue = 0;
        let totalPotentialProfitOnCoveredExpenses = 0;
        let totalOutstandingCostOnUncoveredExpenses = 0;
        let coveredBillCount = 0;
        let uncoveredBillCount = 0;

        expenseBills.forEach(bill => {
          const totalCost = bill.totalAmount;
          const potentialRevenue = bill.items.reduce((acc, item) => {
             const product = get().getProductById(item.productId);
             if (product && product.trackQuantity === false) {
                const defaultSku = product.productSKUs.find(s => Object.keys(s.optionValues).length === 0);
                const skuDetails = get().getSkuDetails(defaultSku, bill.storeId);
                return acc + ((skuDetails.currentSellPrice ?? 0) * item.quantity);
             }
             return acc + ((item.sellPrice ?? 0) * item.quantity);
          }, 0);
          if (potentialRevenue >= totalCost) {
            totalCoveredExpenseValue += totalCost;
            totalPotentialProfitOnCoveredExpenses += (potentialRevenue - totalCost);
            coveredBillCount++;
          } else {
            totalUncoveredExpenseValue += totalCost;
            totalOutstandingCostOnUncoveredExpenses += (totalCost - potentialRevenue);
            uncoveredBillCount++;
          }
        });
        return {
          totalCoveredExpenseValue, totalUncoveredExpenseValue,
          totalPotentialProfitOnCoveredExpenses, totalOutstandingCostOnUncoveredExpenses,
          coveredBillCount, uncoveredBillCount,
        };
      },
      getOverallFinancialSummary: (companyId): FinancialSummary => { 
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        let totalRevenue = 0; let totalCOGS = 0; let totalExpenses = 0;

        billsToConsider.forEach(bill => {
          if (bill.type === 'sell' && !bill.isEstimate) { 
            totalRevenue += bill.subTotal ?? bill.totalAmount; 
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_') || item.isAdditionalCharge) return;
              const costForItem = (item.costPrice || 0); 
              totalCOGS += costForItem * item.quantity;
            });
          } else if (bill.type === 'buy') {
            totalExpenses += bill.totalAmount;
          }
        });
        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalExpenses; 
        return { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit };
      },
      getTodaysFinancialSummary: (companyId): TodaysFinancialSummary => { 
         let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const todaysBills = billsToConsider.filter(bill => isToday(new Date(bill.date)));
        let totalRevenue = 0; let totalCOGS = 0; let totalExpenses = 0;
        let transactionsToday = 0; let defectivesToday = 0;

        todaysBills.forEach(bill => {
          transactionsToday++;
          if (bill.type === 'sell' && !bill.isEstimate) {
            totalRevenue += bill.subTotal ?? bill.totalAmount; 
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_') || item.isAdditionalCharge) return;
              const costForItem = (item.costPrice || 0);
              totalCOGS += costForItem * item.quantity;
            });
          } else if (bill.type === 'buy') {
            totalExpenses += bill.totalAmount;
          } else if (bill.type === 'return') {
            bill.items.forEach(item => {
              if (item.isDefective) {
                defectivesToday += item.quantity;
              }
            });
          }
        });
        const grossProfit = totalRevenue - totalCOGS;
        return { totalRevenue, totalCOGS, grossProfit, totalExpenses, transactionsToday, defectivesToday };
      },
      getTopProfitableProducts: (limit: number, companyId): ProductProfitabilityData[] => { 
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const productFinancials: Record<string, { name: string; revenue: number; cogs: number; profit: number }> = {};
        billsToConsider.forEach(bill => {
          if (bill.type === 'sell' && !bill.isEstimate) { 
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_') || item.isAdditionalCharge) return;
              const skuIdentifier = item.productName;
              if (skuIdentifier && typeof skuIdentifier === 'string') {
                if (!productFinancials[skuIdentifier]) {
                  productFinancials[skuIdentifier] = { name: skuIdentifier, revenue: 0, cogs: 0, profit: 0 };
                }
                const itemRevenue = (item.sellPrice || 0) * item.quantity;
                const itemCogs = (item.costPrice || 0) * item.quantity; 

                productFinancials[skuIdentifier].revenue += itemRevenue;
                productFinancials[skuIdentifier].cogs += itemCogs;
                productFinancials[skuIdentifier].profit += (itemRevenue - itemCogs);
              }
            });
          }
        });
        return Object.values(productFinancials)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, limit);
      },
      
      getMessagesForStore: (storeId: string) => { 
        const messages = get().messagesByStore[storeId] || [];
        return [...messages].sort((a, b) => a.timestamp - b.timestamp);
      },
      
      _hydrate: () => { 
        try {
          const state = get();
          let storeUpdated = false;
          const defaultCompanyId = "comp_default_001"; 

          if (typeof window !== 'undefined' && !localStorage.getItem('companyId')) {
            localStorage.setItem('companyId', defaultCompanyId);
          }

          const arraysToReset: (keyof InventoryState)[] = ['products', 'bills', 'staffs', 'stores', 'categories', 'customers'];
          arraysToReset.forEach(key => {
            if (!Array.isArray((state as any)[key])) { // Only reset if not an array, to preserve empty arrays
              (state as any)[key] = []; storeUpdated = true;
            }
          });
          
          if (!state.userProfile || typeof state.userProfile !== 'object' || state.userProfile === null || state.userProfile.dataMode !== 'global') {
            state.userProfile = JSON.parse(JSON.stringify(defaultUserProfile));
            storeUpdated = true;
          } else {
            const defaultProfileKeys = Object.keys(defaultUserProfile) as Array<keyof UserProfile>;
            defaultProfileKeys.forEach(key => {
                if (state.userProfile[key] === undefined) {
                    state.userProfile[key] = defaultUserProfile[key] as any;
                    storeUpdated = true;
                }
            });
             if (!state.userProfile.companyCurrency) {
                state.userProfile.companyCurrency = DEFAULT_CURRENCY_CODE;
                storeUpdated = true;
            }
          }
          
          if(!state.messagesByStore || typeof state.messagesByStore !== 'object') {
            state.messagesByStore = {}; storeUpdated = true;
          }

          if (storeUpdated) {
            set({ ...state });
          }
        } catch (error) {
          console.error("Critical error during inventory store hydration, resetting to defaults:", error);
          set({
            products: [], bills: [], categories: [], customers: [], staffs: [], stores: [], 
            userProfile: { ...defaultUserProfile }, messagesByStore: {}
          });
        }
      }
    }),
    {
      name: 'stockflow-app-storage', 
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?._hydrate) {
          state._hydrate();
        }
      },
      migrate: (persistedState: any, version: number) => {
        if (persistedState && persistedState.userProfile && persistedState.userProfile.dataMode === undefined) {
          persistedState.userProfile.dataMode = 'local'; 
        }
        if (persistedState && persistedState.userProfile && persistedState.userProfile.companyCurrency === undefined) {
          persistedState.userProfile.companyCurrency = DEFAULT_CURRENCY_CODE;
        }
        return persistedState;
      },
      version: 5,
    }
  )
);

if (typeof window !== 'undefined') {
  const state = useInventoryStore.getState();
  if (state._hydrate && !(state as any).__hydrated) {
    state._hydrate();
    (useInventoryStore.getState() as any).__hydrated = true;
  }
  const companyId = localStorage.getItem('companyId');
  if (companyId) {
    if (!(window as any).__initialDataFetched) {
      console.log("Performing initial data fetch for company:", companyId);
      Promise.all([
        state.fetchCompanyProfile(companyId),
        state.fetchProducts(companyId),
        state.fetchBills(companyId),
        state.fetchCategories(companyId),
        state.fetchStaff(companyId),
        state.fetchStores(companyId),
        state.fetchCustomers(companyId) 
      ]).catch(err => console.error("Error during initial data fetch:", err));
      (window as any).__initialDataFetched = true;
    }
  } else {
      console.warn("No companyId found in localStorage. Initial data fetch skipped. User may need to login/signup.");
  }
}
