
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
import { MoreHorizontal, Edit3, Trash2, Eye, PlusCircle, ArrowUpDown, PackageSearch } from 'lucide-react';
import Image from 'next/image';
import type { Product, ProductSKU } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type SortableColumns = 'name' | 'category' | 'stock' | 'costPrice' | 'sellPrice' | 'sku' | 'expiryDate';

export function ProductsTable() {
  const { products, deleteProduct, getSkuDetails } = useInventoryStore(
    (state) => ({
      products: state.products,
      deleteProduct: state.deleteProduct,
      getSkuDetails: state.getSkuDetails,
    })
  );
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

  const filteredAndSortedProducts = useMemo(() => {
    let sortableProducts = [...products];
    if (searchTerm) {
      sortableProducts = sortableProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) || // Main product SKU code
        product.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'stock') {
            valA = a.trackQuantity ? a.productSKUs.reduce((sum, sku) => sum + (getSkuDetails(sku).totalStock ?? 0), 0) : -1; // Treat non-tracked as less than 0 for sorting
            valB = b.trackQuantity ? b.productSKUs.reduce((sum, sku) => sum + (getSkuDetails(sku).totalStock ?? 0), 0) : -1;
        } else if (sortConfig.key === 'costPrice') {
            const costsA = a.productSKUs.map(sku => getSkuDetails(sku).averageCostPrice).filter(p => typeof p === 'number') as number[];
            const costsB = b.productSKUs.map(sku => getSkuDetails(sku).averageCostPrice).filter(p => typeof p === 'number') as number[];
            valA = costsA.length > 0 ? Math.min(...costsA) : Infinity; // Unpriced items go to the end
            valB = costsB.length > 0 ? Math.min(...costsB) : Infinity;
        } else if (sortConfig.key === 'sellPrice') {
            const pricesA = a.productSKUs.map(sku => getSkuDetails(sku).currentSellPrice).filter(p => typeof p === 'number') as number[];
            const pricesB = b.productSKUs.map(sku => getSkuDetails(sku).currentSellPrice).filter(p => typeof p === 'number') as number[];
            valA = pricesA.length > 0 ? Math.min(...pricesA) : Infinity;
            valB = pricesB.length > 0 ? Math.min(...pricesB) : Infinity;
        } else if (sortConfig.key === 'sku') {
            valA = a.sku || ''; // Main product SKU
            valB = b.sku || '';
        } else if (sortConfig.key === 'expiryDate') {
            valA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0; // No expiry date sorts first
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

  const handleDeleteProductClick = (productId: string, productName: string) => {
    deleteProduct(productId);
    toast({ title: "Product Deleted", description: `${productName} has been removed from inventory.` });
  };

  const getProductStockDisplay = (product: Product): string | number => {
    if (!product.trackQuantity) return <span className="text-xs text-muted-foreground">N/A</span>;
    const totalStock = product.productSKUs.reduce((sum, sku) => sum + (getSkuDetails(sku).totalStock ?? 0), 0);
    return totalStock;
  };

  const getProductPriceDisplay = (product: Product, field: 'averageCostPrice' | 'currentSellPrice'): string => {
    if (product.productSKUs.length === 0) return "N/A";
    
    const prices = product.productSKUs.map(sku => getSkuDetails(sku)[field]).filter(price => typeof price === 'number') as number[];
    
    if (prices.length === 0) return "N/A"; 
    
    const allPricesAreZero = prices.every(price => price === 0);
    if (allPricesAreZero && prices.length > 0) return `₹0.00`; // If SKUs exist but all prices are 0

    const validPrices = prices.filter(price => price > 0); // Consider only non-zero prices for min/max if some are zero
    if (validPrices.length === 0 && prices.length > 0) return `₹0.00`; // All existing SKU prices are 0
    if (validPrices.length === 0) return "N/A"; // No valid prices among SKUs

    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    if (minPrice === maxPrice) return `₹${minPrice.toFixed(2)}`;
    
    return `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2">
        <Input
          placeholder="Search products (name, category, SKU identifier)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button asChild>
          <Link href="/admin/products/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px] py-3 px-4">Image</TableHead>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                <Tooltip>
                  <TooltipTrigger className="flex items-center">Name <ArrowUpDown className="ml-1 h-3 w-3 inline" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Name</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                <Tooltip>
                  <TooltipTrigger className="flex items-center">Category <ArrowUpDown className="ml-1 h-3 w-3 inline" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Category</p></TooltipContent>
                </Tooltip>
              </TableHead>
               <TableHead onClick={() => requestSort('sku')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden md:table-cell">
                <Tooltip>
                  <TooltipTrigger className="flex items-center">Base SKU <ArrowUpDown className="ml-1 h-3 w-3 inline" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Base Product SKU</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4" onClick={() => requestSort('stock')}>
                <Tooltip>
                  <TooltipTrigger className="flex items-center w-full justify-end">Stock <ArrowUpDown className="ml-1 h-3 w-3 inline" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Stock Quantity</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4" onClick={() => requestSort('costPrice')}>
                <Tooltip>
                  <TooltipTrigger className="flex items-center w-full justify-end">Avg. Cost <ArrowUpDown className="ml-1 h-3 w-3 inline" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Average Cost Price</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4" onClick={() => requestSort('sellPrice')}>
                 <Tooltip>
                  <TooltipTrigger className="flex items-center w-full justify-end">Sell Price <ArrowUpDown className="ml-1 h-3 w-3 inline" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Current Sell Price</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead onClick={() => requestSort('expiryDate')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden lg:table-cell">
                <Tooltip>
                  <TooltipTrigger className="flex items-center">Expiry <ArrowUpDown className="ml-1 h-3 w-3 inline" /></TooltipTrigger>
                  <TooltipContent><p>Sort by Expiry Date</p></TooltipContent>
                </Tooltip>
              </TableHead>
              <TableHead className="py-3 px-4 text-center">Tracked</TableHead>
              <TableHead className="text-right py-3 px-4 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => {
                const isVariantProduct = product.variants && product.variants.length > 0;
                return (
                <TableRow key={product.id}>
                  <TableCell className="py-2 px-3">
                    <Image
                      src={product.imageUrl || `https://placehold.co/64x64.png?text=${product.name.charAt(0)}`}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="rounded-md object-cover aspect-square"
                      data-ai-hint="product item generic"
                    />
                  </TableCell>
                  <TableCell className="font-medium py-3 px-4 align-top">
                    <div>{product.name}</div>
                    {isVariantProduct && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {product.variants?.map(v => `${v.name} (${v.options.length})`).join(' / ')} ({product.productSKUs.length} SKU(s) defined)
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-top">
                    {product.category ? <Badge variant="outline" className="bg-tertiary text-tertiary-foreground border-tertiary-foreground/30 whitespace-nowrap">{product.category}</Badge> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-top font-mono text-xs hidden md:table-cell">
                    {product.sku || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 align-top">
                    {getProductStockDisplay(product)}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 align-top">
                    {getProductPriceDisplay(product, 'averageCostPrice')}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 align-top">
                     {getProductPriceDisplay(product, 'currentSellPrice')}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-top text-xs hidden lg:table-cell">
                    {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4 align-top text-center">
                     <Badge variant={product.trackQuantity ? "default" : "outline"} className={cn(product.trackQuantity ? "bg-primary/80 hover:bg-primary" : "", "cursor-default text-xs")}>
                        {product.trackQuantity ? 'Yes' : 'No'}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/products/${product.id}`}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit / View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the product "{product.name}" and all associated data (including stock layers and SKU definitions). Bill history will retain references to this product name.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProductClick(product.id, product.name)} className="bg-destructive hover:bg-destructive/90">
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
                <TableCell colSpan={10} className="h-24 text-center py-3 px-4">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

    