
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Product, ProductSKU, StockLayer } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';

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
  const { searchProducts, getSkuDetails, getSkuIdentifier } = useInventoryStore(state => ({
    searchProducts: state.searchProducts,
    getSkuDetails: state.getSkuDetails,
    getSkuIdentifier: state.getSkuIdentifier,
  }));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0 && document.activeElement === inputRef?.current) { // Only show suggestions if input is focused
      const foundProducts = searchProducts(value);
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
        } else {
          detailedSuggestions.push({
            product,
            sku: { id: product.id + '_defaultSKU', optionValues: {}, stockLayers: [], skuIdentifier: product.name },
            displayInfo: {
              name: product.name,
              stock: product.trackQuantity ? '0 (No Purchases Yet)' : 'N/A',
              price: 'N/A',
              category: product.category,
            },
          });
        }
      });

      setSuggestions(detailedSuggestions);
      setShowSuggestions(detailedSuggestions.length > 0);
      setActiveIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, searchProducts, getSkuDetails, getSkuIdentifier, currentMode, inputRef]);

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
        } else if (suggestions.length > 0) { // If Enter is pressed and suggestions are visible, select the first one
          selectedSuggestion = suggestions[0];
        }

        if (selectedSuggestion) {
          handleSelectSuggestion(selectedSuggestion);
        } else if (onEnterWithoutSelection) { // Only call if no suggestion was selected
          onEnterWithoutSelection(value);
        }
        setShowSuggestions(false);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') { // No suggestions visible or no suggestions match
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
      <Input
        id={id}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
            onValueChange(e.target.value);
            if(e.target.value === "") {
                 setSuggestions([]);
                 setShowSuggestions(false);
            }
        }}
        onFocus={() => {
            if (value && value.length > 0) { // Re-show/fetch suggestions on focus if there's text
                const foundProducts = searchProducts(value);
                // (Re-populate suggestions logic - same as in useEffect for `value` change)
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
                                    detailedSuggestions.push({ product, sku, layer, displayInfo: { name: `${baseSkuIdentifier} - Sell @ ₹${layer.sellPrice.toFixed(2)}`, stock: layer.quantity, price: `₹${layer.sellPrice.toFixed(2)}`, category: product.category }});
                                });
                                } else {
                                detailedSuggestions.push({ product, sku, displayInfo: { name: `${baseSkuIdentifier} (Out of Stock)`, stock: 0, price: 'N/A', category: product.category }});
                                }
                            } else {
                                const isOutOfStock = product.trackQuantity && (skuDetails.totalStock === null || skuDetails.totalStock === 0);
                                const outOfStockLabel = isOutOfStock ? " (Out of Stock)" : "";
                                detailedSuggestions.push({ product, sku, displayInfo: { name: `${baseSkuIdentifier}${outOfStockLabel}`, stock: product.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A', price: skuDetails.currentSellPrice !== null ? `₹${skuDetails.currentSellPrice.toFixed(2)}` : 'N/A', category: product.category }});
                            }
                        });
                    } else {
                        detailedSuggestions.push({ product, sku: { id: product.id + '_defaultSKU', optionValues: {}, stockLayers: [], skuIdentifier: product.name }, displayInfo: { name: product.name, stock: product.trackQuantity ? '0 (No Purchases Yet)' : 'N/A', price: 'N/A', category: product.category }});
                    }
                 });
                 setSuggestions(detailedSuggestions);
                 setShowSuggestions(detailedSuggestions.length > 0);
                 setActiveIndex(-1);
            } else {
                 setShowSuggestions(false);
            }
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60">
          <ScrollArea className="max-h-60">
            <ul>
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.product.id}-${suggestion.sku.id}-${suggestion.layer?.id || 'no-layer'}-${index}`}
                  id={`suggestion-${index}`}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    index === activeIndex && "bg-accent text-accent-foreground",
                    suggestion.displayInfo.stock === 0 && suggestion.product.trackQuantity && "text-muted-foreground opacity-75"
                  )}
                  onMouseDown={(e) => {
                     e.preventDefault();
                     handleSelectSuggestion(suggestion);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate mr-2">{suggestion.displayInfo.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap text-right">
                      {suggestion.displayInfo.stock !== 'N/A'
                        ? `Qty: ${suggestion.displayInfo.stock}`
                        : ""}
                      {(suggestion.displayInfo.stock !== 'N/A' && suggestion.displayInfo.stock !== null && suggestion.displayInfo.price !== 'N/A') ? " " : ""}
                       {suggestion.displayInfo.price}
                    </span>
                  </div>
                  {suggestion.displayInfo.category && <div className="text-xs text-muted-foreground">{suggestion.displayInfo.category}</div>}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
