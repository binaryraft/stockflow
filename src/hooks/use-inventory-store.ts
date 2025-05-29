
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, Staff, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode, ChatMessage, StockLayer, ProductOption, FinancialSummary, TodaysFinancialSummary } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay, isToday } from 'date-fns';
import { DEFAULT_CATEGORIES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, DEFAULT_COMPANY_NAME } from '@/lib/constants';

const generateId = () => uuidv4();

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

interface ProductProfitabilityData {
  name: string; // SKU Identifier
  revenue: number;
  cogs: number;
  profit: number;
}


interface InventoryState {
  products: Product[];
  bills: Bill[];
  categories: Category[];
  staffs: Staff[];
  stores: Store[];
  userProfile: UserProfile;
  messagesByStore: Record<string, ChatMessage[]>;

  // Product methods
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { variants?: Array<{ name: string, options: Array<{ value: string}> }>, costPriceForNonTracked?: number, sellPriceForNonTracked?: number }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }>, costPriceForNonTracked?: number, sellPriceForNonTracked?: number }) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  getLowStockProductCount: (threshold: number) => number;
  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>) => ProductSKU | undefined;
  getSkuDetails: (sku: ProductSKU | undefined) => { totalStock: number | null; currentSellPrice: number | null; averageCostPrice: number | null; skuIdentifier?: string; };
  getSkuIdentifier: (productName: string, optionValues: Record<string, string>) => string;

  // Bill methods
  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName'> & { billedByStaffId?: string; storeId?: string; },
    items: Omit<BillItem, 'id'|'productName'>[]
  ) => Bill | null;
  deleteBill: (billId: string) => void;
  getBillById: (billId: string) => Bill | undefined;
  getRecentBills: (limit: number) => Bill[];
  getBillsForProduct: (productId: string) => Bill[];


  // Category methods
  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[];

  // Staff methods
  addStaff: (staffData: Omit<Staff, 'id'>) => Staff | null;
  updateStaff: (staffId: string, staffData: Partial<Omit<Staff, 'id'>>) => void;
  deleteStaff: (staffId: string) => void;
  getStaffById: (staffId: string) => Staff | undefined;
  getAllStaff: () => Staff[];
  getStaffDetailsByIds: (staffIds: string[]) => Staff[];

  // Store methods
  addStore: (storeData: Omit<Store, 'id'>) => Store | null;
  updateStore: (storeId: string, storeData: Partial<Omit<Store, 'id'>>) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;
  getAllStores: () => Store[];

  // User Profile methods
  updateCompanyName: (name: string) => void;
  updateSubscription: (planId: string) => void;
  getActiveSubscriptionPlan: () => SubscriptionPlan | undefined;
  canAddStore: () => boolean;
  canAddStaff: () => boolean;

  // Dashboard selectors
  getDailySalesAndExpenses: (days: number) => Array<{ date: string; sales: number; expenses: number }>;
  getTopSellingProductsByRevenue: (limit: number) => Array<{ name: string; revenue: number }>;
  getRecentExpenseBillsWithPotentialCoverage: (limit: number) => ExpenseBillWithCoverage[];
  getExpenseSummaryStats: () => ExpenseSummary;
  getOverallFinancialSummary: () => FinancialSummary;
  getTodaysFinancialSummary: () => TodaysFinancialSummary;
  getTopProfitableProducts: (limit: number) => Array<{ name: string; revenue: number; cogs: number }>;


  // Chat methods
  addChatMessage: (storeId: string, senderId: 'admin' | string, senderName: string, text: string) => void;
  getMessagesForStore: (storeId: string) => ChatMessage[];
  clearChatForStore: (storeId: string) => void;

  _hydrate: () => void;
}

