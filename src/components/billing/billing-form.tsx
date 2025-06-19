
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput, type ProductSearchSuggestion } from './product-search-input';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode, ProductSKU, Store, Staff, Bill, ProductVariant as ProductVariantType, AdditionalChargeDefinition } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw, Edit3, CornerDownLeft, Info, CircleDollarSign, Settings2, Building, LogInIcon, Percent, Printer, Barcode as BarcodeIconLucide, Loader2 } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateBillPrintContent, triggerPrint } from '@/lib/print-utils';
import { HardwareBarcodeScanModal } from '@/components/common/HardwareBarcodeScanModal';


type PendingBillPayload = {
  billType: BillMode;
  vendorOrCustomerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentStatus?: 'paid' | 'unpaid';
  items: Omit<BillItem, 'id'|'productName'|'sgstAmount'|'cgstAmount'>[];
  storeIdForBill?: string;
  isEstimate?: boolean;
};

interface BillingFormProps {
  storeId?: string;
  allowedModes?: BillMode[];
  initialModeProp?: BillMode | null;
  isAdminContext?: boolean;
  preselectedStoreId?: string | null;
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

  const {
    addBill, searchProducts, getProductById, getAllStores,
    findOrCreateProductSKU, getSkuDetails, getSkuIdentifier,
    getActiveSubscriptionPlan, userProfile, products: allProductsStoreHook,
    updateProduct: updateProductInStore, // Added
    fetchProducts
  } = useInventoryStore(state => ({
    addBill: state.addBill,
    searchProducts: state.searchProducts,
    getProductById: state.getProductById,
    getAllStores: state.getAllStores,
    findOrCreateProductSKU: state.findOrCreateProductSKU,
    getSkuDetails: state.getSkuDetails,
    getSkuIdentifier: state.getSkuIdentifier,
    getActiveSubscriptionPlan: state.getActiveSubscriptionPlan,
    userProfile: state.userProfile,
    products: state.products,
    updateProduct: state.updateProduct, // Added
    fetchProducts: state.fetchProducts,
  }));
  const companyId = useInventoryStore(state => localStorage.getItem('companyId') || "comp_default_001");

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  const [hasMounted, setHasMounted] = useState(false);

  const [mode, setMode] = useState<BillMode>('sell');
  const [isEstimateMode, setIsEstimateMode] = useState(false);

