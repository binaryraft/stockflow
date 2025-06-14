
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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

  // Product methods
  addProduct: (productData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'companyId'> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number, companyId: string }) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs' | 'companyId'>> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number }) => void;
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
    billData: Omit<Bill, 'id' | 'date' | 'timestamp' | 'totalAmount' | 'items' | 'billedByStaffName' | 'storeName' | 'companyId' | 'subTotal' | 'totalSGST' | 'totalCGST'> & { billedByStaffId?: string; storeId?: string; companyId: string; isEstimate?: boolean },
    items: Omit<BillItem, 'id'|'productName'|'sgstAmount'|'cgstAmount'>[]
  ) => Bill | null;
  deleteBill: (billId: string) => void;
  getBillById: (billId: string) => Bill | undefined;
  updateBillNonCriticalDetails: (billId: string, details: { paymentStatus?: Bill['paymentStatus'], notes?: string }) => void;
  getRecentBills: (limit: number) => Bill[];
  getBillsForProduct: (productId: string) => Bill[];


  // Category methods
  addCategory: (categoryName: string) => Category;
  searchCategories: (searchTerm: string) => string[];

  // Staff (User) methods
  addStaff: (staffData: Omit<User, 'id' | 'role'> & {companyId: string}) => User | null; 
  updateStaff: (staffId: string, staffData: Partial<Omit<User, 'id' | 'role' | 'companyId'>>) => void;
  deleteStaff: (staffId: string) => void;
  getStaffById: (staffId: string) => User | undefined; 
  getAllStaff: () => User[]; 
  getStaffDetailsByIds: (staffIds: string[]) => User[]; 

  // Store methods
  addStore: (storeData: Omit<Store, 'id' | 'companyId'> & {companyId: string}) => Store | null;
  updateStore: (storeId: string, storeData: Partial<Omit<Store, 'id' | 'companyId'>>) => void;
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
  getDailySalesAndExpenses: (days: number, companyId?: string) => Array<{ date: string; sales: number; expenses: number }>;
  getTopSellingProductsByRevenue: (limit: number, companyId?: string) => Array<{ name: string; revenue: number }>;
  getRecentExpenseBillsWithPotentialCoverage: (limit: number, companyId?: string) => ExpenseBillWithCoverage[];
  getExpenseSummaryStats: (companyId?: string) => ExpenseSummary;
  getOverallFinancialSummary: (companyId?: string) => FinancialSummary;
  getTodaysFinancialSummary: (companyId?: string) => TodaysFinancialSummary;
  getTopProfitableProducts: (limit: number, companyId?: string) => ProductProfitabilityData[];
  getProductLedgerSummary: (params?: { companyId?: string, startDate?: Date, endDate?: Date }) => ProductLedgerEntry[];


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
  activeSubscriptionId: SUBSCRIPTION_PLAN_IDS.STARTER,
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
          companyId: productData.companyId,
          sgstRate: productData.sgstRate,
          cgstRate: productData.cgstRate,
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
              const updatedProduct: Product = { ...p, ...productData, companyId: p.companyId } as Product; 

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
        set((state) => {
          const updatedProducts = state.products.filter((p) => p.id !== productId);
          return { products: updatedProducts };
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

      addBill: (billData, billItemsData) => {
        const currentDate = new Date();
        const billTimestamp = currentDate.getTime();
        const newBillId = format(currentDate, 'ddMMyyHHmmss');
        const newBillItems: BillItem[] = [];
        let tempProducts = JSON.parse(JSON.stringify(get().products)) as Product[];
        let productsUpdated = false;
        const storeIdForBill = billData.storeId;
        const companyIdForBill = billData.companyId;
        const isSalesEstimate = billData.type === 'sell' && billData.isEstimate === true;

        let billSubTotal = 0;
        let billTotalSGST = 0;
        let billTotalCGST = 0;

        for (const itemData of billItemsData) {
          const productIndex = tempProducts.findIndex(p => p.id === itemData.productId && p.companyId === companyIdForBill);
          let product = productIndex !== -1 ? tempProducts[productIndex] : null;
          
          if (!product && !itemData.productId.startsWith('SERVICE_ITEM_')) {
            console.error(`Product not found for ID: ${itemData.productId} in company ${companyIdForBill}. Skipping item.`);
            continue;
          }

          if (billData.type === 'buy' && product && product.trackQuantity === false) {
             console.error(`Attempt to add non-tracked product ${product.name} to expense bill.`);
             return null;
          }

          let sku: ProductSKU | undefined = undefined;
          let billItemCostPrice = typeof itemData.costPrice === 'number' ? itemData.costPrice : 0;
          let billItemSellPrice = typeof itemData.sellPrice === 'number' ? itemData.sellPrice : 0; // This is pre-tax sell price
          let itemProductNameForBill = product?.name || (itemData.productId.startsWith('SERVICE_ITEM_') ? (itemData.productName || 'Service/Charge') : 'Unknown Product');
          let itemSgstAmount = 0;
          let itemCgstAmount = 0;

          if (product) {
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

            if (billData.type === 'sell' && !isSalesEstimate) {
                const itemSubTotal = billItemSellPrice * itemData.quantity;
                const sgstRate = currentProductRef.sgstRate || 0;
                const cgstRate = currentProductRef.cgstRate || 0;
                itemSgstAmount = (itemSubTotal * sgstRate) / 100;
                itemCgstAmount = (itemSubTotal * cgstRate) / 100;
            }


            if (billData.type === 'buy') {
              if (!currentProductRef.trackQuantity) {
                console.error(`Attempt to add non-tracked product ${currentProductRef.name} to expense bill (should be caught earlier).`);
                return null;
              }
              const newLayer: StockLayer = {
                id: generateId(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
                initialQuantity: itemData.quantity, quantity: itemData.quantity,
                costPrice: billItemCostPrice, sellPrice: billItemSellPrice, // sellPrice here is for the batch
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
                  console.error(`Stock ran out for ${itemProductNameForBill} at store ${storeIdForBill}. Remaining to sell: ${quantityToSell}`);
                  return null; 
                }
                billItemCostPrice = itemData.quantity > 0 ? costOfGoodsSoldThisItem / itemData.quantity : 0;
              } else { // Non-tracked product sale
                const skuDetails = get().getSkuDetails(sku, storeIdForBill);
                billItemCostPrice = skuDetails.averageCostPrice ?? 0;
              }
            } else if (billData.type === 'return') {
              const skuDetails = get().getSkuDetails(sku, storeIdForBill);
              billItemCostPrice = skuDetails.averageCostPrice ?? 0; // For COGS adjustment if applicable
              if (currentProductRef.trackQuantity && !itemData.isDefective) {
                const returnLayer: StockLayer = {
                  id: generateId(), purchaseBillId: newBillId, purchaseDate: currentDate.toISOString(),
                  initialQuantity: itemData.quantity, quantity: itemData.quantity,
                  costPrice: billItemCostPrice, // Use average cost as new cost for this restocked layer
                  sellPrice: billItemSellPrice, // Use the return price as the new sell price for this layer
                  storeId: storeIdForBill,
                };
                sku.stockLayers.push(returnLayer);
                productsUpdated = true;
              }
            }
          } else if (itemData.productId.startsWith('SERVICE_ITEM_')) { // Service Item
            billItemCostPrice = billData.type === 'buy' ? (itemData.costPrice ?? 0) : 0;
            billItemSellPrice = itemData.sellPrice ?? 0;
            // Services generally don't have product-specific GST rates; they might have a general service tax rate
            // For simplicity, we are not applying product-level SGST/CGST to ad-hoc service items here.
            // A more advanced system might allow specifying tax rates for services too.
          }

          newBillItems.push({
            id: generateId(), productName: itemProductNameForBill,
            productId: itemData.productId, quantity: itemData.quantity,
            costPrice: billItemCostPrice, sellPrice: billItemSellPrice,
            isDefective: itemData.isDefective, selectedVariantOptions: itemData.selectedVariantOptions,
            sgstAmount: itemSgstAmount, cgstAmount: itemCgstAmount,
          });

          billSubTotal += billItemSellPrice * itemData.quantity;
          billTotalSGST += itemSgstAmount;
          billTotalCGST += itemCgstAmount;
        }

        if (productsUpdated) {
          set({ products: tempProducts });
        }

        let grandTotalAmount = 0;
        if (billData.type === 'buy') { // Expense bills are based on cost price, no GST in this prototype for purchases
          grandTotalAmount = newBillItems.reduce((acc, buyItem) => acc + (buyItem.quantity * (buyItem.costPrice || 0)), 0);
          // For buy bills, subTotal and tax totals are typically not stored this way, as it's an expense.
          // We'll store the grandTotalAmount as the totalAmount for simplicity.
          billSubTotal = grandTotalAmount;
          billTotalSGST = 0;
          billTotalCGST = 0;
        } else if (billData.type === 'sell') {
            if (isSalesEstimate) {
                grandTotalAmount = billSubTotal; // No tax for estimates
                billTotalSGST = 0;
                billTotalCGST = 0;
            } else {
                grandTotalAmount = billSubTotal + billTotalSGST + billTotalCGST;
            }
        } else { // Return bills
            grandTotalAmount = billSubTotal; // Returns are based on sell price, tax implications handled by reversal (not in this simple model)
            billTotalSGST = 0; // Assuming returns don't add new tax, but reverse original.
            billTotalCGST = 0;
        }


        const staffUser = billData.billedByStaffId ? get().getStaffById(billData.billedByStaffId) : undefined;
        const storeLocation = billData.storeId ? get().getStoreById(billData.storeId) : undefined;

        const newBill: Bill = {
          id: newBillId, type: billData.type, date: currentDate.toISOString(), timestamp: billTimestamp,
          vendorOrCustomerName: billData.vendorOrCustomerName, customerPhone: billData.customerPhone,
          items: newBillItems, 
          subTotal: billSubTotal,
          totalSGST: billTotalSGST,
          totalCGST: billTotalCGST,
          totalAmount: grandTotalAmount, 
          isEstimate: billData.isEstimate,
          notes: billData.notes, paymentStatus: billData.paymentStatus,
          billedByStaffId: staffUser?.id, billedByStaffName: staffUser?.name,
          storeId: storeLocation?.id, storeName: storeLocation?.name,
          companyId: companyIdForBill,
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
      updateBillNonCriticalDetails: (billId, details) => {
        set((state) => ({
          bills: state.bills.map((bill) =>
            bill.id === billId
              ? {
                  ...bill,
                  paymentStatus: details.paymentStatus !== undefined ? details.paymentStatus : bill.paymentStatus,
                  notes: details.notes !== undefined ? details.notes : bill.notes,
                }
              : bill
          ),
        }));
      },
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
        const newStaff: User = { id: generateId(), role: 'employee', ...staffData };
        set((state) => ({ staffs: [...state.staffs, newStaff] }));
        return newStaff;
      },
      updateStaff: (staffId, staffData) => {
        set((state) => ({
          staffs: state.staffs.map((s) => (s.id === staffId ? { ...s, ...staffData, role: 'employee', companyId: s.companyId } : s)),
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
        return staffIds.map(id => allStaff.find(s => s.id === id)).filter(s => !!s) as User[];
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
          stores: state.stores.map((s) => (s.id === storeId ? { ...s, ...storeData, companyId: s.companyId } : s)),
        }));
      },
      deleteStore: (storeId: string) => {
         set((state) => ({
          stores: state.stores.filter((s) => s.id !== storeId),
          staffs: state.staffs.map(staff => ({
            ...staff,
            assignedStoreIds: (staff.assignedStoreIds || []).filter(id => id !== storeId)
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
          const billDateStr = format(startOfDay(new Date(bill.date)), 'MMM d');
          if (dailyDataMap[billDateStr]) {
            if (bill.type === 'sell' && !bill.isEstimate) { // Only count non-estimate sales bills towards revenue
              dailyDataMap[billDateStr].sales += bill.totalAmount; // totalAmount includes tax
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
          if (bill.type === 'sell' && !bill.isEstimate) { // Only count non-estimate sales
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return;
              const productNameForItem = item.productName || 'Unknown Product';
              if (!productRevenue[productNameForItem]) {
                productRevenue[productNameForItem] = { name: productNameForItem, revenue: 0 };
              }
              // Revenue for top selling should be based on pre-tax sell price
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
             // item.sellPrice in a 'buy' bill item is the sell price set for that batch
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
             // item.sellPrice in a 'buy' bill item is the sell price set for that batch
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
          if (bill.type === 'sell' && !bill.isEstimate) { // Only consider non-estimate sales for financial summary
            totalRevenue += bill.subTotal ?? bill.totalAmount; // Use subTotal if available (pre-tax)
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
            totalRevenue += bill.subTotal ?? bill.totalAmount; // Use subTotal (pre-tax) for revenue
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

      getTopProfitableProducts: (limit: number, companyId): ProductProfitabilityData[] => {
        let billsToConsider = get().bills;
        if (companyId) {
          billsToConsider = billsToConsider.filter(bill => bill.companyId === companyId);
        }
        const productFinancials: Record<string, { name: string; revenue: number; cogs: number; profit: number }> = {};
        billsToConsider.forEach(bill => {
          if (bill.type === 'sell' && !bill.isEstimate) { // Only consider non-estimate sales
            bill.items.forEach(item => {
              if (item.productId.startsWith('SERVICE_ITEM_')) return;
              const skuIdentifier = item.productName;
              if (skuIdentifier && typeof skuIdentifier === 'string') {
                if (!productFinancials[skuIdentifier]) {
                  productFinancials[skuIdentifier] = { name: skuIdentifier, revenue: 0, cogs: 0, profit: 0 };
                }
                // Revenue here should be pre-tax
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

      getProductLedgerSummary: (params): ProductLedgerEntry[] => {
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
            if (productId.startsWith('SERVICE_ITEM_')) return;

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
            } else if (bill.type === 'sell' && !bill.isEstimate) { // Only count non-estimate sales towards sold quantity
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
             state.userProfile.dataMode = state.userProfile.dataMode || 'local';
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
