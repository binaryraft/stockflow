
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
import { PlusCircle, Save, Eraser, ShoppingBag, Send, RotateCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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

  const [currentProductForSelection, setCurrentProductForSelection] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});

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

  const resetFormFields = useCallback(() => {
    setProductNameQuery('');
    setQuantity(1);
    setCostPrice('');
    setSellPrice('');
    setReturnItemIsDefective(false);
    setCurrentProductForSelection(null);
    setSelectedVariantOptions({});
    productNameInputRef.current?.focus();
  }, []);

  const handleProductSelect = (product: Product) => {
    setProductNameQuery(product.name);
    setCurrentProductForSelection(product);
    setSelectedVariantOptions({}); // Reset variant selections

    if (mode === 'sell' || mode === 'return') {
      setCostPrice(product.costPrice); // Still set for reference, though not editable in sell mode
      setSellPrice(product.sellPrice);
      // If product has no variants, focus quantity. Otherwise, user selects variants.
      if (!product.variants || product.variants.length === 0) {
        quantityInputRef.current?.focus();
      }
    } else if (mode === 'buy') {
      setCostPrice(product.costPrice); 
      setSellPrice(product.sellPrice); 
      if (!product.variants || product.variants.length === 0) {
        quantityInputRef.current?.focus();
      }
    }
  };

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
    resetFormFields();
  };
  
  const handleEnterNavigation = (currentField: 'productName' | 'quantity' | 'costPrice' | 'sellPrice') => {
    if (currentField === 'productName') {
       const productsFound = searchProducts(productNameQuery);
       if (productsFound.length === 1) {
            handleProductSelect(productsFound[0]);
            // if no variants, focus quantity, else variant selection takes precedence
            if (!productsFound[0].variants || productsFound[0].variants.length === 0) {
                quantityInputRef.current?.focus();
            }
       } else if (productsFound.length > 1) {
            // keep focus on product name for user to refine
       } else { // No product found by exact name or multiple results
            // If in buy mode, we might expect new product details next
            if (mode === 'buy') quantityInputRef.current?.focus();
            // If in sell/return and no single exact match, maybe open new product dialog or focus quantity
            else quantityInputRef.current?.focus();
       }
    } else if (currentField === 'quantity') {
      if (mode === 'buy') costPriceInputRef.current?.focus();
      else handleAddNewItem(); // In sell/return mode, add item after quantity (if variants handled)
    } else if (currentField === 'costPrice') {
      if (mode === 'buy') sellPriceInputRef.current?.focus();
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
    resetFormFields();
    router.push('/billing'); 
  };
  
  const onNewProductAddedFromDialog = (product: Product) => {
    // Product is the full product object from the store
    setProductNameQuery(product.name);
    setCurrentProductForSelection(product); // Set for variant selection
    setSelectedVariantOptions({});

    if (mode === 'buy') {
        setCostPrice(product.costPrice);
        setSellPrice(product.sellPrice);
    } else { // sell or return
        setSellPrice(product.sellPrice);
        setCostPrice(product.costPrice); // Keep cost price for reference
    }
    // If no variants, focus quantity, else user focuses on variant selection
    if (!product.variants || product.variants.length === 0) {
        quantityInputRef.current?.focus();
    }
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as BillMode);
    router.push(`/billing?action=new&mode=${newMode}`, { scroll: false });
    resetFormFields(); 
  };


  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-center">
            <Tabs value={mode} onValueChange={handleModeChange} className="w-auto">
            <TabsList className="grid w-full grid-cols-3 gap-1">
                <TabsTrigger 
                value="sell" 
                className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white dark:data-[state=active]:bg-green-700 dark:data-[state=active]:text-white"
                >
                <Send size={18}/>Sales
                </TabsTrigger>
                <TabsTrigger 
                value="buy" 
                className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white dark:data-[state=active]:bg-red-700 dark:data-[state=active]:text-white"
                >
                <ShoppingBag size={18}/>Expense
                </TabsTrigger>
                <TabsTrigger 
                value="return" 
                className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-yellow-900 dark:data-[state=active]:bg-yellow-500 dark:data-[state=active]:text-yellow-950"
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
          if (!open) setNewProductDialogInitialValues({ name: '' });
        }}
        initialProductName={newProductDialogInitialValues.name}
        initialQuantityForDialog={newProductDialogInitialValues.quantity}
        initialCostPriceForDialog={newProductDialogInitialValues.costPrice}
        initialSellPriceForDialog={newProductDialogInitialValues.sellPrice}
        onProductAdd={onNewProductAddedFromDialog}
      />

      <Card className="w-full shadow-lg flex flex-col"> 
          <CardHeader>
              <CardTitle className="text-xl">Current Bill</CardTitle>
              <CardDescription>
                {mode === 'sell' ? 'Enter items for sales.' : 
                 mode === 'buy' ? 'Enter details for expenses.' : 
                 'Enter items being returned.'}
              </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4 pt-4">
            {/* Item Entry Section - Moved inside Current Bill Card */}
            <div className="space-y-4 pb-4 border-b border-dashed mb-4">
              <h3 className="text-lg font-medium">Add Item</h3>
              {/* Product Name and Quantity always visible */}
              <div className={`grid ${mode === 'sell' ? 'md:grid-cols-[2fr_1fr]' : 'grid-cols-1 md:grid-cols-2'} gap-4 items-end`}>
                  <div className="space-y-1.5">
                    <Label htmlFor="productNameGlobal">Product Name</Label>
                    <ProductSearchInput
                      inputRef={productNameInputRef}
                      value={productNameQuery}
                      onValueChange={(v) => { setProductNameQuery(v); if (!v) setCurrentProductForSelection(null);}}
                      onProductSelect={handleProductSelect}
                      onEnterWithoutSelection={() => handleEnterNavigation('productName')}
                      placeholder={mode === 'return' ? 'Search product being returned' : 'Scan or type product name'}
                      id="productNameGlobal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quantityGlobal">Quantity</Label>
                    <Input
                      id="quantityGlobal"
                      ref={quantityInputRef}
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('quantity'))}
                      min="1"
                    />
                  </div>
              </div>
              
              {/* Variant Selection Dropdowns */}
              {currentProductForSelection && currentProductForSelection.variants && currentProductForSelection.variants.length > 0 && (
                <div className={`grid md:grid-cols-${Math.min(currentProductForSelection.variants.length, 2)} gap-4 mt-3`}>
                  {currentProductForSelection.variants.map((variant) => (
                    <div key={variant.id} className="space-y-1.5">
                      <Label htmlFor={`variant-select-${variant.id}`}>{variant.name}</Label>
                      <Select
                        value={selectedVariantOptions[variant.name] || ""}
                        onValueChange={(value) =>
                          setSelectedVariantOptions((prev) => ({ ...prev, [variant.name]: value }))
                        }
                      >
                        <SelectTrigger id={`variant-select-${variant.id}`} className="w-full">
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
                  ))}
                </div>
              )}


              {/* Cost and Sell Price for Buy mode */}
              {mode === 'buy' && (
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="costPrice">Cost Price (per unit)</Label>
                    <Input
                      id="costPrice"
                      ref={costPriceInputRef}
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('costPrice'))}
                      step="0.01" min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sellPrice">Sell Price (per unit)</Label>
                    <Input
                      id="sellPrice"
                      ref={sellPriceInputRef}
                      type="number"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(parseFloat(e.target.value) || '')}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                      step="0.01" min="0"
                    />
                  </div>
                </div>
              )}
              
              {/* Defective Switch for Return mode */}
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

              <Button onClick={handleAddNewItem} className="w-full mt-3">
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Bill
              </Button>
            </div>
            {/* End Item Entry Section */}

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
          <CardFooter className="flex-col items-stretch gap-4 pt-4">
              <div className="flex justify-between text-lg font-semibold">
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
              <Button variant="outline" onClick={() => { setCurrentBillItems([]); resetFormFields(); setCustomerVendorName(''); setCustomerPhone(''); setNotes('')}} className="flex-1">
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
