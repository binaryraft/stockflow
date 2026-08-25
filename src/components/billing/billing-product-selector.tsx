
"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { CornerDownLeft, Barcode as BarcodeIconLucide, Info, Loader2, Edit3 } from 'lucide-react';
import { ProductSearchInput, type ProductSearchSuggestion } from './product-search-input';
import { Product, ProductSKU, BillMode } from '@/types';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/hooks/use-inventory-store';

interface BillingProductSelectorProps {
    mode: BillMode;
    productNameQuery: string;
    setProductNameQuery: (val: string) => void;
    isLoadingProductSearch: boolean;

    currentProductForSelection: Product | null;
    setCurrentProductForSelection: (p: Product | null) => void;

    selectedVariantOptions: Record<string, string>;
    setSelectedVariantOptions: React.Dispatch<React.SetStateAction<Record<string, string>>>;

    quantity: number | string;
    setQuantity: (val: number | string) => void;

    costPrice: number | string;
    setCostPrice: (val: number | string) => void;

    sellPrice: number | string;
    setSellPrice: (val: number | string) => void;

    currentSkuStock: number | null;
    currentSkuSellPrice: number | null;
    isDisplayingLayerStock: boolean;

    onAddProduct: () => void;
    onScannerClick: () => void;
    onEditProductClick: () => void;

    productNotFoundHint: string;
    handleProductSelectFromSearch: (suggestion: ProductSearchSuggestion) => void;
    handleProductNameSubmit: (val: string) => void;

    finalStoreIdForSkuDetails?: string;
    returnItemIsDefective: boolean;
    setReturnItemIsDefective: (val: boolean) => void;

    productNameInputRef: React.RefObject<HTMLInputElement>;
}

