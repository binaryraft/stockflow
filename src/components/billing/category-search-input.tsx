
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';

interface CategorySearchInputProps {
  value: string;
  onValueChange: (value: string) => void; // Used to update the form field
  onCategorySelect?: (categoryName: string) => void; // Called when a suggestion is selected
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  id?: string;
}

export function CategorySearchInput({
  value,
  onValueChange,
  onCategorySelect,
  placeholder = "Type category name...",
  className,
  inputRef,
  id
}: CategorySearchInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchCategories = useInventoryStore((state) => state.searchCategories);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch suggestions when input has focus and value changes, or just on focus if value is empty
    if (showSuggestions) { 
      const foundCategories = searchCategories(value);
      setSuggestions(foundCategories);
      setActiveIndex(-1); 
    } else {
      setSuggestions([]);
    }
  }, [value, searchCategories, showSuggestions]);

  const handleSelectCategory = useCallback((categoryName: string) => {
    onValueChange(categoryName); // Update the form field directly
    onCategorySelect?.(categoryName);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef?.current?.blur(); // Optional: blur input after selection
  }, [onValueChange, onCategorySelect, inputRef]);
  
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
          handleSelectCategory(suggestions[activeIndex]);
        } else {
          // If Enter is pressed without a suggestion selected, accept the current input value
          // The onValueChange has already updated the form, so just hide suggestions
          setShowSuggestions(false);
          inputRef?.current?.blur();
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // If no suggestions shown, accept current input value
      setShowSuggestions(false);
      inputRef?.current?.blur();
    }
  };
  
  useEffect(() => {
    const activeItem = document.getElementById(`category-suggestion-${activeIndex}`);
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
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => {
            setShowSuggestions(true);
            // Fetch initial suggestions when focusing, even if input is empty
             const foundCategories = searchCategories(value);
             setSuggestions(foundCategories);
             setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60">
          <ScrollArea className="max-h-60">
            <ul>
              {suggestions.map((categoryName, index) => (
                <li
                  key={categoryName}
                  id={`category-suggestion-${index}`}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    index === activeIndex && "bg-accent text-accent-foreground"
                  )}
                  onMouseDown={(e) => { 
                     e.preventDefault(); 
                     handleSelectCategory(categoryName);
                  }}
                >
                  {categoryName}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
