
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput, type ProductSearchSuggestion } from './product-search-input';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode, ProductSKU, Store, Staff, Bill, ProductVariant as ProductVariantType } from '@/types';
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
import { NewProductDialog } from './new-product-dialog';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';

type PendingBillPayload = {
  billType: BillMode;
  vendorOrCustomerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  items: Omit<BillItem, 'id'|'productName'>[]; // productName will be re-derived
  storeIdForBill?: string;
};

interface BillingFormProps {
  storeId?: string; // For store portal context
  allowedModes?: BillMode[];
  initialModeProp?: BillMode | null;
  isAdminContext?: boolean;
  preselectedStoreId?: string | null; // For admin context, if a store is preselected
}

export function BillingForm({
  storeId: storeIdFromProp,
  allowedModes,
  initialModeProp,
  isAdminContext = false,
  preselectedStoreId,
}: BillingFormProps) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();

  // Store Hooks
  const addBill = useInventoryStore(state => state.addBill);
  const searchProducts = useInventoryStore(state => state.searchProducts);
  const getProductById = useInventoryStore(state => state.getProductById);
  const getAllStores = useInventoryStore(state => state.getAllStores);
  const findOrCreateProductSKU = useInventoryStore(state => state.findOrCreateProductSKU);
  const getSkuDetails = useInventoryStore(state => state.getSkuDetails);
  const getSkuIdentifier = useInventoryStore(state => state.getSkuIdentifier);
  const getActiveSubscriptionPlan = useInventoryStore(state => state.getActiveSubscriptionPlan);

  // Component State
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  const [hasMounted, setHasMounted] = useState(false);

  const [mode, setMode] = useState<BillMode>('sell');
  
  // For Admin context, if a specific store is selected for billing
  const [selectedStoreIdForAdmin, setSelectedStoreIdForAdmin] = useState<string | undefined>(undefined);

  // Item entry fields
  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>(''); // Used for 'buy' mode cost
  const [sellPrice, setSellPrice] = useState<number | string>(''); // Used for 'buy' mode sell price, or auto-filled for 'sell'/'return'

  // SKU specific display info
  const [currentSkuStock, setCurrentSkuStock] = useState<number | null>(null);
  const [currentSkuSellPrice, setCurrentSkuSellPrice] = useState<number | null>(null);
  const [isDisplayingLayerStock, setIsDisplayingLayerStock] = useState(false); // To differentiate if currentSkuStock is total or layer specific

  // Product and Variant selection
  const [currentProductForSelection, setCurrentProductForSelection] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [variantDropdownOpenState, setVariantDropdownOpenState] = useState<Record<string, boolean>>({});

  // Bill level fields
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(true); // For 'sell' and 'buy' modes
  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false); // For 'return' mode

  // UI Control State
  const [productNotFoundHint, setProductNotFoundHint] = useState('');
  const [isSavingAnimationVisible, setIsSavingAnimationVisible] = useState(false);
  const [lastSavedBillMode, setLastSavedBillMode] = useState<BillMode | null>(null);
  const [isVerifyEmployeeDialogOpen, setIsVerifyEmployeeDialogOpen] = useState(false);
  const [pendingBillPayload, setPendingBillPayload] = useState<PendingBillPayload | null>(null);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProductDialogInitialValues, setNewProductDialogInitialValues] = useState<{ name: string; quantity?: string; costPrice?: string; sellPrice?: string; } | null>(null);

  // Service item fields
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceAmount, setServiceAmount] = useState<number | string>('');

  // Refs
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const sellPriceBatchInputRef = useRef<HTMLInputElement>(null); // For buy mode sell price
  const customerVendorNameInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);
  const serviceDescriptionInputRef = useRef<HTMLInputElement>(null);
  const serviceAmountInputRef = useRef<HTMLInputElement>(null);
  const variantSelectRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

  // Effects for setup and syncing
  useEffect(() => {
    setHasMounted(true);
    setAllStores(getAllStores());
    setActivePlan(getActiveSubscriptionPlan());
  }, [getAllStores, getActiveSubscriptionPlan]);

  const determineMode = useCallback((): BillMode => {
    const urlMode = initialModeProp || searchParamsHook.get('mode') as BillMode | null;
    if (urlMode && ['sell', 'buy', 'return'].includes(urlMode)) {
      if (!allowedModes || (allowedModes && allowedModes.includes(urlMode))) {
        return urlMode;
      }
    }
    if (allowedModes && allowedModes.length > 0) return allowedModes[0];
    return 'sell'; // Default mode
  }, [initialModeProp, allowedModes, searchParamsHook]);

  useEffect(() => {
    const newDeterminedMode = determineMode();
    if (newDeterminedMode !== mode) {
      setMode(newDeterminedMode);
      // Do not resetFullForm here, let parent page key change handle it for major mode shifts
    }
  }, [determineMode, mode]); // Removed resetFullForm from here

  // Initialize selectedStoreIdForAdmin based on context and preselection
  useEffect(() => {
    if (isAdminContext && hasMounted && activePlan) {
      if (preselectedStoreId && allStores.find(s => s.id === preselectedStoreId)) {
        setSelectedStoreIdForAdmin(preselectedStoreId);
      } else if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 0) { // Auto-select if Starter plan and store exists
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 1) { // Auto-select if only one store and not Starter
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1 && !preselectedStoreId) {
        setSelectedStoreIdForAdmin(allStores[0].id); // Default to first for multi-store plans if none preselected
      } else {
        setSelectedStoreIdForAdmin(undefined); // No preselection, or no stores for the plan
      }
    }
  }, [isAdminContext, allStores, preselectedStoreId, hasMounted, activePlan]);


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

  const resetFullForm = useCallback(() => {
    setCurrentBillItems([]);
    setCustomerVendorName('');
    setCustomerPhone('');
    setNotes('');
    setIsPaid(true);
    setServiceDescription('');
    setServiceAmount('');
    resetFormFields(true);
    setPendingBillPayload(null);
  }, [resetFormFields]);


  useEffect(() => {
    setTimeout(() => productNameInputRef.current?.focus(), 50);
  }, [mode]);

  const finalStoreIdForSkuDetails = useMemo(() => {
    return isAdminContext ? selectedStoreIdForAdmin : storeIdFromProp;
  }, [isAdminContext, selectedStoreIdForAdmin, storeIdFromProp]);

  const updateSkuDisplayInfo = useCallback((skuToUse?: ProductSKU) => {
    if (skuToUse && currentProductForSelection) {
      const details = getSkuDetails(skuToUse, finalStoreIdForSkuDetails);
      setCurrentSkuStock(currentProductForSelection.trackQuantity ? details.totalStock : null);
      setIsDisplayingLayerStock(false); // Default to showing total stock for the SKU
      setCurrentSkuSellPrice(details.currentSellPrice);
      if (mode === 'sell' || mode === 'return') {
        setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : '');
      } else if (mode === 'buy') {
          setCostPrice(''); // Clear cost price when selecting a new product/SKU in buy mode
          setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : ''); // Pre-fill current sell price as default
      }
    } else if (currentProductForSelection && !skuToUse) { // E.g. product selected but specific SKU not yet, or product has no SKUs
        setCurrentSkuStock(currentProductForSelection.trackQuantity ? 0 : null);
        setIsDisplayingLayerStock(false);
        setCurrentSkuSellPrice(null); // No specific SKU, no price to show yet
        setSellPrice('');
        if (mode === 'buy') setCostPrice('');
    } else { // No product selected
      setCurrentSkuStock(null);
      setIsDisplayingLayerStock(false);
      setCurrentSkuSellPrice(null);
      setSellPrice('');
      if (mode === 'buy') setCostPrice('');
    }
  }, [getSkuDetails, mode, currentProductForSelection, finalStoreIdForSkuDetails]);


  const handleProductSelectFromSearch = useCallback((suggestion: ProductSearchSuggestion) => {
    const { product, sku, layer } = suggestion;
    setCurrentProductForSelection(product);
    
    if (sku) {
        const skuDetailsToUse = getSkuDetails(sku, finalStoreIdForSkuDetails);
        setProductNameQuery(skuDetailsToUse.skuIdentifier || product.name);
        setSelectedVariantOptions(sku.optionValues || {});

        if (currentMode === 'sell' && product.trackQuantity && layer && typeof layer.quantity === 'number') {
            setCurrentSkuStock(layer.quantity);
            setIsDisplayingLayerStock(true); // Indicate we are showing layer-specific stock
            setCurrentSkuSellPrice(layer.sellPrice);
            setSellPrice(layer.sellPrice.toString());
        } else { // Other modes, or no specific layer selected from search
            setCurrentSkuStock(product.trackQuantity ? skuDetailsToUse.totalStock : null);
            setIsDisplayingLayerStock(false);
            setCurrentSkuSellPrice(skuDetailsToUse.currentSellPrice);
            setSellPrice(skuDetailsToUse.currentSellPrice !== null ? skuDetailsToUse.currentSellPrice.toString() : '');
        }
         // For 'buy' mode, pre-fill sell price from SKU, but cost price should be entered.
        if (mode === 'buy') {
            setCostPrice(''); // Ensure cost price is cleared for manual entry
            // Sell price is already set above based on SKU details
        }
    } else { // Product without specific SKUs selected (e.g. new product or non-variant)
        setProductNameQuery(product.name);
        setSelectedVariantOptions({});
        updateSkuDisplayInfo(undefined); // Pass undefined to reset based on product only
    }

    setProductNotFoundHint('');

    if (product.variants && product.variants.length > 0 && (!sku || Object.keys(sku.optionValues || {}).length < product.variants.length)) {
      const firstUnselectedVariant = product.variants.find(v => !(selectedVariantOptions[v.name]));
      if (firstUnselectedVariant) {
          setTimeout(() => {
            setVariantDropdownOpenState({ [firstUnselectedVariant.id]: true });
            variantSelectRefs.current[firstUnselectedVariant.id]?.current?.focus();
          }, 50);
      } else if (Object.keys(selectedVariantOptions).length === product.variants.length) { // All variants selected, but maybe not from an explicit SKU selection
          setTimeout(() => {
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
          }, 50);
      }
    } else { // No variants, or an SKU was fully selected
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 50);
    }
  }, [getSkuDetails, mode, updateSkuDisplayInfo, finalStoreIdForSkuDetails, selectedVariantOptions]);

  // Handle newly added product (from ProductForm navigation)
  useEffect(() => {
    if (!hasMounted) return;
    const newlyAddedProductId = searchParamsHook.get('newlyAddedProductId');
    if (newlyAddedProductId) {
      const product = getProductById(newlyAddedProductId);
      if (product) {
        const skuToSelect = product.productSKUs.length > 0 ? product.productSKUs[0] : undefined;
        const suggestionForNewProduct: ProductSearchSuggestion = {
            product,
            sku: skuToSelect || { id: product.id + '_default_new_bill', optionValues: {}, stockLayers: [], skuIdentifier: product.name }, // conceptual SKU
            displayInfo: {
                name: getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).skuIdentifier || product.name,
                stock: product.trackQuantity ? (getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).totalStock ?? 0) : 'N/A',
                price: getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).currentSellPrice !== null ? `₹${getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).currentSellPrice!.toFixed(2)}` : 'N/A',
            }
        };
        handleProductSelectFromSearch(suggestionForNewProduct);
      }
      const newParams = new URLSearchParams(searchParamsHook.toString());
      newParams.delete('newlyAddedProductId');
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    }
  }, [searchParamsHook, getProductById, router, pathname, handleProductSelectFromSearch, finalStoreIdForSkuDetails, hasMounted]);

  // Focus variant dropdown when it's opened programmatically
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
  }, [currentProductForSelection?.variants, variantDropdownOpenState]);

  // Focus quantity input after all variants are selected
  useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
        const allVariantsSelected = currentProductForSelection.variants.every(
          (v) => selectedVariantOptions[v.name]
        );
        
        if (allVariantsSelected) {
          const lastVariantId = currentProductForSelection.variants[currentProductForSelection.variants.length - 1].id;
          // Check if the last variant dropdown is NOT currently open (meaning selection is complete)
          // And ensure quantity input doesn't already have focus
          if (!variantDropdownOpenState[lastVariantId] && document.activeElement?.id !== quantityInputRef.current?.id) {
              const currentSku = currentProductForSelection.productSKUs.find(sku =>
                JSON.stringify(Object.entries(sku.optionValues || {}).sort()) === JSON.stringify(Object.entries(selectedVariantOptions).sort())
              );
              updateSkuDisplayInfo(currentSku); // Update SKU display info based on fully selected options
              setTimeout(() => {
                  quantityInputRef.current?.focus();
                  quantityInputRef.current?.select();
              }, 50);
          }
        }
    }
  }, [selectedVariantOptions, currentProductForSelection, updateSkuDisplayInfo, variantDropdownOpenState]);


  const handleAddNewItem = () => {
    const currentQuantity = typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity || 1;
    if (!currentProductForSelection) {
      toast({ variant: "destructive", title: "Product Not Selected", description: "Please select a product/SKU from suggestions or add a new one." });
      productNameInputRef.current?.focus();
      return;
    }
    if (currentQuantity <= 0) {
      toast({ variant: "destructive", title: "Invalid Quantity", description: "Please enter a valid quantity." });
      quantityInputRef.current?.focus();
      return;
    }

    const product = currentProductForSelection;

    if (product.variants && product.variants.length > 0) {
      const allVariantsSelected = product.variants.every((v) => selectedVariantOptions[v.name]);
      if (!allVariantsSelected) {
        toast({ variant: "destructive", title: "Variant Selection Required", description: "Please select options for all product variants." });
        const firstUnselectedVariant = product.variants.find(v => !selectedVariantOptions[v.name]);
        if (firstUnselectedVariant) {
            setTimeout(() => setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true })), 50);
        }
        return;
      }
    }

    const selectedOpts = (product.variants && product.variants.length > 0) ? selectedVariantOptions : {};
    const targetSkuFromStore = findOrCreateProductSKU(product.id, selectedOpts);

    if (!targetSkuFromStore) {
        toast({ variant: "destructive", title: "SKU Error", description: "Could not identify or create the product variant. Please re-select." });
        return;
    }
    const skuDetails = getSkuDetails(targetSkuFromStore, finalStoreIdForSkuDetails);
    const itemProductNameForBill = skuDetails?.skuIdentifier || getSkuIdentifier(product.name, selectedOpts) || product.name;

    if (mode === 'buy' && product.trackQuantity === false) {
      toast({ variant: "destructive", title: "Invalid Action", description: "Non-tracked items/services cannot be added to Expense bills."});
      resetFormFields(true);
      return;
    }
    
    if ((mode === 'sell' || (mode === 'return' && !returnItemIsDefective)) && product.trackQuantity) {
        // Use 'isDisplayingLayerStock' to determine which stock figure to check against
        const stockToCheck = isDisplayingLayerStock && currentSkuStock !== null && mode === 'sell' 
                           ? currentSkuStock 
                           : (skuDetails.totalStock ?? 0);

        if (stockToCheck < currentQuantity) {
          toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${stockToCheck} of ${itemProductNameForBill} available at this store.` });
          return;
        }
    }

    let itemCostPrice: number;
    let itemSellPriceForBill: number;

    if (mode === 'buy') {
      itemCostPrice = parseFloat(costPrice.toString()) || 0;
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || 0; // This is the sell price for the batch being purchased
      if (itemCostPrice <= 0 && currentQuantity > 0 && product.trackQuantity) {
        toast({ variant: "destructive", title: "Invalid Cost Price", description: "Cost Price must be greater than 0 for tracked purchases."});
        costPriceInputRef.current?.focus();
        return;
      }
       // For buy mode, sellPrice for batch must be > 0 if product is tracked, or costPrice is > 0.
       // Services (non-tracked) don't have this strict check on sellPrice for buy.
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && product.trackQuantity && itemCostPrice > 0) {
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for purchased batch must be greater than 0."});
        sellPriceBatchInputRef.current?.focus();
        return;
      }
    } else if (mode === 'sell') {
      // Sell price is derived from currentSkuSellPrice (from oldest layer or non-tracked price) or component state if user selected a specific layer suggestion.
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || currentSkuSellPrice || 0;
      
      if (product.trackQuantity === false) { // Non-tracked item
        itemCostPrice = skuDetails.averageCostPrice ?? 0; // averageCostPrice for non-tracked is its defined cost
      } else { // Tracked item - COGS calculated later by FIFO
        itemCostPrice = 0; // Placeholder, actual COGS calculated in addBill
      }
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for products must be greater than 0."});
        return;
      }
    } else { // Return mode
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || currentSkuSellPrice || 0;
      itemCostPrice = skuDetails.averageCostPrice ?? 0; // Use average cost for return valuation
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Return Price", description: "Return price must be greater than 0."});
        return;
      }
    }

    const newItem: BillItem = {
      id: uuidv4(), productId: product.id, productName: itemProductNameForBill,
      quantity: currentQuantity, costPrice: itemCostPrice, sellPrice: itemSellPriceForBill,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
      selectedVariantOptions: (product.variants && product.variants.length > 0) ? { ...selectedVariantOptions } : undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, newItem]);
    resetFormFields(true);
  };

  const handleEnterNavigation = (currentField: 'productName' | 'quantity' | 'costPrice' | 'sellPrice' | 'serviceDescription' | 'serviceAmount') => {
    if (currentField === 'productName') {
       if (productNameQuery.trim() !== '' && !currentProductForSelection) { // User typed something but didn't select a suggestion
           const productsFound = searchProducts(productNameQuery);
           // If exactly one product matches and it has no variants or only one simple SKU, auto-select it
           if (productsFound.length === 1 && 
               (!productsFound[0].variants || productsFound[0].variants.length === 0) && 
               productsFound[0].productSKUs.length <= 1 && 
               productNameQuery.toLowerCase() === productsFound[0].name.toLowerCase()) {
                const productToSelect = productsFound[0];
                const skuToSelect = productToSelect.productSKUs[0]; // Might be undefined if no SKUs yet
                const suggestion: ProductSearchSuggestion = {
                    product: productToSelect,
                    sku: skuToSelect || { id: productToSelect.id + '_default_enter_nav', optionValues: {}, stockLayers: [], skuIdentifier: productToSelect.name },
                    displayInfo: { // This displayInfo is conceptual for the suggestion object
                        name: getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).skuIdentifier || productToSelect.name,
                        stock: productToSelect.trackQuantity ? (getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).totalStock ?? 0) : 'N/A',
                        price: getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).currentSellPrice !== null ? `₹${getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).currentSellPrice!.toFixed(2)}` : 'N/A',
                    }
                };
                handleProductSelectFromSearch(suggestion); // This will set currentProductForSelection and move focus
           } else if (productNotFoundHint === productNameQuery) { // Second Enter press after "not found" hint
                const billingFormPreFill = {
                  name: productNameQuery,
                  quantity: mode === 'buy' ? (typeof quantity === 'string' ? quantity : quantity.toString()) : undefined,
                  costPrice: mode === 'buy' ? (typeof costPrice === 'string' ? costPrice : costPrice.toString()) : undefined,
                  sellPrice: mode === 'buy' ? (typeof sellPrice === 'string' ? sellPrice : sellPrice.toString()) : undefined,
                };
                setNewProductDialogInitialValues(billingFormPreFill);
                setIsNewProductDialogOpen(true);
                // Do not resetFormFields here as dialog opens
            } else if (productsFound.length > 0 || productNameQuery.trim() !== '') { // Show hint on first Enter if product typed but not selected
                setProductNotFoundHint(productNameQuery);
            }
       } else if (currentProductForSelection) { // Product is already selected
            if (currentProductForSelection.variants && currentProductForSelection.variants.length > 0) {
                const firstUnselectedVariant = currentProductForSelection.variants.find(v => !selectedVariantOptions[v.name]);
                if(firstUnselectedVariant) { // If variants need selection, focus first unselected
                    setTimeout(() => {
                        setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true }));
                        variantSelectRefs.current[firstUnselectedVariant.id]?.current?.focus();
                    }, 50);
                } else { // All variants selected, move to quantity
                    quantityInputRef.current?.focus();
                    quantityInputRef.current?.select();
                }
            } else { // No variants, move to quantity
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
            }
       }
    } else if (currentField === 'quantity') {
      if (mode === 'buy') {
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      } else if (mode === 'sell' || mode === 'return') {
        handleAddNewItem(); // This will reset and focus product name
      }
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') {
        sellPriceBatchInputRef.current?.focus();
        sellPriceBatchInputRef.current?.select();
      }
    } else if (currentField === 'sellPrice') { // This context is for 'buy' mode's batch sell price
      if (mode === 'buy') handleAddNewItem(); // This will reset and focus product name
    } else if (currentField === 'serviceDescription') {
      serviceAmountInputRef.current?.focus();
      serviceAmountInputRef.current?.select();
    } else if (currentField === 'serviceAmount') {
      handleAddServiceItem();
    }
  };

  const updateBillItemQuantity = (itemId: string, newQuantity: number) => {
    setCurrentBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      }).filter(item => item.quantity > 0) // Remove item if quantity becomes 0
    );
  };

  const updateBillItemPrice = (itemId: string, newPrice: number, priceType: 'cost' | 'sell') => {
    if (mode !== 'buy') return; // Only editable for buy mode items in list
    setCurrentBillItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [priceType === 'cost' ? 'costPrice' : 'sellPrice']: Math.max(0, newPrice) } : item
      )
    );
  };

  const removeBillItem = (itemId: string) => {
    setCurrentBillItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return currentBillItems.reduce((acc, item) => {
      // For buy mode, total is based on costPrice. For sell/return, it's based on sellPrice.
      const price = mode === 'buy' ? (item.costPrice || 0) : (item.sellPrice || 0);
      return acc + (price * item.quantity);
    }, 0);
  };

  const calculatePotentialSellTotalForBuy = () => {
    if (mode !== 'buy') return 0;
    // This is the sum of (item.sellPrice * item.quantity) for items in the *current buy bill*
    return currentBillItems.reduce((acc, item) => acc + ((item.sellPrice || 0) * item.quantity), 0);
  };

  const proceedWithSave = (staffId: string, billPayloadToSave: PendingBillPayload) => {
    if (!billPayloadToSave) {
      toast({ variant: "destructive", title: "Internal Error", description: "No bill data to save." });
      setIsSavingAnimationVisible(false); // Ensure animation doesn't show if no data
      return;
    }
    const { billType, items: itemsToSave, storeIdForBill: storeIdForThisBill, ...otherBillData } = billPayloadToSave;

    const billResult = addBill(
      { type: billType, billedByStaffId: staffId, storeId: storeIdForThisBill, ...otherBillData },
      itemsToSave // Pass the already processed items (COGS set for sales, etc.)
    );

    if (billResult === null) { // addBill returns null if an error occurred (e.g. insufficient stock)
      setIsSavingAnimationVisible(false); // Don't show success animation
      // Toast for error would have been shown by addBill or earlier validation
      return;
    }

    setLastSavedBillMode(billType);
    setIsSavingAnimationVisible(true); // Trigger success animation
    // Form reset and navigation will happen in handleAnimationClose
  };

  const handleSaveBill = () => {
    if (currentBillItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Bill", description: "Please add items to the bill." });
      return;
    }

    let finalStoreId: string | undefined = undefined;
    if (isAdminContext) {
        const planId = activePlan?.id;
        if (planId === SUBSCRIPTION_PLAN_IDS.STARTER) {
            if (allStores.length === 1) finalStoreId = allStores[0].id;
            else {
                toast({ variant: "destructive", title: "Store Required", description: "Please add your store in Store Management before creating bills on the Starter plan."});
                return;
            }
        } else { // Growth, Pro, Enterprise
            if (allStores.length === 0) {
                 toast({ variant: "destructive", title: "No Stores Configured", description: "Please add stores in Store Management before creating bills." });
                 return;
            }
            if (!selectedStoreIdForAdmin) {
                toast({ variant: "destructive", title: "Store Not Selected", description: "Please select a store for this bill." });
                return;
            }
            finalStoreId = selectedStoreIdForAdmin;
        }
    } else { // Store Portal Context
      finalStoreId = storeIdFromProp;
    }

    // Map currentBillItems to the format expected by addBill (Omit<BillItem, 'id'|'productName'>)
    const billItemsForStore: Omit<BillItem, 'id'|'productName'>[] = currentBillItems.map(item => ({
      productId: item.productId, quantity: item.quantity,
      costPrice: item.costPrice || 0, sellPrice: item.sellPrice || 0, // Ensure these are numbers
      isDefective: item.isDefective, selectedVariantOptions: item.selectedVariantOptions,
    }));

    const billPaymentStatus = (mode === 'sell' || mode === 'buy') ? (isPaid ? 'paid' : 'unpaid') : undefined;

    const currentBillPayload: PendingBillPayload = {
      billType: mode, vendorOrCustomerName: customerVendorName || undefined,
      customerPhone: customerPhone || undefined, notes: notes || undefined,
      paymentStatus: billPaymentStatus, items: billItemsForStore,
      storeIdForBill: finalStoreId,
    };

    if (!isAdminContext && storeIdFromProp) { // Store portal context, requires employee verification
        setPendingBillPayload(currentBillPayload);
        setIsVerifyEmployeeDialogOpen(true);
    } else if (isAdminContext) { // Admin context
        if (!finalStoreId && activePlan && activePlan.maxStores > 0) { // Should be caught by earlier checks, but as a safeguard
            toast({ variant: "destructive", title: "Store Required", description: "A store context is required to save this bill for your plan."});
            return;
        }
        proceedWithSave('admin_self_billed', currentBillPayload); // Use a placeholder staff ID for admin
    }
  };

  const handleEmployeeVerifiedForBill = (staff: Staff) => {
    setIsVerifyEmployeeDialogOpen(false);
    if (pendingBillPayload) {
      proceedWithSave(staff.id, pendingBillPayload);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Billing data was unexpectedly cleared. Please try saving again." });
    }
    setPendingBillPayload(null); // Clear pending data after attempting save
  };

  const handleAnimationClose = () => {
    setIsSavingAnimationVisible(false);
    setLastSavedBillMode(null);
    resetFullForm();

    if (isAdminContext) {
      const currentQueryModeInUrl = searchParamsHook.get('mode');
      const basePath = '/admin/billing';
       if (currentQueryModeInUrl && ['sell', 'buy', 'return'].includes(currentQueryModeInUrl)) {
         // Stay on same page if mode was explicitly set
       } else {
         router.push(basePath); // Go to history view
       }
    }
    // For store portal, it stays on the billing form, ready for new bill
  };

  const handleModeChange = (newModeString: string) => {
    const newMode = newModeString as BillMode;
    if (allowedModes && allowedModes.length > 0 && !allowedModes.includes(newMode)) {
        toast({variant: "destructive", title: "Mode Not Allowed", description: `This terminal is not configured for ${newMode} operations.`});
        return;
    }

    if (newMode !== mode) {
        resetFullForm(); // Reset everything when mode changes via tabs
        setMode(newMode); // Update internal mode state first
        // Update URL without full page reload, parent key change will handle BillingForm reset if needed
        const basePath = isAdminContext ? '/admin/billing' : (storeIdFromProp ? `/storeportal/${storeIdFromProp}/billing` : '/admin/billing');
        router.push(`${basePath}?mode=${newMode}`, { scroll: false });
    }
  };

  const handleEditProductClick = () => {
    if (currentProductForSelection) {
        const params = new URLSearchParams();
        // Construct the current billing URL to return to
        const currentBillingUrl = `${pathname}?${searchParamsHook.toString()}`;
        params.set('returnTo', encodeURIComponent(currentBillingUrl));
        router.push(`/admin/products/${currentProductForSelection.id}?${params.toString()}`);
    }
  };

  const handleNewProductAddedFromDialog = (newProduct: Product) => {
    setIsNewProductDialogOpen(false);
    // Auto-select the newly added product
    const skuToSelect = newProduct.productSKUs.length > 0 ? newProduct.productSKUs[0] : undefined;
     const suggestion: ProductSearchSuggestion = {
      product: newProduct,
      sku: skuToSelect || { id: newProduct.id + '_default_dialog_add', optionValues: {}, stockLayers: [], skuIdentifier: newProduct.name },
      displayInfo: {
        name: getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).skuIdentifier || newProduct.name,
        stock: newProduct.trackQuantity ? (getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).totalStock ?? 0) : 'N/A',
        price: getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).currentSellPrice !== null ? `₹${getSkuDetails(skuToSelect, finalStoreIdForSkuDetails).currentSellPrice!.toFixed(2)}` : 'N/A',
      },
    };
    handleProductSelectFromSearch(suggestion);
  };

  const handleAddServiceItem = () => {
    if (!serviceDescription || !serviceAmount || parseFloat(serviceAmount.toString()) <= 0) {
      toast({ variant: "destructive", title: "Missing Service Info", description: "Please enter service description and a valid amount." });
      serviceDescriptionInputRef.current?.focus();
      return;
    }

    const amount = parseFloat(serviceAmount.toString());
    const serviceItem: BillItem = {
      id: uuidv4(), 
      productId: `SERVICE_ITEM_${uuidv4()}`, // Unique ID for service items
      productName: serviceDescription, 
      quantity: 1,
      costPrice: mode === 'buy' ? amount : 0, // Cost for service is the amount if it's an expense
      sellPrice: amount, // Sell price is the amount if it's a sale
      isDefective: undefined, 
      selectedVariantOptions: undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, serviceItem]);
    setServiceDescription('');
    setServiceAmount('');
    setTimeout(() => serviceDescriptionInputRef.current?.focus(), 0); // Focus back to description for next service
  };


  const displayModes = allowedModes || ['sell', 'buy', 'return'];
  const activeModeConfig = {
    sell: { icon: Send, color: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground", label: "Sales" },
    buy: { icon: ShoppingBag, color: "data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground", label: "Expense" },
    return: { icon: RotateCcw, color: "data-[state=active]:bg-amber-400 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-amber-950", label: "Return" },
  };

  // Determine if the store selection dropdown should be shown for admin
  const showAdminStoreSelector = isAdminContext && 
                               activePlan && 
                               activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && 
                               allStores.length > 1;

  const currentMode = searchParamsHook.get('mode') as BillMode | null;


  return (
    <div className="flex flex-col gap-6">
      <BillSaveAnimation
        show={isSavingAnimationVisible}
        billMode={lastSavedBillMode}
        onClose={handleAnimationClose}
      />
      {isNewProductDialogOpen && newProductDialogInitialValues && (
        <NewProductDialog
          isOpen={isNewProductDialogOpen}
          onOpenChange={setIsNewProductDialogOpen}
          onProductAdded={handleNewProductAddedFromDialog}
          initialValues={newProductDialogInitialValues}
        />
      )}
      {(!isAdminContext && storeIdFromProp) && (
        <EmployeePasskeyDialog
          isOpen={isVerifyEmployeeDialogOpen}
          onOpenChange={(open) => {
              if(!open && isVerifyEmployeeDialogOpen) { // If dialog is closed by user (not by successful auth)
                  setPendingBillPayload(null); // Clear pending bill if user cancels auth
              }
              setIsVerifyEmployeeDialogOpen(open);
          }}
          storeId={storeIdFromProp}
          onAuthenticated={handleEmployeeVerifiedForBill}
        />
      )}

      {/* Tabs are outside the card, centered */}
      <div className="flex justify-center">
        <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
          <TabsList className="grid w-full grid-cols-3 gap-1 h-11">
            {displayModes.includes('sell') && (
              <TabsTrigger value="sell" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.sell.color)}>
                <activeModeConfig.sell.icon size={18}/>{activeModeConfig.sell.label}
              </TabsTrigger>
            )}
            {displayModes.includes('buy') && (
              <TabsTrigger value="buy" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.buy.color)}>
                <activeModeConfig.buy.icon size={18}/>{activeModeConfig.buy.label}
              </TabsTrigger>
            )}
            {displayModes.includes('return') && (
              <TabsTrigger value="return" className={cn("flex items-center gap-2 text-sm px-4 py-2.5", activeModeConfig.return.color)}>
                <activeModeConfig.return.icon size={18}/>{activeModeConfig.return.label}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      <Card className="w-full shadow-lg flex flex-col border-t-2 border-t-primary">
        <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 p-6">
          {/* Admin Store Selector - only if admin, not starter, and multiple stores */}
          {showAdminStoreSelector && (
              <div className="space-y-1.5 pb-4 border-b border-dashed mb-4">
                <Label htmlFor="adminStoreSelect" className="flex items-center gap-1.5 text-base font-medium text-primary">
                    <Building size={18} /> Store for this Bill
                </Label>
                <Select value={selectedStoreIdForAdmin || ""} onValueChange={setSelectedStoreIdForAdmin}>
                    <SelectTrigger id="adminStoreSelect" className="w-full md:w-1/2 select-trigger-class">
                        <SelectValue placeholder="Select a store..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allStores.map(store => (
                            <SelectItem key={store.id} value={store.id}>{store.name} ({store.location})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {isAdminContext && activePlan && activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1 && !selectedStoreIdForAdmin && (
                    <p className="text-xs text-destructive mt-1">Please select a store before saving the bill.</p>
                 )}
              </div>
          )}
          {/* Message for Admin on Starter plan if no store configured */}
          {isAdminContext && activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 0 && (
             <p className="text-sm text-destructive text-center p-4 border border-dashed rounded-md bg-destructive/10">
                No store configured for your Starter plan. Please <Link href="/admin/stores" className="font-semibold underline hover:text-destructive/80">add your store</Link> in Store Management.
             </p>
          )}
          {/* Message for Admin on other plans if no store configured */}
          {isAdminContext && activePlan && activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 0 && (
             <p className="text-sm text-destructive text-center p-4 border border-dashed rounded-md bg-destructive/10">
                No stores configured. Please <Link href="/admin/stores" className="font-semibold underline hover:text-destructive/80">add stores</Link> in Store Management.
             </p>
          )}


          {/* Item Entry Section */}
          <div className="space-y-4 pb-4 border-b border-dashed">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <Settings2 size={20} className="text-muted-foreground"/> Add Item / Product
            </h3>
            <div className={cn(
              "grid gap-4 items-baseline", // Common classes
              "grid-cols-1", // Mobile default
              mode === 'buy' ? "md:grid-cols-[1fr_auto_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto]" // Desktop variations
            )}>
              {/* Product Name / SKU Input */}
              <div className="space-y-1.5 flex-grow">
                <Label htmlFor="productNameGlobal">Product Name / SKU</Label>
                <div className="flex items-center gap-2">
                  <ProductSearchInput
                    inputRef={productNameInputRef}
                    value={productNameQuery}
                    onValueChange={(v) => {
                        setProductNameQuery(v);
                        if (!v) { // If input is cleared
                            setCurrentProductForSelection(null);
                            setSelectedVariantOptions({});
                            setProductNotFoundHint('');
                            updateSkuDisplayInfo(undefined);
                            setIsDisplayingLayerStock(false);
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
                {/* Display Selected Product Info & "Not Found" Hint */}
                {currentProductForSelection && (
                  <div className="text-xs text-muted-foreground ml-1 space-y-0.5 mt-1">
                    <span>Selected: {getSkuDetails(currentProductForSelection.productSKUs.find(sku => JSON.stringify(Object.entries(sku.optionValues).sort()) === JSON.stringify(Object.entries(selectedVariantOptions).sort())), finalStoreIdForSkuDetails)?.skuIdentifier || currentProductForSelection.name}</span>
                    {currentProductForSelection.trackQuantity && currentSkuStock !== null && (
                      <span className="block">
                        {isDisplayingLayerStock && mode === 'sell' ? `Layer Stock: ${currentSkuStock}` : `Total Stock: ${currentSkuStock}`}
                      </span>
                    )}
                    {currentSkuSellPrice !== null && (
                      <span className="block">
                        Current Sell Price: ₹{currentSkuSellPrice.toFixed(2)}
                        {currentProductForSelection.trackQuantity && (isDisplayingLayerStock && mode === 'sell' ? "" : " (from oldest batch)")}
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

              {/* Quantity Input */}
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

              {/* Conditional Price Inputs for 'buy' mode */}
              {mode === 'buy' && (
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
                      ref={sellPriceBatchInputRef}
                      type="number"
                      value={sellPrice} // This 'sellPrice' state is used for buy mode's batch sell price
                      onChange={(e) => setSellPrice(parseFloat(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                      onFocus={(e) => e.target.select()}
                      step="0.01" min="0" placeholder="0.00"
                    />
                  </div>
                </>
              )}
              
              {/* Add Item Button */}
               <Button onClick={handleAddNewItem} className="w-full md:w-auto self-end bg-primary hover:bg-primary/90" variant="default">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add
               </Button>
            </div>

            {/* Variant Selection Dropdowns */}
            {currentProductForSelection && currentProductForSelection.variants && currentProductForSelection.variants.length > 0 && (
              <div className={cn(`grid md:grid-cols-${Math.min(currentProductForSelection.variants.length, 3)} gap-4 mt-3 items-end`)}>
                {currentProductForSelection.variants.map((variant, index) => {
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
                        }}
                        value={selectedVariantOptions[variant.name] || ""}
                        onValueChange={(value) => {
                            setSelectedVariantOptions((prev) => ({ ...prev, [variant.name]: value }));
                            setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: false })); // Close current dropdown

                            // Logic to open next variant dropdown or focus quantity
                            const currentIndex = currentProductForSelection!.variants!.findIndex(v_ => v_.id === variant.id);
                            if (currentIndex < currentProductForSelection!.variants!.length - 1) {
                                const nextVariantId = currentProductForSelection!.variants![currentIndex + 1].id;
                                setTimeout(() => { // Timeout ensures state updates and dropdown can re-render before focus
                                  setVariantDropdownOpenState((prev) => ({ ...prev, [nextVariantId]: true }));
                                  variantSelectRefs.current[nextVariantId]?.current?.focus();
                                }, 50);
                            } else { // Last variant selected
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
                            if (e.key === 'Enter' && !variantDropdownOpenState[variant.id]) { // Open dropdown on Enter if closed
                                e.preventDefault();
                                setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: true }));
                            } else if (e.key === 'Tab' && !e.shiftKey) { // Handle Tab navigation
                                if (index < currentProductForSelection!.variants!.length -1) {
                                    e.preventDefault();
                                    setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: false })); // Close current
                                    const nextVariantId = currentProductForSelection!.variants![index + 1].id;
                                    setVariantDropdownOpenState(prev => ({ ...prev, [nextVariantId]: true })); // Open next
                                    variantSelectRefs.current[nextVariantId]?.current?.focus();
                                } else if (index === currentProductForSelection!.variants!.length -1) { // Last variant, tab to quantity
                                    e.preventDefault();
                                    setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: false }));
                                    quantityInputRef.current?.focus();
                                    quantityInputRef.current?.select();
                                }
                            }
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

            {/* Return Item Defective Switch */}
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

          {/* Current Bill Items List */}
          <div className="flex-grow overflow-hidden">
            {currentBillItems.length > 0 && <BillItemHeader mode={mode} />}
            <ScrollArea className="flex-1 -mx-6 px-6 h-[200px] md:h-auto md:max-h-[300px]">
              {currentBillItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in the bill yet.</p>
              ) : (
                <div className="space-y-0">
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

          {/* Add Service/Charge Section */}
          {(mode === 'sell' || mode === 'buy') && (
            <div className="pt-4 border-t border-dashed mt-auto space-y-3">
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
          {/* Customer/Vendor and Notes */}
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
            {mode !== 'buy' && ( // Customer phone only for sell/return
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
             <div className={cn("space-y-1.5", mode === 'buy' && "md:col-span-2")}>
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

          {/* Payment Status and Totals */}
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
              disabled={currentBillItems.length === 0 || isVerifyEmployeeDialogOpen || (isAdminContext && allStores.length === 0 && activePlan && activePlan.maxStores > 0)}
            >
              <Save className="mr-2 h-4 w-4" /> Save Bill
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
