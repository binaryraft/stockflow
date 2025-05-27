"use client";

import React, { useState, useMemo } from 'react';
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
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit3, Trash2, Eye, PlusCircle, ArrowUpDown } from 'lucide-react';
import Image from 'next/image';
import type { Product } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { NewProductDialog } from '../billing/new-product-dialog'; // Re-use for editing/adding
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type SortableColumns = keyof Pick<Product, 'name' | 'category' | 'quantityInStock' | 'sellPrice'>;


export function ProductsTable() {
  const { products, updateProduct } = useInventoryStore();
  const { toast } = useToast();
  
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' } | null>(null);


  const filteredAndSortedProducts = useMemo(() => {
    let sortableProducts = [...products];
    if (searchTerm) {
      sortableProducts = sortableProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
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

  const handleEditProduct = (product: Product) => {
    // For simplicity, we'll use the NewProductDialog for editing by pre-filling it.
    // A dedicated edit dialog might be better for complex scenarios.
    setEditingProduct(product); // This would be used to prefill a dialog
    toast({ title: "Edit Product", description: "Editing via New Product Dialog for now. Save will update."});
    // Ideally, open a dialog prefilled with 'product' data
    // For now, let's just log and open the new product dialog as a placeholder for edit functionality
    console.log("Editing product:", product);
    // To properly edit, you'd pass `product` to `NewProductDialog` and have it handle update logic
    // This is a simplified approach:
    // 1. Open NewProductDialog
    // 2. User manually re-enters data or it's pre-filled (requires NewProductDialog modification)
    // 3. On submit, if editingProduct is set, call updateProduct instead of addProduct.
    // This needs NewProductDialog to support an 'editMode' and initialData.
    // For now, we'll just re-use the 'add' functionality for demo.
    setIsNewProductDialogOpen(true); 
  };

  const handleDeleteProduct = (productId: string) => {
    // This would typically call a store action like `deleteProduct(productId)`
    // For now, it's a placeholder.
    toast({ title: "Delete Product", description: `Product with ID ${productId} would be deleted. (Not implemented)` });
    console.log("Deleting product:", productId);
  };

  const onProductFormSubmit = (data: Product) => {
    if (editingProduct) { // This logic needs to be in the dialog or passed via callback
      updateProduct(editingProduct.id, data);
      toast({ title: "Product Updated", description: `${data.name} has been updated.` });
      setEditingProduct(null);
    } else {
      // addProduct is handled by NewProductDialog's own submit
    }
    setIsNewProductDialogOpen(false);
  };


  return (
    <>
      <NewProductDialog 
        isOpen={isNewProductDialogOpen} 
        onOpenChange={setIsNewProductDialogOpen}
        onProductAdd={onProductFormSubmit} // This dialog only adds, edit needs modification
        initialProductName={editingProduct ? editingProduct.name : undefined} // Basic prefill
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
      <Card className="shadow-md">
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
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => requestSort('quantityInStock')}>
                Stock <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => requestSort('sellPrice')}>
                Sell Price <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead>Tracked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image
                      src={product.imageUrl || `https://placehold.co/64x64.png`}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="rounded-md object-cover aspect-square"
                      data-ai-hint="product item"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.category ? <Badge variant="secondary">{product.category}</Badge> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.trackQuantity ? product.quantityInStock : <span className="text-muted-foreground">N/A</span>}
                  </TableCell>
                  <TableCell className="text-right">${product.costPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${product.sellPrice.toFixed(2)}</TableCell>
                  <TableCell>
                     <Badge variant={product.trackQuantity ? "default" : "outline"}>
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
                        <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled> {/* View details page not implemented */}
                          <Eye className="mr-2 h-4 w-4" /> View Details
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
                                    This action cannot be undone. This will permanently delete the product "{product.name}".
                                    (Note: Actual delete functionality is not implemented in this demo.)
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
