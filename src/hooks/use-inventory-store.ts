
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, Staff, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode, ChatMessage, StockLayer } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay } from 'date-fns';
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

interface InventoryState {
  products: Product[];
  bills: Bill[];
  categories: Category[];
  staffs: Staff[];
  stores: Store[];
  userProfile: UserProfile;
  messagesByStore: Record<string, ChatMessage[]>;

  // Product methods
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }> }) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  getLowStockProductCount: (threshold: number) => number;
  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>) => ProductSKU | undefined;
  getSkuDetails: (sku: ProductSKU | undefined) => { totalStock: number; currentSellPrice: number | null; averageCostPrice: number | null };

  // Bill methods
  addBill: (
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName'> & { billedByStaffId?: string; storeId?: string; },
    items: Omit<BillItem, 'id'|'productName'>[]
  ) => Bill | null; // Can return null if stock issue
  deleteBill: (billId: string) => void;
  getBillById: (billId: string) => Bill | undefined;
  getRecentBills: (limit: number) => Bill[];

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

  // Chat methods
  addChatMessage: (storeId: string, senderId: 'admin' | string, senderName: string, text: string) => void;
  getMessagesForStore: (storeId: string) => ChatMessage[];
  clearChatForStore: (storeId: string) => void;

  _hydrate: () => void;
}

const getSkuIdentifier = (productName: string, optionValues: Record<string, string>): string => {
  if (Object.keys(optionValues).length === 0) return productName;
  const sortedOptions = Object.entries(optionValues)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, value]) => value)
    .join('-');
  return `${productName}-${sortedOptions}`;
};

const initialProducts: Product[] = [
  // { id: generateId(), name: 'Organic Apples', category: 'Fruits', trackQuantity: true, description: "Fresh, crispy organic apples, sourced locally.", imageUrl: `https://placehold.co/100x100.png?text=Apples&font=roboto`, productSKUs: [{ id: generateId(), optionValues: {}, skuIdentifier: 'Organic Apples', stockLayers: [{id: generateId(), purchaseBillId: 'initial', purchaseDate: new Date().toISOString(), quantity: 50, costPrice: 20, sellPrice: 40 }] }] },
  // { id: generateId(), name: 'Whole Wheat Bread', category: 'Bakery', trackQuantity: true, description: "Healthy whole wheat bread, freshly baked daily, no preservatives.", imageUrl: `https://placehold.co/100x100.png?text=Bread&font=roboto`, productSKUs: [{ id: generateId(), optionValues: {}, skuIdentifier: 'Whole Wheat Bread', stockLayers: [{id: generateId(), purchaseBillId: 'initial', purchaseDate: new Date().toISOString(), quantity: 30, costPrice: 30, sellPrice: 50 }] }] },
];

const initialCategories: Category[] = DEFAULT_CATEGORIES.map(name => ({ id: generateId(), name }));

