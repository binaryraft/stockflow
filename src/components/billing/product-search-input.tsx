
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Product, ProductSKU, StockLayer } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';
import { Loader2, CornerDownLeft } from 'lucide-react';

export interface ProductSearchSuggestion {
  product: Product;
  sku: ProductSKU;
  layer?: StockLayer;
  displayInfo: {
    name: string;
    stock: string | number | null;
    price: string;
    category?: string;
  };
}

interface ProductSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onProductSelect: (suggestion: ProductSearchSuggestion) => void;
  onEnterWithoutSelection?: (inputValue: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  id?: string;
  currentMode?: 'sell' | 'buy' | 'return';
}

export function ProductSearchInput({
  value,
  onValueChange,
  onProductSelect,
  onEnterWithoutSelection,
  placeholder = "Type product name...",
  className,
  inputRef,
  id,
  currentMode,
}: ProductSearchInputProps) {
  const [suggestions, setSuggestions] = useState<ProductSearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  const { searchProductsRemote, getSkuDetails, getSkuIdentifier } = useInventoryStore(state => ({
    searchProductsRemote: state.searchProductsRemote,
    getSkuDetails: state.getSkuDetails,
    getSkuIdentifier: state.getSkuIdentifier,
  }));
  const containerRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    const companyId = localStorage.getItem('companyId');
    if (!companyId) {
      setIsSearching(false);
      return;
    }

    try {
      const foundProducts = await searchProductsRemote(companyId, searchTerm);
      const detailedSuggestions: ProductSearchSuggestion[] = [];

      foundProducts.forEach(product => {
        if (product.productSKUs && product.productSKUs.length > 0) {
          product.productSKUs.forEach(sku => {
            const skuDetails = getSkuDetails(sku);
            const baseSkuIdentifier = sku.skuIdentifier || getSkuIdentifier(product.name, sku.optionValues);

            if (currentMode === 'sell' && product.trackQuantity) {
              const availableLayers = sku.stockLayers.filter(layer => layer.quantity > 0);
              if (availableLayers.length > 0) {
                availableLayers.forEach(layer => {
                  detailedSuggestions.push({
                    product,
                    sku,
                    layer,
                    displayInfo: {
                      name: `${baseSkuIdentifier} - Sell @ ₹${layer.sellPrice.toFixed(2)}`,
                      stock: layer.quantity,
                      price: `₹${layer.sellPrice.toFixed(2)}`,
                      category: product.category,
                    },
                  });
                });
              } else {
                detailedSuggestions.push({
                  product,
                  sku,
                  displayInfo: {
                    name: `${baseSkuIdentifier} (Out of Stock)`,
                    stock: 0,
                    price: 'N/A',
                    category: product.category,
                  },
                });
              }
            } else {
              const isOutOfStock = product.trackQuantity && (skuDetails.totalStock === null || skuDetails.totalStock === 0);
              const outOfStockLabel = isOutOfStock ? " (Out of Stock)" : "";
              detailedSuggestions.push({
                product,
                sku,
                displayInfo: {
                  name: `${baseSkuIdentifier}${outOfStockLabel}`,
                  stock: product.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A',
                  price: skuDetails.currentSellPrice !== null ? `₹${skuDetails.currentSellPrice.toFixed(2)}` : 'N/A',
                  category: product.category,
                },
              });
            }
          });
        }
      });

      setSuggestions(detailedSuggestions);
      // Always show suggestions if we have a search term, so we can show "Add New" option if empty
      setShowSuggestions(true);
      setActiveIndex(-1);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchProductsRemote, getSkuDetails, getSkuIdentifier, currentMode]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (value && document.activeElement === inputRef?.current) {
        performSearch(value);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [value, performSearch, inputRef]);

  const handleSelectSuggestion = useCallback((suggestion: ProductSearchSuggestion) => {
    onProductSelect(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  }, [onProductSelect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement as Node)) {
        setShowSuggestions(false);
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prevIndex) => (prevIndex - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        let selectedSuggestion = null;
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          selectedSuggestion = suggestions[activeIndex];
        } else if (suggestions.length > 0) {
          selectedSuggestion = suggestions[0];
        }

        if (selectedSuggestion) {
          handleSelectSuggestion(selectedSuggestion);
        } else if (onEnterWithoutSelection) {
          onEnterWithoutSelection(value);
        }
        setShowSuggestions(false);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (onEnterWithoutSelection) {
        onEnterWithoutSelection(value);
      }
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const activeItem = document.getElementById(`suggestion-${activeIndex}`);
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={() => { if (value) performSearch(value); }}
          onKeyDown={handleKeyDown}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-hidden">
          <ScrollArea className="max-h-60">
            <ul className="py-1">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion, index) => (
                  <li
                    key={`${suggestion.product.id}-${suggestion.sku.id}-${suggestion.layer?.id || 'no-layer'}-${index}`}
                    id={`suggestion-${index}`}
                    className={cn(
                      "px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      index === activeIndex && "bg-accent text-accent-foreground",
                      suggestion.displayInfo.stock === 0 && suggestion.product.trackQuantity && "text-muted-foreground opacity-75"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(suggestion);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate mr-2 font-medium">{suggestion.displayInfo.name}</span>
                      <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap text-right">
                        {suggestion.displayInfo.stock !== 'N/A' ? `Qty: ${suggestion.displayInfo.stock}` : ""}
                        {" "}
                        {suggestion.displayInfo.price}
                      </span>
                    </div>
                    {suggestion.displayInfo.category && <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{suggestion.displayInfo.category}</div>}
                  </li>
                ))
              ) : (
                <li
                  className={cn(
                    "px-3 py-3 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-3 text-primary",
                    activeIndex === 0 && "bg-accent text-accent-foreground"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (onEnterWithoutSelection) onEnterWithoutSelection(value);
                    setShowSuggestions(false);
                  }}
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <CornerDownLeft className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Add "{value}"</span>
                    <span className="text-xs text-muted-foreground">Press Enter to add new product</span>
                  </div>
                </li>
              )}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

