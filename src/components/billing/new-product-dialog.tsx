
"use client";

import React, { useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductVariant } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { CategorySearchInput } from './category-search-input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const productOptionSchema = z.object({
  value: z.string().min(1, "Option value cannot be empty"),
});

const productVariantSchema = z.object({
  name: z.string().min(1, "Variant name cannot be empty"),
  options: z.string().min(1, "Enter comma-separated options"), // Will be parsed
});

const newProductSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().optional(),
  category: z.string().optional().default(''),
  trackQuantity: z.boolean().default(false),
  initialStock: z.coerce.number().min(0).optional().default(0),
  costPrice: z.coerce.number().min(0).optional().default(0),
  sellPrice: z.coerce.number().min(0).optional().default(0),
  sku: z.string().optional(),
  expiryDate: z.string().optional(),
  variants: z.array(productVariantSchema).max(2, "Maximum of 2 variants allowed").optional(),
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
  const { addProduct } = useInventoryStore();
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
      variants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  useEffect(() => {
    if (isOpen) {
      const shouldTrack = initialQuantityForDialog !== undefined; 
      form.reset({
        name: initialProductName || '',
        description: '', 
        category: '',
        trackQuantity: shouldTrack,
        initialStock: initialQuantityForDialog || 0,
        costPrice: initialCostPriceForDialog || 0,
        sellPrice: initialSellPriceForDialog || 0,
        sku: '',
        expiryDate: '',
        variants: [], // Reset variants on open
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
    const productVariants: ProductVariant[] = (data.variants || []).map((variant, index) => ({
      id: `variant-${Date.now()}-${index}`, // Simple ID generation for variants
      name: variant.name,
      options: variant.options.split(',').map(opt => opt.trim()).filter(opt => opt).map((optValue, optIndex) => ({
        id: `option-${Date.now()}-${index}-${optIndex}`, // Simple ID generation for options
        value: optValue,
      })),
    }));

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
        variants: productVariants,
    };
    // Type assertion needed if addProduct expects a more specific type without raw variants
    const addedProduct = addProduct(newProductData as Omit<Product, 'id' | 'quantityInStock' | 'imageUrl'> & { initialStock?: number; variants?: ProductVariant[] });
    toast({ title: "Product Added", description: `${addedProduct.name} has been added to your inventory.` });
    if (onProductAdd) {
      onProductAdd(addedProduct);
    }
    onOpenChange(false);
  };

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
                  <CategorySearchInput
                    id="category"
                    value={field.value || ''}
                    onValueChange={(value) => field.onChange(value)}
                    onCategorySelect={(categoryName) => field.onChange(categoryName)}
                    placeholder="Type or select category"
                  />
                )}
              />
               {form.formState.errors.category && <p className="text-sm text-destructive mt-1">{form.formState.errors.category.message}</p>}
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

          <Separator/>
          <Label>Variants (Max 2)</Label>
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-2 border p-3 rounded-md">
              <div className="flex justify-between items-center">
                <Label>Variant {index + 1}</Label>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive"/>
                </Button>
              </div>
              <div>
                <Label htmlFor={`variants.${index}.name`}>Variant Name (e.g., Color, Size)</Label>
                <Input {...form.register(`variants.${index}.name`)} placeholder="e.g. Color"/>
                {form.formState.errors.variants?.[index]?.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.variants[index]?.name?.message}</p>}
              </div>
              <div>
                <Label htmlFor={`variants.${index}.options`}>Options (comma-separated)</Label>
                <Input {...form.register(`variants.${index}.options`)} placeholder="e.g. Red, Green, Blue"/>
                {form.formState.errors.variants?.[index]?.options && <p className="text-sm text-destructive mt-1">{form.formState.errors.variants[index]?.options?.message}</p>}
              </div>
            </div>
          ))}
          {fields.length < 2 && (
            <Button type="button" variant="outline" onClick={() => append({ name: "", options: "" })}>
              <PlusCircle className="mr-2 h-4 w-4"/> Add Variant
            </Button>
          )}
          {form.formState.errors.variants && !form.formState.errors.variants.some(v => v.name || v.options) && <p className="text-sm text-destructive mt-1">{form.formState.errors.variants.message}</p>}


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
