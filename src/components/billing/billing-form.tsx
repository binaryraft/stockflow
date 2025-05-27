
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductSearchInput } from './product-search-input';
import { NewProductDialog } from './new-product-dialog';
import { BillItemRow, BillItemHeader } from './bill-item-row';
import type { Product, BillItem, BillMode } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw, Edit3, CornerDownLeft, Info } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';


interface NewProductDialogInitialValues {
  name: string;
  quantity?: number;
  costPrice?: number;
  sellPrice?: number;
}

export function BillingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { getProductByName, addBill, searchProducts, getProductById } = useInventoryStore();

  const [mode, setMode] = useState<BillMode>((searchParams.get('mode') as BillMode) || 'sell');
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [customerVendorName, setCustomerVendorName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  const [productNameQuery, setProductNameQuery] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [costPrice, setCostPrice] = useState<number | string>('');
  const [sellPrice, setSellPrice] = useState<number | string>('');

  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [newProductDialogInitialValues, setNewProductDialogInitialValues] = useState<NewProductDialogInitialValues>({ name: '' });
  const [returnItemIsDefective, setReturnItemIsDefective] = useState(false);
  const [editingProductFromBill, setEditingProductFromBill] = useState<Product | null>(null);
  const [productNotFoundHint, setProductNotFoundHint] = useState('');


  const [currentProductForSelection, setCurrentProductForSelection] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const variantSelectRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});


  const productNameInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const costPriceInputRef = useRef<HTMLInputElement>(null);
  const sellPriceInputRef = useRef<HTMLInputElement>(null);
  const customerVendorNameInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const queryMode = searchParams.get('mode') as BillMode;
    if (queryMode && ['buy', 'sell', 'return'].includes(queryMode)) {
      setMode(queryMode);
    }
    productNameInputRef.current?.focus();
  }, [searchParams]);

  const resetFormFields = useCallback((focusProductName = true) => {
    setProductNameQuery('');
    setQuantity(1);
    setCostPrice('');
    setSellPrice('');
    setReturnItemIsDefective(false);
    setCurrentProductForSelection(null);
    setSelectedVariantOptions({});
    setProductNotFoundHint('');
    if (focusProductName) {
      productNameInputRef.current?.focus();
    }
  }, []);
  

  const handleProductSelect = (product: Product) => {
    setProductNameQuery(product.name);
    setCurrentProductForSelection(product);
    setSelectedVariantOptions({}); 
    setProductNotFoundHint('');

    if (mode === 'sell' || mode === 'return') {
      setCostPrice(product.costPrice); 
      setSellPrice(product.sellPrice);
    } else if (mode === 'buy') {
      setCostPrice(product.costPrice); 
      setSellPrice(product.sellPrice); 
    }
  };
  
  useEffect(() => {
    if (currentProductForSelection) {
        if (currentProductForSelection.variants && currentProductForSelection.variants.length > 0) {
            const firstVariant = currentProductForSelection.variants[0];
            if (firstVariant) {
                // Ensure refs are created for SelectTriggers
                currentProductForSelection.variants.forEach(variant => {
                    if (!variantSelectRefs.current[variant.id]) {
                        variantSelectRefs.current[variant.id] = React.createRef<HTMLButtonElement>();
                    }
                });
                
                // Attempt focus after a short delay to allow refs to be assigned
                setTimeout(() => {
                    const firstVariantRef = variantSelectRefs.current[firstVariant.id];
                    if (firstVariantRef?.current) {
                        firstVariantRef.current.focus();
                    } else {
                        // Fallback if ref not immediately available (less ideal, but a failsafe)
                        const firstVariantSelectTriggerEl = document.getElementById(`variant-select-${firstVariant.id}-trigger`);
                        firstVariantSelectTriggerEl?.focus();
                    }
                }, 0);
            }
        } else { // No variants, product selected
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
        }
    }
  }, [currentProductForSelection?.id, currentProductForSelection?.variants]);


  useEffect(() => {
    if (currentProductForSelection && currentProductForSelection.variants && currentProductForSelection.variants.length > 0) {
      const allVariantsSelected = currentProductForSelection.variants.every(
        (v) => selectedVariantOptions[v.name]
      );
      if (allVariantsSelected) {
        const activeElement = document.activeElement;
        const isVariantSelectFocused = currentProductForSelection.variants.some(variant => 
            activeElement?.id === `variant-select-${variant.id}-trigger`
        );
        
        // Only focus quantity if it's not already focused and if a variant select wasn't the last focused element that triggered this effect
        if(!isVariantSelectFocused && activeElement?.id !== quantityInputRef.current?.id) {
             quantityInputRef.current?.focus();
             quantityInputRef.current?.select();
        }
      }
    }
  }, [selectedVariantOptions, currentProductForSelection]);


  const handleAddNewItem = () => {
    if (!productNameQuery || (typeof quantity === 'string' && parseInt(quantity) <=0) || (typeof quantity === 'number' && quantity <= 0)) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter product name and valid quantity." });
      return;
    }

    let product = currentProductForSelection || getProductByName(productNameQuery);

    if (!product) {
      setNewProductDialogInitialValues({
        name: productNameQuery,
        quantity: mode === 'buy' ? (typeof quantity === 'string' ? parseInt(quantity) || 0 : quantity || 0) : undefined,
        costPrice: mode === 'buy' ? (typeof costPrice === 'string' ? parseFloat(costPrice) || 0 : costPrice || 0) : undefined,
        sellPrice: mode === 'buy' ? (typeof sellPrice === 'string' ? parseFloat(sellPrice) || 0 : sellPrice || 0) : undefined,
      });
      setIsNewProductDialogOpen(true);
      return;
    }
    
    if (product.variants && product.variants.length > 0) {
      const allVariantsSelected = product.variants.every(
        (v) => selectedVariantOptions[v.name]
      );
      if (!allVariantsSelected) {
        toast({ variant: "destructive", title: "Variant Selection Required", description: "Please select options for all product variants." });
        return;
      }
    }


    if (mode === 'sell' && product.trackQuantity && product.quantityInStock < (typeof quantity === 'string' ? parseInt(quantity) : quantity)) {
      toast({ variant: "destructive", title: "Insufficient Stock", description: `Only ${product.quantityInStock} of ${product.name} available.` });
      return;
    }
    
    const newItemCostPrice = mode === 'buy' ? (parseFloat(costPrice.toString()) || product.costPrice) : product.costPrice;
    const newItemSellPrice = (mode === 'buy' || mode === 'sell') ? (parseFloat(sellPrice.toString()) || product.sellPrice) : product.sellPrice;

    const newItem: BillItem = {
      id: uuidv4(),
      productId: product.id,
      productName: product.name,
      quantity: typeof quantity === 'string' ? parseInt(quantity) : quantity,
      costPrice: newItemCostPrice,
      sellPrice: newItemSellPrice,
      isDefective: mode === 'return' ? returnItemIsDefective : undefined,
      selectedVariantOptions: (product.variants && product.variants.length > 0) ? { ...selectedVariantOptions } : undefined,
    };

    setCurrentBillItems(prevItems => [...prevItems, newItem]);
    resetFormFields(true); 
  };
  
  const handleEnterNavigation = (currentField: 'productName' | 'variantSelect' | 'quantity' | 'costPrice' | 'sellPrice') => {
    if (currentField === 'productName') {
       const productsFound = searchProducts(productNameQuery);
       if (productsFound.length === 1 && !currentProductForSelection) { 
            handleProductSelect(productsFound[0]); 
            // Focus logic is now handled by useEffect based on currentProductForSelection
       } else if (productsFound.length > 1 && !currentProductForSelection) {
            // Keep focus on product name to allow user to refine search or pick from dropdown
            productNameInputRef.current?.focus(); 
       } else { 
            // Case: Product already selected (currentProductForSelection is true) OR no products found
            if (productNotFoundHint === productNameQuery && !currentProductForSelection) { 
                // Second Enter: Product not found, open dialog
                setNewProductDialogInitialValues({
                    name: productNameQuery,
                    quantity: mode === 'buy' ? (typeof quantity === 'string' ? parseInt(quantity) || 1 : quantity || 1) : undefined,
                    costPrice: mode === 'buy' ? (typeof costPrice === 'string' ? parseFloat(costPrice) || 0 : costPrice || 0) : undefined,
                    sellPrice: mode === 'buy' ? (typeof sellPrice === 'string' ? parseFloat(sellPrice) || 0 : sellPrice || 0) : undefined,
                  });
                setIsNewProductDialogOpen(true);
                setProductNotFoundHint(''); 
            } else if (!currentProductForSelection && productNameQuery.trim() !== '') {
                // First Enter: Product not found, show hint
                setProductNotFoundHint(productNameQuery); 
            } else if (currentProductForSelection) { 
                // Product is selected, move to variants or quantity
                if (!currentProductForSelection.variants || currentProductForSelection.variants.length === 0) {
                     quantityInputRef.current?.focus();
                     quantityInputRef.current?.select();
                } else {
                    // Product has variants, try to focus the first unselected variant
                    const firstUnselectedVariant = currentProductForSelection.variants.find(v => !selectedVariantOptions[v.name]);
                    if(firstUnselectedVariant && variantSelectRefs.current[firstUnselectedVariant.id]?.current){
                        variantSelectRefs.current[firstUnselectedVariant.id].current.focus();
                    } else if (firstUnselectedVariant) {
                        // Fallback if ref not immediately available
                        const triggerEl = document.getElementById(`variant-select-${firstUnselectedVariant.id}-trigger`);
                        triggerEl?.focus();
                    } else { // All variants selected or no unselected ref found
                        quantityInputRef.current?.focus();
                        quantityInputRef.current?.select();
                    }
                }
            }
       }
    } else if (currentField === 'variantSelect') { // This case will be triggered from onKeyDown of SelectTrigger
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
    } else if (currentField === 'quantity') {
      if (mode === 'buy') {
        costPriceInputRef.current?.focus();
        costPriceInputRef.current?.select();
      }
      else handleAddNewItem(); 
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') {
        sellPriceInputRef.current?.focus();
        sellPriceInputRef.current?.select();
      }
    } else if (currentField === 'sellPrice') {
      if (mode === 'buy') handleAddNewItem();
    }
  };

  const updateBillItem = (itemId: string, updates: Partial<BillItem>) => {
    setCurrentBillItems(prevItems =>
      prevItems.map(item => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  const removeBillItem = (itemId: string) => {
    setCurrentBillItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return currentBillItems.reduce((acc, item) => {
      const price = mode === 'buy' ? item.costPrice : item.sellPrice;
      return acc + (price * item.quantity);
    }, 0);
  };
  
  const calculatePotentialSellTotalForBuy = () => {
    if (mode !== 'buy') return 0;
    return currentBillItems.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  };

  const handleSaveBill = () => {
    if (currentBillItems.length === 0) {
      toast({ variant: "destructive", title: "Empty Bill", description: "Please add items to the bill." });
      return;
    }

    const billItemsForStore = currentBillItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      costPrice: item.costPrice,
      sellPrice: item.sellPrice,
      isDefective: item.isDefective,
      selectedVariantOptions: item.selectedVariantOptions,
    }));

    addBill({
      type: mode,
      vendorOrCustomerName: customerVendorName,
      customerPhone: customerPhone,
      notes: notes,
    }, billItemsForStore);
    
    const modeDisplay = mode === 'sell' ? 'Sales' : mode === 'buy' ? 'Expense' : 'Return';
    toast({ title: "Bill Saved", description: `${modeDisplay} Bill has been successfully saved.` });
    setCurrentBillItems([]);
    setCustomerVendorName('');
    setCustomerPhone('');
    setNotes('');
    resetFormFields(true);
    router.push('/billing'); 
  };
  
  const onNewProductAddedFromDialog = (product: Product) => {
    handleProductSelect(product); 
    // Focus is now handled by useEffect based on currentProductForSelection and its variants
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as BillMode);
    router.push(`/billing?action=new&mode=${newMode}`, { scroll: false });
    resetFormFields(true); 
    setCurrentBillItems([]); 
  };

  const handleEditProductClick = () => {
    if (currentProductForSelection) {
      setEditingProductFromBill(currentProductForSelection);
      setIsNewProductDialogOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-center">
            <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
            <TabsList className="grid w-full grid-cols-3 gap-1">
                <TabsTrigger 
                  value="sell" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
                >
                  <Send size={18}/>Sales
                </TabsTrigger>
                <TabsTrigger 
                  value="buy" 
                  className="flex items-center gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground dark:data-[state=active]:bg-destructive dark:data-[state=active]:text-destructive-foreground"
                >
                  <ShoppingBag size={18}/>Expense
                </TabsTrigger>
                <TabsTrigger 
                  value="return" 
                  className="flex items-center gap-2 data-[state=active]:bg-amber-400 data-[state=active]:text-amber-900 dark:data-[state=active]:bg-amber-500 dark:data-[state=active]:text-amber-950"
                >
                  <RotateCcw size={18}/>Return
                </TabsTrigger>
            </TabsList>
            </Tabs>
        </div>
      <NewProductDialog
        isOpen={isNewProductDialogOpen}
        onOpenChange={(open) => {
          setIsNewProductDialogOpen(open);
          if (!open) {
            setNewProductDialogInitialValues({ name: '' });
            setEditingProductFromBill(null); 
            productNameInputRef.current?.focus(); 
          }
        }}
        editingProduct={editingProductFromBill}
        initialProductName={newProductDialogInitialValues.name}
        initialQuantityForDialog={newProductDialogInitialValues.quantity}
        initialCostPriceForDialog={newProductDialogInitialValues.costPrice}
        initialSellPriceForDialog={newProductDialogInitialValues.sellPrice}
        onProductAdd={onNewProductAddedFromDialog}
      />

      <Card className="w-full shadow-lg flex flex-col border-t-2 border-t-primary"> 
          <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 p-6">
            
            <div className="space-y-4 pb-4 border-b border-dashed mb-4">
              <h3 className="text-lg font-medium text-foreground">Add Item</h3>
              <div className={cn(`grid ${mode === 'sell' || mode === 'return' ? 'grid-cols-1 md:grid-cols-[2fr_auto_1fr]' : 'grid-cols-1 md:grid-cols-[2fr_auto_1fr_1fr_1fr]'} gap-4 items-baseline`)}>
                  <div className="space-y-1.5 flex-grow">
                    <Label htmlFor="productNameGlobal">Product Name</Label>
                    <div className="flex items-center gap-2">
                        <ProductSearchInput
                        inputRef={productNameInputRef}
                        value={productNameQuery}
                        onValueChange={(v) => { setProductNameQuery(v); if (!v) setCurrentProductForSelection(null); setProductNotFoundHint('');}}
                        onProductSelect={handleProductSelect}
                        onEnterWithoutSelection={() => handleEnterNavigation('productName')}
                        placeholder={mode === 'return' ? 'Search product being returned' : 'Scan or type product name'}
                        id="productNameGlobal"
                        />
                        {currentProductForSelection && (
                        <Button variant="ghost" size="icon" onClick={handleEditProductClick} className="shrink-0" aria-label="Edit selected product">
                            <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        )}
                    </div>
                     {currentProductForSelection && <span className="text-xs text-muted-foreground ml-1">Selected: {currentProductForSelection.name}</span>}
                     {productNotFoundHint && productNameQuery === productNotFoundHint && (
                        <div className="bg-accent/10 text-accent-foreground p-2 rounded-md flex items-center gap-2 my-2 text-sm shadow">
                            <Info size={16} className="text-accent" />
                            Product '{productNotFoundHint}' not found. Press <CornerDownLeft size={16} className="inline text-green-600 dark:text-green-500 mx-1" /> Enter to add it.
                        </div>
                    )}
                  </div>


                  <div className="space-y-1.5 w-24 shrink-0"> 
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
                    />
                  </div>
                  {mode === 'buy' && (
                    <>
                    <div className="space-y-1.5 w-32 shrink-0"> 
                        <Label htmlFor="costPrice">Cost Price</Label>
                        <Input
                        id="costPrice"
                        ref={costPriceInputRef}
                        type="number"
                        value={costPrice}
                        onChange={(e) => setCostPrice(parseFloat(e.target.value) || '')}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('costPrice'))}
                        onFocus={(e) => e.target.select()}
                        step="0.01" min="0"
                        />
                    </div>
                    <div className="space-y-1.5 w-32 shrink-0"> 
                        <Label htmlFor="sellPrice">Sell Price</Label>
                        <Input
                        id="sellPrice"
                        ref={sellPriceInputRef}
                        type="number"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(parseFloat(e.target.value) || '')}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                        onFocus={(e) => e.target.select()}
                        step="0.01" min="0"
                        />
                    </div>
                    </>
                  )}
              </div>
              
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
                        value={selectedVariantOptions[variant.name] || ""}
                        onValueChange={(value) =>
                          setSelectedVariantOptions((prev) => ({ ...prev, [variant.name]: value }))
                        }
                      >
                        <SelectTrigger 
                            id={`variant-select-${variant.id}-trigger`}
                            ref={variantSelectRefs.current[variant.id]}
                            className="w-full select-trigger-class"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (index === currentProductForSelection!.variants!.length - 1) {
                                        // Last variant selected, move to quantity
                                        quantityInputRef.current?.focus();
                                        quantityInputRef.current?.select();
                                    } else {
                                        // Move to next variant selector
                                        const nextVariantId = currentProductForSelection!.variants![index + 1].id;
                                        const nextVariantRef = variantSelectRefs.current[nextVariantId];
                                        if (nextVariantRef?.current) {
                                          nextVariantRef.current.focus();
                                        } else {
                                           // Fallback if ref not immediately available
                                           const nextVariantSelectTriggerEl = document.getElementById(`variant-select-${nextVariantId}-trigger`);
                                           nextVariantSelectTriggerEl?.focus();
                                        }
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

              <Button onClick={handleAddNewItem} className="w-full mt-3 bg-primary hover:bg-primary/90" variant="default">
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Bill
              </Button>
            </div>
            

            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                <Label htmlFor="customerVendorName">
                    {mode === 'buy' ? 'Vendor Name' : 'Customer Name'}
                </Label>
                <Input
                    id="customerVendorName"
                    ref={customerVendorNameInputRef}
                    value={customerVendorName}
                    onChange={(e) => setCustomerVendorName(e.target.value)}
                    placeholder={mode === 'buy' ? 'Enter vendor name (optional)' : 'Enter customer name (optional)'}
                />
                </div>
                <div className="space-y-1.5">
                <Label htmlFor="customerPhone">
                    {mode === 'buy' ? 'Vendor Phone' : 'Customer Phone'}
                </Label>
                <Input
                    id="customerPhone"
                    ref={customerPhoneInputRef}
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={mode === 'buy' ? 'Enter vendor phone (optional)' : 'Enter customer phone (optional)'}
                />
                </div>
            </div>
            
            {currentBillItems.length > 0 && <BillItemHeader mode={mode} />}
            <ScrollArea className="flex-1 -mx-6 px-6"> 
              {currentBillItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in the bill yet.</p>
              ) : (
                <div className="space-y-0">
                  {currentBillItems.map((item) => (
                    <BillItemRow
                      key={item.id}
                      item={item}
                      mode={mode}
                      onQuantityChange={(itemId, newQty) => updateBillItem(itemId, { quantity: newQty })}
                      onPriceChange={mode === 'buy' ? (itemId, newPrice, type) => updateBillItem(itemId, type === 'cost' ? { costPrice: newPrice } : { sellPrice: newPrice }) : undefined}
                      onRemoveItem={removeBillItem}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          <Separator className="my-0"/>
          <CardFooter className="flex-col items-stretch gap-4 pt-6">
              <div className="flex justify-between text-lg font-semibold text-foreground">
                <span>Total:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
              {mode === 'buy' && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Potential Sell Value:</span>
                  <span>₹{calculatePotentialSellTotalForBuy().toFixed(2)}</span>
                </div>
              )}
               <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Input 
                      id="notes" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="Add any notes for this bill (optional)" 
                  />
              </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={() => { setCurrentBillItems([]); resetFormFields(true); setCustomerVendorName(''); setCustomerPhone(''); setNotes('')}} className="flex-1">
                <Eraser className="mr-2 h-4 w-4" /> Clear Bill
              </Button>
              <Button onClick={handleSaveBill} className="flex-1" disabled={currentBillItems.length === 0}>
                <Save className="mr-2 h-4 w-4" /> Save Bill
              </Button>
            </div>
          </CardFooter>
        </Card>
    </div>
  );
}

    
