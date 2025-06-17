
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, User, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode, ChatMessage, StockLayer, ProductOption, FinancialSummary, TodaysFinancialSummary, ProductLedgerEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay, isToday } from 'date-fns';
import { DEFAULT_CATEGORIES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, DEFAULT_COMPANY_NAME } from '@/lib/constants';

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
  staffs: User[]; 
  stores: Store[];
  userProfile: UserProfile;
  messagesByStore: Record<string, ChatMessage[]>;

  fetchProducts: (companyId: string) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'companyId'> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number }, companyId: string) => Promise<Product | null>;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'companyId'>> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number }, companyId: string) => Promise<Product | null>;
  deleteProduct: (productId: string, companyId: string) => Promise<boolean>;
  getProductById: (productId: string) => Product | undefined; 
  getProductByName: (name: string) => Product | undefined; 
  searchProducts: (searchTerm: string) => Product[]; 
  getLowStockProductCount: (threshold: number) => number; 

  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>) => ProductSKU | undefined; 
  getSkuDetails: (sku: ProductSKU | undefined, targetStoreId?: string) => { totalStock: number | null; currentSellPrice: number | null; averageCostPrice: number | null; skuIdentifier?: string; };
  getSkuIdentifier: (productName: string, optionValues: Record<string, string>) => string;

  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName' | 'companyId' | 'subTotal' | 'totalSGST' | 'totalCGST'> & { billedByStaffId?: string; storeId?: string; companyId: string; isEstimate?: boolean },
    items: Omit<BillItem, 'id'|'productName'|'sgstAmount'|'cgstAmount'|'sourceChargeDefinitionId'>[]
  ) => Bill | null;
  deleteBill: (billId: string) => void;
  getBillById: (billId: string) => Bill | undefined;
  updateBillNonCriticalDetails: (billId: string, details: { paymentStatus?: Bill['paymentStatus'], notes?: string }) => void;
  getRecentBills: (limit: number) => Bill[];
  getBillsForProduct: (productId: string) => Bill[];


  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[];

  fetchStaff: (companyId: string) => Promise<void>;
  addStaff: (staffData: Omit<User, 'id' | 'role' | 'companyId'>, companyId: string) => Promise<User | null>;
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

  updateUserProfileFields: (data: Partial<UserProfile>) => Promise<void>; // Now async
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
  getProductLedgerSummary: (params?: { companyId?: string, startDate?: Date, endDate?: Date }) => ProductLedgerEntry[];

  addChatMessage: (storeId: string, senderId: 'admin' | string, senderName: string, text: string) => void;
  getMessagesForStore: (storeId: string) => ChatMessage[];
  clearChatForStore: (storeId: string) => void;

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
  dataMode: 'local', 
  defaultBillNotes: '',
  defaultSalesPaymentStatus: 'paid',
  defaultPurchasePaymentStatus: 'paid',
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
      categories: DEFAULT_CATEGORIES.map(name => ({ id: generateId(), name })).sort((a, b) => a.name.localeCompare(b.name)),
      staffs: [],
      stores: [],
      userProfile: { ...defaultUserProfile },
      messagesByStore: {},

      // --- Product Methods (API driven) ---
      fetchProducts: async (companyId: string) => {
        if (!companyId) {
          console.warn("fetchProducts: companyId is required");
          set({ products: [] });
          return;
        }
        try {
          const response = await fetch(`/api/products?companyId=${companyId}`);
          if (!response.ok) throw new Error(`Failed to fetch products: ${response.statusText}`);
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) set({ products: result.data });
          else { console.error("Failed to fetch products or data format incorrect:", result.message); set({ products: [] }); }
        } catch (error) { console.error("Error fetching products:", error); set({ products: [] }); }
      },
      addProduct: async (productData, companyId) => {
        try {
          const response = await fetch('/api/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ products: [...state.products, result.data] }));
            if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
              get().addCategory(productData.category!);
            }
            return result.data;
          } else { console.error("Failed to add product via API:", result.message); return null; }
        } catch (error) { console.error("Error adding product via API:", error); return null; }
      },
      updateProduct: async (productId, productData, companyId) => {
        try {
          const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ products: state.products.map((p) => (p.id === productId ? result.data : p)) }));
            if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
              get().addCategory(productData.category!);
            }
            return result.data;
          } else { console.error("Failed to update product via API:", result.message); return null; }
        } catch (error) { console.error("Error updating product via API:", error); return null; }
      },
      deleteProduct: async (productId: string, companyId: string) => {
        try {
          const response = await fetch(`/api/products/${productId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => ({ products: state.products.filter((p) => p.id !== productId) }));
            return true;
          } else { console.error("Failed to delete product via API:", result.message); return false; }
        } catch (error) { console.error("Error deleting product via API:", error); return false; }
      },

      // --- Store Methods (API driven) ---
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
        try {
          const response = await fetch('/api/stores', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ stores: [...state.stores, result.data] }));
            return result.data;
          } else { console.error("Failed to add store via API:", result.message); return null; }
        } catch (error) { console.error("Error adding store via API:", error); return null; }
      },
      updateStore: async (storeId, storeData, companyId) => {
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
        try {
          const response = await fetch(`/api/stores/${storeId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => ({ stores: state.stores.filter((s) => s.id !== storeId) }));
            return true;
          } else { console.error("Failed to delete store via API:", result.message); return false; }
        } catch (error) { console.error("Error deleting store via API:", error); return false; }
      },

      // --- Staff Methods (API driven) ---
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
        try {
          const response = await fetch('/api/staff', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffData, companyId }),
          });
          const result = await response.json();
          if (result.success && result.data) {
            set((state) => ({ staffs: [...state.staffs, result.data] }));
            return result.data;
          } else { console.error("Failed to add staff via API:", result.message); return null; }
        } catch (error) { console.error("Error adding staff via API:", error); return null; }
      },
      updateStaff: async (staffId, staffData, companyId) => {
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
        try {
          const response = await fetch(`/api/staff/${staffId}?companyId=${companyId}`, { method: 'DELETE' });
          const result = await response.json();
          if (result.success) {
            set((state) => ({ staffs: state.staffs.filter((s) => s.id !== staffId) }));
            return true;
          } else { console.error("Failed to delete staff via API:", result.message); return false; }
        } catch (error) { console.error("Error deleting staff via API:", error); return false; }
      },

      // --- Client-side only methods (or methods operating on client-side cache) ---
      getSkuIdentifier: (productName, optionValues) => { /* ... (same as before) ... */ 
        if (!productName) return "Unknown Product";
        if (!optionValues || Object.keys(optionValues).length === 0) return productName;
        const sortedOptionsString = Object.entries(optionValues)
          .filter(([, value]) => typeof value === 'string')
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([, value]) => value)
          .join(' - ');
        return sortedOptionsString ? `${productName} (${sortedOptionsString})` : productName;
      },
      findOrCreateProductSKU: (productId, optionValues) => { /* ... (same as before, operates on client cache) ... */ 
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
          sku = {
            id: generateId(),
            optionValues: { ...optionValues },
            skuIdentifier: skuIdentifier,
            stockLayers: [],
          };
          const updatedProductSKUs = [...product.productSKUs, sku];
          const updatedProducts = [...products];
          updatedProducts[productIndex] = { ...product, productSKUs: updatedProductSKUs };
          set({ products: updatedProducts }); 
        }
        return sku;
      },
      getSkuDetails: (sku, targetStoreId) => { /* ... (same as before) ... */ 
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
      addBill: (billData, billItemsData) => { /* ... (same as before, still operates on client-side products for stock updates) ... */ 
        const currentDate = new Date();
        const billTimestamp = currentDate.getTime();
        const newBillId = format(currentDate, 'ddMMyyHHmmss');
        let newBillItems: BillItem[] = [];
        let tempProducts = JSON.parse(JSON.stringify(get().products)) as Product[];
        let productsUpdated = false;
        const storeIdForBill = billData.storeId;
        const companyIdForBill = billData.companyId;
        const isSalesEstimate = billData.type === 'sell' && billData.isEstimate === true;

        let billSubTotal = 0;
        let billTotalSGST = 0;
        let billTotalCGST = 0;
        
        const mainProductItemsData = billItemsData.filter(item => !item.productId.startsWith('CHARGE_ITEM_') && !item.productId.startsWith('SERVICE_ITEM_'));
        const chargeItemsData = billItemsData.filter(item => item.productId.startsWith('CHARGE_ITEM_') || item.productId.startsWith('SERVICE_ITEM_'));


        for (const itemData of mainProductItemsData) {
          const productIndex = tempProducts.findIndex(p => p.id === itemData.productId && p.companyId === companyIdForBill);
          let product = productIndex !== -1 ? tempProducts[productIndex] : null;
          
          if (!product) {
            console.error(`Product not found for ID: ${itemData.productId} in company ${companyIdForBill}. Skipping item.`);
            continue;
          }

          if (billData.type === 'buy' && product && product.trackQuantity === false) {
             console.error(`Attempt to add non-tracked product ${product.name} to expense bill.`);
             return null;
          }

          let sku: ProductSKU | undefined = undefined;
          let billItemCostPrice = typeof itemData.costPrice === 'number' ? itemData.costPrice : 0;
          let billItemSellPrice = typeof itemData.sellPrice === 'number' ? itemData.sellPrice : 0; 
          let itemProductNameForBill = product?.name || 'Unknown Product';
          let itemSgstAmount = 0;
          let itemCgstAmount = 0;

          const selectedOpts = itemData.selectedVariantOptions || {};
          const currentProductRef = tempProducts[productIndex];
          if (!currentProductRef) { console.error("Product ref disappeared in tempProducts"); continue; }

          const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(selectedOpts).sort()));
          sku = currentProductRef.productSKUs.find(s =>
            JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === stringifiedTargetOptions
          );

          if (!sku) {
            const skuIdentifier = get().getSkuIdentifier(currentProductRef.name, selectedOpts);
            sku = {
              id: generateId(), optionValues: { ...selectedOpts }, skuIdentifier: skuIdentifier,
              stockLayers: [],
            };
            currentProductRef.productSKUs.push(sku);
            productsUpdated = true;
          }
          itemProductNameForBill = sku.skuIdentifier || get().getSkuIdentifier(currentProductRef.name, selectedOpts);

          const itemSubTotalPreTax = billItemSellPrice * itemData.quantity;
          
          if (billData.type === 'sell' && !isSalesEstimate && !itemData.productId.startsWith('SERVICE_ITEM_')) {
              const sgstRate = currentProductRef.sgstRate || 0;
              const cgstRate = currentProductRef.cgstRate || 0;
              itemSgstAmount = (itemSubTotalPreTax * sgstRate) / 100;
              itemCgstAmount = (itemSubTotalPreTax * cgstRate) / 100;
          }

          if (billData.type === 'buy') {
            if (!currentProductRef.trackQuantity) {
              console.error(`Attempt to add non-tracked product ${currentProductRef.name} to expense bill.`);
              return null;
            }
            const newLayer: StockLayer = {
              id: generateId(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
              initialQuantity: itemData.quantity, quantity: itemData.quantity,
              costPrice: billItemCostPrice, sellPrice: billItemSellPrice,
              storeId: storeIdForBill,
            };
            sku.stockLayers.push(newLayer);
            productsUpdated = true;
          } else if (billData.type === 'sell') {
            if (currentProductRef.trackQuantity) {
              let quantityToSell = itemData.quantity;
              let costOfGoodsSoldThisItem = 0;
              const relevantLayers = sku.stockLayers.filter(l => l.storeId === storeIdForBill && l.quantity > 0)
                                         .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

              for (let i = 0; i < relevantLayers.length && quantityToSell > 0; i++) {
                const layer = relevantLayers[i];
                const sellFromThisLayer = Math.min(quantityToSell, layer.quantity);
                costOfGoodsSoldThisItem += sellFromThisLayer * layer.costPrice;

                const originalSku = tempProducts[productIndex].productSKUs.find(s => s.id === sku!.id);
                const originalLayer = originalSku?.stockLayers.find(l => l.id === layer.id);
                if (originalLayer) {
                  originalLayer.quantity -= sellFromThisLayer;
                }
                quantityToSell -= sellFromThisLayer;
                productsUpdated = true;
              }
              if (quantityToSell > 0) {
                console.error(`Stock ran out for ${itemProductNameForBill} at store ${storeIdForBill}. Remaining: ${quantityToSell}`);
                return null; 
              }
              billItemCostPrice = itemData.quantity > 0 ? costOfGoodsSoldThisItem / itemData.quantity : 0;
            } else { 
              const skuDetails = get().getSkuDetails(sku, storeIdForBill);
              billItemCostPrice = skuDetails.averageCostPrice ?? 0;
            }
          } else if (billData.type === 'return') {
            const skuDetails = get().getSkuDetails(sku, storeIdForBill);
            billItemCostPrice = skuDetails.averageCostPrice ?? 0;
            if (currentProductRef.trackQuantity && !itemData.isDefective) {
              const returnLayer: StockLayer = {
                id: generateId(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
                initialQuantity: itemData.quantity, quantity: itemData.quantity,
                costPrice: billItemCostPrice, sellPrice: billItemSellPrice,
                storeId: storeIdForBill,
              };
              sku.stockLayers.push(returnLayer);
              productsUpdated = true;
            }
          }
          
          newBillItems.push({
            id: generateId(), productName: itemProductNameForBill,
            productId: itemData.productId, quantity: itemData.quantity,
            costPrice: billItemCostPrice, sellPrice: billItemSellPrice,
            isDefective: itemData.isDefective, selectedVariantOptions: itemData.selectedVariantOptions,
            sgstAmount: itemSgstAmount, cgstAmount: itemCgstAmount,
            isAdditionalCharge: false,
          });

          billSubTotal += itemSubTotalPreTax;
          billTotalSGST += itemSgstAmount;
          billTotalCGST += itemCgstAmount;

          if (billData.type === 'sell' && currentProductRef.additionalChargeDefinitions && currentProductRef.additionalChargeDefinitions.length > 0) {
            currentProductRef.additionalChargeDefinitions.forEach(chargeDef => {
              let chargeValue = 0;
              if (chargeDef.type === 'fixed') {
                chargeValue = chargeDef.value;
              } else if (chargeDef.type === 'percentage') {
                chargeValue = (itemSubTotalPreTax * chargeDef.value) / 100;
              }
              
              newBillItems.push({
                id: generateId(), productId: `CHARGE_ITEM_${chargeDef.id}`, productName: chargeDef.name,
                quantity: 1, costPrice: 0, sellPrice: chargeValue,
                sgstAmount: 0, cgstAmount: 0, isAdditionalCharge: true, sourceChargeDefinitionId: chargeDef.id,
              });
              billSubTotal += chargeValue; // Add charge to subtotal for sales invoices
            });
          }
        }
        
        for (const itemData of chargeItemsData) {
          const billItemCostPrice = billData.type === 'buy' ? (itemData.costPrice ?? 0) : 0;
          const billItemSellPrice = itemData.sellPrice ?? 0;
          newBillItems.push({
            id: generateId(), productId: itemData.productId, productName: itemData.productName || 'Service/Charge',
            quantity: itemData.quantity, costPrice: billItemCostPrice, sellPrice: billItemSellPrice,
            isDefective: undefined, selectedVariantOptions: undefined, sgstAmount: 0, cgstAmount: 0, isAdditionalCharge: false,
          });
          billSubTotal += billItemSellPrice * itemData.quantity; // Add ad-hoc service/charge to subtotal
        }


        if (productsUpdated) {
          set({ products: tempProducts }); // This still updates the client-side cache directly for stock.
        }

        let grandTotalAmount = 0;
        if (billData.type === 'buy') { 
          grandTotalAmount = newBillItems.reduce((acc, buyItem) => acc + (buyItem.quantity * (buyItem.costPrice || 0)), 0);
          billSubTotal = grandTotalAmount; billTotalSGST = 0; billTotalCGST = 0;
        } else if (billData.type === 'sell') {
            if (isSalesEstimate) { grandTotalAmount = billSubTotal; billTotalSGST = 0; billTotalCGST = 0; } 
            else { grandTotalAmount = billSubTotal + billTotalSGST + billTotalCGST; }
        } else { // Return bill
            grandTotalAmount = billSubTotal; 
            // For returns, tax reversal logic might be complex and is not fully implemented here.
            // This assumes subTotal is the amount returned, taxes might need to be calculated based on original sale.
            // For simplicity now, keeping SGST/CGST as 0 for return total calc unless explicitly set on items.
             billTotalSGST = newBillItems.reduce((sum, item) => sum + (item.sgstAmount || 0), 0);
             billTotalCGST = newBillItems.reduce((sum, item) => sum + (item.cgstAmount || 0), 0);
             grandTotalAmount = billSubTotal + billTotalSGST + billTotalCGST;
        }


        const staffUser = billData.billedByStaffId ? get().getStaffById(billData.billedByStaffId) : undefined;
        const storeLocation = billData.storeId ? get().getStoreById(billData.storeId) : undefined;

        const newBill: Bill = {
          id: newBillId, type: billData.type, date: currentDate.toISOString(), timestamp: billTimestamp,
          vendorOrCustomerName: billData.vendorOrCustomerName, customerPhone: billData.customerPhone,
          items: newBillItems, subTotal: billSubTotal, totalSGST: billTotalSGST, totalCGST: billTotalCGST,
          totalAmount: grandTotalAmount, isEstimate: billData.isEstimate,
          notes: billData.notes, paymentStatus: billData.paymentStatus,
          billedByStaffId: staffUser?.id, billedByStaffName: staffUser?.name,
          storeId: storeLocation?.id, storeName: storeLocation?.name,
          companyId: companyIdForBill,
        };

        set((state) => ({ bills: [newBill, ...state.bills].sort((a,b) => b.timestamp - a.timestamp) }));
        return newBill;
      },
      deleteBill: (billId: string) => { set((state) => ({ bills: state.bills.filter((b) => b.id !== billId) })); },
      getBillById: (billId) => get().bills.find((b) => b.id === billId),
      updateBillNonCriticalDetails: (billId, details) => { 
        set((state) => ({
          bills: state.bills.map((bill) =>
            bill.id === billId
              ? { ...bill, paymentStatus: details.paymentStatus !== undefined ? details.paymentStatus : bill.paymentStatus, notes: details.notes !== undefined ? details.notes : bill.notes, }
              : bill
          ),
        }));
      },
      getRecentBills: (limit: number) => [...get().bills].slice(0, limit),
      getBillsForProduct: (productId: string) => get().bills.filter(bill => bill.items.some(item => item.productId === productId)).sort((a, b) => b.timestamp - a.timestamp),
      addCategory: (categoryName) => { /* ... (same as before) ... */ 
        const existingCategory = get().categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (existingCategory) return existingCategory;
        const newCategory: Category = { id: generateId(), name: categoryName };
        set((state) => ({ categories: [...state.categories, newCategory].sort((a, b) => a.name.localeCompare(b.name)) }));
        return newCategory;
      },
      searchCategories: (searchTerm: string) => { /* ... (same as before) ... */ 
        if (!searchTerm) return get().categories.map(c => c.name).sort((a,b) => a.localeCompare(b));
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().categories
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
      updateUserProfileFields: async (data: Partial<UserProfile>) => {
        const oldProfile = get().userProfile;
        const newProfile = { ...oldProfile, ...data };
        set({ userProfile: newProfile });

        if (data.activeSubscriptionId !== undefined && data.activeSubscriptionId !== oldProfile.activeSubscriptionId) {
            const companyId = localStorage.getItem('companyId');
            if (companyId) {
                try {
                    const response = await fetch(`/api/companies/${companyId}/subscription`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ activeSubscriptionId: data.activeSubscriptionId }),
                    });
                    if (!response.ok) {
                        const errorResult = await response.json();
                        console.error("Failed to update company subscription on server:", errorResult.message);
                        // Optionally revert client-side change or notify user
                        set({ userProfile: oldProfile }); // Revert optimistic update
                    }
                } catch (error) {
                    console.error("Error updating company subscription on server:", error);
                    set({ userProfile: oldProfile }); // Revert optimistic update
                }
            } else {
                console.warn("Company ID not found in localStorage, cannot sync subscription to server.");
            }
        }
      },
      getActiveSubscriptionPlan: () => { 
        const { userProfile } = get();
        if (!userProfile) return SUBSCRIPTION_PLANS.find(p => p.id === SUBSCRIPTION_PLAN_IDS.STARTER);
        const { activeSubscriptionId } = userProfile;
        return SUBSCRIPTION_PLANS.find(plan => plan.id === activeSubscriptionId) || SUBSCRIPTION_PLANS.find(p => p.id === SUBSCRIPTION_PLAN_IDS.STARTER);
      },
      canAddStore: () => { 
        const plan = get().getActiveSubscriptionPlan();
        if (!plan) return false;
        // This relies on `stores` being up-to-date for the current company via `fetchStores`
        return get().stores.length < plan.maxStores;
      },
      canAddStaff: () => { 
        const plan = get().getActiveSubscriptionPlan();
        if (!plan) return false;
        // This relies on `staffs` being up-to-date for the current company via `fetchStaff`
        return get().staffs.length < plan.maxEmployees;
      },
      getProductById: (productId: string) => get().products.find((p) => p.id === productId),
      getProductByName: (name: string) => get().products.find((p) => p.name.toLowerCase() === name.toLowerCase()),
      searchProducts: (searchTerm: string) => { /* ... (same as before) ... */ 
        if (!searchTerm) return []; 
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().products.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerSearchTerm) ||
            (p.category && p.category.toLowerCase().includes(lowerSearchTerm)) ||
            (p.sku && p.sku.toLowerCase().includes(lowerSearchTerm)) ||
            p.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(lowerSearchTerm))
        );
      },
      getLowStockProductCount: (threshold: number) => { /* ... (same as before) ... */ 
        return get().products.reduce((count, product) => {
          if (product.trackQuantity) {
            const totalStock = product.productSKUs.reduce((sum, sku) => sum + (get().getSkuDetails(sku, undefined).totalStock ?? 0), 0);
            if (totalStock > 0 && totalStock < threshold) {
              return count + 1;
            }
          }
          return count;
        }, 0);
      },
      getDailySalesAndExpenses: (days, companyId) => { /* ... (same as before) ... */ 
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
          const billDateStr = format(startOfDay(new Date(bill.date)), 'MMM d');
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
      getTopSellingProductsByRevenue: (limit: number, companyId) => { /* ... (same as before) ... */ 
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
      getRecentExpenseBillsWithPotentialCoverage: (limit: number, companyId) => { /* ... (same as before) ... */ 
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
      getExpenseSummaryStats: (companyId): ExpenseSummary => { /* ... (same as before) ... */ 
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
      getOverallFinancialSummary: (companyId): FinancialSummary => { /* ... (same as before) ... */ 
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
      getTodaysFinancialSummary: (companyId): TodaysFinancialSummary => { /* ... (same as before) ... */ 
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
        const netProfit = grossProfit - totalExpenses;
        return { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit, transactionsToday, defectivesToday };
      },
      getTopProfitableProducts: (limit: number, companyId): ProductProfitabilityData[] => { /* ... (same as before) ... */ 
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
              } else {
                console.warn("Skipping item in profit calculation due to missing or invalid productName/skuIdentifier:", item);
              }
            });
          }
        });

        return Object.values(productFinancials)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, limit);
      },
      getProductLedgerSummary: (params): ProductLedgerEntry[] => { /* ... (same as before) ... */ 
        const { companyId, startDate, endDate } = params || {};
        let productsToConsider = get().products;
        let billsToConsider = get().bills;

        if (companyId) {
          productsToConsider = productsToConsider.filter(p => p.companyId === companyId);
          billsToConsider = billsToConsider.filter(b => b.companyId === companyId);
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
            const productId = item.productId;
            if (productId.startsWith('SERVICE_ITEM_') || item.isAdditionalCharge) return;

            if (!ledgerMap[productId]) {
              ledgerMap[productId] = {
                totalPurchased: 0,
                totalSold: 0,
                totalRestockedReturns: 0,
                totalDefectiveReturns: 0,
              };
            }

            if (bill.type === 'buy') {
              ledgerMap[productId].totalPurchased += item.quantity;
            } else if (bill.type === 'sell' && !bill.isEstimate) { 
              ledgerMap[productId].totalSold += item.quantity;
            } else if (bill.type === 'return') {
              if (item.isDefective) {
                ledgerMap[productId].totalDefectiveReturns += item.quantity;
              } else {
                ledgerMap[productId].totalRestockedReturns += item.quantity;
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
            currentStock = product.productSKUs.reduce((sum, sku) => sum + (get().getSkuDetails(sku).totalStock ?? 0), 0);
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
      addChatMessage: (storeId, senderId, senderName, text) => { /* ... (same as before) ... */ 
        const newMessage: ChatMessage = {
          id: generateId(), storeId, senderId, senderName, text, timestamp: Date.now(),
        };
        set((state) => {
          const existingMessages = state.messagesByStore[storeId] || [];
          return {
            messagesByStore: { ...state.messagesByStore, [storeId]: [...existingMessages, newMessage] },
          };
        });
      },
      getMessagesForStore: (storeId: string) => { /* ... (same as before) ... */ 
        const messages = get().messagesByStore[storeId] || [];
        return [...messages].sort((a, b) => a.timestamp - b.timestamp);
      },
      clearChatForStore: (storeId: string) => { /* ... (same as before) ... */ 
        set((state) => {
          const newMessagesByStore = { ...state.messagesByStore };
          delete newMessagesByStore[storeId];
          return { messagesByStore: newMessagesByStore };
        });
      },
      _hydrate: () => { /* ... (same as before, with new UserProfile fields handled) ... */ 
        try {
          const state = get();
          let storeUpdated = false;

          const defaultStateShape: Partial<InventoryState> = {
            products: [], bills: [], categories: [], staffs: [], stores: [],
            userProfile: { ...defaultUserProfile }, messagesByStore: {}
          };

          for (const key in defaultStateShape) {
            if (Object.prototype.hasOwnProperty.call(defaultStateShape, key)) {
              const k = key as keyof InventoryState;
              if (state[k] === undefined || state[k] === null ||
                  (Array.isArray((defaultStateShape as any)[k]) && !Array.isArray(state[k])) ||
                  (typeof (defaultStateShape as any)[k] === 'object' && !Array.isArray((defaultStateShape as any)[k]) && typeof state[k] !== 'object')
              ) {
                (state as any)[k] = JSON.parse(JSON.stringify((defaultStateShape as any)[k]));
                storeUpdated = true;
              }
            }
          }

          if (!state.userProfile || typeof state.userProfile !== 'object' || state.userProfile === null) {
            state.userProfile = JSON.parse(JSON.stringify(defaultUserProfile));
            storeUpdated = true;
          } else {
            state.userProfile.companyName = state.userProfile.companyName || DEFAULT_COMPANY_NAME;
            state.userProfile.companyLogoUrl = state.userProfile.companyLogoUrl || '';
            state.userProfile.companySlogan = state.userProfile.companySlogan || '';
            state.userProfile.companyPhone = state.userProfile.companyPhone || '';
            state.userProfile.companyAddress = state.userProfile.companyAddress || '';
            state.userProfile.companyGstNo = state.userProfile.companyGstNo || '';

            const currentSubId = state.userProfile.activeSubscriptionId;
            const isValidSubId = SUBSCRIPTION_PLANS.some(plan => plan.id === currentSubId);
            if (!currentSubId || !isValidSubId) {
              state.userProfile.activeSubscriptionId = SUBSCRIPTION_PLAN_IDS.STARTER;
              storeUpdated = true;
            }
             state.userProfile.dataMode = state.userProfile.dataMode || 'local';
             state.userProfile.defaultBillNotes = state.userProfile.defaultBillNotes || '';
             state.userProfile.defaultSalesPaymentStatus = state.userProfile.defaultSalesPaymentStatus || 'paid';
             state.userProfile.defaultPurchasePaymentStatus = state.userProfile.defaultPurchasePaymentStatus || 'paid';
          }

          if (!Array.isArray(state.categories)) { state.categories = []; storeUpdated = true; }
          DEFAULT_CATEGORIES.forEach(catName => {
            if (!state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
              state.categories.push({ id: generateId(), name: catName });
              storeUpdated = true;
            }
          });
          if(storeUpdated || state.categories.some((c, i) => state.categories.findIndex(sc => sc.name === c.name) !== i)) {
             state.categories.sort((a, b) => a.name.localeCompare(b.name));
             storeUpdated = true;
          }

          if (Array.isArray(state.products)) {
            state.products = state.products.map(p_any => {
              if (!p_any || typeof p_any !== 'object' || !p_any.id || !p_any.name) return null;
              let p = { ...p_any } as Product;
              p.companyId = p.companyId || "comp_default_001"; 
              p.trackQuantity = typeof p.trackQuantity === 'boolean' ? p.trackQuantity : true;
              p.sgstRate = typeof p.sgstRate === 'number' ? p.sgstRate : undefined;
              p.cgstRate = typeof p.cgstRate === 'number' ? p.cgstRate : undefined;
              p.additionalChargeDefinitions = Array.isArray(p.additionalChargeDefinitions) ? p.additionalChargeDefinitions.map(ac => ({...ac, type: ac.type || 'fixed'})) : [];


              p.variants = Array.isArray(p.variants) ? p.variants.map(v_any => {
                if(!v_any || typeof v_any !== 'object') return null;
                const v = v_any as ProductVariantType;
                v.options = Array.isArray(v.options) ? v.options.map(opt_any => {
                    if(!opt_any || typeof opt_any !== 'object') return null;
                    return opt_any as ProductOption;
                }).filter(o => o !== null) : [];
                return v;
              }).filter(v => v !== null) : [];

              p.productSKUs = Array.isArray(p.productSKUs) ? p.productSKUs.map(sku_any => {
                if(!sku_any || typeof sku_any !== 'object') return null;
                let sku = { ...sku_any } as ProductSKU;
                sku.stockLayers = Array.isArray(sku.stockLayers) ? sku.stockLayers.map(layer_any => {
                    if(!layer_any || typeof layer_any !== 'object') return null;
                    const layer = { ...layer_any } as StockLayer;
                    layer.costPrice = typeof layer.costPrice === 'number' ? layer.costPrice : 0;
                    layer.sellPrice = typeof layer.sellPrice === 'number' ? layer.sellPrice : 0;
                    layer.initialQuantity = typeof layer.initialQuantity === 'number' ? layer.initialQuantity : (typeof layer.quantity === 'number' ? layer.quantity : 0);
                    layer.quantity = typeof layer.quantity === 'number' ? layer.quantity : 0;
                    layer.purchaseDate = layer.purchaseDate || new Date(0).toISOString();
                    layer.purchaseBillId = layer.purchaseBillId || 'unknown_hydrated';
                    layer.id = layer.id || generateId();
                    layer.storeId = layer.storeId || undefined;
                    return layer;
                }).filter(l => l !== null) : [];

                sku.optionValues = sku.optionValues || {};
                sku.skuIdentifier = sku.skuIdentifier || get().getSkuIdentifier(p.name, sku.optionValues);
                return sku;
              }).filter(sku => sku !== null) : [];

              if (p.productSKUs.length === 0 && (!p.variants || p.variants.length === 0)) {
                  const defaultSkuIdentifier = get().getSkuIdentifier(p.name, {});
                  const defaultSku: ProductSKU = {
                    id: generateId(), optionValues: {}, skuIdentifier: defaultSkuIdentifier, stockLayers: [],
                  };
                  if (p.trackQuantity === false && (p as any).costPriceForNonTracked !== undefined) {
                     defaultSku.stockLayers.push({
                        id: generateId(), purchaseBillId: 'hydrated_nontracked_price', purchaseDate: new Date(0).toISOString(),
                        initialQuantity: 0, quantity: 0,
                        costPrice: (p as any).costPriceForNonTracked ?? 0,
                        sellPrice: (p as any).sellPriceForNonTracked ?? 0,
                        storeId: undefined,
                    });
                    storeUpdated = true;
                  }
                  p.productSKUs.push(defaultSku);
              }
              delete (p as any).costPriceForNonTracked; delete (p as any).sellPriceForNonTracked;
              return p;
            }).filter(p => p !== null) as Product[];
          } else {
            state.products = []; storeUpdated = true;
          }

          if (Array.isArray(state.bills)) {
            state.bills = state.bills.map(bill_any => {
              if (!bill_any || typeof bill_any !== 'object') return null;
              const bill = { ...bill_any } as Bill;
              bill.companyId = bill.companyId || "comp_default_001"; 
              bill.items = Array.isArray(bill.items) ? bill.items.map(item_any => {
                if (!item_any || typeof item_any !== 'object') return null;
                const item = { ...item_any } as BillItem;
                item.costPrice = typeof item.costPrice === 'number' ? item.costPrice : 0;
                item.sellPrice = typeof item.sellPrice === 'number' ? item.sellPrice : 0;
                item.quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
                item.productName = item.productName || 'Unknown Item';
                item.sgstAmount = typeof item.sgstAmount === 'number' ? item.sgstAmount : 0;
                item.cgstAmount = typeof item.cgstAmount === 'number' ? item.cgstAmount : 0;
                item.isAdditionalCharge = typeof item.isAdditionalCharge === 'boolean' ? item.isAdditionalCharge : false;
                item.sourceChargeDefinitionId = item.sourceChargeDefinitionId || undefined;
                return item;
              }).filter(item => item !== null) : [];
              bill.subTotal = typeof bill.subTotal === 'number' ? bill.subTotal : bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity),0);
              bill.totalSGST = typeof bill.totalSGST === 'number' ? bill.totalSGST : bill.items.reduce((acc, item) => acc + (item.sgstAmount || 0),0);
              bill.totalCGST = typeof bill.totalCGST === 'number' ? bill.totalCGST : bill.items.reduce((acc, item) => acc + (item.cgstAmount || 0),0);
              bill.totalAmount = typeof bill.totalAmount === 'number' ? bill.totalAmount : (bill.subTotal + bill.totalSGST + bill.totalCGST);
              bill.isEstimate = typeof bill.isEstimate === 'boolean' ? bill.isEstimate : false;


              bill.timestamp = typeof bill.timestamp === 'number' ? bill.timestamp : (bill.date ? new Date(bill.date).getTime() : Date.now());
              bill.date = bill.date || new Date(bill.timestamp).toISOString();
              bill.storeId = bill.storeId || undefined;
              bill.storeName = bill.storeName || undefined;
              bill.billedByStaffId = bill.billedByStaffId || undefined;
              bill.billedByStaffName = bill.billedByStaffName || undefined;
              return bill;
            }).filter(bill => bill !== null) as Bill[];
          } else {
            state.bills = []; storeUpdated = true;
          }

          if(!Array.isArray(state.staffs)) { state.staffs = []; storeUpdated = true;}
          state.staffs = state.staffs.map(s_any => {
             if (!s_any || typeof s_any !== 'object') return null;
             const s = { ...s_any } as User;
             s.companyId = s.companyId || "comp_default_001"; 
             s.role = s.role || 'employee'; 
             return s;
          }).filter(s => s !== null) as User[];

          if(!Array.isArray(state.stores)) { state.stores = []; storeUpdated = true;}
          state.stores = state.stores.map(s_any => {
            if (!s_any || typeof s_any !== 'object') return null;
            const s = { ...s_any } as Store;
            s.companyId = s.companyId || "comp_default_001"; 
            s.allowedOperations = Array.isArray(s.allowedOperations) && s.allowedOperations.length > 0 ? s.allowedOperations : ['sell', 'buy', 'return'];
            return s;
          }).filter(s => s !== null) as Store[];

          if(!state.messagesByStore || typeof state.messagesByStore !== 'object') {state.messagesByStore = {}; storeUpdated = true;}
          Object.keys(state.messagesByStore).forEach(storeId => {
            if (!Array.isArray(state.messagesByStore[storeId])) {
                state.messagesByStore[storeId] = [];
                storeUpdated = true;
            } else {
                state.messagesByStore[storeId] = state.messagesByStore[storeId].filter(msg => msg && typeof msg === 'object');
            }
          });


          if (storeUpdated) {
            set({ ...state });
          }
        } catch (error) {
          console.error("Critical error during inventory store hydration, resetting to defaults:", error);
          set({
            products: [], bills: [],
            categories: DEFAULT_CATEGORIES.map(name => ({ id: generateId(), name })).sort((a, b) => a.name.localeCompare(b.name)),
            staffs: [], stores: [], userProfile: { ...defaultUserProfile }, messagesByStore: {}
          });
        }
      }
    }),
    {
      name: 'stockflow-inventory-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?._hydrate) {
          state._hydrate();
        }
      }
    }
  )
);

if (typeof window !== 'undefined' && useInventoryStore.getState()._hydrate) {
  if (!(useInventoryStore.getState() as any).__hydrated) {
      useInventoryStore.getState()._hydrate();
      (useInventoryStore.getState() as any).__hydrated = true;
  }
}

