
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput, type ProductSearchSuggestion } from './product-search-input';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode, ProductSKU, Store, Staff, StockLayer } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw, Edit3, CornerDownLeft, Info, CircleDollarSign, Settings2, Building, LogInIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { BillSaveAnimation } from './bill-save-animation';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { EmployeePasskeyDialog } from './employee-passkey-dialog';

interface NewProductPrefillParams {
  name?: string;
  quantity?: string;
  costPrice?: string;
  sellPrice?: string;
  returnTo?: string;
}

type PendingBillPayload = {
  billType: BillMode;
  vendorOrCustomerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  items: Omit<BillItem, 'id'|'productName'>[]; // productName is derived in addBill
  storeIdForBill?: string; // For admin context
};


interface BillingFormProps {
  storeId?: string; // storeIdFromProp, used in store portal context
  allowedModes?: BillMode[]; // For store portal, restricts available bill types
  initialModeProp?: BillMode | null; // Mode from URL
  isAdminContext?: boolean; // True if rendered in admin section
}

export function BillingForm({
  storeId: storeIdFromProp,
  allowedModes,
  initialModeProp,
  isAdminContext = false,
}: BillingFormProps) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();

  // Store hooks
  const {
    addBill,
    searchProducts,
    getProductById,
    getAllStores,
    findOrCreateProductSKU,
    getSkuDetails,
    getSkuIdentifier,
  } = useInventoryStore(state => ({
    addBill: state.addBill,
    searchProducts: state.searchProducts,
    getProductById: state.getProductById,
    getAllStores: state.getAllStores,
    findOrCreateProductSKU: state.findOrCreateProductSKU,
    getSkuDetails: state.getSkuDetails,
    getSkuIdentifier: state.getSkuIdentifier,
  }));
  const allStores = getAllStores();

  // Refs for focusing inputs
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const sellPriceInputRef = useRef<HTMLInputElement>(null); // For buy mode, setting sell price for the batch
  const customerVendorNameInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);
  const serviceDescriptionInputRef = useRef<HTMLInputElement>(null);
  const serviceAmountInputRef = useRef<HTMLInputElement>(null);
  const variantSelectRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});


  // State for managing current bill mode
  const determineMode = useCallback((): BillMode => {
    const urlMode = initialModeProp || searchParamsHook.get('mode') as BillMode | null;
    if (urlMode && ['sell', 'buy', 'return'].includes(urlMode)) {
        if (!allowedModes || (allowedModes && allowedModes.includes(urlMode))) {
            return urlMode;
        }
    }
    if (allowedModes && allowedModes.length > 0) return allowedModes[0];
    return 'sell'; // Default for admin or if no restrictions
  }, [initialModeProp, allowedModes, searchParamsHook]);

  const [mode, setMode] = useState<BillMode>(determineMode());

  // Admin-specific state for store selection
  const [selectedStoreIdForAdmin, setSelectedStoreIdForAdmin] = useState<string | undefined>(
    isAdminContext && allStores.length === 1 ? allStores[0].id : undefined
  );

  // Item entry form state
  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>(''); // Used in 'buy' mode
  const [sellPrice, setSellPrice] = useState<number | string>(''); // Used in 'buy' to set batch sell price, auto-filled in sell/return
  const [currentSkuStock, setCurrentSkuStock] = useState<number | null>(null); // Stock for current SKU/Layer
  const [currentSkuSellPrice, setCurrentSkuSellPrice] = useState<number | null>(null); // Default/oldest sell price for the SKU
  const [isDisplayingLayerStock, setIsDisplayingLayerStock] = useState(false); // Flag for stock display label

  // Current product and variant selection
  const [currentProductForSelection, setCurrentProductForSelection] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [variantDropdownOpenState, setVariantDropdownOpenState] = useState<Record<string, boolean>>({});

  // Bill-level state
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(true); // For sell/buy modes
  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false); // For return mode

  // UI interaction state
  const [productNotFoundHint, setProductNotFoundHint] = useState('');
  const [isSavingAnimationVisible, setIsSavingAnimationVisible] = useState(false);
  const [lastSavedBillMode, setLastSavedBillMode] = useState<BillMode | null>(null);
  const [isVerifyEmployeeDialogOpen, setIsVerifyEmployeeDialogOpen] = useState(false);
  const [pendingBillPayload, setPendingBillPayload] = useState<PendingBillPayload | null>(null);

  // Service item entry state
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceAmount, setServiceAmount] = useState<number | string>('');

  // Resets individual item entry fields
  const resetFormFields = useCallback((focusProductName = true) => {
    setProductNameQuery('');
    setQuantity(1);
    setCostPrice('');
    setSellPrice('');
    setCurrentSkuStock(null);
    setCurrentSkuSellPrice(null);
    setIsDisplayingLayerStock(false);
    setReturnItemIsDefective(false);
    setCurrentProductForSelection(null);
    setSelectedVariantOptions({});
    setVariantDropdownOpenState({});
    setProductNotFoundHint('');
    if (focusProductName && productNameInputRef.current) {
      setTimeout(() => productNameInputRef.current?.focus(), 0);
    }
  }, []);

  // Resets the entire bill form
  const resetFullForm = useCallback(() => {
    setCurrentBillItems([]);
    setCustomerVendorName('');
    setCustomerPhone('');
    setNotes('');
    setIsPaid(true);
    setServiceDescription('');
    setServiceAmount('');
    resetFormFields(true);
    setPendingBillPayload(null); // Clear any pending data
  }, [resetFormFields]);

  // Effect to sync form mode with URL, ensures remount/reset if mode in URL changes
  useEffect(() => {
    const newDeterminedMode = determineMode();
    if (newDeterminedMode !== mode) {
      setMode(newDeterminedMode);
      resetFullForm(); // Full reset when mode changes
    }
  }, [determineMode, mode, resetFullForm]);

  // Updates displayed SKU info (stock, price) based on selected SKU or after variant changes
  const updateSkuDisplayInfo = useCallback((skuToUse?: ProductSKU) => {
    if (skuToUse && currentProductForSelection) {
      const details = getSkuDetails(skuToUse);
      if(currentProductForSelection.trackQuantity) setCurrentSkuStock(details.totalStock);
      else setCurrentSkuStock(null); // Non-tracked items don't show stock number
      setIsDisplayingLayerStock(false); // This shows total stock for the SKU

      setCurrentSkuSellPrice(details.currentSellPrice);

      if (mode === 'sell' || mode === 'return') {
        setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : '');
      } else if (mode === 'buy') {
          setCostPrice(''); // Clear cost price input for new batch
          setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : ''); // Suggest current, but user will set for new batch
      }
    } else if (currentProductForSelection && !skuToUse) { // Product selected, but no specific SKU (e.g., base product of a variant item)
        setCurrentSkuStock(currentProductForSelection.trackQuantity ? 0 : null);
        setIsDisplayingLayerStock(false);
        setCurrentSkuSellPrice(null);
        setSellPrice('');
        if (mode === 'buy') setCostPrice('');
    } else { // No product selected
      setCurrentSkuStock(null);
      setIsDisplayingLayerStock(false);
      setCurrentSkuSellPrice(null);
      setSellPrice('');
      if (mode === 'buy') setCostPrice('');
    }
  }, [getSkuDetails, mode, currentProductForSelection]);


  // Handler for selecting a product/SKU from the search suggestions
  const handleProductSelectFromSearch = useCallback((suggestion: ProductSearchSuggestion) => {
    const { product, sku, layer } = suggestion;
    setCurrentProductForSelection(product);
    setProductNotFoundHint('');

    const skuDetails = getSkuDetails(sku); // sku is always present in ProductSearchSuggestion
    setProductNameQuery(suggestion.displayInfo.name); // Update input to the detailed suggestion name

    if (layer) {
      setCurrentSkuStock(layer.quantity);
      setIsDisplayingLayerStock(true); // Layer stock is being displayed
      if (typeof layer.sellPrice === 'number') {
        setSellPrice(layer.sellPrice.toString());
      }
      // For currentSkuSellPrice, we might still want to show the SKU's default, or layer's - for now, keep SKU default
      setCurrentSkuSellPrice(skuDetails.currentSellPrice);
    } else {
      setCurrentSkuStock(product.trackQuantity ? skuDetails.totalStock : null);
      setIsDisplayingLayerStock(false); // Total SKU stock is being displayed
      setCurrentSkuSellPrice(skuDetails.currentSellPrice);
      setSellPrice(skuDetails.currentSellPrice !== null ? skuDetails.currentSellPrice.toString() : '');
    }
    
    setSelectedVariantOptions(sku.optionValues || {});

    // Focus logic:
    if (product.variants && product.variants.length > 0 && Object.keys(sku.optionValues).length < product.variants.length) {
      // If variants exist but not all were part of the SKU (e.g., base product suggestion for a variant product)
      const firstVariantId = product.variants[0].id;
      if (firstVariantId) {
        setTimeout(() => {
           setVariantDropdownOpenState({ [firstVariantId]: true });
           const firstVariantRef = variantSelectRefs.current[firstVariantId];
           (firstVariantRef?.current || document.getElementById(`variant-select-${firstVariantId}-trigger`) as HTMLElement)?.focus();
        }, 50);
      }
    } else {
      // All variants selected via SKU, or no variants - focus quantity
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 50);
    }
  }, [getSkuDetails, updateSkuDisplayInfo, setSelectedVariantOptions, setProductNotFoundHint, setCurrentProductForSelection, setSellPrice, setCurrentSkuStock, setIsDisplayingLayerStock]);

  // Effect to handle pre-filling form if navigated from "Add Product" page
  useEffect(() => {
    const newlyAddedProductId = searchParamsHook.get('newlyAddedProductId');
    if (newlyAddedProductId) {
      const product = getProductById(newlyAddedProductId);
      if (product) {
        const firstSku = product.productSKUs && product.productSKUs.length > 0 ? product.productSKUs[0] : undefined;
        const suggestionForNewProduct: ProductSearchSuggestion = {
            product,
            sku: firstSku || { id: product.id + '_default', optionValues: {}, stockLayers: [], skuIdentifier: product.name }, // Fallback
            displayInfo: {
                name: firstSku?.skuIdentifier || product.name,
                stock: firstSku ? getSkuDetails(firstSku).totalStock : (product.trackQuantity ? 0 : null),
                price: firstSku ? (getSkuDetails(firstSku).currentSellPrice?.toFixed(2) || '0.00') : '0.00',
            }
        };
        handleProductSelectFromSearch(suggestionForNewProduct);
      }
      // Clean up URL parameters
      const newParams = new URLSearchParams(searchParamsHook.toString());
      newParams.delete('newlyAddedProductId');
      newParams.delete('name'); newParams.delete('quantity'); newParams.delete('costPrice'); newParams.delete('sellPrice'); newParams.delete('returnTo');
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    }
  }, [searchParamsHook, getProductById, router, pathname, handleProductSelectFromSearch, getSkuDetails]);

  // Initial focus on product name input
  useEffect(() => {
    setTimeout(() => productNameInputRef.current?.focus(), 0);
  }, [mode]); // Re-focus if mode changes

  // Effect to focus the first open variant dropdown
  useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
        const firstOpenVariantId = Object.keys(variantDropdownOpenState).find(id => variantDropdownOpenState[id]);
        if (firstOpenVariantId) {
            const firstVariantRef = variantSelectRefs.current[firstOpenVariantId];
             setTimeout(() => {
                const elToFocus = firstVariantRef?.current || document.getElementById(`variant-select-${firstOpenVariantId}-trigger`);
                (elToFocus as HTMLElement)?.focus();
            }, 100);
        }
    }
  }, [currentProductForSelection, variantDropdownOpenState]); // Rerun if current product or open state changes

  // Effect to update SKU display and focus quantity after all variants are selected
  useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
        const allVariantsSelected = currentProductForSelection.variants.every(
          (v) => selectedVariantOptions[v.name]
        );
        const lastVariantId = currentProductForSelection.variants[currentProductForSelection.variants.length - 1].id;

        if (allVariantsSelected) {
          // Find the SKU that matches the selected options
          const currentSku = currentProductForSelection.productSKUs.find(sku =>
            JSON.stringify(Object.entries(sku.optionValues).sort()) === JSON.stringify(Object.entries(selectedVariantOptions).sort())
          );
          updateSkuDisplayInfo(currentSku); // Update stock/price display based on this SKU

          // Only focus quantity if the last variant dropdown is not currently open and quantity input isn't already focused.
          if (!variantDropdownOpenState[lastVariantId] && document.activeElement?.id !== quantityInputRef.current?.id) {
              setTimeout(() => {
                  quantityInputRef.current?.focus();
                  quantityInputRef.current?.select();
              }, 100); 
          }
        }
    }
  }, [selectedVariantOptions, currentProductForSelection, updateSkuDisplayInfo, variantDropdownOpenState]);


  // Adds the currently configured item to the bill
  const handleAddNewItem = () => {
    const currentQuantity = typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity || 1;
    if (!productNameQuery || currentQuantity <= 0) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter product name and valid quantity." });
      productNameInputRef.current?.focus();
      return;
    }

    if (!currentProductForSelection) {
      toast({ variant: "destructive", title: "Product Not Selected", description: "Please select a product/SKU from suggestions or add a new one." });
      productNameInputRef.current?.focus();
      return;
    }
    const product = currentProductForSelection;

    // Ensure all variants are selected if the product has them
    if (product.variants && product.variants.length > 0) {
      const allVariantsSelected = product.variants.every(
        (v) => selectedVariantOptions[v.name]
      );
      if (!allVariantsSelected) {
        toast({ variant: "destructive", title: "Variant Selection Required", description: "Please select options for all product variants." });
        // Try to open the first unselected variant dropdown
        const firstUnselectedVariant = product.variants.find(v => !selectedVariantOptions[v.name]);
        if (firstUnselectedVariant) {
            setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true }));
            // Focus will be handled by the useEffect watching variantDropdownOpenState
        }
        return;
      }
    }

    // Find or create the target SKU definition
    const selectedOpts = (product.variants && product.variants.length > 0) ? selectedVariantOptions : {};
    const targetSkuFromStore = findOrCreateProductSKU(product.id, selectedOpts);
    if (!targetSkuFromStore) {
        toast({ variant: "destructive", title: "SKU Error", description: "Could not identify or create the product variant. Please re-select." });
        return;
    }
    const skuDetails = getSkuDetails(targetSkuFromStore); // Get fresh details for this SKU
    const itemProductNameForBill = skuDetails?.skuIdentifier || getSkuIdentifier(product.name, selectedOpts) || product.name;


    // Stock and price validation based on mode
    if (mode === 'buy') {
        if(product.trackQuantity === false) {
             toast({ variant: "destructive", title: "Invalid Action", description: "Non-tracked items/services cannot be added to Expense bills."});
             return;
        }
    } else if ((mode === 'sell' || (mode === 'return' && !returnItemIsDefective)) && product.trackQuantity) {
        // For sales/returns of tracked items, check against total stock of the SKU
        if (skuDetails.totalStock === null || skuDetails.totalStock < currentQuantity) {
          toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${skuDetails.totalStock ?? 0} of ${itemProductNameForBill} available.` });
          return;
        }
    }

    let itemCostPrice: number;
    let itemSellPrice: number;

    if (mode === 'buy') {
      itemCostPrice = parseFloat(costPrice.toString()) || 0;
      itemSellPrice = parseFloat(sellPrice.toString()) || 0; // This is the sell price intended for this new batch
       if (itemCostPrice <= 0 && currentQuantity > 0) { // Can't be free if buying actual items
        toast({ variant: "destructive", title: "Invalid Cost Price", description: "Cost Price must be greater than 0 for purchases."});
        costPriceInputRef.current?.focus();
        return;
      }
    } else if (mode === 'sell') {
      // For sales, COGS (itemCostPrice) is determined by FIFO in addBill.
      // itemSellPrice is what the user is currently charging, taken from the form's sellPrice state
      // which was populated from the oldest stock layer or from the selected batch.
      itemCostPrice = product.trackQuantity ? 0 : (skuDetails.averageCostPrice ?? 0); // Placeholder for tracked, actual for non-tracked
      itemSellPrice = parseFloat(sellPrice.toString()) || skuDetails.currentSellPrice || 0;
      if (itemSellPrice <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for products must be greater than 0. Check inventory pricing."});
        return;
      }
    } else { // Return mode
      // For returns, itemSellPrice is the value being returned to customer.
      // itemCostPrice is the original cost of the item for valuation if it's restocked.
      itemSellPrice = parseFloat(sellPrice.toString()) || skuDetails.currentSellPrice || 0; // Return value
      itemCostPrice = skuDetails.averageCostPrice ?? 0; // Cost for valuation if restocked
      if (itemSellPrice <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Return Price", description: "Return price must be greater than 0. Check inventory pricing."});
        return;
      }
    }

    const newItem: BillItem = {
      id: uuidv4(),
      productId: product.id,
      productName: itemProductNameForBill, // Use SKU identifier if available
      quantity: currentQuantity,
      costPrice: itemCostPrice,
      sellPrice: itemSellPrice,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
      selectedVariantOptions: (product.variants && product.variants.length > 0) ? { ...selectedVariantOptions } : undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, newItem]);
    resetFormFields(true); // Focus product name after adding
  };

  // Handles Enter key navigation between input fields
  const handleEnterNavigation = (currentField: 'productName' | 'quantity' | 'costPrice' | 'sellPrice' | 'serviceDescription' | 'serviceAmount') => {
    if (currentField === 'productName') {
       // Logic to handle Enter on product name: select suggestion or show "add new" hint
       if (productNameQuery.trim() !== '' && !currentProductForSelection) { // If text entered but no product object selected yet
           const productsFound = searchProducts(productNameQuery);
           // ProductSearchInput handles Enter by selecting first suggestion if suggestions are open.
           // This part is more for when suggestions are NOT open or user bypassed them.
           if (productsFound.length === 1 && productsFound[0].productSKUs.length <= 1 && productNameQuery.toLowerCase() === productsFound[0].name.toLowerCase()) {
                // If only one basic product matches exactly, select it.
                const productToSelect = productsFound[0];
                const skuToSelect = productToSelect.productSKUs[0]; // Might be undefined if no SKUs yet
                const suggestion: ProductSearchSuggestion = {
                    product: productToSelect,
                    sku: skuToSelect || { id: productToSelect.id + '_default', optionValues: {}, stockLayers: [], skuIdentifier: productToSelect.name },
                    displayInfo: { // Simplified display info for direct selection
                        name: skuToSelect?.skuIdentifier || productToSelect.name,
                        stock: skuToSelect ? getSkuDetails(skuToSelect).totalStock : (productToSelect.trackQuantity ? 0 : null),
                        price: skuToSelect ? (getSkuDetails(skuToSelect).currentSellPrice?.toFixed(2) || '0.00') : '0.00',
                    }
                };
                handleProductSelectFromSearch(suggestion); // This will set currentProductForSelection
           } else if (productNotFoundHint === productNameQuery) { // Second Enter: "Add New" flow
                const params: NewProductPrefillParams = {
                  name: productNameQuery,
                  returnTo: encodeURIComponent(pathname + searchParamsHook.toString())
                };
                if (mode === 'buy') {
                  const currentQty = typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity || 1;
                  params.quantity = currentQty.toString();
                  params.costPrice = (typeof costPrice === 'string' ? costPrice : costPrice?.toString()) || '0';
                  params.sellPrice = (typeof sellPrice === 'string' ? sellPrice : sellPrice?.toString()) || '0';
                }
                const query = new URLSearchParams(params as Record<string, string>).toString();
                router.push(`/admin/products/add?${query}`);
                resetFormFields(false); // Don't refocus product name if navigating away
            } else if (productsFound.length > 0) { // Ambiguous entry or many SKUs, show hint
                setProductNotFoundHint(productNameQuery);
            } else { // No products found
                setProductNotFoundHint(productNameQuery); // Set hint for "Add New" flow on next Enter
            }
       } else if (currentProductForSelection) { // Product is already selected
            // If product has variants, try to focus the first unselected variant.
            if (currentProductForSelection.variants && currentProductForSelection.variants.length > 0) {
                const firstUnselectedVariant = currentProductForSelection.variants.find(v => !selectedVariantOptions[v.name]);
                if(firstUnselectedVariant) {
                    setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true }));
                    // Focus handled by useEffect watching variantDropdownOpenState
                } else { // All variants selected, or product had no variants but was selected
                    quantityInputRef.current?.focus();
                    quantityInputRef.current?.select();
                }
            } else { // No variants, focus quantity
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
            }
       }
    } else if (currentField === 'quantity') {
      if (mode === 'buy') {
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      } else if (mode === 'sell' || mode === 'return') {
        handleAddNewItem(); // Add item and reset for next
      }
    } else if (currentField === 'costPrice') { // Only in 'buy' mode
      if (mode === 'buy') {
        sellPriceInputRef.current?.focus();
        sellPriceInputRef.current?.select();
      }
    } else if (currentField === 'sellPrice') { // Only in 'buy' mode
      if (mode === 'buy') handleAddNewItem(); // Add item and reset
    } else if (currentField === 'serviceDescription') {
      serviceAmountInputRef.current?.focus();
      serviceAmountInputRef.current?.select();
    } else if (currentField === 'serviceAmount') {
      handleAddServiceItem();
    }
  };

  // Updates quantity for an item already in the bill
  const updateBillItemQuantity = (itemId: string, newQuantity: number) => {
    setCurrentBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          // Here, you might want to add validation against available stock if mode is 'sell' or 'return'
          // For simplicity, this example allows any quantity.
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      }).filter(item => item.quantity > 0) // Remove item if quantity becomes 0
    );
  };

  // Updates cost/sell price for an item in 'buy' mode (only relevant there)
  const updateBillItemPrice = (itemId: string, newPrice: number, priceType: 'cost' | 'sell') => {
    if (mode !== 'buy') return; // Only allow price edits on bill items in buy mode
    setCurrentBillItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [priceType === 'cost' ? 'costPrice' : 'sellPrice']: Math.max(0, newPrice) } : item
      )
    );
  };

  // Removes an item from the current bill
  const removeBillItem = (itemId: string) => {
    setCurrentBillItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  // Calculates total amount for the current bill
  const calculateTotal = () => {
    return currentBillItems.reduce((acc, item) => {
      const price = mode === 'buy' ? (parseFloat(item.costPrice.toString()) || 0) : (parseFloat(item.sellPrice.toString()) || 0);
      return acc + (price * item.quantity);
    }, 0);
  };

  const calculatePotentialSellTotalForBuy = () => {
    if (mode !== 'buy') return 0;
    return currentBillItems.reduce((acc, item) => acc + ((parseFloat(item.sellPrice.toString()) || 0) * item.quantity), 0);
  };

  // Proceeds with saving the bill after employee verification (if needed)
  const proceedWithSave = (staffId: string, billPayloadToSave: PendingBillPayload) => {
    if (!billPayloadToSave) {
      toast({ variant: "destructive", title: "Internal Error", description: "Bill payload missing for save." });
      setIsSavingAnimationVisible(false); // Ensure animation doesn't show on error
      return;
    }
    const { billType, items, storeIdForBill, ...otherBillData } = billPayloadToSave;

    const billResult = addBill(
      { type: billType, billedByStaffId: staffId, storeId: storeIdForBill, ...otherBillData },
      items
    );

    if (billResult === null) {
      // addBill returns null if, for example, stock is insufficient or a non-tracked item is added to expense.
      // The toast for this is often handled within addBill or by its return value interpretation.
      // For robustness, ensure a generic failure toast if not more specific.
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save bill. This might be due to insufficient stock or an invalid operation." });
      setIsSavingAnimationVisible(false); // Ensure animation doesn't show on error
      return;
    }

    setLastSavedBillMode(billType);
    setIsSavingAnimationVisible(true);
    // Form reset is handled by handleAnimationClose
  };


  // Initiates the bill saving process
  const handleSaveBill = () => {
    if (currentBillItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Bill", description: "Please add items to the bill." });
      return;
    }

    const finalStoreId = isAdminContext ? selectedStoreIdForAdmin : storeIdFromProp;
    if (isAdminContext && allStores.length > 1 && !finalStoreId) {
      toast({ variant: "destructive", title: "Store Not Selected", description: "Please select a store for this bill." });
      return;
    }
     if (isAdminContext && allStores.length === 0 && !finalStoreId && !storeIdFromProp) { // Should be caught by store selection
        toast({ variant: "destructive", title: "No Stores Configured", description: "Please add stores in Store Management before creating bills." });
        return;
    }

    const billItemsForStore = currentBillItems.map(item => ({
      productId: item.productId,
      // productName is set by addBill based on SKU identifier
      quantity: item.quantity,
      costPrice: parseFloat(item.costPrice.toString()) || 0, // Ensure numeric
      sellPrice: parseFloat(item.sellPrice.toString()) || 0, // Ensure numeric
      isDefective: item.isDefective,
      selectedVariantOptions: item.selectedVariantOptions,
    }));

    const billPaymentStatus = (mode === 'sell' || mode === 'buy') ? (isPaid ? 'paid' : 'unpaid') : undefined;

    const currentBillPayload: PendingBillPayload = {
      billType: mode,
      vendorOrCustomerName: customerVendorName,
      customerPhone: customerPhone,
      notes: notes,
      paymentStatus: billPaymentStatus,
      items: billItemsForStore,
      storeIdForBill: finalStoreId,
    };

    if (!isAdminContext && storeIdFromProp) { // Store portal context: always verify employee
        setPendingBillPayload(currentBillPayload);
        setIsVerifyEmployeeDialogOpen(true);
    } else { // Admin context
      proceedWithSave('admin_self_billed', currentBillPayload); // Admin bills are self-billed
    }
  };

  // Callback for when employee is verified via passkey dialog
  const handleEmployeeVerifiedForBill = (staff: Staff) => {
    setIsVerifyEmployeeDialogOpen(false); // Close dialog
    if (pendingBillPayload) {
      proceedWithSave(staff.id, pendingBillPayload);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Billing data was unexpectedly cleared. Please try saving again." });
    }
    // No need to clear pendingBillPayload here, proceedWithSave or animationClose will handle it.
  };

  // Callback for when the save animation finishes
  const handleAnimationClose = () => {
    setIsSavingAnimationVisible(false);
    setLastSavedBillMode(null);
    resetFullForm(); // Reset the entire form

    // Navigation logic after save
    if (isAdminContext) {
      const currentQueryModeInUrl = searchParamsHook.get('mode');
      const basePath = '/admin/billing';
       // If the mode was explicitly set in the URL (e.g. user navigated to /admin/billing?mode=buy),
       // stay on that mode's form. Otherwise, go to history.
       if (currentQueryModeInUrl && ['sell', 'buy', 'return'].includes(currentQueryModeInUrl)) {
         // No navigation needed, stay on form for current mode (it's already reset)
       } else {
         router.push(basePath); // Default to history view if no mode was in URL or it was 'new'
       }
    }
    // For store portal, it stays on the billing form, ready for the next bill.
  };

  // Handles mode change via tabs
  const handleModeChange = (newModeString: string) => {
    const newMode = newModeString as BillMode;
    if (allowedModes && allowedModes.length > 0 && !allowedModes.includes(newMode)) {
        toast({variant: "destructive", title: "Mode Not Allowed", description: `This terminal is not configured for ${newMode} operations.`});
        return;
    }

    if (newMode !== mode) {
        // Update URL to reflect new mode, BillingForm will re-evaluate its mode state via useEffect
        const basePath = isAdminContext ? '/admin/billing' : (storeIdFromProp ? `/storeportal/${storeIdFromProp}/billing` : '/admin/billing');
        router.push(`${basePath}?mode=${newMode}`, { scroll: false });
        // resetFullForm(); // Form reset is now handled by useEffect watching `mode`
    }
  };

  // Navigates to product edit page (admin context only)
  const handleEditProductClick = () => {
    if (currentProductForSelection && isAdminContext) {
      const currentBillingUrl = pathname + searchParamsHook.toString();
      router.push(`/admin/products/${currentProductForSelection.id}?returnTo=${encodeURIComponent(currentBillingUrl)}`);
    }
  };

  // Adds a service/charge item to the bill
  const handleAddServiceItem = () => {
    if (!serviceDescription || !serviceAmount || parseFloat(serviceAmount.toString()) <= 0) {
      toast({ variant: "destructive", title: "Missing Service Info", description: "Please enter service description and a valid amount." });
      serviceDescriptionInputRef.current?.focus();
      return;
    }

    const amount = parseFloat(serviceAmount.toString());

    const serviceItem: BillItem = {
      id: uuidv4(),
      productId: `SERVICE_ITEM_${uuidv4()}`, // Unique ID for service item
      productName: serviceDescription,
      quantity: 1,
      costPrice: mode === 'buy' ? amount : 0, // Cost is amount if buying an external service
      sellPrice: amount, // Sell/charge price is always the amount
      isDefective: undefined,
      selectedVariantOptions: undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, serviceItem]);
    setServiceDescription('');
    setServiceAmount('');
    setTimeout(() => serviceDescriptionInputRef.current?.focus(), 0); // Focus description for next service
  };

  const displayModes = allowedModes || ['sell', 'buy', 'return'];
  const activeModeConfig = {
    sell: { icon: Send, color: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", label: "Sales" },
    buy: { icon: ShoppingBag, color: "data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground", label: "Expense" },
    return: { icon: RotateCcw, color: "data-[state=active]:bg-amber-400 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-amber-950", label: "Return" },
  };

  return (
    <div className="flex flex-col gap-6">
      <BillSaveAnimation
        show={isSavingAnimationVisible}
        billMode={lastSavedBillMode}
        onClose={handleAnimationClose}
      />
      {(!isAdminContext && storeIdFromProp) && (
        <EmployeePasskeyDialog
          isOpen={isVerifyEmployeeDialogOpen}
          onOpenChange={(open) => {
              if(!open && isVerifyEmployeeDialogOpen) { // If dialog is cancelled by user
                  setPendingBillPayload(null); // Clear pending data
              }
              setIsVerifyEmployeeDialogOpen(open);
          }}
          storeId={storeIdFromProp}
          onAuthenticated={handleEmployeeVerifiedForBill}
        />
      )}

      <div className="flex justify-center">
        <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
          <TabsList className="grid w-full grid-cols-3 gap-1">
            {displayModes.includes('sell') && (
              <TabsTrigger
                value="sell"
                className={cn("flex items-center gap-2 text-sm px-4 py-2", activeModeConfig.sell.color)}
              >
                <activeModeConfig.sell.icon size={18}/>{activeModeConfig.sell.label}
              </TabsTrigger>
            )}
            {displayModes.includes('buy') && (
              <TabsTrigger
                value="buy"
                className={cn("flex items-center gap-2 text-sm px-4 py-2", activeModeConfig.buy.color)}
              >
                <activeModeConfig.buy.icon size={18}/>{activeModeConfig.buy.label}
              </TabsTrigger>
            )}
            {displayModes.includes('return') && (
              <TabsTrigger
                value="return"
                className={cn("flex items-center gap-2 text-sm px-4 py-2", activeModeConfig.return.color)}
              >
                <activeModeConfig.return.icon size={18}/>{activeModeConfig.return.label}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Main Billing Card */}
      <Card className="w-full shadow-lg flex flex-col border-t-2 border-t-primary">
        <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 p-6">
          {/* Admin Store Selection Dropdown */}
          {isAdminContext && allStores.length > 1 && (
              <div className="space-y-1.5 pb-4 border-b border-dashed mb-4">
                <Label htmlFor="adminStoreSelect" className="flex items-center gap-1.5 text-base font-medium">
                    <Building size={18} className="text-muted-foreground"/> Select Store for this Bill
                </Label>
                <Select value={selectedStoreIdForAdmin} onValueChange={setSelectedStoreIdForAdmin}>
                    <SelectTrigger id="adminStoreSelect" className="w-full md:w-1/2 select-trigger-class">
                        <SelectValue placeholder="Select a store..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allStores.map(store => (
                            <SelectItem key={store.id} value={store.id}>{store.name} ({store.location})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {isAdminContext && allStores.length > 1 && !selectedStoreIdForAdmin && <p className="text-xs text-destructive mt-1">Please select a store before saving the bill.</p>}
              </div>
          )}

          {/* Item Entry Section */}
          <div className="space-y-4 pb-4 border-b border-dashed">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <Settings2 size={20} className="text-muted-foreground"/> Add Item / Product
            </h3>
            <div className={cn(
              "grid gap-4 items-baseline", // Use items-baseline for better input alignment
              "grid-cols-1", // Default to single column for mobile
              mode === 'buy' ? "md:grid-cols-[1fr_auto_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto_auto]" // Adjusted for button
            )}>
              <div className="space-y-1.5 flex-grow">
                <Label htmlFor="productNameGlobal">Product Name / SKU</Label>
                <div className="flex items-center gap-2">
                  <ProductSearchInput
                    inputRef={productNameInputRef}
                    value={productNameQuery}
                    onValueChange={(v) => {
                        setProductNameQuery(v);
                        if (!v) { // If input is cleared, reset related states
                            setCurrentProductForSelection(null);
                            setSelectedVariantOptions({});
                            setProductNotFoundHint('');
                            updateSkuDisplayInfo(undefined); // Reset SKU display info
                        }
                    }}
                    onProductSelect={handleProductSelectFromSearch}
                    onEnterWithoutSelection={() => handleEnterNavigation('productName')}
                    placeholder={mode === 'return' ? 'Search product to return' : 'Scan or type product name/SKU'}
                    id="productNameGlobal"
                    className="flex-grow"
                    currentMode={mode}
                  />
                  {currentProductForSelection && isAdminContext && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={handleEditProductClick} className="shrink-0" aria-label="Edit selected product">
                            <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Edit {currentProductForSelection.name}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                 {currentProductForSelection && (
                  <div className="text-xs text-muted-foreground ml-1 space-y-0.5 mt-1">
                    <span>Selected: {(currentProductForSelection.productSKUs.find(sku => JSON.stringify(Object.entries(sku.optionValues).sort()) === JSON.stringify(Object.entries(selectedVariantOptions).sort()))?.skuIdentifier) || currentProductForSelection.name}</span>
                    {currentProductForSelection.trackQuantity && currentSkuStock !== null && (
                      <span className="block">
                        {isDisplayingLayerStock && mode === 'sell' ? `Layer Stock: ${currentSkuStock}` : `Total Stock: ${currentSkuStock}`}
                      </span>
                    )}
                    {currentSkuSellPrice !== null && (
                      <span className="block">
                        Current Sell Price: ₹{currentSkuSellPrice.toFixed(2)}
                        {currentProductForSelection.trackQuantity && " (from oldest batch)"}
                      </span>
                    )}
                  </div>
                )}
                {productNotFoundHint && productNameQuery === productNotFoundHint && (
                    <div className="bg-accent/10 text-accent-foreground p-2 rounded-md flex items-center gap-2 my-2 text-sm shadow">
                        <Info size={16} className="text-accent shrink-0" />
                        Product '{productNotFoundHint}' not found. Press <CornerDownLeft size={16} strokeWidth={2.5} className="inline text-primary dark:text-primary mx-0.5 shrink-0" /> Enter to add it.
                    </div>
                )}
              </div>

              <div className="space-y-1.5 w-full md:w-24">
                <Label htmlFor="quantityGlobal">Quantity</Label>
                <Input
                  id="quantityGlobal"
                  ref={quantityInputRef}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || '')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('quantity'))}
                  onFocus={(e) => e.target.select()}
                  min="1"
                  placeholder="1"
                />
              </div>

              {mode === 'buy' ? (
                <>
                  <div className="space-y-1.5 w-full md:w-32">
                    <Label htmlFor="costPrice">Cost Price/Unit</Label>
                    <Input
                      id="costPrice"
                      ref={costPriceInputRef}
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('costPrice'))}
                      onFocus={(e) => e.target.select()}
                      step="0.01" min="0" placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5 w-full md:w-32">
                    <Label htmlFor="sellPriceGlobalBuy">Sell Price/Unit (Set for this Batch)</Label>
                    <Input
                      id="sellPriceGlobalBuy"
                      ref={sellPriceInputRef}
                      type="number"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(parseFloat(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                      onFocus={(e) => e.target.select()}
                      step="0.01" min="0" placeholder="0.00"
                    />
                  </div>
                   <Button onClick={handleAddNewItem} className="w-full md:w-auto self-end bg-primary hover:bg-primary/90" variant="default">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                   </Button>
                </>
              ) : ( // Sales or Return mode - Sell Price input is not shown, button takes its grid spot
                 <Button onClick={handleAddNewItem} className="w-full md:w-auto self-end bg-primary hover:bg-primary/90" variant="default">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                 </Button>
              )}
            </div>

            {/* Variant Selection Dropdowns */}
            {currentProductForSelection && currentProductForSelection.variants && currentProductForSelection.variants.length > 0 && (
              <div className={cn(`grid md:grid-cols-${Math.min(currentProductForSelection.variants.length, 3)} gap-4 mt-3 items-end`)}>
                {currentProductForSelection.variants.map((variant, index) => {
                   // Ensure ref is created for each variant
                   if (!variantSelectRefs.current[variant.id]) {
                      variantSelectRefs.current[variant.id] = React.createRef<HTMLButtonElement>();
                    }
                  return (
                    <div key={variant.id} className="space-y-1.5">
                      <Label htmlFor={`variant-select-${variant.id}-trigger`}>{variant.name}</Label>
                      <Select
                        open={variantDropdownOpenState[variant.id] || false}
                        onOpenChange={(isOpen) => {
                          setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: isOpen }));
                          if (isOpen) { // If opening, focus the trigger
                             setTimeout(() => (variantSelectRefs.current[variant.id]?.current || document.getElementById(`variant-select-${variant.id}-trigger`) as HTMLElement)?.focus(), 50);
                          }
                        }}
                        value={selectedVariantOptions[variant.name] || ""}
                        onValueChange={(value) => {
                            setSelectedVariantOptions((prev) => ({ ...prev, [variant.name]: value }));
                            setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: false })); // Close current dropdown

                            // Auto-open and focus next variant or quantity input
                            const currentIndex = currentProductForSelection!.variants!.findIndex(v_ => v_.id === variant.id);
                            if (currentIndex < currentProductForSelection!.variants!.length - 1) {
                                const nextVariantId = currentProductForSelection!.variants![currentIndex + 1].id;
                                setTimeout(() => { 
                                  setVariantDropdownOpenState((prev) => ({ ...prev, [nextVariantId]: true }));
                                  // Focus handled by useEffect watching variantDropdownOpenState
                                }, 50); 
                            } else { // Last variant selected, focus quantity
                                setTimeout(() => {
                                   quantityInputRef.current?.focus();
                                   quantityInputRef.current?.select();
                                }, 50);
                            }
                        }}
                      >
                        <SelectTrigger
                          id={`variant-select-${variant.id}-trigger`}
                          ref={variantSelectRefs.current[variant.id]}
                          className="w-full select-trigger-class"
                           onKeyDown={(e) => {
                            if (e.key === 'Enter' && !variantDropdownOpenState[variant.id]) {
                                e.preventDefault();
                                setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: true }));
                            } else if (e.key === 'Enter' && variantDropdownOpenState[variant.id]) {
                                // Radix Select handles selection when open. onValueChange triggers focus.
                            } else if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) { // Move to next variant or quantity
                                if (index < currentProductForSelection!.variants!.length -1) {
                                    e.preventDefault();
                                    setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: false }));
                                    const nextVariantId = currentProductForSelection!.variants![index + 1].id;
                                    setVariantDropdownOpenState(prev => ({ ...prev, [nextVariantId]: true }));
                                    // Focus handled by useEffect
                                } else if (index === currentProductForSelection!.variants!.length -1) { // Last variant
                                    e.preventDefault();
                                    setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: false }));
                                    quantityInputRef.current?.focus();
                                    quantityInputRef.current?.select();
                                }
                            } // Add ArrowLeft/Shift+Tab for previous if needed
                          }}
                        >
                          <SelectValue placeholder={`Select ${variant.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {variant.options.map((option) => (
                            <SelectItem key={option.id} value={option.value}>
                              {option.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )})}
              </div>
            )}

            {/* Return Specific: Is Defective Switch */}
            {mode === 'return' && (
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="isDefective"
                  checked={returnItemIsDefective}
                  onCheckedChange={setReturnItemIsDefective}
                />
                <Label htmlFor="isDefective">Item is defective</Label>
              </div>
            )}
          </div>

          {/* Bill Items List */}
          <div className="flex-grow overflow-hidden">
            {currentBillItems.length > 0 && <BillItemHeader mode={mode} />}
            <ScrollArea className="flex-1 -mx-6 px-6 h-[200px] md:h-auto md:max-h-[300px]"> {/* Constrained height for scroll */}
              {currentBillItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in the bill yet.</p>
              ) : (
                <div className="space-y-0"> {/* No extra space between rows */}
                  {currentBillItems.map((item) => (
                    <BillItemRow
                      key={item.id}
                      item={item}
                      mode={mode}
                      onQuantityChange={updateBillItemQuantity}
                      onPriceChange={updateBillItemPrice}
                      onRemoveItem={removeBillItem}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Ad-hoc Service/Charge Section */}
          {(mode === 'sell' || mode === 'buy') && (
            <div className="pt-4 border-t border-dashed mt-auto space-y-3"> {/* Ensure it's pushed down */}
              <h3 className="text-md font-medium text-foreground flex items-center gap-2">
                <CircleDollarSign size={18} className="text-muted-foreground"/> Add Ad-hoc Service / Charge
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="serviceDescription">Description</Label>
                  <Input
                    id="serviceDescription"
                    ref={serviceDescriptionInputRef}
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="e.g., Delivery Fee, Repair Service"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('serviceDescription'))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serviceAmount">Amount</Label>
                  <Input
                    id="serviceAmount"
                    ref={serviceAmountInputRef}
                    type="number"
                    value={serviceAmount}
                    onChange={(e) => setServiceAmount(parseFloat(e.target.value) || '')}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('serviceAmount'))}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
                <Button onClick={handleAddServiceItem} variant="outline" className="self-end h-10">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Service
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <Separator className="my-0"/>
        <CardFooter className="flex-col items-stretch gap-4 pt-6">
          {/* Customer/Vendor and Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-1.5">
                <Label htmlFor="customerVendorName">{mode === 'buy' ? 'Vendor Name' : (mode === 'sell' ? 'Customer Name' : 'Party Name')}</Label>
                <Input
                id="customerVendorName"
                ref={customerVendorNameInputRef}
                value={customerVendorName}
                onChange={(e) => setCustomerVendorName(e.target.value)}
                placeholder={`Enter ${mode === 'buy' ? 'vendor' : (mode === 'sell' ? 'customer' : 'party')} name (optional)`}
                />
            </div>
            {mode !== 'buy' && ( // Only show phone for sell/return
                 <div className="space-y-1.5">
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                    id="customerPhone"
                    ref={customerPhoneInputRef}
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter customer phone (optional)"
                    />
                </div>
            )}
             <div className={cn("space-y-1.5", mode === 'buy' && "md:col-span-2")}> {/* Notes span full width in buy mode on desktop */}
                <Label htmlFor="notes">Notes</Label>
                <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this bill (optional)"
                />
            </div>
          </div>

          <Separator className="my-2"/>

          {/* Total and Payment Status */}
          <div className="flex justify-between items-center">
            {(mode === 'sell' || mode === 'buy') && (
                <div className="flex items-center space-x-2">
                <Switch
                    id="paymentStatus"
                    checked={isPaid}
                    onCheckedChange={setIsPaid}
                    className={cn(isPaid ? "data-[state=checked]:bg-green-500" : "data-[state=unchecked]:bg-destructive")}
                />
                <Label htmlFor="paymentStatus" className={cn("font-medium", isPaid ? "text-green-600 dark:text-green-500" : "text-destructive")}>
                    {isPaid ? 'Paid' : 'Unpaid'}
                </Label>
                </div>
            )}
             <div className="flex flex-col items-end ml-auto">
                <div className="flex justify-between text-lg font-semibold text-foreground">
                    <span>Total:</span>
                    <span className="ml-2">₹{calculateTotal().toFixed(2)}</span>
                </div>
                {mode === 'buy' && currentBillItems.length > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Potential Revenue (from this purchase batch):</span>
                    <span className="ml-2">₹{calculatePotentialSellTotalForBuy().toFixed(2)}</span>
                    </div>
                )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={resetFullForm} className="flex-1">
              <Eraser className="mr-2 h-4 w-4" /> Clear Bill
            </Button>
            <Button 
              onClick={handleSaveBill} 
              className="flex-1" 
              disabled={currentBillItems.length === 0 || isVerifyEmployeeDialogOpen}
            >
              <Save className="mr-2 h-4 w-4" /> Save Bill
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
