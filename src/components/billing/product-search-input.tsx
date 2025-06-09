
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Product, ProductSKU, StockLayer } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';

export interface ProductSearchSuggestion {
  product: Product;
  sku: ProductSKU; // The SKU this suggestion always refers to
  layer?: StockLayer; // The specific stock layer, if this suggestion is for a batch
  displayInfo: {
    name: string; // e.g., "Chikengunia - Sell @ ₹10.00"
    stock: string | number | null; // Quantity in this specific layer, or total SKU stock
    price: string; // Formatted sell price of this layer, or default SKU sell price
    category?: string;
  };
}

interface ProductSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onProductSelect: (suggestion: ProductSearchSuggestion) => void;
  onEnterWithoutSelection?: () => void;
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
    if (value.length > 0) {
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
              } else { // SKU is tracked but has no available stock layers
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
              // For other modes, non-tracked, or if no specific layers to detail
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
          // Product with no defined SKUs (e.g., new or non-tracked with no prices set yet)
          detailedSuggestions.push({
            product,
            // Create a conceptual default SKU for products without any actual ProductSKU entries
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
      setActiveIndex(-1); // Reset active index when suggestions change
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, searchProducts, getSkuDetails, getSkuIdentifier, currentMode]);

  const handleSelectSuggestion = useCallback((suggestion: ProductSearchSuggestion) => {
    onProductSelect(suggestion);
    onValueChange(suggestion.displayInfo.name);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef?.current?.blur();
  }, [onProductSelect, onValueChange, inputRef]);

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
    // Delay hiding suggestions to allow click on suggestion item to register
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
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[activeIndex]);
        } else if (suggestions.length > 0) { // Auto-select first if no active index
          handleSelectSuggestion(suggestions[0]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (onEnterWithoutSelection) {
        onEnterWithoutSelection();
      }
    }
  };
  
  // Scroll active item into view
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
            if(e.target.value === "") { // If input is cleared, also clear suggestions
                 setSuggestions([]);
                 setShowSuggestions(false);
            }
        }}
        onFocus={() => { // Show suggestions on focus if value is not empty
            if (value && value.length > 0) {
                 // Re-evaluate suggestions on focus if there's already text
                 const foundProducts = searchProducts(value);
                 const detailedSuggestions: ProductSearchSuggestion[] = [];
                 // (Duplicated logic for brevity - ideally centralize or call effect's generator)
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
                              product, sku, layer,
                              displayInfo: { name: `${baseSkuIdentifier} - Sell @ ₹${layer.sellPrice.toFixed(2)}`, stock: layer.quantity, price: `₹${layer.sellPrice.toFixed(2)}`, category: product.category },
                            });
                          });
                        } else {
                          detailedSuggestions.push({
                            product, sku,
                            displayInfo: { name: `${baseSkuIdentifier} (Out of Stock)`, stock: 0, price: 'N/A', category: product.category },
                          });
                        }
                      } else {
                        const isOutOfStock = product.trackQuantity && (skuDetails.totalStock === null || skuDetails.totalStock === 0);
                        const outOfStockLabel = isOutOfStock ? " (Out of Stock)" : "";
                        detailedSuggestions.push({
                          product, sku,
                          displayInfo: { name: `${baseSkuIdentifier}${outOfStockLabel}`, stock: product.trackQuantity ? (skuDetails.totalStock ?? 0) : 'N/A', price: skuDetails.currentSellPrice !== null ? `₹${skuDetails.currentSellPrice.toFixed(2)}` : 'N/A', category: product.category },
                        });
                      }
                    });
                  } else {
                    detailedSuggestions.push({
                      product, sku: { id: product.id + '_defaultSKU', optionValues: {}, stockLayers: [], skuIdentifier: product.name },
                      displayInfo: { name: product.name, stock: product.trackQuantity ? '0 (No Purchases Yet)' : 'N/A', price: 'N/A', category: product.category },
                    });
                  }
                });
                 setSuggestions(detailedSuggestions);
                 setShowSuggestions(detailedSuggestions.length > 0);
            } else {
                 setShowSuggestions(false); // No value, no suggestions
            }
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur} // Added onBlur handler
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
                    suggestion.displayInfo.stock === 0 && suggestion.product.trackQuantity && "text-muted-foreground opacity-75" // Style for out of stock tracked items
                  )}
                  onMouseDown={(e) => { // Use onMouseDown to ensure it fires before onBlur
                     e.preventDefault(); // Prevent input from losing focus immediately
                     handleSelectSuggestion(suggestion);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate mr-2">{suggestion.displayInfo.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap text-right">
                      {suggestion.displayInfo.stock !== 'N/A' 
                        ? `Qty: ${suggestion.displayInfo.stock}${suggestion.displayInfo.stock === 0 && suggestion.product.trackQuantity ? "" : ""}` // Out of stock already in name
                        : ""}
                      {/* Separator only if both stock and price are shown */}
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