  const [selectedStoreIdForAdmin, setSelectedStoreIdForAdmin] = useState<string | undefined>(undefined);

  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellPrice, setSellPrice] = useState<number | string>('');

  const [currentSkuStock, setCurrentSkuStock] = useState<number | null>(null);
  const [currentSkuSellPrice, setCurrentSkuSellPrice] = useState<number | null>(null);
  const [isDisplayingLayerStock, setIsDisplayingLayerStock] = useState(false);

  const [currentProductForSelection, setCurrentProductForSelection] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [variantDropdownOpenState, setVariantDropdownOpenState] = useState<Record<string, boolean>>({});

  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false);

  const [productNotFoundHint, setProductNotFoundHint] = useState('');
  const [isSavingAnimationVisible, setIsSavingAnimationVisible] = useState(false);
  const [lastSavedBillMode, setLastSavedBillMode] = useState<BillMode | null>(null);
  const [lastSavedBillIsEstimate, setLastSavedBillIsEstimate] = useState<boolean>(false);
  const [isVerifyEmployeeDialogOpen, setIsVerifyEmployeeDialogOpen] = useState(false);
  const [pendingBillPayload, setPendingBillPayload] = useState<PendingBillPayload | null>(null);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProductDialogInitialValues, setNewProductDialogInitialValues] = useState<{ name: string; quantity?: string; costPrice?: string; sellPrice?: string; } | null>(null);

  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceAmount, setServiceAmount] = useState<number | string>('');

  const [billToPotentiallyPrint, setBillToPotentiallyPrint] = useState<Bill | null>(null);
  const [isPrintConfirmDialogOpen, setIsPrintConfirmDialogOpen] = useState(false);
  
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeScanPurpose, setBarcodeScanPurpose] = useState<'addItem' | 'updateProductSku' | null>(null);
  const [productToUpdateSkuFor, setProductToUpdateSkuFor] = useState<Product | null>(null);
  const [isLoadingProductSearch, setIsLoadingProductSearch] = useState(false);


  const productNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const sellPriceBatchInputRef = useRef<HTMLInputElement>(null);
  const customerVendorNameInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);
  const serviceDescriptionInputRef = useRef<HTMLInputElement>(null);
  const serviceAmountInputRef = useRef<HTMLInputElement>(null);
  const variantSelectRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});

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
    return 'sell';
  }, [initialModeProp, allowedModes, searchParamsHook]);

  useEffect(() => {
    const newDeterminedMode = determineMode();
    if (newDeterminedMode !== mode) {
      setMode(newDeterminedMode);
    }
  }, [determineMode, mode]);

  useEffect(() => {
    if (isAdminContext && hasMounted && activePlan) {
      if (preselectedStoreId && allStores.find(s => s.id === preselectedStoreId)) {
        setSelectedStoreIdForAdmin(preselectedStoreId);
      } else if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 0) {
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 1) {
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1 && !preselectedStoreId) {
        setSelectedStoreIdForAdmin(allStores[0].id);
      } else {
        setSelectedStoreIdForAdmin(undefined);
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

    setNotes(userProfile.defaultBillNotes || '');
    if (mode === 'sell') {
      setIsPaid(userProfile.defaultSalesPaymentStatus === 'paid');
    } else if (mode === 'buy') {
      setIsPaid(userProfile.defaultPurchasePaymentStatus === 'paid');
    } else {
      setIsPaid(true);
    }

    setIsEstimateMode(false);
    setServiceDescription('');
    setServiceAmount('');
    resetFormFields(true);
    setPendingBillPayload(null);
    setBillToPotentiallyPrint(null);
  }, [resetFormFields, userProfile, mode]);


  useEffect(() => {
    setTimeout(() => productNameInputRef.current?.focus(), 50);
    setNotes(userProfile.defaultBillNotes || '');
    if (mode === 'sell') {
      setIsPaid(userProfile.defaultSalesPaymentStatus === 'paid');
    } else if (mode === 'buy') {
      setIsPaid(userProfile.defaultPurchasePaymentStatus === 'paid');
    } else {
      setIsPaid(true);
    }
  }, [mode, userProfile]);

  const finalStoreIdForSkuDetails = useMemo(() => {
    return isAdminContext ? selectedStoreIdForAdmin : storeIdFromProp;
  }, [isAdminContext, selectedStoreIdForAdmin, storeIdFromProp]);

  const updateSkuDisplayInfo = useCallback((skuToUse?: ProductSKU) => {
    if (skuToUse && currentProductForSelection) {
      const details = getSkuDetails(skuToUse, finalStoreIdForSkuDetails);
      setCurrentSkuStock(currentProductForSelection.trackQuantity ? details.totalStock : null);
      setIsDisplayingLayerStock(false);
      setCurrentSkuSellPrice(details.currentSellPrice);
      if (mode === 'sell' || mode === 'return') {
        setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : '');
      } else if (mode === 'buy') {
          setCostPrice('');
          setSellPrice(details.currentSellPrice !== null ? details.currentSellPrice.toString() : '');
      }
    } else if (currentProductForSelection && !skuToUse) {
        setCurrentSkuStock(currentProductForSelection.trackQuantity ? 0 : null);
        setIsDisplayingLayerStock(false);
        setCurrentSkuSellPrice(null);
        setSellPrice('');
        if (mode === 'buy') setCostPrice('');
    } else {
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
        setProductNameQuery(skuDetailsToUse.skuIdentifier || product.name); // Display SKU identifier or product name
        setSelectedVariantOptions(sku.optionValues || {});

        if (mode === 'sell' && product.trackQuantity && layer && typeof layer.quantity === 'number') {
            setCurrentSkuStock(layer.quantity);
            setIsDisplayingLayerStock(true);
            setCurrentSkuSellPrice(layer.sellPrice);
            setSellPrice(layer.sellPrice.toString());
        } else {
            setCurrentSkuStock(product.trackQuantity ? skuDetailsToUse.totalStock : null);
            setIsDisplayingLayerStock(false);
            setCurrentSkuSellPrice(skuDetailsToUse.currentSellPrice);
            setSellPrice(skuDetailsToUse.currentSellPrice !== null ? skuDetailsToUse.currentSellPrice.toString() : '');
        }
        if (mode === 'buy') {
            setCostPrice(''); // Cost price for buy is entered manually per batch
        }
    } else { // Should not happen if suggestion always has an SKU
        setProductNameQuery(product.name);
        setSelectedVariantOptions({});
        updateSkuDisplayInfo(undefined);
    }

    setProductNotFoundHint(''); // Clear any "not found" hint

    // Focus logic
    if (product.variants && product.variants.length > 0 && (!sku || Object.keys(sku.optionValues || {}).length < product.variants.length)) {
      // If variants exist and not all are selected (e.g. base product selected from search)
      const firstUnselectedVariant = product.variants.find(v => !(selectedVariantOptions[v.name]));
      if (firstUnselectedVariant) {
          setTimeout(() => {
            setVariantDropdownOpenState({ [firstUnselectedVariant.id]: true });
            variantSelectRefs.current[firstUnselectedVariant.id]?.current?.focus();
          }, 50);
      } else if (Object.keys(selectedVariantOptions).length === product.variants.length) {
          // All variants selected, focus quantity
          setTimeout(() => {
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
          }, 50);
      }
    } else { // No variants or all selected, focus quantity
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 50);
    }
  }, [getSkuDetails, mode, updateSkuDisplayInfo, finalStoreIdForSkuDetails, selectedVariantOptions]);


  useEffect(() => {
    if (!hasMounted) return;
    const newlyAddedProductId = searchParamsHook.get('newlyAddedProductId');
    if (newlyAddedProductId) {
      const product = getProductById(newlyAddedProductId);
      if (product) {
        const skuToSelect = product.productSKUs.length > 0 ? product.productSKUs[0] : undefined;
        const skuDetails = getSkuDetails(skuToSelect, finalStoreIdForSkuDetails);
        const suggestionForNewProduct: ProductSearchSuggestion = {
            product,
            sku: skuToSelect || { id: product.id + '_default_new_bill', optionValues: {}, stockLayers: [], skuIdentifier: product.name },
            displayInfo: {
                name: skuDetails.skuIdentifier || product.name,
                stock: product.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A',
                price: skuDetails.currentSellPrice !== null ? `₹${skuDetails.currentSellPrice.toFixed(2)}` : 'N/A',
            }
        };
        handleProductSelectFromSearch(suggestionForNewProduct);
      }
      // Clean up the URL parameter
      const newParams = new URLSearchParams(searchParamsHook.toString());
      newParams.delete('newlyAddedProductId');
      router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
    }
  }, [searchParamsHook, getProductById, router, pathname, handleProductSelectFromSearch, finalStoreIdForSkuDetails, hasMounted]);

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

  useEffect(() => {
    if (currentProductForSelection?.variants && currentProductForSelection.variants.length > 0) {
        const allVariantsSelected = currentProductForSelection.variants.every(
          (v) => selectedVariantOptions[v.name]
        );

        if (allVariantsSelected) {
          const lastVariantId = currentProductForSelection.variants[currentProductForSelection.variants.length - 1].id;
          if (!variantDropdownOpenState[lastVariantId] && document.activeElement?.id !== quantityInputRef.current?.id) {
              const currentSku = currentProductForSelection.productSKUs.find(sku =>
                JSON.stringify(Object.entries(sku.optionValues || {}).sort()) === JSON.stringify(Object.entries(selectedVariantOptions).sort())
              );
              updateSkuDisplayInfo(currentSku); // Update price/stock display for the fully selected SKU
              setTimeout(() => {
                  quantityInputRef.current?.focus();
                  quantityInputRef.current?.select();
              }, 50);
          }
        }
    }
  }, [selectedVariantOptions, currentProductForSelection, updateSkuDisplayInfo, variantDropdownOpenState]);


  const handleAddNewItem = () => {
    const currentQuantity = typeof quantity === 'string' ? parseFloat(quantity) || 1 : quantity || 1;
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
        const stockToCheck = isDisplayingLayerStock && currentSkuStock !== null && mode === 'sell'
                           ? currentSkuStock // If specific layer stock is shown (from suggestion)
                           : (skuDetails.totalStock ?? 0); // Otherwise, total stock for the SKU

        if (stockToCheck < currentQuantity) {
          toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${stockToCheck.toFixed(2)} of ${itemProductNameForBill} available at this store.` });
          return;
        }
    }

    let itemCostPrice: number;
    let itemSellPriceForBill: number;
    let itemSgstAmount: number | undefined = 0;
    let itemCgstAmount: number | undefined = 0;

    if (mode === 'buy') {
      itemCostPrice = parseFloat(costPrice.toString()) || 0;
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || 0;
      if (itemCostPrice <= 0 && currentQuantity > 0 && product.trackQuantity) {
        toast({ variant: "destructive", title: "Invalid Cost Price", description: "Cost Price must be greater than 0 for tracked purchases."});
        costPriceInputRef.current?.focus();
        return;
      }
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && product.trackQuantity && itemCostPrice > 0) {
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for purchased batch must be greater than 0."});
        sellPriceBatchInputRef.current?.focus();
        return;
      }
    } else if (mode === 'sell') {
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || currentSkuSellPrice || 0; // Use form input if set, else default from SKU

      if (product.trackQuantity === false) { // Non-tracked items
        itemCostPrice = skuDetails.averageCostPrice ?? 0; // Use average or default cost
      } else { // Tracked items
        itemCostPrice = 0; // COGS will be calculated on server FIFO for sales
      }
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Sell Price", description: "Sell price for products must be greater than 0."});
        return;
      }
      // Calculate tax for non-service items
      if (!isEstimateMode && !product.id?.startsWith('SERVICE_ITEM_')) {
        const itemSubTotal = itemSellPriceForBill * currentQuantity;
        itemSgstAmount = (itemSubTotal * (product.sgstRate || 0)) / 100;
        itemCgstAmount = (itemSubTotal * (product.cgstRate || 0)) / 100;
      }

    } else { // mode === 'return'
      itemSellPriceForBill = parseFloat(sellPrice.toString()) || currentSkuSellPrice || 0; // Price at which it's being returned
      // Cost for returns is often the average cost price from inventory.
      itemCostPrice = skuDetails.averageCostPrice ?? 0;
      if (itemSellPriceForBill <= 0 && currentQuantity > 0 && !product.id?.startsWith('SERVICE_ITEM_')) {
        toast({ variant: "destructive", title: "Invalid Return Price", description: "Return price must be greater than 0."});
        return;
      }
      if (!product.id?.startsWith('SERVICE_ITEM_')) {
        const itemSubTotal = itemSellPriceForBill * currentQuantity;
        itemSgstAmount = (itemSubTotal * (product.sgstRate || 0)) / 100;
        itemCgstAmount = (itemSubTotal * (product.cgstRate || 0)) / 100;
      }
    }

    const newItem: BillItem = {
      id: uuidv4(), productId: product.id, productName: itemProductNameForBill,
      quantity: currentQuantity, costPrice: itemCostPrice, sellPrice: itemSellPriceForBill,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
      selectedVariantOptions: (product.variants && product.variants.length > 0) ? { ...selectedVariantOptions } : undefined,
      sgstAmount: itemSgstAmount,
      cgstAmount: itemCgstAmount,
      isAdditionalCharge: false, // This item itself is not an additional charge
    };
    const itemsToAdd = [newItem];

    // Add associated additional charges if defined for the product
    if (product.additionalChargeDefinitions && product.additionalChargeDefinitions.length > 0 && (mode === 'sell' || mode === 'return')) {
        product.additionalChargeDefinitions.forEach(charge => {
            let chargeValue = 0;
            if (charge.type === 'fixed') {
                chargeValue = charge.value;
            } else if (charge.type === 'percentage') {
                // Percentage calculated based on the main product item's line total (sellPrice * quantity)
                chargeValue = ((itemSellPriceForBill * currentQuantity) * charge.value) / 100;
            }

            itemsToAdd.push({
                id: uuidv4(),
                productId: `CHARGE_ITEM_${charge.id}`, // Special ID prefix
                productName: charge.name,
                quantity: 1, // Charges are typically per main item instance or per bill
                costPrice: 0, // Charges usually don't have a cost price in this context
                sellPrice: chargeValue,
                isAdditionalCharge: true,
                sourceChargeDefinitionId: charge.id,
                sgstAmount: 0, // Additional charges typically don't have their own GST in this model
                cgstAmount: 0,
            });
        });
    }


    setCurrentBillItems(prevItems => [...prevItems, ...itemsToAdd]);
    resetFormFields(true);
  };

  const findAndPopulateProductByBarcode = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) return;
    setIsLoadingProductSearch(true);
  
    let foundProduct: Product | undefined = undefined;
    let foundSkuForProduct: ProductSKU | undefined = undefined;
  
    for (const p of allProductsStoreHook) {
      if (p.sku === barcodeValue) { // Prioritize base product SKU
        foundProduct = p;
        foundSkuForProduct = p.productSKUs.find(s => Object.keys(s.optionValues || {}).length === 0) || p.productSKUs[0];
        break;
      }
      for (const s of p.productSKUs) {
        if (s.skuIdentifier === barcodeValue) { // Then check variant SKU identifiers
          foundProduct = p;
          foundSkuForProduct = s;
          break;
        }
      }
      if (foundProduct) break;
    }
    setIsLoadingProductSearch(false);
  
    if (foundProduct) {
      const skuToUse = foundSkuForProduct || (foundProduct.productSKUs.length > 0 ? foundProduct.productSKUs[0] : { id: foundProduct.id + '_default_barcode_scan', optionValues: {}, stockLayers: [], skuIdentifier: foundProduct.name });
      const skuDetails = getSkuDetails(skuToUse, finalStoreIdForSkuDetails);
      const suggestion: ProductSearchSuggestion = {
        product: foundProduct,
        sku: skuToUse,
        displayInfo: {
          name: skuDetails.skuIdentifier || foundProduct.name,
          stock: foundProduct.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A',
          price: skuDetails.currentSellPrice !== null ? `₹${skuDetails.currentSellPrice.toFixed(2)}` : 'N/A',
        }
      };
      handleProductSelectFromSearch(suggestion);
      toast({ title: "Product Found", description: `${suggestion.displayInfo.name} selected for billing.` });
      resetFormFields(false); 
      setTimeout(() => quantityInputRef.current?.focus(), 50);
    } else {
      toast({ variant: "destructive", title: "Barcode Not Found", description: `No product matched barcode: ${barcodeValue}` });
      setProductNameQuery(barcodeValue);
      setProductNotFoundHint(barcodeValue);
      productNameInputRef.current?.focus();
    }
  };

  const handleBarcodeIconClick = () => {
    if (currentProductForSelection) {
      setProductToUpdateSkuFor(currentProductForSelection);
      setBarcodeScanPurpose('updateProductSku');
    } else {
      setProductToUpdateSkuFor(null);
      setBarcodeScanPurpose('addItem');
    }
    setIsBarcodeModalOpen(true);
  };

  const handleBarcodeScannedFromModal = async (barcodeValue: string) => {
    setIsBarcodeModalOpen(false);
  
    if (barcodeScanPurpose === 'addItem') {
      await findAndPopulateProductByBarcode(barcodeValue);
    } else if (barcodeScanPurpose === 'updateProductSku' && productToUpdateSkuFor) {
      const productToUpdate = productToUpdateSkuFor;
      try {
        const updatedProduct = await updateProductInStore(
          productToUpdate.id,
          { sku: barcodeValue }, // Update the base 'sku' field of the Product
          companyId
        );
        if (updatedProduct) {
          toast({ title: "Product SKU Updated", description: `Base SKU for ${updatedProduct.name} set to ${barcodeValue}.` });
          if (currentProductForSelection && currentProductForSelection.id === updatedProduct.id) {
            setCurrentProductForSelection(updatedProduct);
            // Update product name query if it was displaying the old SKU or if user expects visual feedback
            setProductNameQuery(updatedProduct.name); // Or updatedProduct.sku
            // Re-fetch and display details for the updated product
            const skuToUse = updatedProduct.productSKUs.find(s => Object.keys(s.optionValues).length === 0) || updatedProduct.productSKUs[0] || {id: updatedProduct.id + '_temp', optionValues:{}, stockLayers:[], skuIdentifier: updatedProduct.name};
            updateSkuDisplayInfo(skuToUse);
          }
        } else {
          toast({ variant: "destructive", title: "Update Failed", description: "Could not update product SKU." });
        }
      } catch (error) {
        console.error("Error updating product SKU:", error);
        toast({ variant: "destructive", title: "Error", description: "An error occurred while updating SKU." });
      }
    }
    setBarcodeScanPurpose(null);
    setProductToUpdateSkuFor(null);
    productNameInputRef.current?.focus();
  };


  const handleEnterNavigation = (currentField: 'productName' | 'quantity' | 'costPrice' | 'sellPrice' | 'serviceDescription' | 'serviceAmount') => {
    if (currentField === 'productName') {
       if (productNotFoundHint && productNameQuery === productNotFoundHint && productNameQuery.trim() !== '') {
            const billingFormPreFill = {
              name: productNameQuery,
              quantity: mode === 'buy' ? (typeof quantity === 'string' ? quantity : quantity.toString()) : undefined,
              costPrice: mode === 'buy' ? (typeof costPrice === 'string' ? costPrice : costPrice.toString()) : undefined,
              sellPrice: mode === 'buy' ? (typeof sellPrice === 'string' ? sellPrice : sellPrice.toString()) : undefined,
            };
            setNewProductDialogInitialValues(billingFormPreFill);
            setIsNewProductDialogOpen(true);
        } else if (currentProductForSelection) {
            if (currentProductForSelection.variants && currentProductForSelection.variants.length > 0) {
                const firstUnselectedVariant = currentProductForSelection.variants.find(v => !selectedVariantOptions[v.name]);
                if(firstUnselectedVariant) {
                    setTimeout(() => {
                        setVariantDropdownOpenState(prev => ({ ...prev, [firstUnselectedVariant.id]: true }));
                        variantSelectRefs.current[firstUnselectedVariant.id]?.current?.focus();
                    }, 50);
                } else { // All variants selected
                    quantityInputRef.current?.focus();
                    quantityInputRef.current?.select();
                }
            } else { // No variants
                quantityInputRef.current?.focus();
                quantityInputRef.current?.select();
            }
       }
    } else if (currentField === 'quantity') {
      if (mode === 'buy') {
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      } else if (mode === 'sell' || mode === 'return') {
        handleAddNewItem(); // Attempt to add item after quantity entry
      }
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') {
        sellPriceBatchInputRef.current?.focus();
        sellPriceBatchInputRef.current?.select();
      }
    } else if (currentField === 'sellPrice') {
      if (mode === 'buy') handleAddNewItem(); // Add item after sell price for buy mode
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
          let updatedItem = { ...item, quantity: Math.max(0, newQuantity) };
          // Recalculate tax if quantity changes for sell/return items
          if ((mode === 'sell' || mode === 'return') && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
            const product = getProductById(item.productId);
            if (product) {
              const itemSubTotal = updatedItem.sellPrice * updatedItem.quantity;
              updatedItem.sgstAmount = (itemSubTotal * (product.sgstRate || 0)) / 100;
              updatedItem.cgstAmount = (itemSubTotal * (product.cgstRate || 0)) / 100;
            }
          }
          return updatedItem;
        }
        return item;
      }).filter(item => item.quantity > 0 || item.isAdditionalCharge) // Remove if quantity is 0, unless it's a charge
    );
  };

  const updateBillItemPrice = (itemId: string, newPrice: number, priceType: 'cost' | 'sell') => {
    if (mode !== 'buy') return; // Only allow price edit in buy mode for bill items
    setCurrentBillItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, [priceType === 'cost' ? 'costPrice' : 'sellPrice']: Math.max(0, newPrice) } : item
      )
    );
  };

  const removeBillItem = (itemId: string) => {
    setCurrentBillItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const calculateBillTotals = () => {
    let subTotal = 0;
    let totalSGST = 0;
    let totalCGST = 0;

    currentBillItems.forEach(item => {
      const itemSubTotal = item.sellPrice * item.quantity;
      subTotal += itemSubTotal; // For sell/return, subtotal is sum of sellPrice*qty of all items (products+charges)
      
      if ((mode === 'sell' || mode === 'return') && !isEstimateMode && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_')) {
        totalSGST += item.sgstAmount || 0;
        totalCGST += item.cgstAmount || 0;
      }
    });

    let grandTotal;
    if (mode === 'buy') {
        subTotal = currentBillItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
        grandTotal = subTotal; // For buy bills, grand total is total cost
        totalSGST = 0; // No output tax on buy bills
        totalCGST = 0;
    } else if ((mode === 'sell' || mode === 'return')) {
        if (isEstimateMode) {
            grandTotal = subTotal; // No tax on estimates
            totalSGST = 0;
            totalCGST = 0;
        } else {
            grandTotal = subTotal + totalSGST + totalCGST;
        }
    } else { // Should not happen
        grandTotal = subTotal;
    }
    return { subTotal, totalSGST, totalCGST, grandTotal };
  };

  const billTotals = useMemo(calculateBillTotals, [currentBillItems, mode, isEstimateMode]);

  const startSaveProcess = async (staffId: string, billPayloadToSave: PendingBillPayload) => {
    if (!billPayloadToSave) {
      toast({ variant: "destructive", title: "Internal Error", description: "No bill data to save." });
      return;
    }
    try {
      const savedBill = await addBill(
        {
          type: billPayloadToSave.billType,
          billedByStaffId: staffId,
          storeId: billPayloadToSave.storeIdForBill,
          companyId: companyId,
          isEstimate: billPayloadToSave.isEstimate,
          ... (({ billType, items, storeIdForBill, isEstimate, ...otherData }) => otherData)(billPayloadToSave)
        },
        billPayloadToSave.items
      );

      if (savedBill) {
        setBillToPotentiallyPrint(savedBill);
        setIsPrintConfirmDialogOpen(true); // Trigger print confirmation
      } else {
        // addBill already throws an error if API fails, which is caught below
      }
    } catch (error) {
      console.error("Error during bill save process:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error instanceof Error ? error.message : "Could not save the bill. Please check stock or product details." });
    }
  };

  const handleConfirmPrint = (print: boolean) => {
    setIsPrintConfirmDialogOpen(false);
    if (print && billToPotentiallyPrint) {
        const printContent = generateBillPrintContent(billToPotentiallyPrint, userProfile, allProductsStoreHook);
        triggerPrint(printContent);
    }
    // Proceed with success animation regardless of print choice
    if (billToPotentiallyPrint) { // Check if bill was actually saved
        setLastSavedBillMode(billToPotentiallyPrint.type);
        setLastSavedBillIsEstimate(billToPotentiallyPrint.isEstimate || false);
        setIsSavingAnimationVisible(true);
    }
    setBillToPotentiallyPrint(null); // Clear for next bill
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
        } else { // Growth or Pro plan
            if (allStores.length === 0) {
                 toast({ variant: "destructive", title: "No Stores Configured", description: "Please add stores in Store Management before creating bills." });
                 return;
            }
            if (!selectedStoreIdForAdmin) { // Multi-store setup but no store selected
                toast({ variant: "destructive", title: "Store Not Selected", description: "Please select a store for this bill." });
                return;
            }
            finalStoreId = selectedStoreIdForAdmin;
        }
    } else { // Store context (billing terminal)
      finalStoreId = storeIdFromProp;
    }

    // Prepare items payload
    const billItemsForStore: Omit<BillItem, 'id'|'productName'|'sgstAmount'|'cgstAmount'>[] = currentBillItems.map(item => ({
      productId: item.productId, quantity: item.quantity,
      costPrice: item.costPrice || 0, // Ensure costPrice is a number
      sellPrice: item.sellPrice || 0, // Ensure sellPrice is a number
      isDefective: item.isDefective, selectedVariantOptions: item.selectedVariantOptions,
      isAdditionalCharge: item.isAdditionalCharge,
      sourceChargeDefinitionId: item.sourceChargeDefinitionId,
    }));

    const billPaymentStatus = (mode === 'sell' || mode === 'buy') ? (isPaid ? 'paid' : 'unpaid') : undefined;

    const currentBillPayload: PendingBillPayload = {
      billType: mode, vendorOrCustomerName: customerVendorName || undefined,
      customerPhone: customerPhone || undefined, notes: notes || undefined,
      paymentStatus: billPaymentStatus, items: billItemsForStore,
      storeIdForBill: finalStoreId,
      isEstimate: mode === 'sell' ? isEstimateMode : undefined,
    };

    if (!isAdminContext && storeIdFromProp) { // Store terminal context
        setPendingBillPayload(currentBillPayload);
        setIsVerifyEmployeeDialogOpen(true);
    } else if (isAdminContext) { // Admin context
        if (!finalStoreId && activePlan && activePlan.maxStores > 0) { // Should be caught earlier, but defensive
            toast({ variant: "destructive", title: "Store Required", description: "A store context is required to save this bill for your plan."});
            return;
        }
        startSaveProcess('admin_self_billed', currentBillPayload); // Admin bills on their own behalf
    }
  };

  const handleEmployeeVerifiedForBill = (staff: Staff) => {
    setIsVerifyEmployeeDialogOpen(false);
    if (pendingBillPayload) {
      startSaveProcess(staff.id, pendingBillPayload);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Billing data was unexpectedly cleared. Please try saving again." });
    }
    setPendingBillPayload(null); // Clear pending payload
  };

  const handleAnimationClose = () => {
    setIsSavingAnimationVisible(false);
    setLastSavedBillMode(null);
    setLastSavedBillIsEstimate(false);
    resetFullForm(); // Reset the entire form for a new bill

    // For admin, if the URL has ?mode=... we keep it, otherwise navigate to base /admin/billing
    if (isAdminContext) {
      const currentQueryModeInUrl = searchParamsHook.get('mode');
      const basePath = '/admin/billing';
       if (currentQueryModeInUrl && ['sell', 'buy', 'return'].includes(currentQueryModeInUrl)) {
         // Stay on the current mode page
       } else {
         // If no mode in URL or it's an action like 'new', go to history view
         router.push(basePath); // This will show bill history by default
       }
    }
    // For store portal, it just resets the form, stays on the same page.
  };

  const handleModeChange = (newModeString: string) => {
    const newMode = newModeString as BillMode;
    if (allowedModes && allowedModes.length > 0 && !allowedModes.includes(newMode)) {
        toast({variant: "destructive", title: "Mode Not Allowed", description: `This terminal is not configured for ${newMode} operations.`});
        return;
    }

    if (newMode !== mode) {
        resetFullForm(); // Reset everything when mode changes
        setMode(newMode);
        // Update URL to reflect the new mode without full page reload
        const basePath = isAdminContext ? '/admin/billing' : (storeIdFromProp ? `/storeportal/${storeIdFromProp}/billing` : '/admin/billing'); // Fallback for admin if storeId somehow missing
        router.push(`${basePath}?mode=${newMode}`, { scroll: false });
    }
  };

  const handleEditProductClick = () => {
    if (currentProductForSelection) {
        const params = new URLSearchParams();
        // Construct the current billing URL (including any existing query params)
        const currentBillingUrl = `${pathname}?${searchParamsHook.toString()}`;
        params.set('returnTo', encodeURIComponent(currentBillingUrl));
        router.push(`/admin/products/${currentProductForSelection.id}?${params.toString()}`);
    }
  };

  const handleNewProductAddedFromDialog = (newProduct: Product) => {
    setIsNewProductDialogOpen(false);
    // Select the newly added product in the ProductSearchInput
    const skuToSelect = newProduct.productSKUs.length > 0 ? newProduct.productSKUs[0] : undefined;
    const skuDetails = getSkuDetails(skuToSelect, finalStoreIdForSkuDetails);
     const suggestion: ProductSearchSuggestion = {
      product: newProduct,
      sku: skuToSelect || { id: newProduct.id + '_default_dialog_add', optionValues: {}, stockLayers: [], skuIdentifier: newProduct.name }, // conceptual SKU if none
      displayInfo: {
        name: skuDetails.skuIdentifier || newProduct.name,
        stock: newProduct.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A',
        price: skuDetails.currentSellPrice !== null ? `₹${skuDetails.currentSellPrice.toFixed(2)}` : 'N/A',
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
    // Services/charges usually don't have their own GST calculated this way; GST is on the main product items.
    // If services *are* taxable, this logic would need SGST/CGST rates for services. For now, assuming 0.
    let sgstAmount: number | undefined = 0;
    let cgstAmount: number | undefined = 0;

    // For 'buy' mode, the service amount is a cost. For 'sell'/'return', it's a revenue/refund amount.
    const serviceItem: BillItem = {
      id: uuidv4(),
      productId: `SERVICE_ITEM_${uuidv4()}`, // Special prefix to identify as service
      productName: serviceDescription,
      quantity: 1, // Services are typically quantity 1
      costPrice: mode === 'buy' ? amount : 0, // Cost if buying a service
      sellPrice: amount, // Sell price for sell/return, or could be 0 if it's just an expense
      isDefective: undefined,
      selectedVariantOptions: undefined,
      sgstAmount, // Assuming services are not taxed this way in this system
      cgstAmount,
      isAdditionalCharge: false, // This is a primary service, not an additional charge to another product
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

  // For admin context, determine if store selection is needed/allowed
  const showAdminStoreSelector = isAdminContext &&
                               activePlan &&
                               activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER &&
                               allStores.length > 1;

  // Get current mode from URL for reliable state, fallback to determined mode
  const currentUrlMode = searchParamsHook.get('mode') as BillMode | null;


  return (
    <div className="flex flex-col gap-6">
      <BillSaveAnimation
        show={isSavingAnimationVisible}
        billMode={lastSavedBillMode}
        isEstimate={lastSavedBillIsEstimate}
        onClose={handleAnimationClose}
      />
       <AlertDialog open={isPrintConfirmDialogOpen} onOpenChange={setIsPrintConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bill Saved Successfully!</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to print this bill now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmPrint(false)}>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmPrint(true)}>
              <Printer className="mr-2 h-4 w-4" /> Yes, Print Bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isNewProductDialogOpen && newProductDialogInitialValues && (
        <NewProductDialog
          isOpen={isNewProductDialogOpen}
          onOpenChange={setIsNewProductDialogOpen}
          onProductAdded={handleNewProductAddedFromDialog}
          initialValues={newProductDialogInitialValues}
        />
      )}
      {(!isAdminContext && storeIdFromProp) && ( // Store context, needs employee auth
        <EmployeePasskeyDialog
          isOpen={isVerifyEmployeeDialogOpen}
          onOpenChange={(open) => {
              if(!open && isVerifyEmployeeDialogOpen) { // If dialog is closed without verification
                  setPendingBillPayload(null); // Clear pending bill
              }
              setIsVerifyEmployeeDialogOpen(open);
          }}
          storeId={storeIdFromProp}
          onAuthenticated={handleEmployeeVerifiedForBill}
        />
      )}
      <HardwareBarcodeScanModal
        isOpen={isBarcodeModalOpen}
        onOpenChange={setIsBarcodeModalOpen}
        onScan={handleBarcodeScannedFromModal}
        purpose={barcodeScanPurpose || 'addItem'}
        productNameForUpdate={productToUpdateSkuFor?.name}
      />


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

      {/* Main Billing Form Card */}
      <Card className="w-full shadow-lg flex flex-col border-t-2 border-t-primary">
        <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 p-6">
          {/* Store Selector for Admin Context */}
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
                 {/* Validation message if admin hasn't selected a store for multi-store plan */}
                 {isAdminContext && activePlan && activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length > 1 && !selectedStoreIdForAdmin && (
                    <p className="text-xs text-destructive mt-1">Please select a store before saving the bill.</p>
                 )}
              </div>
          )}
          {/* Message if admin is on Starter plan but no store is configured */}
          {isAdminContext && activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 0 && (
             <p className="text-sm text-destructive text-center p-4 border border-dashed rounded-md bg-destructive/10">
                No store configured for your Starter plan. Please <Link href="/admin/stores" className="font-semibold underline hover:text-destructive/80">add your store</Link> in Store Management.
             </p>
          )}
          {/* Message if admin is on Growth/Pro but no stores configured */}
          {isAdminContext && activePlan && activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStores.length === 0 && (
             <p className="text-sm text-destructive text-center p-4 border border-dashed rounded-md bg-destructive/10">
                No stores configured. Please <Link href="/admin/stores" className="font-semibold underline hover:text-destructive/80">add stores</Link> in Store Management.
             </p>
          )}

          {/* Estimate Mode Toggle for Sales */}
          {mode === 'sell' && (
            <div className="flex items-center space-x-2 pt-2 pb-2 justify-end">
                <Label htmlFor="estimateMode" className="font-medium text-primary">Estimate Mode</Label>
                <Switch
                    id="estimateMode"
                    checked={isEstimateMode}
                    onCheckedChange={setIsEstimateMode}
                    className="data-[state=checked]:bg-primary"
                />
            </div>
          )}


          {/* Item Input Section */}
          <div className="space-y-4 pb-4 border-b border-dashed">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                <Settings2 size={20} className="text-muted-foreground"/> Add Item / Product
            </h3>
            <div className={cn(
              "grid gap-4 items-baseline",
              "grid-cols-1", // Default to single column for small screens
              mode === 'buy' ? "md:grid-cols-[1fr_auto_auto_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto_auto_auto]" // More columns for wider screens
            )}>
              {/* Product Search Input and Barcode/Edit Icons */}
              <div className="space-y-1.5 flex-grow">
                <Label htmlFor="productNameGlobal">Product Name / SKU / Barcode</Label>
                <div className="flex items-center gap-2">
                  <ProductSearchInput
                    inputRef={productNameInputRef}
                    value={productNameQuery}
                    onValueChange={(v) => {
                        setProductNameQuery(v);
                        if (!v) { // Clear selection if input is empty
                            setCurrentProductForSelection(null);
                            setSelectedVariantOptions({});
                            setProductNotFoundHint('');
                            updateSkuDisplayInfo(undefined); // Reset SKU display
                            setIsDisplayingLayerStock(false);
                        }
                    }}
                    onProductSelect={handleProductSelectFromSearch}
                    onEnterWithoutSelection={findAndPopulateProductByBarcode} // Use this for Enter key on input
                    placeholder={mode === 'return' ? 'Scan barcode or type product, then Enter' : 'Scan barcode, or type product name/SKU, then Enter'}
                    id="productNameGlobal"
                    className="flex-grow"
                    currentMode={mode}
                  />
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleBarcodeIconClick} className="shrink-0" aria-label="Scan Hardware Barcode">
                                <BarcodeIconLucide className="h-5 w-5 text-primary" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{currentProductForSelection ? `Update Barcode for ${currentProductForSelection.name}` : "Scan Barcode to Add Item"}</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                {isLoadingProductSearch && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Loader2 className="h-3 w-3 animate-spin"/> Searching...</div>}
                {currentProductForSelection && (
                  <div className="text-xs text-muted-foreground ml-1 space-y-0.5 mt-1">
                    <span>Selected: {getSkuDetails(currentProductForSelection.productSKUs.find(sku => JSON.stringify(Object.entries(sku.optionValues).sort()) === JSON.stringify(Object.entries(selectedVariantOptions).sort())), finalStoreIdForSkuDetails)?.skuIdentifier || currentProductForSelection.name}</span>
                    {currentProductForSelection.trackQuantity && currentSkuStock !== null && (
                      <span className="block">
                        {isDisplayingLayerStock && mode === 'sell' ? `Layer Stock: ${currentSkuStock.toFixed(2)}` : `Total Stock: ${currentSkuStock.toFixed(2)}`}
                      </span>
                    )}
                    {currentSkuSellPrice !== null && (
                      <span className="block">
                        Current Sell Price: ₹{currentSkuSellPrice.toFixed(2)}
                        {currentProductForSelection.trackQuantity && (isDisplayingLayerStock && mode === 'sell' ? "" : " (from oldest batch)")}
                      </span>
                    )}
                     {/* Display Tax Info if applicable */}
                     {mode === 'sell' && !isEstimateMode && currentProductForSelection.sgstRate !== undefined && currentProductForSelection.cgstRate !== undefined && !currentProductForSelection.id?.startsWith('SERVICE_ITEM_') && (
                        <span className="block text-primary/80">
                            Tax: SGST {currentProductForSelection.sgstRate}% + CGST {currentProductForSelection.cgstRate}%
                        </span>
                     )}
                  </div>
                )}
                {/* "Product not found" hint */}
                {productNotFoundHint && productNameQuery === productNotFoundHint && (
                    <div className="bg-accent/10 text-accent-foreground p-2 rounded-md flex items-center gap-2 my-2 text-sm shadow">
                        <Info size={16} className="text-accent shrink-0" />
                        Product '{productNotFoundHint}' not found. Press <CornerDownLeft size={16} strokeWidth={2.5} className="inline text-primary dark:text-primary mx-0.5 shrink-0" /> Enter again to add it as a new product.
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
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('quantity'))}
                  onFocus={(e) => e.target.select()}
                  step="any" // Allow float quantities
                  min="0.01"
                  placeholder="1"
                />
              </div>

              {/* Price Inputs for Buy Mode */}
              {mode === 'buy' && (
                <>
                  <div className="space-y-1.5 w-full md:w-32">
                    <Label htmlFor="costPrice">Cost Price/Unit</Label>
                    <Input
                      id="costPrice"
                      ref={costPriceInputRef}
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
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
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
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

            {/* Variant Selection Section (if product has variants) */}
            {currentProductForSelection && currentProductForSelection.variants && currentProductForSelection.variants.length > 0 && (
              <div className={cn(`grid md:grid-cols-${Math.min(currentProductForSelection.variants.length, 3)} gap-4 mt-3 items-end`)}>
                {currentProductForSelection.variants.map((variant, index) => {
                   // Ensure ref is created for each variant select
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
                            setVariantDropdownOpenState((prev) => ({ ...prev, [variant.id]: false })); // Close current select

                            // Auto-focus next variant select or quantity input
                            const currentIndex = currentProductForSelection!.variants!.findIndex(v_ => v_.id === variant.id);
                            if (currentIndex < currentProductForSelection!.variants!.length - 1) {
                                const nextVariantId = currentProductForSelection!.variants![currentIndex + 1].id;
                                setTimeout(() => { // Delay to allow state update and re-render
                                  setVariantDropdownOpenState((prev) => ({ ...prev, [nextVariantId]: true }));
                                  variantSelectRefs.current[nextVariantId]?.current?.focus();
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
                           onKeyDown={(e) => { // Handle Enter and Tab for variant selects
                            if (e.key === 'Enter' && !variantDropdownOpenState[variant.id]) { // Open dropdown on Enter if closed
                                e.preventDefault();
                                setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: true }));
                            } else if (e.key === 'Tab' && !e.shiftKey) { // Move to next variant or quantity on Tab
                                if (index < currentProductForSelection!.variants!.length -1) { // If not the last variant
                                    e.preventDefault();
                                    setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: false })); // Close current
                                    const nextVariantId = currentProductForSelection!.variants![index + 1].id;
                                    setVariantDropdownOpenState(prev => ({ ...prev, [nextVariantId]: true })); // Open next
                                    variantSelectRefs.current[nextVariantId]?.current?.focus();
                                } else if (index === currentProductForSelection!.variants!.length -1) { // If last variant
                                    e.preventDefault();
                                    setVariantDropdownOpenState(prev => ({ ...prev, [variant.id]: false })); // Close current
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

            {/* Defective Item Toggle for Return Mode */}
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
            {currentBillItems.length > 0 && <BillItemHeader mode={mode} isEstimateMode={isEstimateMode} />}
            <ScrollArea className="flex-1 -mx-6 px-6 h-[200px] md:h-auto md:max-h-[300px]">
              {currentBillItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in the bill yet.</p>
              ) : (
                <div className="space-y-0"> {/* No vertical space between rows */}
                  {currentBillItems.map((item) => (
                    <BillItemRow
                      key={item.id}
                      item={item}
                      mode={mode}
                      isEstimateMode={isEstimateMode}
                      onQuantityChange={updateBillItemQuantity}
                      onPriceChange={updateBillItemPrice}
                      onRemoveItem={removeBillItem}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Ad-hoc Service/Charge Section for Sell/Buy Modes */}
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
                    onChange={(e) => setServiceAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || '')}
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
        {/* Bill Footer: Customer/Vendor Details, Totals, Actions */}
        <CardFooter className="flex-col items-stretch gap-4 pt-6">
          {/* Customer/Vendor Details */}
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
             {/* Notes - span full width if phone isn't shown */}
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

          {/* Bill Totals */}
          <div className="flex flex-col items-end gap-0.5 text-sm">
             {/* Conditional tax display for Sell/Return (non-estimate) */}
             { (mode === 'sell' || mode === 'return') && !isEstimateMode && ((billTotals.totalSGST ?? 0) > 0 || (billTotals.totalCGST ?? 0) > 0 || currentBillItems.some(i => !i.isAdditionalCharge && !i.productId.startsWith('SERVICE_ITEM_'))) && (
                <>
                    <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Subtotal (Before Tax):</span>
                        <span className="font-medium text-foreground">₹{billTotals.subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Total SGST:</span>
                        <span className="font-medium text-foreground">₹{billTotals.totalSGST.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-xs">
                        <span className="text-muted-foreground">Total CGST:</span>
                        <span className="font-medium text-foreground">₹{billTotals.totalCGST.toFixed(2)}</span>
                    </div>
                    <Separator className="my-1 w-full max-w-xs"/>
                </>
             )}
             {/* Buy mode subtotal (which is the grand total) */}
             { mode === 'buy' && (
                <div className="flex justify-between w-full max-w-xs">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold text-destructive">₹{billTotals.grandTotal.toFixed(2)}</span>
                </div>
             )}
             {/* Grand Total for Sell/Return, or if it's an Estimate */}
             { (mode === 'sell' || mode === 'return') && (
                <div className="flex justify-between w-full max-w-xs text-lg font-semibold text-primary">
                    <span>{isEstimateMode && mode === 'sell' ? 'Estimate Total:' : 'Grand Total:'}</span>
                    <span>₹{billTotals.grandTotal.toFixed(2)}</span>
                </div>
             )}
          </div>

          {/* Payment Status Toggle for Sell/Buy modes */}
          {(mode === 'sell' || mode === 'buy') && (
              <div className="flex items-center space-x-2 self-start pt-2">
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
    