export const BillingProductSelector: React.FC<BillingProductSelectorProps> = ({
    mode, productNameQuery, setProductNameQuery, isLoadingProductSearch,
    currentProductForSelection, setCurrentProductForSelection,
    selectedVariantOptions, setSelectedVariantOptions,
    quantity, setQuantity, costPrice, setCostPrice, sellPrice, setSellPrice,
    currentSkuStock, currentSkuSellPrice, isDisplayingLayerStock,
    onAddProduct, onScannerClick, onEditProductClick,
    productNotFoundHint, handleProductSelectFromSearch, handleProductNameSubmit,
    finalStoreIdForSkuDetails, returnItemIsDefective, setReturnItemIsDefective,
    productNameInputRef
}) => {
    const { getSkuDetails } = useInventoryStore();
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const costPriceInputRef = useRef<HTMLInputElement>(null);
    const sellPriceBatchInputRef = useRef<HTMLInputElement>(null);
    const variantSelectRefs = useRef<Record<string, React.RefObject<HTMLButtonElement>>>({});
    const [variantDropdownOpenState, setVariantDropdownOpenState] = useState<Record<string, boolean>>({});

    const handleSearchProductSelect = (suggestion: ProductSearchSuggestion) => {
        handleProductSelectFromSearch(suggestion);
        setTimeout(() => {
            quantityInputRef.current?.focus();
            quantityInputRef.current?.select();
        }, 0);
    };

    const handleEnterNavigation = (currentField: 'quantity' | 'costPrice' | 'sellPrice') => {
        if (currentField === 'quantity') {
            if (mode === 'buy') {
                setTimeout(() => costPriceInputRef.current?.focus(), 0);
            } else {
                onAddProduct();
            }
        } else if (currentField === 'costPrice') {
            setTimeout(() => sellPriceBatchInputRef.current?.focus(), 0);
        } else if (currentField === 'sellPrice') {
            onAddProduct();
        }
    };

    return (
        <div className="space-y-4 pb-4 border-b border-dashed">
            <div className={cn(
                "grid gap-4 items-baseline",
                "grid-cols-1",
                mode === 'buy' ? "md:grid-cols-[1fr_auto_auto_auto_auto_auto]" : "md:grid-cols-[1fr_auto_auto_auto_auto]"
            )}>
                {/* Product Search */}
                <div className="space-y-1.5 flex-grow min-w-[250px]">
                    <Label htmlFor="productNameGlobal">Product Name / SKU / Barcode</Label>
                    <div className="flex items-center gap-2">
                        <ProductSearchInput
                            inputRef={productNameInputRef}
                            value={productNameQuery}
                            onValueChange={(v) => {
                                setProductNameQuery(v);
                                if (!v) setCurrentProductForSelection(null);
                            }}
                            onProductSelect={handleSearchProductSelect}
                            onEnterWithoutSelection={handleProductNameSubmit}
                            placeholder={mode === 'return' ? 'Scan or type product...' : 'Scan barcode, or type product...'}
                            id="productNameGlobal"
                            className="flex-grow"
                            currentMode={mode}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={onScannerClick} className="shrink-0">
                                        <BarcodeIconLucide className="h-5 w-5 text-primary" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Scan Barcode/QR</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {currentProductForSelection && (
                            <Button variant="ghost" size="icon" onClick={onEditProductClick} className="shrink-0">
                                <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                        )}
                    </div>

                    {/* Product Info Display */}
                    {currentProductForSelection && (
                        <div className="text-xs text-muted-foreground ml-1 space-y-0.5 mt-1">
                            <span>{currentProductForSelection.name}</span>
                            {currentProductForSelection.trackQuantity && currentSkuStock !== null && (
                                <span className="block font-medium text-foreground">
                                    {isDisplayingLayerStock && mode === 'sell' ? `Available Batch Stock: ${currentSkuStock}` : `Total Stock: ${currentSkuStock}`}
                                </span>
                            )}
                            {currentSkuSellPrice !== null && (
                                <span className="block">Price: ₹{currentSkuSellPrice.toFixed(2)}</span>
                            )}
                            {mode === 'sell' && currentProductForSelection.hsnCode && (
                                <span className="block text-primary/80">HSN: {currentProductForSelection.hsnCode}</span>
                            )}
                        </div>
                    )}

                    {productNotFoundHint && productNameQuery.toLowerCase() === productNotFoundHint.toLowerCase() && (
                        <div className="bg-destructive/10 text-destructive p-2 rounded-md text-sm mt-2">
                            Product not found. Press Enter again to add new.
                        </div>
                    )}
                </div>

                {/* Quantity */}
                <div className="space-y-1.5 w-full md:w-24">
                    <Label htmlFor="quantityGlobal">Quantity</Label>
                    <Input
                        id="quantityGlobal"
                        ref={quantityInputRef}
                        type="number"
                        step="any"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('quantity'))}
                        onFocus={(e) => e.target.select()}
                        placeholder="1"
                    />
                </div>

                {/* Buy Mode Prices */}
                {mode === 'buy' && (
                    <>
                        <div className="space-y-1.5 w-full md:w-28">
                            <Label htmlFor="costPrice">Cost Price</Label>
                            <Input
                                id="costPrice"
                                ref={costPriceInputRef}
                                type="number"
                                value={costPrice}
                                onChange={(e) => setCostPrice(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('costPrice'))}
                                onFocus={(e) => e.target.select()}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-1.5 w-full md:w-28">
                            <Label htmlFor="sellPrice">Sell Price</Label>
                            <Input
                                id="sellPrice"
                                ref={sellPriceBatchInputRef}
                                type="number"
                                value={sellPrice}
                                onChange={(e) => setSellPrice(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleEnterNavigation('sellPrice'))}
                                onFocus={(e) => e.target.select()}
                                placeholder="0.00"
                            />
                        </div>
                    </>
                )}

                {/* Add Button */}
                <Button onClick={onAddProduct} className="w-full md:w-auto self-end bg-primary hover:bg-primary/90" variant="default">
                    <CornerDownLeft className="mr-2 h-4 w-4" /> Add
                </Button>
            </div>

            {/* Variants */}
            {currentProductForSelection?.variants && currentProductForSelection.variants.length > 0 && (
                <div className="grid md:grid-cols-3 gap-4 mt-3">
                    {currentProductForSelection.variants.map((variant) => (
                        <div key={variant.id} className="space-y-1.5">
                            <Label>{variant.name}</Label>
                            <Select
                                value={selectedVariantOptions[variant.name] || ""}
                                onValueChange={(val) => {
                                    setSelectedVariantOptions(prev => ({ ...prev, [variant.name]: val }));
                                    // Logic to focus next or quantity
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder={`Select ${variant.name}`} /></SelectTrigger>
                                <SelectContent>
                                    {variant.options.map(opt => (
                                        <SelectItem key={opt.id} value={opt.value}>{opt.value}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
