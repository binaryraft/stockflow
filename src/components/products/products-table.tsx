
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, ArrowUpDown, PackageSearch, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import type { Product, ProductSKU } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { getCurrencySymbol } from '@/lib/utils';


type SortableColumns = 'name' | 'category' | 'stock' | 'costPrice' | 'sellPrice' | 'sku' | 'expiryDate';

export function ProductsTable() {
  const { 
    products, 
    fetchProducts, 
    deleteProduct: deleteProductFromStore, 
    getSkuDetails,
    getActiveSubscriptionPlan,
    userProfile 
  } = useInventoryStore(
    (state) => ({
      products: state.products,
      fetchProducts: state.fetchProducts,
      deleteProduct: state.deleteProduct,
      getSkuDetails: state.getSkuDetails,
      getActiveSubscriptionPlan: state.getActiveSubscriptionPlan,
      userProfile: state.userProfile,
    })
  );
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setHasMounted(true);
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
    const storedCompanyId = localStorage.getItem('companyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    } else {
      console.error("Company ID not found for fetching products.");
      setIsLoading(false);
    }
  }, [userProfile.companyCurrency]);

  useEffect(() => {
    if (hasMounted) {
       setActivePlan(getActiveSubscriptionPlan());
    }
  }, [hasMounted, getActiveSubscriptionPlan]);

  useEffect(() => {
    if (hasMounted && companyId) {
      setIsLoading(true);
      fetchProducts(companyId).finally(() => setIsLoading(false));
    }
  }, [hasMounted, companyId, fetchProducts]);


  const filteredAndSortedProducts = useMemo(() => {
    let sortableProducts = [...products]; 
    if (searchTerm) {
      sortableProducts = sortableProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) || 
        product.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'stock') {
            valA = a.trackQuantity ? a.productSKUs.reduce((sum, sku) => sum + (getSkuDetails(sku).totalStock ?? 0), 0) : -1; 
            valB = b.trackQuantity ? b.productSKUs.reduce((sum, sku) => sum + (getSkuDetails(sku).totalStock ?? 0), 0) : -1;
        } else if (sortConfig.key === 'costPrice') {
            const costsA = a.productSKUs.map(sku => getSkuDetails(sku).averageCostPrice).filter(p => typeof p === 'number') as number[];
            const costsB = b.productSKUs.map(sku => getSkuDetails(sku).averageCostPrice).filter(p => typeof p === 'number') as number[];
            valA = costsA.length > 0 ? Math.min(...costsA) : Infinity; 
            valB = costsB.length > 0 ? Math.min(...costsB) : Infinity;
        } else if (sortConfig.key === 'sellPrice') {
            const pricesA = a.productSKUs.map(sku => getSkuDetails(sku).currentSellPrice).filter(p => typeof p === 'number') as number[];
            const pricesB = b.productSKUs.map(sku => getSkuDetails(sku).currentSellPrice).filter(p => typeof p === 'number') as number[];
            valA = pricesA.length > 0 ? Math.min(...pricesA) : Infinity;
            valB = pricesB.length > 0 ? Math.min(...pricesB) : Infinity;
        } else if (sortConfig.key === 'sku') {
            valA = a.sku || ''; 
            valB = b.sku || '';
        } else if (sortConfig.key === 'expiryDate') {
            valA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0; 
            valB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
        } else {
            valA = a[sortConfig.key as Exclude<SortableColumns, 'stock'|'costPrice'|'sellPrice'|'sku'|'expiryDate'>];
            valB = b[sortConfig.key as Exclude<SortableColumns, 'stock'|'costPrice'|'sellPrice'|'sku'|'expiryDate'>];
        }

        let comparison = 0;
        if (valA === undefined || valA === null || valA === Infinity) comparison = sortConfig.direction === 'ascending' ? 1 : -1; 
        else if (valB === undefined || valB === null || valB === Infinity) comparison = sortConfig.direction === 'ascending' ? -1 : 1;
        else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }
        
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableProducts;
  }, [products, searchTerm, sortConfig, getSkuDetails]);

  const requestSort = (key: SortableColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!companyId) {
        toast({ variant: "destructive", title: "Error", description: "Company context is missing." });
        return;
    }
    const success = await deleteProductFromStore(productId, companyId);
    if (success) {
        toast({ title: "Product Deleted", description: `${productName} has been removed from inventory.` });
    } else {
        toast({ variant: "destructive", title: "Deletion Failed", description: `Could not delete ${productName}.` });
    }
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
    if (allPricesAreZero && prices.length > 0) return `${currencySymbol}0.00`;

    const validPrices = prices.filter(price => price > 0); 
    if (validPrices.length === 0 && prices.length > 0) return `${currencySymbol}0.00`; 
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
    
    // If a specific numeric limit is defined (e.g., maxProducts in plan)
    // const productLimit = (planDetails as any).maxProducts; // Conceptual; actual plan structure might differ
    // if (typeof productLimit === 'number') {
    //   return products.length < productLimit;
    // }

    // Fallback if no specific limit and not explicitly "unlimited"
    // This depends on business rules. For demo, let's assume a high implicit limit or rely on `maxProducts`
    return true; // For now, assume true if not explicitly limited by "Unlimited" or a numeric cap.
  }, [activePlan, products.length]);

  const addProductButtonTooltipContent = !canAddProducts && activePlan
    ? `Product limit reached for your current plan (${activePlan.name}). Please upgrade.`
    : "Add New Product";


  if (isLoading && hasMounted) {
    return <div className="flex-1 flex items-center justify-center p-6">Loading products...</div>;
  }
  if (!companyId && hasMounted) {
     return <div className="flex-1 flex items-center justify-center p-6 text-destructive">Error: Company ID not found. Cannot load products.</div>;
  }


  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 p-4 border rounded-xl bg-card shadow-md">
        <Input
          placeholder="Search products (name, category, SKU identifier)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md w-full md:w-auto h-11 text-base"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block w-full md:w-auto">
              <Button 
                asChild={canAddProducts} 
                disabled={!canAddProducts}
                className="w-full md:w-auto h-11 text-base"
              >
                {canAddProducts ? (
                  <Link href="/admin/products/add">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add Product
                  </Link>
                ) : (
                  <span>
                    <PlusCircle className="mr-2 h-5 w-5" /> Add Product
                  </span>
                )}
              </Button>
            </div>
          </TooltipTrigger>
          {!canAddProducts && (
            <TooltipContent side="bottom" align="end">
              <p>{addProductButtonTooltipContent}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
      <div className="border rounded-xl overflow-hidden shadow-xl bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px] py-3 px-4">Image</TableHead>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/80 py-3 px-4">
                <Tooltip>
                  <TooltipTrigger className="flex items-center">Name <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Name</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted/80 py-3 px-4 hidden sm:table-cell">
                <Tooltip>
                  <TooltipTrigger className="flex items-center">Category <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Category</p></TooltipContent>
                </Tooltip>
              </TableHead>
               <TableHead onClick={() => requestSort('sku')} className="cursor-pointer hover:bg-muted/80 py-3 px-4 hidden md:table-cell">
                <Tooltip>
                  <TooltipTrigger className="flex items-center">Base SKU <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Base Product SKU</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/80 py-3 px-4" onClick={() => requestSort('stock')}>
                <Tooltip>
                  <TooltipTrigger className="flex items-center w-full justify-end">Stock <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Stock Quantity</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/80 py-3 px-4 hidden lg:table-cell" onClick={() => requestSort('costPrice')}>
                <Tooltip>
                  <TooltipTrigger className="flex items-center w-full justify-end">Avg. Cost <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Average Cost Price</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/80 py-3 px-4" onClick={() => requestSort('sellPrice')}>
                 <Tooltip>
                  <TooltipTrigger className="flex items-center w-full justify-end">Sell Price <ArrowUpDown className="ml-1.5 h-4 w-4 opacity-70" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Current Sell Price</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="py-3 px-4 text-center hidden md:table-cell">Tracked</TableHead>
              <TableHead className="text-right py-3 px-4 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => {
                const isVariantProduct = product.variants && product.variants.length > 0;
                return (
                <TableRow key={product.id} className="hover:bg-muted/30">
                  <TableCell className="py-3 px-4">
                    <Image
                      src={product.imageUrl || `https://placehold.co/64x64.png?text=${product.name.charAt(0)}`}
                      alt={product.name}
                      width={52}
                      height={52}
                      className="rounded-lg object-cover aspect-square border border-border shadow-sm"
                      data-ai-hint="product item generic"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/64x64.png?text=${product.name.charAt(0)}&font=roboto`; }}
                    />
                  </TableCell>
                  <TableCell className="font-semibold py-3 px-4 align-top text-foreground">
                    <div>{product.name}</div>
                    {isVariantProduct && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Variants: {product.variants?.map(v => `${v.name}`).join(' / ')} ({product.productSKUs.length} SKU(s))
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-top hidden sm:table-cell">
                    {product.category ? <Badge variant="secondary" className="bg-tertiary text-tertiary-foreground whitespace-nowrap">{product.category}</Badge> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-top font-mono text-xs hidden md:table-cell text-muted-foreground">
                    {product.sku || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 align-top font-medium">
                    {getProductStockDisplay(product)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 align-top hidden lg:table-cell">
                    {getProductPriceDisplay(product, 'averageCostPrice')}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 align-top">
                     {getProductPriceDisplay(product, 'currentSellPrice')}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-top text-center hidden md:table-cell">
                     <Badge variant={product.trackQuantity ? "default" : "outline"} className={cn(product.trackQuantity ? "bg-primary/80 hover:bg-primary text-primary-foreground" : "text-muted-foreground border-border", "cursor-default text-xs font-medium")}>
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
                          <Link href={`/admin/products/${product.id}`}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit / View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                           <Link href={`/admin/billing?action=new&mode=buy&prefillProductId=${product.id}${isVariantProduct ? `&isVariant=true`: ""}`} target="_blank">
                               <PackageSearch className="mr-2 h-4 w-4" /> New Purchase Bill <ExternalLink className="ml-auto h-3 w-3 opacity-70"/>
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete "{product.name}" and all associated data. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(product.id, product.name)} className="bg-destructive hover:bg-destructive/90">
                                    Delete Product
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  {isLoading ? "Loading products..." : (companyId ? "No products found. Add some to get started!" : "Company ID not available.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

    