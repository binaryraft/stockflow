
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CurrencyOption } from "@/types";
import { SUPPORTED_CURRENCIES } from "./constants";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) {
    // Fallback to default if no code is provided or user profile isn't loaded yet
    const defaultCurrency = SUPPORTED_CURRENCIES.find(c => c.code === 'INR');
    return defaultCurrency ? defaultCurrency.symbol : '₹';
  }
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
  return currency ? currency.symbol : currencyCode; // Fallback to code if symbol not found
}

export function formatCurrency(
  value: number,
  currencyCode?: string,
  options?: Intl.NumberFormatOptions
): string {
  const resolvedCurrencyCode = currencyCode || 'INR'; // Default to INR if not provided
  const symbol = getCurrencySymbol(resolvedCurrencyCode);

  // Basic formatting, can be expanded with Intl.NumberFormat for full locale support
  // For now, we'll just prepend the symbol.
  // Note: Intl.NumberFormat would be better for production for proper decimal/grouping by locale.

  // A more robust formatting:
  try {
    return new Intl.NumberFormat(undefined, { // Use browser's default locale for formatting
      style: 'currency',
      currency: resolvedCurrencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  } catch (e) {
    // Fallback for unsupported currency codes in Intl.NumberFormat
    return `${symbol}${(value || 0).toFixed(2)}`;
  }
}
