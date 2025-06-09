
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Bill, BillItem, Category, ProductVariant as ProductVariantType, Staff, Store, UserProfile, SubscriptionPlan, ProductSKU, BillMode, ChatMessage, StockLayer, ProductOption, FinancialSummary, TodaysFinancialSummary } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, startOfDay, isToday } from 'date-fns';
import { DEFAULT_CATEGORIES, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS, DEFAULT_COMPANY_NAME } from '@/lib/constants';

import {} from '@/api/productHandler'
import {addStoreToServer, updateStoreToServer, deleteStoreToServer, getAllStoresToServer, getStoreByIdToServer} from '../api/storeHandler'
import { addStaffToServer, updateStaffToServer, deleteStaffToServer, getStaffByIdToServer, getAllStaffToServer } from '@/api/staffHandler';
import { addProductToServer, updateProductToServer, deleteProductToServer, getProductByIdToServer, getAllProductsToServer, searchProductsToServer } from '@/api/productHandler';
import {addBillToServer, deleteBillFromServer, getBillByIdFromServer, getAllBillsFromServer, getBillsForProductFromServer} from '../api/billHandler'

// const generateId = () => uuidv4(); 
// uuidv4 collides in developement probably by improper caching, using DDMMYYHHMMSS instead.
const generateId = () => { // Replaced 'uuidv4()' with DDMMYYHHMMSS to resolve collision/reuse issue
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    pad(now.getDate()) +
    pad(now.getMonth() + 1) +
    now.getFullYear().toString().slice(2) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
};


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
  staffs: Staff[];
  stores: Store[];
  userProfile: UserProfile;
  messagesByStore: Record<string, ChatMessage[]>;

  // Product methods
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs'>> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number }) => void;
  deleteProduct: (productId: string) => void;
  getProductById: (productId: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  searchProducts: (searchTerm: string) => Product[];
  getLowStockProductCount: (threshold: number) => number;
  findOrCreateProductSKU: (productId: string, optionValues: Record<string, string>) => ProductSKU | undefined;
  getSkuDetails: (sku: ProductSKU | undefined, targetStoreId?: string) => { totalStock: number | null; currentSellPrice: number | null; averageCostPrice: number | null; skuIdentifier?: string; };
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
  addStaff: (staffData: Omit<Staff, 'id'>) => Promise<Staff | null>;
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
  getTopProfitableProducts: (limit: number) => ProductProfitabilityData[];


  // Chat methods
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
  activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.STARTER, // Default to Starter plan
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
        if (!productName) return "Unknown Product";
        if (!optionValues || Object.keys(optionValues).length === 0) return productName;
        const sortedOptionsString = Object.entries(optionValues)
          .filter(([, value]) => typeof value === 'string')
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([, value]) => value)
          .join(' - ');
        return sortedOptionsString ? `${productName} (${sortedOptionsString})` : productName;
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
          name: productData.name, category: productData.category,
          trackQuantity: productData.trackQuantity, sku: productData.sku,
          expiryDate: productData.expiryDate, description: productData.description,
          variants: productVariants,
        };

        const newProduct: Product = {
          ...newProductBase,
          id: generateId(),
          imageUrl: `https://placehold.co/100x100.png?text=${encodeURIComponent(productData.name.substring(0,10))}&font=roboto`,
          productSKUs: [],
        };

        if ((!productVariants || productVariants.length === 0)) {
            const skuIdentifier = get().getSkuIdentifier(newProduct.name, {});
            const defaultSku: ProductSKU = {
                id: generateId(), optionValues: {}, skuIdentifier: skuIdentifier,
                stockLayers: [],
            };
            if (newProduct.trackQuantity === false) {
                defaultSku.stockLayers.push({
                    id: generateId(), purchaseBillId: 'INITIAL_SETUP_NON_TRACKED', purchaseDate: new Date().toISOString(),
                    initialQuantity: 0, quantity: 0,
                    costPrice: productData.costPriceForNonTracked ?? 0,
                    sellPrice: productData.sellPriceForNonTracked ?? 0,
                });
            }
            newProduct.productSKUs.push(defaultSku);
        }

        // addProductToServer(newProduct)
        set((state) => ({ products: [...state.products, newProduct] }));
        if (productData.category && !get().categories.find(c => c.name.toLowerCase() === productData.category!.toLowerCase())) {
          get().addCategory(productData.category!);
        }
        return newProduct;
      },

      updateProduct: (productId, productData) => {
        updateProductToServer(productId, productData)

        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              const updatedProduct: Product = { ...p, ...productData } as Product;

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

              updatedProduct.productSKUs = updatedProduct.productSKUs.map(sku => ({
                ...sku,
                skuIdentifier: get().getSkuIdentifier(updatedProduct.name, sku.optionValues)
              }));

              if (updatedProduct.trackQuantity === false && (!updatedProduct.variants || updatedProduct.variants.length === 0)) {
                let defaultSku = updatedProduct.productSKUs.find(sku => Object.keys(sku.optionValues).length === 0);
                const costPrice = productData.costPriceForNonTracked ?? 0;
                const sellPrice = productData.sellPriceForNonTracked ?? 0;

                if (defaultSku) {
                  if (defaultSku.stockLayers.length > 0) {
                    defaultSku.stockLayers[0].costPrice = costPrice;
                    defaultSku.stockLayers[0].sellPrice = sellPrice;
                    defaultSku.stockLayers[0].quantity = 0;
                    defaultSku.stockLayers[0].initialQuantity = 0;
                  } else {
                    defaultSku.stockLayers.push({
                        id: generateId(), purchaseBillId: 'UPDATED_NON_TRACKED', purchaseDate: new Date().toISOString(),
                        initialQuantity: 0, quantity: 0, costPrice, sellPrice,
                    });
                  }
                   defaultSku.skuIdentifier = get().getSkuIdentifier(updatedProduct.name, defaultSku.optionValues);
                } else {
                  defaultSku = {
                    id: generateId(), optionValues: {}, skuIdentifier: get().getSkuIdentifier(updatedProduct.name, {}),
                    stockLayers: [{
                      id: generateId(), purchaseBillId: 'CREATED_NON_TRACKED', purchaseDate: new Date().toISOString(),
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
        // deleteProductToServer(productId)
        set((state) => {
          const updatedProducts = state.products.filter((p) => p.id !== productId);
          const updatedBills = state.bills.map(bill => {
            const items = bill.items.filter(item => item.productId !== productId);
            if (items.length === 0 && bill.items.length > 0) {
              return { ...bill, items, totalAmount: 0 };
            }
            const totalAmount = items.reduce((acc, item) => acc + ((bill.type === 'buy' ? item.costPrice : item.sellPrice) * item.quantity), 0);
            return { ...bill, items, totalAmount };
          }).filter(bill => bill !== null) as Bill[];
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

      getSkuDetails: (sku, targetStoreId) => {
        const products = get().products;
        const product = products.find(p => p.productSKUs.some(s => s.id === sku?.id));
        const skuIdentifier = sku?.skuIdentifier || (sku && product ? get().getSkuIdentifier(product.name, sku.optionValues) : undefined);

        if (!sku || !Array.isArray(sku.stockLayers) || !product) {
          return { totalStock: 0, currentSellPrice: null, averageCostPrice: null, skuIdentifier };
        }

        const relevantStockLayers = sku.stockLayers.filter(layer => layer.storeId === targetStoreId);

        if (product.trackQuantity === false) {
          const priceLayer = sku.stockLayers.find(layer => layer.storeId === targetStoreId) || sku.stockLayers[0]; // Non-tracked items store their price on layers
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

      addBill: (billData, billItemsData) => {
        const currentDate = new Date();
        const billTimestamp = currentDate.getTime();
        const newBillId = format(currentDate, 'ddMMyyHHmmss');
        const newBillItems: BillItem[] = [];
        let tempProducts = JSON.parse(JSON.stringify(get().products)) as Product[];
        let productsUpdated = false;
        const storeIdForBill = billData.storeId;

        for (const itemData of billItemsData) {
          const productIndex = tempProducts.findIndex(p => p.id === itemData.productId);

          if (productIndex === -1 && !itemData.productId.startsWith('SERVICE_ITEM_')) {
            console.error(`Product not found for ID: ${itemData.productId} in addBill. Skipping item.`);
            continue;
          }
          const product = productIndex !== -1 ? tempProducts[productIndex] : null;

          if (billData.type === 'buy' && product && product.trackQuantity === false) {
             console.error(`Attempt to add non-tracked product ${product.name} to expense bill.`);
             return null;
          }

          let sku: ProductSKU | undefined = undefined;
          let billItemCostPrice = typeof itemData.costPrice === 'number' ? itemData.costPrice : 0;
          let billItemSellPrice = typeof itemData.sellPrice === 'number' ? itemData.sellPrice : 0;
          let itemProductNameForBill = product?.name || (itemData.productId.startsWith('SERVICE_ITEM_') ? (itemData.productName || 'Service/Charge') : 'Unknown Product');

          if (product) {
            const selectedOpts = itemData.selectedVariantOptions || {};
            const currentProductRef = tempProducts[productIndex]; // Use the one from tempProducts
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


            if (billData.type === 'buy') {
              if (!currentProductRef.trackQuantity) {
                console.error(`Attempt to add non-tracked product ${currentProductRef.name} to expense bill (should be caught earlier).`);
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

                  // Update the original layer in tempProducts
                  const originalSku = tempProducts[productIndex].productSKUs.find(s => s.id === sku!.id);
                  const originalLayer = originalSku?.stockLayers.find(l => l.id === layer.id);
                  if (originalLayer) {
                    originalLayer.quantity -= sellFromThisLayer;
                  }

                  quantityToSell -= sellFromThisLayer;
                  productsUpdated = true;
                }
                if (quantityToSell > 0) {
                  console.error(`Stock ran out for ${itemProductNameForBill} at store ${storeIdForBill}. Remaining to sell: ${quantityToSell}`);
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
                  costPrice: billItemCostPrice,
                  sellPrice: billItemSellPrice,
                  storeId: storeIdForBill,
                };
                sku.stockLayers.push(returnLayer);
                productsUpdated = true;
              }
            }
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
        // addBillToServer(newBill, newBillItems )
        set((state) => ({ bills: [newBill, ...state.bills].sort((a,b) => b.timestamp - a.timestamp) }));
        return newBill;
      },
      deleteBill: (billId: string) => {
        // deleteBillFromServer(billId)
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== billId),
        }));
      },
      getBillById: (billId: string) => {
        // getBillByIdFromServer(billId);
        return get().bills.find((b) => b.id === billId);
      },
      
      getRecentBills: (limit: number) => {
        return [...get().bills].slice(0, limit);
      },
      
      getBillsForProduct: (productId: string) => {
        // getBillsForProductFromServer(productId);
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

      addStaff: async (staffData) => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan || get().staffs.length >= plan.maxEmployees) return null;
        const newStaff: Staff = { id: generateId(), ...staffData };
        console.log('id', newStaff.id)
        const registeredResponse = await addStaffToServer(newStaff)
        console.log('Registered Response ', registeredResponse)
        if(registeredResponse.success){
          set((state) => ({ staffs: [...state.staffs, newStaff] }));
          return newStaff;
        } 
        throw new Error(registeredResponse.message || 'Failed to register staff');
      },
      updateStaff: (staffId, staffData) => {
        updateStaffToServer(staffId, staffData)
        set((state) => ({
          staffs: state.staffs.map((s) => (s.id === staffId ? { ...s, ...staffData } : s)),
        }));
      },
      deleteStaff: (staffId: string) => {
        deleteStaffToServer(staffId)
         set((state) => ({
          staffs: state.staffs.filter((s) => s.id !== staffId),
          stores: state.stores.map(store => ({
            ...store,
            allowedStaffIds: store.allowedStaffIds.filter(id => id !== staffId)
          }))
        }));
      },

      getStaffById: async (staffId) => {
        let staff = get().staffs.find((s) => s.id === staffId);
        if (!staff) {
          // fetch from server
          const response = await getStaffByIdToServer(staffId);
          if (response.success && response.data) {
            staff = response.data;
            set((state) => ({
              staffs: [...state.staffs.filter(s => s.id !== staffId), staff],
            }));
          }
        }
        return staff || null;
      },
      
      getAllStaff: async () => {
        console.log('Getting all staffs')
        let staffs = get().staffs;
        if (!staffs || staffs.length === 0) {
          const response = await getAllStaffToServer();
          if (response.success && response.data) {
            staffs = response.data;
            set(() => ({ staffs }));
          }
        }
        return staffs || [];
      },
      
      getStaffDetailsByIds: async (staffIds) => {
        const allStaff = get().staffs;
        const foundStaffs = staffIds.map(id => allStaff.find(s => s.id === id)).filter(Boolean);
        if (foundStaffs.length !== staffIds.length) {
          // fetch all from server as fallback (or implement batch fetch)
          const response = await getAllStaffToServer();
          if (response.success && response.data) {
            set(() => ({ staffs: response.data }));
            return staffIds.map(id => response.data.find(s => s.id === id)).filter(Boolean);
          }
        }
        return foundStaffs;
      },
      
      // getStaffById: (staffId) => get().staffs.find((s) => s.id === staffId),
      // getAllStaff: () => get().staffs,
      // getStaffDetailsByIds: (staffIds: string[]) => {
      //   const allStaff = get().staffs;
      //   return staffIds.map(id => allStaff.find(s => s.id === id)).filter(s => !!s) as Staff[];
      // },
// Add Store

      addStore: (storeData) => {
        const plan = get().getActiveSubscriptionPlan();
        if (!plan || get().stores.length >= plan.maxStores) return null;
        const newStore: Store = {
          id: generateId(),
          ...storeData,
          allowedOperations: storeData.allowedOperations || ['sell', 'buy', 'return']
        };
        addStoreToServer(newStore)
        set((state) => ({ stores: [...state.stores, newStore] }));
        return newStore;
      },

// Update Store
      updateStore: (storeId, storeData) => {
        // updateStoreToServer(storeId, storeData)
        set((state) => ({
          stores: state.stores.map((s) => (s.id === storeId ? { ...s, ...storeData } : s)),
        }));
      },


      deleteStore: (storeId: string) => {
        // deleteStoreToServer(storeId)
         set((state) => ({
          stores: state.stores.filter((s) => s.id !== storeId),
          staffs: state.staffs.map(staff => ({
            ...staff,
            accessibleStoreIds: staff.accessibleStoreIds.filter(id => id !== storeId)
          }))
        }));
      },

      // getStoreById: (storeId) => get().stores.find((s) => s.id === storeId),
      // getAllStores: () => get().stores,

      getStoreById: (storeId) => {
        return get().stores.find((s) => s.id === storeId);
      },
      getAllStores: () => {
        console.log('Fetching all stores');
        // const st = getAllStoresToServer()
        // console.log('st', st)
        return get().stores;
      },

      // getStoreById: async (storeId) => {
      //   const localStore = get().stores.find(s => s.id === storeId);
      //   console.log('Local store ' , localStore)
      //   if (localStore) return localStore;
      
      //   // Fetch from server
      //   try {
      //     const response = await getStoreByIdToServer(storeId); // Your API call
      //     if (response.success && response.data) {
      //       set(state => ({ stores: [...state.stores, response.data] }));
      //       return response.data;
      //     }
      //     return null;
      //   } catch {
      //     return null;
      //   }
      // },
      
      // getAllStores: async () => {
      //   console.log('getAllStores called');
      
      //   const localStores = get().stores;
      //   if (localStores.length > 0) {
      //     console.log('✅ Returning stores from local cache:', localStores);
      //     console.log(' local stores ', localStores)
      //     return localStores;
      //   }
      
      //   console.log('📡 Local stores empty. Fetching from server...');
      //   try {
      //     const response = await getAllStoresToServer();
      //     console.log('🌐 Server response received:', response);
      
      //     if (response.success && response.data) {
      //       console.log('✅ Stores fetched from server:', response.data);
      //       set({ stores: response.data });
      //       return response.data;
      //     } else {
      //       console.warn('⚠️ Server responded without valid data');
      //       return [];
      //     }
      //   } catch (error) {
      //     console.error('❌ Error fetching stores from server:', error);
      //     return [];
      //   }
      // },
      
      
      
      updateCompanyName: (name: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, companyName: name || DEFAULT_COMPANY_NAME }}));
      },
      updateSubscription: (planId: string) => {
        set((state) => ({ userProfile: { ...state.userProfile, activeSubscriptionId: planId }}));
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
            const totalStock = product.productSKUs.reduce((sum, sku) => sum + (get().getSkuDetails(sku, undefined).totalStock ?? 0), 0); // Global low stock check
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
          const potentialRevenue = bill.items.reduce((acc, item) => {
             const product = get().getProductById(item.productId);
             if (product && product.trackQuantity === false) {
                const defaultSku = product.productSKUs.find(s => Object.keys(s.optionValues).length === 0);
                const skuDetails = get().getSkuDetails(defaultSku, bill.storeId); // Use bill's store context
                return acc + ((skuDetails.currentSellPrice ?? 0) * item.quantity);
             }
             // For tracked items, item.sellPrice on an expense bill is the intended sell price for that batch's stock layer
             return acc + ((item.sellPrice ?? 0) * item.quantity);
          }, 0);
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
      getOverallFinancialSummary: (): FinancialSummary => {
        const bills = get().bills;
        let totalRevenue = 0; let totalCOGS = 0; let totalExpenses = 0;

        bills.forEach(bill => {
          if (bill.type === 'sell') {
            totalRevenue += bill.totalAmount;
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return;
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
        let totalRevenue = 0; let totalCOGS = 0; let totalExpenses = 0;
        let transactionsToday = 0; let defectivesToday = 0;

        bills.forEach(bill => {
          transactionsToday++;
          if (bill.type === 'sell') {
            totalRevenue += bill.totalAmount;
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return;
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

      getTopProfitableProducts: (limit: number): ProductProfitabilityData[] => {
        const productFinancials: Record<string, { name: string; revenue: number; cogs: number; profit: number }> = {};
        get().bills.forEach(bill => {
          if (bill.type === 'sell') {
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return;
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
            const currentSubId = state.userProfile.activeSubscriptionId;
            const isValidSubId = SUBSCRIPTION_PLANS.some(plan => plan.id === currentSubId);
            if (!currentSubId || !isValidSubId) {
              state.userProfile.activeSubscriptionId = SUBSCRIPTION_PLAN_IDS.STARTER;
              storeUpdated = true;
            }
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
                    layer.storeId = layer.storeId || undefined; // Ensure storeId exists
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
                  // if old structure had direct price/stock, migrate to a stock layer for non-tracked
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
              bill.items = Array.isArray(bill.items) ? bill.items.map(item_any => {
                if (!item_any || typeof item_any !== 'object') return null;
                const item = { ...item_any } as BillItem;
                item.costPrice = typeof item.costPrice === 'number' ? item.costPrice : 0;
                item.sellPrice = typeof item.sellPrice === 'number' ? item.sellPrice : 0;
                item.quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
                item.productName = item.productName || 'Unknown Item';
                return item;
              }).filter(item => item !== null) : [];
              bill.totalAmount = typeof bill.totalAmount === 'number' ? bill.totalAmount : 0;
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
          state.staffs = state.staffs.map(s => (s && typeof s === 'object' ? s : null)).filter(s => s !== null) as Staff[];

          if(!Array.isArray(state.stores)) { state.stores = []; storeUpdated = true;}
          state.stores = state.stores.map(s_any => {
            if (!s_any || typeof s_any !== 'object') return null;
            const s = { ...s_any } as Store;
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
