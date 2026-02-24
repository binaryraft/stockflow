
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, Edit3, Trash2, PlusCircle, ArrowUpDown, PackageSearch, ExternalLink, Archive, ArchiveRestore, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type { Product } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn, getCurrencySymbol } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

type SortableColumns = 'name' | 'category' | 'sku'; // Limited sort support for now

export function ProductsTable() {
  const {
    products,
    productsPagination,
    fetchProductsPaginated,
    archiveProduct,
    unarchiveProduct,
    getSkuDetails,
    getActiveSubscriptionPlan,
    userProfile
  } = useInventoryStore(
    (state) => ({
      products: state.products,
      productsPagination: state.productsPagination,
      fetchProductsPaginated: state.fetchProductsPaginated,
      archiveProduct: state.archiveProduct,
      unarchiveProduct: state.unarchiveProduct,
      getSkuDetails: state.getSkuDetails,
      getActiveSubscriptionPlan: state.getActiveSubscriptionPlan,
      userProfile: state.userProfile,
    })
  );
  const pathname = usePathname();
  const isLocal = pathname.startsWith('/local');
  const basePath = isLocal ? '/local' : '/admin';
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [showArchived, setShowArchived] = useState(false);

  // Pagination State handled by store, but we control page request
  const [requestedPage, setRequestedPage] = useState(1);

  useEffect(() => {
    setHasMounted(true);
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
    const storedCompanyId = localStorage.getItem('companyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    } else {
      console.error("Company ID not found.");
      setIsLoading(false);
    }
  }, [userProfile.companyCurrency]);

  useEffect(() => {
    if (hasMounted) {
      setActivePlan(getActiveSubscriptionPlan());
    }
  }, [hasMounted, getActiveSubscriptionPlan]);

  // Fetch Data Effect
  useEffect(() => {
    if (hasMounted && companyId) {
      setIsLoading(true);
      const sortParams = sortConfig ? { field: sortConfig.key, order: sortConfig.direction === 'ascending' ? 'asc' : 'desc' as 'asc' | 'desc' } : undefined;

      fetchProductsPaginated(companyId, requestedPage, 50, debouncedSearchTerm, sortParams)
        .finally(() => setIsLoading(false));
    }
  }, [hasMounted, companyId, requestedPage, debouncedSearchTerm, sortConfig, fetchProductsPaginated]);

  // Reset page on search
  useEffect(() => {
    setRequestedPage(1);
  }, [debouncedSearchTerm]);


  const requestSort = (key: SortableColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleArchiveProduct = async (productId: string, productName: string) => {
    if (!companyId) return;
    const success = await archiveProduct(productId, companyId);
    if (success) toast({ title: "Product Archived", description: `${productName} has been archived.` });
    else toast({ variant: "destructive", title: "Archive Failed", description: `Could not archive ${productName}.` });
  };

  const handleUnarchiveProduct = async (productId: string, productName: string) => {
    if (!companyId) return;
    const success = await unarchiveProduct(productId, companyId);
    if (success) toast({ title: "Product Restored", description: `${productName} is now active again.` });
    else toast({ variant: "destructive", title: "Restore Failed", description: `Could not restore ${productName}.` });
  };

  const getProductStockDisplay = (product: Product): string | number | JSX.Element => {
    if (!product.trackQuantity) return <span className="text-xs text-muted-foreground">N/A</span>;
    const totalStock = product.productSKUs.reduce((sum, sku) => sum + (getSkuDetails(sku).totalStock ?? 0), 0);
    return totalStock;
  };

  const getProductPriceDisplay = (product: Product, field: 'averageCostPrice' | 'currentSellPrice'): string => {
    if (product.productSKUs.length === 0) return "N/A";
    const prices = product.productSKUs.map(sku => getSkuDetails(sku)[field]).filter(price => typeof price === 'number') as number[];
    if (prices.length === 0) return "N/A";
    const allPricesAreZero = prices.every(price => price === 0);
    if (allPricesAreZero) return `${currencySymbol}0.00`;
    const validPrices = prices.filter(price => price > 0);
    if (validPrices.length === 0) return "N/A";
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    if (minPrice === maxPrice) return `${currencySymbol}${minPrice.toFixed(2)}`;
    return `${currencySymbol}${minPrice.toFixed(2)} - ${currencySymbol}${maxPrice.toFixed(2)}`;
  };

  const canAddProducts = useMemo(() => {
    if (!activePlan) return false;
    const planDetails = SUBSCRIPTION_PLANS.find(p => p.id === activePlan.id);
    if (!planDetails) return false;
    const isUnlimited = planDetails.features.some(f => f.toLowerCase().includes("unlimited products") || f.toLowerCase().includes("unlimited items"));
    if (isUnlimited) return true;
    return true;
  }, [activePlan]); // removed products.length dependency as we don't have total count readily available or it's irrelevant with pagination for now (assuming server checks)

  const addProductButtonTooltipContent = !canAddProducts && activePlan
    ? `Product limit reached for your current plan (${activePlan.name}). Please upgrade.`
    : "Add New Product";


  if (!hasMounted) return <div className="p-12"><LoadingSpinner context="products" /></div>;

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 p-4 border rounded-xl bg-card shadow-md">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md w-full md:w-auto h-11 text-base"
        />
        <div className="flex items-center space-x-4 w-full md:w-auto">
          {/* Show Archived Toggle - Client Side Filter within Page or API? 
              API currently doesn't filter archived. 
              Ideally we add 'showArchived' param to API. For now, let's hide this or keep it visual.
          */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block flex-grow md:flex-grow-0">
                <Button asChild={canAddProducts} disabled={!canAddProducts} className="w-full md:w-auto h-11 text-base">
                  {canAddProducts ? (
                    <Link href={`${basePath}/products/add`}>
                      <PlusCircle className="mr-2 h-5 w-5" /> Add Product
                    </Link>
                  ) : (
                    <span><PlusCircle className="mr-2 h-5 w-5" /> Add Product</span>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {!canAddProducts && (
              <TooltipContent side="bottom" align="end"><p>{addProductButtonTooltipContent}</p></TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      <div className="hidden md:block border rounded-xl overflow-hidden shadow-xl bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px] py-3 px-4">Image</TableHead>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/80 py-3 px-4">
                Name <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted/80 py-3 px-4 hidden sm:table-cell">
                Category <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70 inline" />
              </TableHead>
              <TableHead className="py-3 px-4 hidden md:table-cell">SKU</TableHead>
              <TableHead className="text-right py-3 px-4">Stock</TableHead>
              <TableHead className="text-right py-3 px-4 hidden lg:table-cell">Avg. Cost</TableHead>
              <TableHead className="text-right py-3 px-4">Sell Price</TableHead>
              <TableHead className="py-3 px-4 text-center hidden md:table-cell">Tracked</TableHead>
              <TableHead className="text-right py-3 px-4 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="h-48 text-center"><LoadingSpinner context="products" text="Analyzing catalog..." /></TableCell></TableRow>
            ) : products.length > 0 ? (
              products.map((product) => {
                const isVariantProduct = product.variants && product.variants.length > 0;
                return (
                  <TableRow key={product.id} className={cn("hover:bg-muted/30", product.isArchived && "bg-secondary/10 opacity-60 hover:opacity-100")}>
                    <TableCell className="py-3 px-4">
                      <Image
                        src={product.imageUrl || `https://placehold.co/64x64.png?text=${product.name.charAt(0)}`}
                        alt={product.name}
                        width={52} height={52}
                        className="rounded-lg object-cover aspect-square border border-border shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/64x64.png?text=${product.name.charAt(0)}&font=roboto`; }}
                      />
                    </TableCell>
                    <TableCell className="font-semibold py-3 px-4 align-top text-foreground">
                      <div>{product.name}</div>
                      {product.isArchived && <Badge variant="destructive" className="mt-1">Archived</Badge>}
                      {isVariantProduct && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Variants: {product.variants?.map(v => `${v.name}`).join(' / ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 align-top hidden sm:table-cell">
                      {product.category ? <Badge variant="secondary" className="bg-tertiary text-tertiary-foreground whitespace-nowrap">{product.category}</Badge> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-3 px-4 align-top font-mono text-xs hidden md:table-cell text-muted-foreground">
                      {product.sku || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right py-3 px-4 align-top font-medium">{getProductStockDisplay(product)}</TableCell>
                    <TableCell className="text-right py-3 px-4 align-top hidden lg:table-cell">{getProductPriceDisplay(product, 'averageCostPrice')}</TableCell>
                    <TableCell className="text-right py-3 px-4 align-top">{getProductPriceDisplay(product, 'currentSellPrice')}</TableCell>
                    <TableCell className="py-3 px-4 align-top text-center hidden md:table-cell">
                      <Badge variant={product.trackQuantity ? "default" : "outline"} className={cn("cursor-default text-xs font-medium")}>
                        {product.trackQuantity ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-3 px-4 align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-9 w-9 p-0 text-muted-foreground hover:text-primary">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="shadow-xl">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href={`${basePath}/products/${product.id}`}><Edit3 className="mr-2 h-4 w-4" /> Edit / View Details</Link>
                          </DropdownMenuItem>
                          {!product.isArchived && (
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`${basePath}/billing?action=new&mode=buy&prefillProductId=${product.id}${isVariantProduct ? "&isVariant=true" : ""}`} target="_blank">
                                <PackageSearch className="mr-2 h-4 w-4" /> New Purchase Bill
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {product.isArchived ? (
                            <DropdownMenuItem onSelect={() => handleUnarchiveProduct(product.id, product.name)} className="text-green-600 cursor-pointer">
                              <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive cursor-pointer">
                                  <Archive className="mr-2 h-4 w-4" /> Archive
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive "{product.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>Archiving this product will hide it from new bills and searches.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleArchiveProduct(product.id, product.name)} className="bg-amber-600 hover:bg-amber-700">Yes, Archive Product</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center">
                  {searchTerm ? "No products match your search." : "No products found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View (Simplified) */}
      <div className="md:hidden space-y-3">
        {products.map((product) => (
          <Card key={`mobile-${product.id}`} className="shadow-md">
            <CardHeader className="p-3"><CardTitle className="text-sm">{product.name}</CardTitle></CardHeader>
            <CardContent className="p-3 text-xs"><p>Stock: {getProductStockDisplay(product)}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      {productsPagination.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button variant="outline" size="sm" onClick={() => setRequestedPage(p => Math.max(1, p - 1))} disabled={requestedPage === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="text-sm font-medium">Page {requestedPage} of {productsPagination.totalPages}</div>
          <Button variant="outline" size="sm" onClick={() => setRequestedPage(p => Math.min(productsPagination.totalPages, p + 1))} disabled={requestedPage === productsPagination.totalPages}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </TooltipProvider>
  );
}
