
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';


const newProductSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().optional(),
  category: z.string().optional(),
  trackQuantity: z.boolean().default(false),
  initialStock: z.coerce.number().min(0).optional().default(0),
  costPrice: z.coerce.number().min(0).optional().default(0),
  sellPrice: z.coerce.number().min(0).optional().default(0),
  sku: z.string().optional(),
  expiryDate: z.string().optional(), // Consider using a date picker
});

type NewProductFormData = z.infer<typeof newProductSchema>;

interface NewProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdd?: (product: Product) => void;
  initialProductName?: string;
  initialQuantityForDialog?: number;
  initialCostPriceForDialog?: number;
  initialSellPriceForDialog?: number;
}

export function NewProductDialog({ 
  isOpen, 
  onOpenChange, 
  onProductAdd, 
  initialProductName,
  initialQuantityForDialog,
  initialCostPriceForDialog,
  initialSellPriceForDialog 
}: NewProductDialogProps) {
  const { addProduct, categories: existingCategories, addCategory } = useInventoryStore();
  const { toast } = useToast();
  
  const form = useForm<NewProductFormData>({
    resolver: zodResolver(newProductSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      trackQuantity: false,
      initialStock: 0,
      costPrice: 0,
      sellPrice: 0,
      sku: '',
      expiryDate: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      const shouldTrack = initialQuantityForDialog !== undefined; // Track if quantity is passed, even if 0
      form.reset({
        name: initialProductName || '',
        description: '', // Reset other fields for a new product
        category: '',
        trackQuantity: shouldTrack,
        initialStock: initialQuantityForDialog || 0,
        costPrice: initialCostPriceForDialog || 0,
        sellPrice: initialSellPriceForDialog || 0,
        sku: '',
        expiryDate: '',
      });
    }
  }, [
    isOpen, 
    initialProductName, 
    initialQuantityForDialog, 
    initialCostPriceForDialog, 
    initialSellPriceForDialog, 
    form
  ]);

  const trackQuantity = form.watch('trackQuantity');

  const onSubmit = (data: NewProductFormData) => {
    const newProductData = {
        name: data.name,
        description: data.description,
        category: data.category,
        trackQuantity: data.trackQuantity,
        initialStock: data.trackQuantity ? data.initialStock : 0,
        costPrice: data.costPrice || 0,
        sellPrice: data.sellPrice || 0,
        sku: data.sku,
        expiryDate: data.expiryDate,
    };
    const addedProduct = addProduct(newProductData);
    toast({ title: "Product Added", description: `${addedProduct.name} has been added to your inventory.` });
    if (onProductAdd) {
      onProductAdd(addedProduct);
    }
    // form.reset(); // Reset is handled by useEffect when isOpen changes or by parent on dialog close
    onOpenChange(false);
  };

  const uniqueCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...existingCategories.map(c => c.name)]));


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details for the new product. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name*</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register("description")} placeholder="Enter product description..."/>
          </div>
          
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <Label htmlFor="category">Category</Label>
               <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueCategories.map((catName) => (
                        <SelectItem key={catName} value={catName}>{catName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>


          <div className="flex items-center space-x-2">
            <Controller
              name="trackQuantity"
              control={form.control}
              render={({ field }) => (
                 <Checkbox id="trackQuantity" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="trackQuantity" className="font-normal">Track Quantity</Label>
          </div>

          {trackQuantity && (
            <>
              <div>
                <Label htmlFor="initialStock">Initial Stock Quantity*</Label>
                <Input id="initialStock" type="number" {...form.register("initialStock")} />
                {form.formState.errors.initialStock && <p className="text-sm text-destructive mt-1">{form.formState.errors.initialStock.message}</p>}
              </div>
              <div>
                <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                <Input id="sku" {...form.register("sku")} />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="date" {...form.register("expiryDate")} />
              </div>
            </>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costPrice">Cost Price*</Label>
              <Input id="costPrice" type="number" step="0.01" {...form.register("costPrice")} />
              {form.formState.errors.costPrice && <p className="text-sm text-destructive mt-1">{form.formState.errors.costPrice.message}</p>}
            </div>
            <div>
              <Label htmlFor="sellPrice">Sell Price*</Label>
              <Input id="sellPrice" type="number" step="0.01" {...form.register("sellPrice")} />
              {form.formState.errors.sellPrice && <p className="text-sm text-destructive mt-1">{form.formState.errors.sellPrice.message}</p>}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Add Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
