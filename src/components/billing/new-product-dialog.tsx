
"use client";

import React, { useEffect, useRef } from 'react';
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
import type { Product, ProductVariant, ProductOption as ProductOptionType } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { CategorySearchInput } from './category-search-input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const productOptionSchema = z.object({
  value: z.string().min(1, "Option value cannot be empty"),
});

const productVariantSchema = z.object({
  name: z.string().min(1, "Variant name cannot be empty"),
  options: z.array(productOptionSchema).min(1, "At least one option is required"),
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

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  // Ref to help focus the last added option input if needed (advanced focus management)
  const lastOptionInputRef = useRef<HTMLInputElement | null>(null);

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
        variants: [],
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

  useEffect(() => {
    if (lastOptionInputRef.current) {
      lastOptionInputRef.current.focus();
      lastOptionInputRef.current = null; // Reset ref
    }
  }, [variantFields]); // Re-run when variantFields change, implying an option might have been added

  const trackQuantity = form.watch('trackQuantity');

  const onSubmit = (data: NewProductFormData) => {
    const productVariants: ProductVariant[] = (data.variants || []).map((variant, variantIdx) => ({
      id: `variant-${Date.now()}-${variantIdx}`, 
      name: variant.name,
      options: variant.options.map((opt, optIdx) => ({
        id: `option-${Date.now()}-${variantIdx}-${optIdx}`,
        value: opt.value,
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
          {variantFields.map((variantField, variantIndex) => {
            const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
              control: form.control,
              name: `variants.${variantIndex}.options` as const,
            });

            return (
              <div key={variantField.id} className="space-y-3 border p-4 rounded-md bg-muted/50">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`variants.${variantIndex}.name`}>Variant {variantIndex + 1} Name (e.g., Color, Size)</Label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(variantIndex)}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                </div>
                <Input 
                  {...form.register(`variants.${variantIndex}.name`)} 
                  placeholder="e.g. Color"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Optionally focus first option input or "Add Option" button
                      // For now, just prevent default behavior
                    }
                  }}
                />
                {form.formState.errors.variants?.[variantIndex]?.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.variants[variantIndex]?.name?.message}</p>}
                
                <Label className="text-xs text-muted-foreground">Options for {form.watch(`variants.${variantIndex}.name`) || `Variant ${variantIndex+1}`}</Label>
                <div className="space-y-2">
                  {optionFields.map((optionValueField, optionIndex) => (
                    <div key={optionValueField.id} className="flex items-center gap-2">
                      <Input
                        {...form.register(`variants.${variantIndex}.options.${optionIndex}.value`)}
                        placeholder={`Option ${optionIndex + 1} Value`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault(); // Prevent form submission or dialog close
                            appendOption({ value: '' });
                            // Basic focus attempt for next input after a short delay for DOM update
                            // More robust focus would use refs and useEffect
                            setTimeout(() => {
                              const nextInput = document.querySelector(`input[name="variants.${variantIndex}.options.${optionIndex + 1}.value"]`) as HTMLInputElement;
                              nextInput?.focus();
                            }, 0);
                          }
                        }}
                      />
                      {optionFields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} className="h-8 w-8">
                          <Trash2 className="h-3 w-3 text-destructive"/>
                        </Button>
                      )}
                    </div>
                  ))}
                  {form.formState.errors.variants?.[variantIndex]?.options && !Array.isArray(form.formState.errors.variants?.[variantIndex]?.options) && <p className="text-sm text-destructive mt-1">{ (form.formState.errors.variants?.[variantIndex]?.options as any)?.message || "Error with options"}</p>}

                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => {
                    appendOption({ value: '' });
                    setTimeout(() => {
                       const nextInput = document.querySelector(`input[name="variants.${variantIndex}.options.${optionFields.length}.value"]`) as HTMLInputElement;
                       nextInput?.focus();
                    }, 0);
                  }}
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Option
                </Button>
              </div>
            );
          })}
          {variantFields.length < 2 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => appendVariant({ name: "", options: [{value: ""}] })} // Add with one default option
            >
              <PlusCircle className="mr-2 h-4 w-4"/> Add Variant Type
            </Button>
          )}
          {form.formState.errors.variants && typeof form.formState.errors.variants.message === 'string' && <p className="text-sm text-destructive mt-1">{form.formState.errors.variants.message}</p>}


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

    