const defaultUserProfile: UserProfile = {
  companyName: DEFAULT_COMPANY_NAME,
  activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN,
  dataMode: 'local',
};

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: [],
      bills: [],
      categories: DEFAULT_CATEGORIES.map(name => ({ id: generateId(), name })).sort((a, b) => a.name.localeCompare(b.name)),
      staffs: [],
      stores: [],
      userProfile: { ...defaultUserProfile },
      messagesByStore: {},

      getSkuIdentifier: (productName, optionValues) => {
        if (!optionValues || Object.keys(optionValues).length === 0) return productName;
        const sortedOptionsString = Object.entries(optionValues)
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([, value]) => value)
          .join(' - ');
        return `${productName} (${sortedOptionsString})`;
      },

      addProduct: (productData) => {
        const productVariants: ProductVariantType[] = (productData.variants || []).map((variantData, variantIdx) => ({
          id: (variantData as any).id || `variant-${generateId()}-${variantIdx}`,
          name: variantData.name,
          options: variantData.options.map((optData, optIdx) => ({
            id: (optData as any).id || `option-${generateId()}-${variantIdx}-${optIdx}`,
            value: optData.value,
          })),
        }));

        const newProductBase: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> = {
          name: productData.name,
          category: productData.category,
          trackQuantity: productData.trackQuantity,
          sku: productData.sku,
          expiryDate: productData.expiryDate,
          description: productData.description,
          variants: productVariants,
        };

        const newProduct: Product = {
          ...newProductBase,
          id: generateId(),
          imageUrl: `https://placehold.co/100x100.png?text=${encodeURIComponent(productData.name.substring(0,10))}&font=roboto`,
          productSKUs: [],
        };
        
        if (newProduct.trackQuantity === false && (!productVariants || productVariants.length === 0)) {
            const defaultSku: ProductSKU = {
                id: generateId(),
                optionValues: {},
                skuIdentifier: get().getSkuIdentifier(newProduct.name, {}),
                stockLayers: [{
                    id: generateId(),
                    purchaseBillId: 'INITIAL_SETUP_NON_TRACKED',
                    purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, 
                    quantity: 0,
                    costPrice: productData.costPriceForNonTracked ?? 0,
                    sellPrice: productData.sellPriceForNonTracked ?? 0,
                }],
            };
            newProduct.productSKUs.push(defaultSku);
        }


        set((state) => ({ products: [...state.products, newProduct] }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
        return newProduct;
      },

      updateProduct: (productId, productData) => {
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              const updatedProductBase: Partial<Product> = { ...productData };
              const updatedProduct: Product = { ...p, ...updatedProductBase };
              
              if (productData.variants !== undefined) {
                updatedProduct.variants = productData.variants.map((variantData, variantIdx) => {
                  const existingVariant = p.variants?.find(v => v.id === (variantData as any).id || v.name === variantData.name);
                  return {
                    id: existingVariant?.id || `variant-${generateId()}-${variantIdx}`,
                    name: variantData.name,
                    options: variantData.options.map((optData, optIdx) => {
                      const existingOption = existingVariant?.options.find(o => o.id === (optData as any).id || o.value === optData.value);
                      return {
                        id: existingOption?.id || `option-${generateId()}-${variantIdx}-${optIdx}`,
                        value: optData.value,
                      };
                    }),
                  };
                });
              }
               // Update SKU identifiers if name or variants changed
              updatedProduct.productSKUs = updatedProduct.productSKUs.map(sku => ({
                ...sku,
                skuIdentifier: get().getSkuIdentifier(updatedProduct.name, sku.optionValues)
              }));


              if (updatedProduct.trackQuantity === false && (!updatedProduct.variants || updatedProduct.variants.length === 0)) {
                let defaultSku = updatedProduct.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0);
                const costPrice = productData.costPriceForNonTracked ?? 0;
                const sellPrice = productData.sellPriceForNonTracked ?? 0;

                if (defaultSku) {
                  defaultSku.stockLayers = [{
                      id: defaultSku.stockLayers[0]?.id || generateId(), // Reuse existing layer ID if possible
                      purchaseBillId: 'INITIAL_SETUP_NON_TRACKED', purchaseDate: new Date().toISOString(),
                      initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                  }];
                   defaultSku.skuIdentifier = get().getSkuIdentifier(updatedProduct.name, defaultSku.optionValues);
                } else { 
                  defaultSku = {
                    id: generateId(), optionValues: {}, skuIdentifier: get().getSkuIdentifier(updatedProduct.name, {}),
                    stockLayers: [{
                      id: generateId(), purchaseBillId: 'INITIAL_SETUP_NON_TRACKED', purchaseDate: new Date().toISOString(),
                      initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                    }],
                  };
                  updatedProduct.productSKUs = [defaultSku, ...updatedProduct.productSKUs.filter(sku => Object.keys(sku.optionValues).length > 0)];
                }
              }
              return updatedProduct;
            }
            return p;
          }),
        }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
      },

      deleteProduct: (productId: string) => {
        set((state) => {
          const updatedProducts = state.products.filter((p) => p.id !== productId);
          // Remove items of this product from existing bills
          const updatedBills = state.bills.map(bill => ({
            ...bill,
            items: bill.items.filter(item => item.productId !== productId)
          })).filter(bill => bill.items.length > 0); // Remove bills if they become empty

          return { products: updatedProducts, bills: updatedBills };
        });
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
          sku = {
            id: generateId(),
            optionValues: { ...optionValues },
            skuIdentifier: get().getSkuIdentifier(product.name, optionValues),
            stockLayers: [],
          };
          const updatedProductSKUs = [...product.productSKUs, sku];
          const updatedProducts = [...products];
          updatedProducts[productIndex] = { ...product, productSKUs: updatedProductSKUs };
          set({ products: updatedProducts });
        }
        return sku;
      },

      getSkuDetails: (sku) => {
        const products = get().products;
        const product = products.find(p => p.productSKUs.some(s => s.id === sku?.id));
        const skuIdentifier = sku && product ? (sku.skuIdentifier || get().getSkuIdentifier(product.name, sku.optionValues)) : undefined;
        
        if (!sku || !Array.isArray(sku.stockLayers) || !product) {
          return { totalStock: 0, currentSellPrice: null, averageCostPrice: null, skuIdentifier };
        }

        if (product.trackQuantity === false) {
          // For non-tracked items, price comes from its single conceptual layer
          const priceLayer = sku.stockLayers[0];
          return {
            totalStock: null, 
            currentSellPrice: priceLayer?.sellPrice ?? null,
            averageCostPrice: priceLayer?.costPrice ?? null,
            skuIdentifier,
          };
        }

        const totalStock = sku.stockLayers.reduce((sum, layer) => sum + (typeof layer.quantity === 'number' ? layer.quantity : 0), 0);

        let currentSellPrice: number | null = null;
        if (totalStock > 0) {
          const oldestLayerWithStock = [...sku.stockLayers]
            .filter(layer => typeof layer.quantity === 'number' && layer.quantity > 0)
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())[0];
          if (oldestLayerWithStock && typeof oldestLayerWithStock.sellPrice === 'number') {
            currentSellPrice = oldestLayerWithStock.sellPrice;
          }
        }

        let averageCostPrice: number | null = null;
        if (totalStock > 0) {
            const totalCostValue = sku.stockLayers.reduce((sum, layer) => sum + ((typeof layer.costPrice === 'number' ? layer.costPrice : 0) * (typeof layer.quantity === 'number' ? layer.quantity : 0)), 0);
            averageCostPrice = totalCostValue / totalStock;
        } else if (sku.stockLayers.length > 0) { 
            const totalInitialCost = sku.stockLayers.reduce((sum, layer) => sum + ((typeof layer.costPrice === 'number' ? layer.costPrice : 0) * (typeof layer.initialQuantity === 'number' ? layer.initialQuantity : 0)), 0);
            const totalInitialQty = sku.stockLayers.reduce((sum, layer) => sum + (typeof layer.initialQuantity === 'number' ? layer.initialQuantity : 0), 0);
            if (totalInitialQty > 0) averageCostPrice = totalInitialCost / totalInitialQty;
        }
        return { totalStock, currentSellPrice, averageCostPrice, skuIdentifier };
      },

      addBill: (billData, billItemsData) => {
        const currentDate = new Date();
        const billTimestamp = currentDate.getTime();
        const newBillId = format(currentDate, 'ddMMyyHHmmss');
        const newBillItems: BillItem[] = [];
        let tempProducts = JSON.parse(JSON.stringify(get().products)) as Product[];
        let productsUpdated = false;

        for (const itemData of billItemsData) {
          const productIndex = tempProducts.findIndex(p => p.id === itemData.productId);

          if (productIndex === -1 && !itemData.productId.startsWith('SERVICE_ITEM_')) {
            console.error(`Product not found for ID: ${itemData.productId} in addBill. Skipping item.`);
            continue;
          }

          const product = productIndex !== -1 ? tempProducts[productIndex] : null;
          
          if (billData.type === 'buy' && product && product.trackQuantity === false) {
             return null;
          }

          let sku: ProductSKU | undefined = undefined;
          let skuIndexInProduct = -1;
          let billItemCostPrice = typeof itemData.costPrice === 'number' ? itemData.costPrice : 0;
          let billItemSellPrice = typeof itemData.sellPrice === 'number' ? itemData.sellPrice : 0;
          let itemProductNameForBill = product?.name || itemData.productName || 'Service/Charge';


          if (product) {
            const selectedOpts = itemData.selectedVariantOptions || {};
            const targetSkuInstance = get().findOrCreateProductSKU(product.id, selectedOpts);
             if(!targetSkuInstance) {
                console.error(`SKU could not be found or created for ${product.name} with options ${JSON.stringify(selectedOpts)}`);
                continue;
            }
            const refreshedProduct = tempProducts.find(p => p.id === product.id);
            if (!refreshedProduct) continue;
            skuIndexInProduct = refreshedProduct.productSKUs.findIndex(s => s.id === targetSkuInstance.id);
            if (skuIndexInProduct === -1) { // Should not happen if findOrCreate worked
                console.error("SKU index not found after creation attempt.");
                continue;
            }
            sku = refreshedProduct.productSKUs[skuIndexInProduct];
            itemProductNameForBill = sku.skuIdentifier || get().getSkuIdentifier(refreshedProduct.name, sku.optionValues);

            if (billData.type === 'buy') {
                if (!product.trackQuantity) { // Double check for safety, though form should prevent
                    console.warn(`Attempted to add non-tracked product ${product.name} to expense bill.`);
                    return null;
                }
              const newLayer: StockLayer = {
                id: generateId(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
                initialQuantity: itemData.quantity, quantity: itemData.quantity,
                costPrice: billItemCostPrice, sellPrice: billItemSellPrice, 
              };
              sku.stockLayers.push(newLayer);
              productsUpdated = true;
            } else if (billData.type === 'sell') {
              if (product.trackQuantity) {
                let quantityToSell = itemData.quantity;
                let costOfGoodsSoldThisItem = 0;
                sku.stockLayers.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
                for (let i = 0; i < sku.stockLayers.length && quantityToSell > 0; i++) {
                  const layer = sku.stockLayers[i];
                  if (layer.quantity > 0) {
                    const sellFromThisLayer = Math.min(quantityToSell, layer.quantity);
                    costOfGoodsSoldThisItem += sellFromThisLayer * layer.costPrice;
                    layer.quantity -= sellFromThisLayer;
                    quantityToSell -= sellFromThisLayer;
                    productsUpdated = true;
                  }
                }
                if (quantityToSell > 0) {
                  return null;
                }
                billItemCostPrice = itemData.quantity > 0 ? costOfGoodsSoldThisItem / itemData.quantity : 0;
              } else { 
                const skuDetails = get().getSkuDetails(sku);
                billItemCostPrice = skuDetails.averageCostPrice ?? 0; 
                // billItemSellPrice is already set from form, which got it from skuDetails.currentSellPrice
              }
            } else if (billData.type === 'return') {
              const skuDetails = get().getSkuDetails(sku);
              billItemCostPrice = skuDetails.averageCostPrice ?? 0;

              if (product.trackQuantity && !itemData.isDefective) {
                const returnLayer: StockLayer = {
                  id: generateId(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
                  initialQuantity: itemData.quantity, quantity: itemData.quantity,
                  costPrice: billItemCostPrice, 
                  sellPrice: billItemSellPrice, 
                };
                sku.stockLayers.push(returnLayer);
                productsUpdated = true;
              }
            }
            refreshedProduct.productSKUs[skuIndexInProduct] = sku;
            tempProducts = tempProducts.map(p => p.id === refreshedProduct.id ? refreshedProduct : p);
          } else if (itemData.productId.startsWith('SERVICE_ITEM_')) {
            billItemCostPrice = billData.type === 'buy' ? (itemData.costPrice ?? 0) : 0;
            billItemSellPrice = itemData.sellPrice ?? 0;
          }

          newBillItems.push({
            id: generateId(), productName: itemProductNameForBill,
            productId: itemData.productId, quantity: itemData.quantity,
            costPrice: billItemCostPrice, sellPrice: billItemSellPrice,
            isDefective: itemData.isDefective, selectedVariantOptions: itemData.selectedVariantOptions,
          });
        }

        if (productsUpdated) {
          set({ products: tempProducts });
        }

        let totalAmount = 0;
        if (billData.type === 'buy') {
          totalAmount = newBillItems.reduce((acc, buyItem) => acc + (buyItem.quantity * (buyItem.costPrice || 0)), 0);
        } else {
          totalAmount = newBillItems.reduce((acc, item) => acc + (item.quantity * (item.sellPrice || 0)), 0);
        }

        const staffMember = billData.billedByStaffId ? get().getStaffById(billData.billedByStaffId) : undefined;
        const storeLocation = billData.storeId ? get().getStoreById(billData.storeId) : undefined;

        const newBill: Bill = {
          id: newBillId, type: billData.type, date: currentDate.toISOString(), timestamp: billTimestamp,
          vendorOrCustomerName: billData.vendorOrCustomerName, customerPhone: billData.customerPhone,
          items: newBillItems, totalAmount, notes: billData.notes, paymentStatus: billData.paymentStatus,
          billedByStaffId: staffMember?.id, billedByStaffName: staffMember?.name,
          storeId: storeLocation?.id, storeName: storeLocation?.name,
        };

        set((state) => ({ bills: [newBill, ...state.bills].sort((a,b) => b.timestamp - a.timestamp) }));
        return newBill;
      },
      deleteBill: (billId: string) => {
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== billId),
        }));
      },
      getBillById: (billId) => get().bills.find((b) => b.id === billId),
      getRecentBills: (limit: number) => {
        return [...get().bills]
          .slice(0, limit);
      },
      getBillsForProduct: (productId: string) => {
        return get().bills
          .filter(bill => bill.items.some(item => item.productId === productId))
          .sort((a, b) => b.timestamp - a.timestamp);
      },

      addCategory: (categoryName) => {
        const existingCategory = get().categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (existingCategory) return existingCategory;
        const newCategory: Category = { id: generateId(), name: categoryName };
        set((state) => ({ categories: [...state.categories, newCategory].sort((a, b) => a.name.localeCompare(b.name)) }));
        return newCategory;
      },
      searchCategories: (searchTerm: string) => {
        if (!searchTerm) return get().categories.map(c => c.name).sort((a,b) => a.localeCompare(b));
        const lowerSearchTerm = searchTerm.toLowerCase();
        return get().categories
          .filter(c => c.name.toLowerCase().includes(lowerSearchTerm))
          .map(c => c.name)
          .sort((a,b) => a.localeCompare(b));
      },

      addStaff: (staffData) => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan || get().staffs.length >= plan.maxEmployees) return null;
        const newStaff: Staff = { id: generateId(), ...staffData };
        set((state) => ({ staffs: [...state.staffs, newStaff] }));
        return newStaff;
      },
      updateStaff: (staffId, staffData) => {
        set((state) => ({
          staffs: state.staffs.map((s) => (s.id === staffId ? { ...s, ...staffData } : s)),
        }));
      },
      deleteStaff: (staffId: string) => {
        set((state) => ({
          staffs: state.staffs.filter((s) => s.id !== staffId),
          stores: state.stores.map(store => ({
            ...store,
            allowedStaffIds: store.allowedStaffIds.filter(id => id !== staffId)
          }))
        }));
      },
      getStaffById: (staffId) => get().staffs.find((s) => s.id === staffId),
      getAllStaff: () => get().staffs,
      getStaffDetailsByIds: (staffIds: string[]) => {
        const allStaff = get().staffs;
        return staffIds.map(id => allStaff.find(s => s.id === id)).filter(s => s !== undefined) as Staff[];
      },

      addStore: (storeData) => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan || get().stores.length >= plan.maxStores) return null;
        const newStore: Store = {
          id: generateId(),
          ...storeData,
          allowedOperations: storeData.allowedOperations || ['sell', 'buy', 'return']
        };
        set((state) => ({ stores: [...state.stores, newStore] }));
        return newStore;
      },
      updateStore: (storeId, storeData) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === storeId ? { ...s, ...storeData } : s)),
        }));
      },
      deleteStore: (storeId: string) => {
        set((state) => ({
          stores: state.stores.filter((s) => s.id !== storeId),
          staffs: state.staffs.map(staff => ({
            ...staff,
            accessibleStoreIds: staff.accessibleStoreIds.filter(id => id !== storeId)
          }))
        }));
      },
      getStoreById: (storeId) => get().stores.find((s) => s.id === storeId),
      getAllStores: () => get().stores,

      updateCompanyName: (name: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, companyName: name || DEFAULT_COMPANY_NAME }}));
      },
      updateSubscription: (planId: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, activeSubscriptionId: planId }}));
      },
      getActiveSubscriptionPlan: () => {
        const { activeSubscriptionId } = get().userProfile;
        return SUBSCRIPTION_PLANS.find(plan => plan.id === activeSubscriptionId) || SUBSCRIPTION_PLANS.find(p => p.id === SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN);
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

      getProductById: (productId: string) => {
        return get().products.find((p) => p.id === productId);
      },
      getProductByName: (name: string) => {
        return get().products.find((p) => p.name.toLowerCase() === name.toLowerCase());
      },
      searchProducts: (searchTerm: string) => {
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
      getLowStockProductCount: (threshold: number) => {
        return get().products.reduce((count, product) => {
          if (product.trackQuantity) {
            const totalStock = product.productSKUs.reduce((sum, sku) => sum + (get().getSkuDetails(sku).totalStock ?? 0), 0);
            if (totalStock > 0 && totalStock < threshold) { 
              return count + 1;
            }
          }
          return count;
        }, 0);
      },

      getDailySalesAndExpenses: (days) => {
        const bills = get().bills;
        const dailyData: Array<{ date: string; sales: number; expenses: number }> = [];
        for (let i = 0; i < days; i++) {
          const targetDate = startOfDay(subDays(new Date(), i));
          const dateStr = format(targetDate, 'MMM d');
          let sales = 0;
          let expenses = 0;

          bills.forEach(bill => {
            if (startOfDay(new Date(bill.date)).getTime() === targetDate.getTime()) {
              if (bill.type === 'sell') {
                sales += bill.totalAmount;
              } else if (bill.type === 'buy') {
                expenses += bill.totalAmount;
              }
            }
          });
          dailyData.unshift({ date: dateStr, sales, expenses });
        }
        return dailyData;
      },
      getTopSellingProductsByRevenue: (limit: number) => {
        const bills = get().bills;
        const productRevenue: Record<string, { name: string; revenue: number }> = {};

        bills.forEach(bill => {
          if (bill.type === 'sell') {
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return;
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
      getRecentExpenseBillsWithPotentialCoverage: (limit: number) => {
        const expenseBills = get().bills.filter(bill => bill.type === 'buy')
          .sort((a, b) => b.timestamp - a.timestamp);
        return expenseBills.slice(0, limit).map(bill => {
          const totalCost = bill.totalAmount;
          const potentialRevenue = bill.items.reduce((acc, item) => acc + ((item.sellPrice ?? 0) * item.quantity), 0);
          const coverageStatus = potentialRevenue >= totalCost ? 'Covered' : 'Uncovered';
          return { ...bill, totalCost, potentialRevenue, coverageStatus };
        });
      },
      getExpenseSummaryStats: (): ExpenseSummary => {
        const expenseBills = get().bills.filter(bill => bill.type === 'buy');
        let totalCoveredExpenseValue = 0;
        let totalUncoveredExpenseValue = 0;
        let totalPotentialProfitOnCoveredExpenses = 0;
        let totalOutstandingCostOnUncoveredExpenses = 0;
        let coveredBillCount = 0;
        let uncoveredBillCount = 0;

        expenseBills.forEach(bill => {
          const totalCost = bill.totalAmount;
          const potentialRevenue = bill.items.reduce((acc, item) => acc + ((item.sellPrice ?? 0) * item.quantity), 0);
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
          totalCoveredExpenseValue,
          totalUncoveredExpenseValue,
          totalPotentialProfitOnCoveredExpenses,
          totalOutstandingCostOnUncoveredExpenses,
          coveredBillCount,
          uncoveredBillCount,
        };
      },
      getOverallFinancialSummary: (): FinancialSummary => {
        const bills = get().bills;
        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalExpenses = 0;

        bills.forEach(bill => {
          if (bill.type === 'sell') {
            totalRevenue += bill.totalAmount;
            bill.items.forEach(item => {
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

      getTodaysFinancialSummary: (): TodaysFinancialSummary => {
        const bills = get().bills.filter(bill => isToday(new Date(bill.date)));
        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalExpenses = 0;
        let transactionsToday = 0;
        let defectivesToday = 0;

        bills.forEach(bill => {
          transactionsToday++;
          if (bill.type === 'sell') {
            totalRevenue += bill.totalAmount;
            bill.items.forEach(item => {
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

      getTopProfitableProducts: (limit: number) => {
        const productFinancials: Record<string, { name: string; revenue: number; cogs: number; profit: number }> = {};
        get().bills.forEach(bill => {
          if (bill.type === 'sell') {
            bill.items.forEach(item => {
              // Use item.productName which should be the SKU identifier for accurate grouping
              const skuIdentifier = item.productName; 
              if (!productFinancials[skuIdentifier]) {
                productFinancials[skuIdentifier] = { name: skuIdentifier, revenue: 0, cogs: 0, profit: 0 };
              }
              const itemRevenue = (item.sellPrice || 0) * item.quantity;
              const itemCogs = (item.costPrice || 0) * item.quantity; // costPrice is COGS for sales items
      
              productFinancials[skuIdentifier].revenue += itemRevenue;
              productFinancials[skuIdentifier].cogs += itemCogs;
              productFinancials[skuIdentifier].profit += (itemRevenue - itemCogs);
            });
          }
        });
      
        return Object.values(productFinancials)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, limit)
          .map(pf => ({ name: pf.name, revenue: pf.revenue, cogs: pf.cogs })); // Return only needed fields for chart
      },


      addChatMessage: (storeId, senderId, senderName, text) => {
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
      getMessagesForStore: (storeId: string) => {
        const messages = get().messagesByStore[storeId] || [];
        return [...messages].sort((a, b) => a.timestamp - b.timestamp);
      },
      clearChatForStore: (storeId: string) => {
        set((state) => {
          const newMessagesByStore = { ...state.messagesByStore };
          delete newMessagesByStore[storeId];
          return { messagesByStore: newMessagesByStore };
        });
      },

      _hydrate: () => {
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
              if (state[k] === undefined || state[k] === null || (Array.isArray(defaultStateShape[k]) && !Array.isArray(state[k]))) {
                (state as any)[k] = JSON.parse(JSON.stringify((defaultStateShape as any)[k]));
                storeUpdated = true;
              }
            }
          }
      
          if (!state.userProfile || typeof state.userProfile !== 'object') {
            state.userProfile = JSON.parse(JSON.stringify(defaultUserProfile));
            storeUpdated = true;
          } else {
            state.userProfile.companyName = state.userProfile.companyName || DEFAULT_COMPANY_NAME;
            const currentSubId = state.userProfile.activeSubscriptionId;
            const isValidSubId = SUBSCRIPTION_PLANS.some(plan => plan.id === currentSubId);
            if (!currentSubId || !isValidSubId) {
              state.userProfile.activeSubscriptionId = SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN;
              storeUpdated = true;
            }
            state.userProfile.dataMode = state.userProfile.dataMode || 'local'; // Default dataMode
            storeUpdated = true;
          }
      
          if (!Array.isArray(state.categories)) { state.categories = []; storeUpdated = true; }
          DEFAULT_CATEGORIES.forEach(catName => {
            if (!state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
              state.categories.push({ id: generateId(), name: catName });
              storeUpdated = true;
            }
          });
          if(storeUpdated) state.categories.sort((a, b) => a.name.localeCompare(b.name));
      
          if (Array.isArray(state.products)) {
            state.products = state.products.map(p_any => {
              if (!p_any || typeof p_any !== 'object' || !p_any.id || !p_any.name) return null;
              const p = { ...p_any } as Product & { quantityInStock?: number; costPrice?: number; sellPrice?: number }; 
      
              p.trackQuantity = typeof p.trackQuantity === 'boolean' ? p.trackQuantity : true;
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
                const sku = { ...sku_any } as ProductSKU & { quantityInStock?: number; costPrice?: number; sellPrice?: number }; // temp allow old fields for migration
                sku.stockLayers = Array.isArray(sku.stockLayers) ? sku.stockLayers.map(layer_any => {
                    if(!layer_any || typeof layer_any !== 'object') return null;
                    const layer = { ...layer_any } as StockLayer;
                    layer.costPrice = typeof layer.costPrice === 'number' ? layer.costPrice : 0;
                    layer.sellPrice = typeof layer.sellPrice === 'number' ? layer.sellPrice : 0;
                    layer.quantity = typeof layer.quantity === 'number' ? layer.quantity : 0;
                    layer.initialQuantity = typeof layer.initialQuantity === 'number' ? layer.initialQuantity : layer.quantity;
                    layer.purchaseDate = layer.purchaseDate || new Date(0).toISOString();
                    return layer;
                }).filter(l => l !== null) : [];
      
                if (sku.stockLayers.length === 0 && (sku.hasOwnProperty('quantityInStock') || sku.hasOwnProperty('costPrice'))) {
                    const oldQty = typeof sku.quantityInStock === 'number' ? sku.quantityInStock : 0;
                    const oldCost = typeof sku.costPrice === 'number' ? sku.costPrice : 0;
                    const oldSell = typeof sku.sellPrice === 'number' ? sku.sellPrice : 0;
                    
                    // Only create a placeholder layer if it was non-tracked or had actual stock
                    if (p.trackQuantity === false || (p.trackQuantity === true && oldQty > 0)) {
                        sku.stockLayers.push({
                            id: generateId(), purchaseBillId: 'hydrated_sku_stock', purchaseDate: new Date(0).toISOString(),
                            initialQuantity: oldQty, // Use oldQty as initial and current for tracked
                            quantity: oldQty,
                            costPrice: oldCost,
                            sellPrice: oldSell,
                        });
                        storeUpdated = true;
                    } else if (p.trackQuantity === false) { // Specifically for non-tracked, ensure a price layer
                         sku.stockLayers.push({
                            id: generateId(), purchaseBillId: 'INITIAL_SETUP_NON_TRACKED', purchaseDate: new Date(0).toISOString(),
                            initialQuantity: 0, quantity: 0, costPrice: oldCost, sellPrice: oldSell,
                        });
                        storeUpdated = true;
                    }
                }
                sku.optionValues = sku.optionValues || {};
                sku.skuIdentifier = sku.skuIdentifier || get().getSkuIdentifier(p.name, sku.optionValues);
      
                delete sku.quantityInStock; delete sku.costPrice; delete sku.sellPrice;
                return sku;
              }).filter(sku => sku !== null) : [];
      
              if ((!p.variants || p.variants.length === 0) && p.productSKUs.length === 0 && (p.hasOwnProperty('quantityInStock') || p.hasOwnProperty('costPrice') || p.hasOwnProperty('sellPrice'))) {
                  const defaultSku: ProductSKU = {
                    id: generateId(), optionValues: {}, skuIdentifier: get().getSkuIdentifier(p.name, {}), stockLayers: [],
                  };
                  const oldQty = typeof p.quantityInStock === 'number' ? p.quantityInStock : 0;
                  const oldCost = typeof p.costPrice === 'number' ? p.costPrice : 0;
                  const oldSell = typeof p.sellPrice === 'number' ? p.sellPrice : 0;
                  
                  if (p.trackQuantity === false || (p.trackQuantity === true && oldQty > 0)) {
                    defaultSku.stockLayers.push({
                      id: generateId(), purchaseBillId: 'hydrated_product_stock', purchaseDate: new Date(0).toISOString(),
                      initialQuantity: oldQty, 
                      quantity: oldQty,
                      costPrice: oldCost,
                      sellPrice: oldSell,
                    });
                  } else if (p.trackQuantity === false) {
                     defaultSku.stockLayers.push({
                        id: generateId(), purchaseBillId: 'INITIAL_SETUP_NON_TRACKED', purchaseDate: new Date(0).toISOString(),
                        initialQuantity: 0, quantity: 0, costPrice: oldCost, sellPrice: oldSell,
                    });
                  }
                  p.productSKUs.push(defaultSku);
                  storeUpdated = true;
              }
              delete p.quantityInStock; delete p.costPrice; delete p.sellPrice;
              return p;
            }).filter(p => p !== null) as Product[];
          } else {
            state.products = []; storeUpdated = true;
          }
      
          if (Array.isArray(state.bills)) {
            state.bills = state.bills.map(bill_any => {
              if (!bill_any || typeof bill_any !== 'object') return null;
              const bill = { ...bill_any } as Bill;
              bill.items = Array.isArray(bill.items) ? bill.items.map(item_any => {
                if (!item_any || typeof item_any !== 'object') return null;
                const item = { ...item_any } as BillItem;
                item.costPrice = typeof item.costPrice === 'number' ? item.costPrice : 0;
                item.sellPrice = typeof item.sellPrice === 'number' ? item.sellPrice : 0;
                item.quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
                return item;
              }).filter(item => item !== null) : [];
              bill.totalAmount = typeof bill.totalAmount === 'number' ? bill.totalAmount : 0;
              bill.timestamp = typeof bill.timestamp === 'number' ? bill.timestamp : (bill.date ? new Date(bill.date).getTime() : Date.now());
              bill.date = bill.date || new Date(bill.timestamp).toISOString();
              return bill;
            }).filter(bill => bill !== null) as Bill[];
          } else {
            state.bills = []; storeUpdated = true;
          }
      
          if(!Array.isArray(state.staffs)) { state.staffs = []; storeUpdated = true;}
          if(!Array.isArray(state.stores)) { state.stores = []; storeUpdated = true;}
          state.stores = state.stores.map(s_any => {
            if (!s_any || typeof s_any !== 'object') return null;
            const s = { ...s_any } as Store;
            s.allowedOperations = Array.isArray(s.allowedOperations) && s.allowedOperations.length > 0 ? s.allowedOperations : ['sell', 'buy', 'return'];
            return s;
          }).filter(s => s !== null) as Store[];
      
          if(!state.messagesByStore || typeof state.messagesByStore !== 'object') {state.messagesByStore = {}; storeUpdated = true;}
      
      
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

if (typeof window !== 'undefined') {
  const store = useInventoryStore.getState();
  if (store._hydrate && !(store as any).__hydrated) {
    store._hydrate();
    (store as any).__hydrated = true; 
  }
}
