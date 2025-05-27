
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit3, Trash2, Eye, PlusCircle, ArrowUpDown, Pencil } from 'lucide-react';
import Image from 'next/image';
import type { Product, ProductSKU } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { NewProductDialog } from '../billing/new-product-dialog'; 
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type SortableColumns = 'name' | 'category' | 'stock' | 'costPrice' | 'sellPrice'; // Adjusted for new data structure
type EditablePriceField = 'costPrice' | 'sellPrice';

export function ProductsTable() {
  const { products, updateProduct } = useInventoryStore();
  const { toast } = useToast();
  
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' } | null>(null);

  const [editingCell, setEditingCell] = useState<{ productId: string; skuId: string; field: EditablePriceField } | null>(null);
  const [currentEditValue, setCurrentEditValue] = useState<string>("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  const handlePriceEdit = (product: Product, sku: ProductSKU, field: EditablePriceField) => {
    if (product.variants && product.variants.length > 0) { // Disable inline editing for variant products for now
        toast({ title: "Info", description: "Edit variant prices via the main 'Edit' product dialog." });
        return;
    }
    setEditingCell({ productId: product.id, skuId: sku.id, field });
    setCurrentEditValue(sku[field].toString());
  };

  const handleSavePrice = () => {
    if (!editingCell) return;

    const numericValue = parseFloat(currentEditValue);
    if (isNaN(numericValue) || numericValue < 0) {
      toast({
        variant: "destructive",
        title: "Invalid Price",
        description: "Price must be a non-negative number.",
      });
      setEditingCell(null);
      return;
    }

    const product = products.find(p => p.id === editingCell.productId);
    if (product) {
        const updatedSKUs = product.productSKUs.map(sku => 
            sku.id === editingCell.skuId ? { ...sku, [editingCell.field]: numericValue } : sku
        );
        updateProduct(editingCell.productId, { productSKUs: updatedSKUs });
        toast({
        title: "Price Updated",
        description: `Product ${editingCell.field === 'costPrice' ? 'cost' : 'sell'} price updated.`,
        });
    }
    setEditingCell(null);
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSavePrice();
    } else if (event.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let sortableProducts = [...products];
    if (searchTerm) {
      sortableProducts = sortableProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productSKUs.some(sku => sku.skuIdentifier?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'stock') {
            valA = a.productSKUs.reduce((sum, sku) => sum + sku.quantityInStock, 0);
            valB = b.productSKUs.reduce((sum, sku) => sum + sku.quantityInStock, 0);
        } else if (sortConfig.key === 'costPrice' || sortConfig.key === 'sellPrice') {
            // For simplicity, sort by the first SKU's price or a default if no SKUs
            valA = a.productSKUs[0]?.[sortConfig.key] ?? 0;
            valB = b.productSKUs[0]?.[sortConfig.key] ?? 0;
        } else {
            valA = a[sortConfig.key as keyof Product];
            valB = b[sortConfig.key as keyof Product];
        }

        let comparison = 0;
        if (valA === undefined || valA === null) comparison = -1; 
        else if (valB === undefined || valB === null) comparison = 1;
        else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }
        
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableProducts;
  }, [products, searchTerm, sortConfig]);

  const requestSort = (key: SortableColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenEditDialog = (product: Product) => {
    setEditingProduct(product); 
    setIsNewProductDialogOpen(true); 
  };

  const handleDeleteProduct = (productId: string) => {
    // Actual delete logic is in useInventoryStore, this is just a placeholder action if needed
    toast({ title: "Delete Product Action", description: `Product with ID ${productId} would be deleted. (Functionality not fully implemented in demo)` });
    // deleteProduct(productId); // This would be the actual call
  };

  const onProductDialogSubmit = (product: Product) => { 
    setIsNewProductDialogOpen(false);
    setEditingProduct(null); 
  };

  const getProductStockDisplay = (product: Product): string | number => {
    if (!product.trackQuantity) return <span className="text-muted-foreground">N/A</span>;
    return product.productSKUs.reduce((sum, sku) => sum + sku.quantityInStock, 0);
  };

  const getProductPriceDisplay = (product: Product, field: 'costPrice' | 'sellPrice'): string => {
    if (product.productSKUs.length === 0) return "N/A";
    if (product.productSKUs.length === 1) return `₹${product.productSKUs[0][field].toFixed(2)}`;
    
    const prices = product.productSKUs.map(sku => sku[field]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return `₹${minPrice.toFixed(2)}`;
    return `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
  };


  return (
    <>
      <NewProductDialog 
        isOpen={isNewProductDialogOpen} 
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null); 
          setIsNewProductDialogOpen(open);
        }}
        editingProduct={editingProduct} 
        onProductAdd={onProductDialogSubmit} 
      />
      <div className="flex items-center justify-between mb-4 gap-2">
        <Input
          placeholder="Search products (name, category, SKU)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => { setEditingProduct(null); setIsNewProductDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">
                Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted/50">
                Category <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => requestSort('stock')}>
                Stock <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => requestSort('costPrice')}>Cost <ArrowUpDown className="ml-2 h-3 w-3 inline" /></TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => requestSort('sellPrice')}>
                Sell Price <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead>Tracked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => {
                const isVariantProduct = product.variants && product.variants.length > 0;
                const singleSku = (!isVariantProduct && product.productSKUs.length > 0) ? product.productSKUs[0] : null;

                return (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image
                      src={product.imageUrl || `https://placehold.co/64x64.png`}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="rounded-md object-cover aspect-square"
                      data-ai-hint="product item generic"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{product.name}</div>
                    {isVariantProduct && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {product.variants?.map(v => `${v.name} (${v.options.length})`).join(', ')} ({product.productSKUs.length} SKUs)
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.category ? <Badge variant="outline" className="bg-tertiary text-tertiary-foreground border-tertiary-foreground/30">{product.category}</Badge> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {getProductStockDisplay(product)}
                  </TableCell>
                  <TableCell 
                    className={cn("text-right group relative", singleSku && "cursor-pointer")}
                    onClick={() => singleSku && editingCell?.skuId !== singleSku.id && handlePriceEdit(product, singleSku, 'costPrice')}
                  >
                    {singleSku && editingCell?.skuId === singleSku.id && editingCell?.field === 'costPrice' ? (
                      <Input
                        ref={editInputRef}
                        type="number"
                        value={currentEditValue}
                        onChange={(e) => setCurrentEditValue(e.target.value)}
                        onBlur={handleSavePrice}
                        onKeyDown={handleEditKeyDown}
                        className="h-8 w-20 text-right text-sm tabular-nums"
                        step="0.01"
                      />
                    ) : (
                      <>
                        <span>{getProductPriceDisplay(product, 'costPrice')}</span>
                        {singleSku && <Pencil className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </>
                    )}
                  </TableCell>
                  <TableCell 
                    className={cn("text-right group relative", singleSku && "cursor-pointer")}
                    onClick={() => singleSku && editingCell?.skuId !== singleSku.id && handlePriceEdit(product, singleSku, 'sellPrice')}
                  >
                     {singleSku && editingCell?.skuId === singleSku.id && editingCell?.field === 'sellPrice' ? (
                      <Input
                        ref={editInputRef}
                        type="number"
                        value={currentEditValue}
                        onChange={(e) => setCurrentEditValue(e.target.value)}
                        onBlur={handleSavePrice}
                        onKeyDown={handleEditKeyDown}
                        className="h-8 w-20 text-right text-sm tabular-nums"
                        step="0.01"
                      />
                    ) : (
                      <>
                        <span>{getProductPriceDisplay(product, 'sellPrice')}</span>
                        {singleSku && <Pencil className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                     <Badge variant={product.trackQuantity ? "default" : "outline"} className={cn(product.trackQuantity ? "bg-primary/80 hover:bg-primary" : "", "cursor-default")}>
                        {product.trackQuantity ? 'Yes' : 'No'}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenEditDialog(product)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled> 
                          <Eye className="mr-2 h-4 w-4" /> View Details (SKUs)
                        </DropdownMenuItem>
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
                                    This action cannot be undone. This will permanently delete the product "{product.name}" and all its SKUs.
                                    (Note: Actual delete functionality is not fully implemented in this demo.)
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(product.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
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
                <TableCell colSpan={8} className="h-24 text-center">
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
