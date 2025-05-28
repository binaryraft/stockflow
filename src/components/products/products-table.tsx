
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
import { MoreHorizontal, Edit3, Trash2, Eye, PlusCircle, ArrowUpDown } from 'lucide-react';
import Image from 'next/image';
import type { Product, ProductSKU } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type SortableColumns = 'name' | 'category' | 'stock' | 'costPrice' | 'sellPrice' | 'sku' | 'expiryDate';

export function ProductsTable() {
  const { products, deleteProduct, getSkuDetails } = useInventoryStore();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

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
            valA = a.trackQuantity ? a.productSKUs.reduce((sum, sku) => sum + getSkuDetails(sku).totalStock, 0) : -1;
            valB = b.trackQuantity ? b.productSKUs.reduce((sum, sku) => sum + getSkuDetails(sku).totalStock, 0) : -1;
        } else if (sortConfig.key === 'costPrice') {
            const costsA = a.productSKUs.map(sku => getSkuDetails(sku).averageCostPrice).filter(p => p !== null) as number[];
            const costsB = b.productSKUs.map(sku => getSkuDetails(sku).averageCostPrice).filter(p => p !== null) as number[];
            valA = costsA.length > 0 ? Math.min(...costsA) : Infinity;
            valB = costsB.length > 0 ? Math.min(...costsB) : Infinity;
        } else if (sortConfig.key === 'sellPrice') {
            const pricesA = a.productSKUs.map(sku => getSkuDetails(sku).currentSellPrice).filter(p => p !== null) as number[];
            const pricesB = b.productSKUs.map(sku => getSkuDetails(sku).currentSellPrice).filter(p => p !== null) as number[];
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

  const handleDeleteProductClick = (productId: string, productName: string) => {
    deleteProduct(productId);
    toast({ title: "Product Deleted", description: `${productName} has been removed from inventory.` });
  };

  const getProductStockDisplay = (product: Product): string | number => {
    if (!product.trackQuantity) return <span className="text-xs text-muted-foreground">N/A</span>;
    const totalStock = product.productSKUs.reduce((sum, sku) => sum + getSkuDetails(sku).totalStock, 0);
    return totalStock;
  };

  const getProductPriceDisplay = (product: Product, field: 'averageCostPrice' | 'currentSellPrice'): string => {
    if (product.productSKUs.length === 0) return "N/A";
    
    const prices = product.productSKUs.map(sku => getSkuDetails(sku)[field]).filter(price => price !== null) as number[];
    
    if (prices.length === 0) return "N/A"; 
    
    const allPricesAreZero = prices.every(price => price === 0);
    if (allPricesAreZero) return `₹0.00`;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) return `₹${minPrice.toFixed(2)}`;
    
    return `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2">
        <Input
          placeholder="Search products (name, category, SKU)..."
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
                Name <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Category <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
               <TableHead onClick={() => requestSort('sku')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden md:table-cell">
                Base SKU <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4" onClick={() => requestSort('stock')}>
                Stock <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4" onClick={() => requestSort('costPrice')}>
                Avg. Cost <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4" onClick={() => requestSort('sellPrice')}>
                Sell Price <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('expiryDate')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden lg:table-cell">
                Expiry <ArrowUpDown className="ml-1 h-3 w-3 inline" />
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
                        {product.variants?.map(v => `${v.name} (${v.options.length})`).join(' / ')} ({product.productSKUs.length} Defined SKU(s))
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
