
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Product } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';

interface ProductSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onProductSelect: (product: Product) => void;
  onEnterWithoutSelection?: () => void; // Called when Enter is pressed and no suggestion is active/selected
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  id?: string; // Added id prop
}

export function ProductSearchInput({
  value,
  onValueChange,
  onProductSelect,
  onEnterWithoutSelection,
  placeholder = "Type product name...",
  className,
  inputRef,
  id // Consumed id prop
}: ProductSearchInputProps) {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchProducts = useInventoryStore((state) => state.searchProducts);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      const foundProducts = searchProducts(value);
      setSuggestions(foundProducts);
      setShowSuggestions(true);
      setActiveIndex(-1); // Reset active index on new suggestions
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, searchProducts]);

  const handleSelectProduct = useCallback((product: Product) => {
    onProductSelect(product); // This will call BillingForm's handleProductSelect
    onValueChange(product.name); // Update input to selected product name
    setShowSuggestions(false);
    setSuggestions([]);
    // Focus is managed by the parent component (BillingForm) after selection
  }, [onProductSelect, onValueChange]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


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
          // User explicitly selected a suggestion with arrow keys
          handleSelectProduct(suggestions[activeIndex]);
        } else if (suggestions.length > 0) { 
          // No explicit selection, but suggestions exist. Auto-select the first one.
          handleSelectProduct(suggestions[0]); 
        } 
        // Note: Removed the 'else if (onEnterWithoutSelection)' from here.
        // onEnterWithoutSelection will be called if suggestions.length is 0 (see below)
        // or if the specific logic in BillingForm decides it's a "not found" scenario.
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') { // No suggestions were visible (suggestions.length === 0)
      e.preventDefault();
      if (onEnterWithoutSelection) {
        onEnterWithoutSelection(); // This triggers "product not found / add new" flow in BillingForm
      }
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
        id={id} // Applied id prop
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => value && searchProducts(value).length > 0 && setShowSuggestions(true)} // Re-check suggestions on focus
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60">
          <ScrollArea className="max-h-60">
            <ul>
              {suggestions.map((product, index) => (
                <li
                  key={product.id}
                  id={`suggestion-${index}`}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    index === activeIndex && "bg-accent text-accent-foreground"
                  )}
                  onMouseDown={(e) => { // Using onMouseDown to ensure it fires before onBlur
                     e.preventDefault(); 
                     handleSelectProduct(product);
                  }}
                >
                  <div className="flex justify-between">
                    <span>{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.trackQuantity ? `Stock: ${product.quantityInStock}` : ''} Price: ₹{product.sellPrice.toFixed(2)}
                    </span>
                  </div>
                  {product.category && <div className="text-xs text-muted-foreground">{product.category}</div>}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