const defaultUserProfile: UserProfile = {
  companyName: DEFAULT_COMPANY_NAME,
  activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN,
};

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: initialProducts,
      bills: [],
      categories: initialCategories,
      staffs: [],
      stores: [],
      userProfile: defaultUserProfile,
      messagesByStore: {},

      addProduct: (productData) => {
        const productVariants: ProductVariantType[] = (productData.variants || []).map((variantData, variantIdx) => ({
          id: `variant-${generateId()}-${variantIdx}`,
          name: variantData.name,
          options: variantData.options.map((optData, optIdx) => ({
            id: `option-${generateId()}-${variantIdx}-${optIdx}`,
            value: optData.value,
          })),
        }));

        const initialSKUs: ProductSKU[] = [];
        if (!productData.variants || productData.variants.length === 0) {
          // For non-variant products, create a default SKU with empty stock layers.
          // Actual stock and pricing will come from expense bills.
          initialSKUs.push({
            id: generateId(),
            optionValues: {},
            skuIdentifier: getSkuIdentifier(productData.name, {}),
            stockLayers: [],
          });
        }
        // For variant products, SKUs are created dynamically on first purchase of a specific variant combination.

        const newProduct: Product = {
          id: generateId(),
          name: productData.name,
          category: productData.category,
          trackQuantity: productData.trackQuantity,
          sku: productData.sku,
          expiryDate: productData.expiryDate,
          imageUrl: `https://placehold.co/100x100.png?text=${encodeURIComponent(productData.name.substring(0,10))}&font=roboto`,
          description: productData.description,
          variants: productVariants,
          productSKUs: initialSKUs,
        };
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
              const updatedProduct: Product = { ...p, ...productData };

              if (productData.variants) {
                updatedProduct.variants = productData.variants.map((variantData, variantIdx) => {
                  const existingVariant = p.variants?.find(v => v.name === variantData.name || v.id === (variantData as any).id);
                  return {
                    id: existingVariant?.id || `variant-${generateId()}-${variantIdx}`,
                    name: variantData.name,
                    options: variantData.options.map((optData, optIdx) => {
                      const existingOption = existingVariant?.options.find(o => o.value === optData.value || o.id === (optData as any).id);
                      return {
                        id: existingOption?.id || `option-${generateId()}-${variantIdx}-${optIdx}`,
                        value: optData.value,
                      };
                    }),
                  };
                });
                 // When variants are updated, existing productSKUs might become invalid or need re-evaluation.
                 // For simplicity in this update, we are not automatically pruning/updating SKUs here.
                 // A more robust system would handle SKU regeneration or validation if variant structure changes.
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
          // Optionally, remove related bill items, or mark them as linked to a deleted product.
          // For simplicity, we'll just remove the product here. Active bills will still hold references.
          return { products: updatedProducts };
        });
      },
      
      findOrCreateProductSKU: (productId, optionValues) => {
        const products = get().products;
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex === -1) return undefined;
        
        const product = products[productIndex];
        const stringifiedTargetOptions = JSON.stringify(Object.fromEntries(Object.entries(optionValues).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))));
        
        let sku = product.productSKUs.find(s => {
          const stringifiedSkuOptions = JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))));
          return stringifiedSkuOptions === stringifiedTargetOptions;
        });

        if (!sku) {
          // Create new SKU if it doesn't exist
          sku = {
            id: generateId(),
            optionValues: { ...optionValues },
            skuIdentifier: getSkuIdentifier(product.name, optionValues),
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
        if (!sku) return { totalStock: 0, currentSellPrice: null, averageCostPrice: null };

        const totalStock = sku.stockLayers.reduce((sum, layer) => sum + layer.quantity, 0);
        
        let currentSellPrice: number | null = null;
        if (totalStock > 0) {
          // Find the oldest layer with stock for its sell price
          const oldestLayerWithStock = [...sku.stockLayers]
            .filter(layer => layer.quantity > 0)
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime())[0];
          if (oldestLayerWithStock) {
            currentSellPrice = oldestLayerWithStock.sellPrice;
          }
        }
        
        let averageCostPrice: number | null = null;
        if (totalStock > 0) {
            const totalCostValue = sku.stockLayers.reduce((sum, layer) => sum + (layer.costPrice * layer.quantity), 0);
            averageCostPrice = totalCostValue / totalStock;
        }

        return { totalStock, currentSellPrice, averageCostPrice };
      },


      addBill: (billData, billItemsData) => {
        const currentDate = new Date();
        const billTimestamp = currentDate.getTime();
        const newBillId = format(currentDate, 'ddMMyyHHmmss') + (billTimestamp % 1000).toString().padStart(3,'0'); // Added SSS for milliseconds
        const newBillItems: BillItem[] = [];
        let productsUpdated = false;
        let tempProducts = [...get().products]; // Work on a copy

        for (const itemData of billItemsData) {
          const productIndex = tempProducts.findIndex(p => p.id === itemData.productId);
          
          if (productIndex === -1 && !itemData.productId.startsWith('SERVICE_ITEM_')) {
            console.error(`Product not found for itemData.productId: ${itemData.productId} during bill creation.`);
            continue; // Skip this item if product not found (and not a service item)
          }

          let product = productIndex !== -1 ? { ...tempProducts[productIndex] } : null;
          let sku: ProductSKU | undefined = undefined;
          let billItemCostPrice = itemData.costPrice; // For 'buy', this is from form. For 'sell', this will be calculated COGS.
          let billItemSellPrice = itemData.sellPrice; // For 'sell', this is from form. For 'buy', this is the "sell price set at purchase".

          if (product) {
            const selectedOpts = itemData.selectedVariantOptions || {};
            const skuIndex = product.productSKUs.findIndex(s => 
              JSON.stringify(Object.fromEntries(Object.entries(s.optionValues).sort())) === 
              JSON.stringify(Object.fromEntries(Object.entries(selectedOpts).sort()))
            );

            if (skuIndex !== -1) {
              sku = { ...product.productSKUs[skuIndex] }; // Work with a copy of SKU
              sku.stockLayers = [...sku.stockLayers]; // And a copy of its layers
            } else {
              // SKU doesn't exist, create it (relevant for new variant combos during purchase)
              sku = {
                id: generateId(),
                optionValues: selectedOpts,
                skuIdentifier: getSkuIdentifier(product.name, selectedOpts),
                stockLayers: [],
              };
              product.productSKUs = [...product.productSKUs, sku];
            }
            
            if (billData.type === 'buy') {
              if (product.trackQuantity) {
                const newLayer: StockLayer = {
                  id: generateId(),
                  purchaseBillId: newBillId,
                  purchaseDate: currentDate.toISOString(),
                  quantity: itemData.quantity,
                  costPrice: itemData.costPrice, // From form input
                  sellPrice: itemData.sellPrice, // From form input (sell price set at time of purchase)
                };
                sku.stockLayers.push(newLayer);
                productsUpdated = true;
              }
              // BillItem costPrice & sellPrice are directly from itemData for 'buy'
            } else if (billData.type === 'sell') {
              if (product.trackQuantity) {
                let quantityToSell = itemData.quantity;
                let costOfGoodsSoldThisItem = 0;
                let layersUsedCount = 0;

                // Sort layers by purchaseDate (oldest first) for FIFO
                sku.stockLayers.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

                for (let i = 0; i < sku.stockLayers.length && quantityToSell > 0; i++) {
                  const layer = sku.stockLayers[i];
                  if (layer.quantity > 0) {
                    const sellFromThisLayer = Math.min(quantityToSell, layer.quantity);
                    costOfGoodsSoldThisItem += sellFromThisLayer * layer.costPrice;
                    layer.quantity -= sellFromThisLayer;
                    quantityToSell -= sellFromThisLayer;
                    layersUsedCount++;
                  }
                }

                if (quantityToSell > 0) {
                  // Insufficient stock
                  console.error(`Insufficient stock for ${product.name} (SKU: ${sku.skuIdentifier}). Needed ${itemData.quantity}, found less.`);
                  // Depending on policy, either fail the bill or partially fill. For now, let's log and skip item.
                  // Or better: fail the whole bill - this is what returning null will do.
                  return null; 
                }
                billItemCostPrice = layersUsedCount > 0 ? costOfGoodsSoldThisItem / itemData.quantity : 0; // Average COGS for this item
                productsUpdated = true;
              } else { // Non-tracked item sale
                billItemCostPrice = 0; // No COGS for non-tracked (or use SKU's default if available)
              }
              // billItemSellPrice is from itemData (form input)
            } else if (billData.type === 'return') {
              billItemSellPrice = itemData.sellPrice; // Use price from original sale (or current if that's the policy)
              // Find the SKU's current sell price to use for return value
              const skuDetails = get().getSkuDetails(sku);
              billItemSellPrice = skuDetails.currentSellPrice ?? itemData.sellPrice; // Fallback to itemData price

              if (product.trackQuantity && !itemData.isDefective) {
                // For simplicity, non-defective returns are added back as a new layer or to the most recent existing layer
                // A more complex system would try to match to original purchase layer or use average cost.
                // Here, we'll add to a "general" stock or the newest layer if identifiable.
                // This is a simplification of FIFO for returns.
                const newLayer: StockLayer = {
                  id: generateId(),
                  purchaseBillId: newBillId, // Mark as a return adjustment
                  purchaseDate: currentDate.toISOString(),
                  quantity: itemData.quantity,
                  costPrice: billItemCostPrice, // Cost at which it was returned (e.g., original COGS or avg)
                  sellPrice: billItemSellPrice, // Value at which it was returned
                };
                sku.stockLayers.push(newLayer);
                productsUpdated = true;
              }
              billItemCostPrice = skuDetails.averageCostPrice ?? itemData.costPrice; // Use average cost for return valuation
            }
            
            // Update the SKU in the product's SKU list
            const skuInProductIndex = product.productSKUs.findIndex(s => s.id === sku!.id);
            if (skuInProductIndex !== -1) {
              product.productSKUs[skuInProductIndex] = sku;
            } else {
               // This branch should ideally not be hit if sku was created above
              product.productSKUs.push(sku);
            }
            tempProducts[productIndex] = product;

          } else if (itemData.productId.startsWith('SERVICE_ITEM_')) {
            // Service items don't affect inventory
            billItemCostPrice = billData.type === 'buy' ? itemData.costPrice : 0;
            billItemSellPrice = itemData.sellPrice;
          }

          newBillItems.push({
            id: generateId(),
            productName: product?.name || itemData.productName || 'Unknown Product',
            productId: itemData.productId,
            quantity: itemData.quantity,
            costPrice: billItemCostPrice,
            sellPrice: billItemSellPrice,
            isDefective: itemData.isDefective,
            selectedVariantOptions: itemData.selectedVariantOptions,
          });
        }

        if (productsUpdated) {
          set({ products: tempProducts });
        }

        let totalAmount = 0;
        newBillItems.forEach(item => {
          totalAmount += item.quantity * item.sellPrice; // Sales/Return value based on sellPrice
          if (billData.type === 'buy') { // Expense bill total is based on costPrice
            totalAmount = newBillItems.reduce((acc, buyItem) => acc + (buyItem.quantity * buyItem.costPrice),0);
          }
        });

        const staffMember = billData.billedByStaffId ? get().getStaffById(billData.billedByStaffId) : undefined;
        const storeLocation = billData.storeId ? get().getStoreById(billData.storeId) : undefined;

        const newBill: Bill = {
          id: newBillId,
          type: billData.type,
          date: currentDate.toISOString(),
          timestamp: billTimestamp,
          vendorOrCustomerName: billData.vendorOrCustomerName,
          customerPhone: billData.customerPhone,
          items: newBillItems,
          totalAmount,
          notes: billData.notes,
          paymentStatus: billData.paymentStatus,
          billedByStaffId: staffMember?.id,
          billedByStaffName: staffMember?.name,
          storeId: storeLocation?.id,
          storeName: storeLocation?.name,
        };

        set((state) => ({ bills: [newBill, ...state.bills] }));
        return newBill;
      },
      deleteBill: (billId: string) => {
        // Note: Deleting a bill does NOT revert stock changes for FIFO. That's complex.
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== billId),
        }));
      },
      getBillById: (billId) => get().bills.find((b) => b.id === billId),
      getRecentBills: (limit: number) => {
        return [...get().bills]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
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
                expenses += bill.totalAmount; // Expense bills total is based on cost
              }
            }
          });
          dailyData.unshift({ date: dateStr, sales, expenses });
        }
        return dailyData;
      },
      getTopSellingProductsByRevenue: (limit) => {
        const bills = get().bills;
        const productRevenue: Record<string, { name: string; revenue: number }> = {};

        bills.forEach(bill => {
          if (bill.type === 'sell') {
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return;
              const productNameForItem = item.productName || get().getProductById(item.productId)?.name || 'Unknown Product';
              if (!productRevenue[productNameForItem]) {
                productRevenue[productNameForItem] = { name: productNameForItem, revenue: 0 };
              }
              productRevenue[productNameForItem].revenue += item.sellPrice * item.quantity;
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
          const potentialRevenue = bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
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
          const totalCost = bill.totalAmount; // Expense bill total is cost
          const potentialRevenue = bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
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

      addChatMessage: (storeId, senderId, senderName, text) => {
        const newMessage: ChatMessage = {
          id: generateId(),
          storeId,
          senderId,
          senderName,
          text,
          timestamp: Date.now(),
        };
        set((state) => {
          const existingMessages = state.messagesByStore[storeId] || [];
          return {
            messagesByStore: {
              ...state.messagesByStore,
              [storeId]: [...existingMessages, newMessage],
            },
          };
        });
      },
      getMessagesForStore: (storeId) => {
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

          const defaultStateSnapshot: Partial<InventoryState> = {
            products: [],
            bills: [],
            categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)),
            staffs: [],
            stores: [],
            userProfile: { ...defaultUserProfile },
            messagesByStore: {}
          };

          (Object.keys(defaultStateSnapshot) as Array<keyof InventoryState>).forEach(key => {
            if (typeof state[key] === 'undefined' || state[key] === null || (Array.isArray(defaultStateSnapshot[key]) && !Array.isArray(state[key]))) {
              (state as any)[key] = (defaultStateSnapshot as any)[key];
              storeUpdated = true;
            }
          });
          
          if (!state.userProfile || typeof state.userProfile !== 'object') {
            state.userProfile = { ...defaultUserProfile };
            storeUpdated = true;
          } else {
            if (!state.userProfile.companyName || typeof state.userProfile.companyName !== 'string' || state.userProfile.companyName.trim() === '') {
              state.userProfile.companyName = DEFAULT_COMPANY_NAME;
              storeUpdated = true;
            }
            const currentSubId = state.userProfile.activeSubscriptionId;
            const isValidSubId = SUBSCRIPTION_PLANS.some(plan => plan.id === currentSubId);
            if (!currentSubId || !isValidSubId) {
              state.userProfile.activeSubscriptionId = SUBSCRIPTION_PLAN_IDS.BASIC_ADMIN;
              storeUpdated = true;
            }
          }

          if (Array.isArray(state.products)) {
            state.products = state.products.map(p_any => {
              if (!p_any || typeof p_any !== 'object' || !p_any.id || !p_any.name) {
                storeUpdated = true;
                return null;
              }
              const p = p_any as Product;
              p.variants = Array.isArray(p.variants) ? p.variants : [];
              p.productSKUs = Array.isArray(p.productSKUs) ? p.productSKUs.map(sku => ({
                ...sku,
                stockLayers: Array.isArray(sku.stockLayers) ? sku.stockLayers : []
              })) : [];
              
              // Migration from old Product structure (costPrice, sellPrice, quantityInStock at ProductSKU level)
              // to new structure (stockLayers array in ProductSKU)
              if (p.productSKUs.some(sku => sku.hasOwnProperty('costPrice') && !sku.hasOwnProperty('stockLayers'))) {
                p.productSKUs = p.productSKUs.map(oldSku => {
                  const oldData = oldSku as any; // Cast to access old properties
                  if (oldData.hasOwnProperty('costPrice') && oldData.hasOwnProperty('sellPrice') && oldData.hasOwnProperty('quantityInStock')) {
                    const newSku: ProductSKU = {
                      id: oldSku.id,
                      optionValues: oldSku.optionValues,
                      skuIdentifier: oldSku.skuIdentifier || getSkuIdentifier(p.name, oldSku.optionValues),
                      stockLayers: oldData.quantityInStock > 0 ? [{
                        id: generateId(),
                        purchaseBillId: 'migrated_initial',
                        purchaseDate: new Date(0).toISOString(), // Epoch date for migrated
                        quantity: oldData.quantityInStock,
                        costPrice: oldData.costPrice,
                        sellPrice: oldData.sellPrice,
                      }] : []
                    };
                    delete (newSku as any).costPrice;
                    delete (newSku as any).sellPrice;
                    delete (newSku as any).quantityInStock;
                    storeUpdated = true;
                    return newSku;
                  }
                  return { ...oldSku, stockLayers: oldSku.stockLayers || [] };
                });
              }
              return p;
            }).filter(p => p !== null) as Product[];
          } else {
            state.products = []; // Default to empty if not array
            storeUpdated = true;
          }

          DEFAULT_CATEGORIES.forEach(catName => {
            if(!get().categories.find(c => c.name.toLowerCase() === catName.toLowerCase())) {
              get().addCategory(catName); storeUpdated = true;
            }
          });

          if (storeUpdated) {
            set({ ...state });
          }
        } catch (error) {
          console.error("Critical error during inventory store hydration, resetting to defaults:", error);
          set({
            products: [],
            bills: [],
            categories: initialCategories.sort((a, b) => a.name.localeCompare(b.name)),
            staffs: [],
            stores: [],
            userProfile: { ...defaultUserProfile },
            messagesByStore: {}
          });
        }
      }
    }),
    {
      name: 'stockflow-inventory-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrate();
      }
    }
  )
);

// Call _hydrate once when the store is initialized client-side
if (typeof window !== 'undefined') {
  useInventoryStore.getState()._hydrate();
}
