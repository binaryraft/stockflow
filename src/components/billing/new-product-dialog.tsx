
"use client";

import React, { useEffect } from 'react';
import { useForm, Controller, useFieldArray, FormProvider } from 'react-hook-form';
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
import type { Product, ProductVariant as ProductVariantType } from '@/types';
import { CategorySearchInput } from './category-search-input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const productOptionSchema = z.object({
  value: z.string().min(1, "Option value cannot be empty"),
});

const productVariantFormSchema = z.object({
  name: z.string().min(1, "Variant name cannot be empty"),
  options: z.array(productOptionSchema).min(1, "At least one option is required for a variant."),
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
  variants: z.array(productVariantFormSchema).max(2, "Maximum of 2 variant types allowed").optional(),
});

type NewProductFormData = z.infer<typeof newProductSchema>;

interface VariantFormSectionProps {
  variantIndex: number;
  removeVariant: (index: number) => void;
  // We don't need to pass control, register, etc. if VariantFormSection uses useFormContext
}

const VariantFormSection: React.FC<VariantFormSectionProps> = ({
  variantIndex,
  removeVariant
}) => {
  const { control, register, formState, watch } = useFormContext<NewProductFormData>(); // Use context here

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `variants.${variantIndex}.options` as const,
  });

  const variantName = watch(`variants.${variantIndex}.name`);

  return (
    <div className="space-y-3 border p-4 rounded-md bg-muted/50">
      <div className="flex justify-between items-center">
        <Label htmlFor={`variants.${variantIndex}.name`} className="text-base font-medium">Variant {variantIndex + 1}</Label>
        <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(variantIndex)} aria-label="Remove Variant">
          <Trash2 className="h-4 w-4 text-destructive"/>
        </Button>
      </div>
      <Input 
        {...register(`variants.${variantIndex}.name`)} 
        placeholder="e.g. Color, Size"
        aria-label={`Variant ${variantIndex + 1} Name`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const firstOptionInput = document.querySelector(`input[name="variants.${variantIndex}.options.0.value"]`) as HTMLInputElement;
            if (firstOptionInput) firstOptionInput.focus();
            else if (optionFields.length === 0) appendOption({ value: '' }); // Add first option if none exist
          }
        }}
      />
      {formState.errors.variants?.[variantIndex]?.name && <p className="text-sm text-destructive mt-1">{formState.errors.variants[variantIndex]?.name?.message}</p>}
      
      <Label className="text-sm text-muted-foreground mt-2 block">Options for {variantName || `Variant ${variantIndex+1}`}</Label>
      <div className="space-y-2">
        {optionFields.map((optionValueField, optionIndex) => (
          <div key={optionValueField.id} className="flex items-center gap-2">
            <Input
              {...register(`variants.${variantIndex}.options.${optionIndex}.value`)}
              placeholder={`Option ${optionIndex + 1} Value (e.g. Red, Small)`}
              aria-label={`Variant ${variantIndex + 1} Option ${optionIndex + 1} Value`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); 
                  appendOption({ value: '' });
                  setTimeout(() => {
                     const nextInput = document.querySelector(`input[name="variants.${variantIndex}.options.${optionFields.length}.value"]`) as HTMLInputElement;
                     nextInput?.focus();
                  }, 0);
                }
              }}
            />
            {optionFields.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} className="h-8 w-8" aria-label="Remove Option">
                <Trash2 className="h-3 w-3 text-destructive"/>
              </Button>
            )}
          </div>
        ))}
        {formState.errors.variants?.[variantIndex]?.options?.root && <p className="text-sm text-destructive mt-1">{formState.errors.variants?.[variantIndex]?.options?.root?.message}</p>}
         {Array.isArray(formState.errors.variants?.[variantIndex]?.options) && (formState.errors.variants?.[variantIndex]?.options as any).map((err: any, i:number) => err?.value?.message && <p key={i} className="text-sm text-destructive mt-1">{err.value.message}</p>)}

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
};


interface NewProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdd?: (product: Product) => void;
  editingProduct?: Product | null;
  initialProductName?: string;
  initialQuantityForDialog?: number;
  initialCostPriceForDialog?: number;
  initialSellPriceForDialog?: number;
}

export function NewProductDialog({ 
  isOpen, 
  onOpenChange, 
  onProductAdd, 
  editingProduct,
  initialProductName,
  initialQuantityForDialog,
  initialCostPriceForDialog,
  initialSellPriceForDialog 
}: NewProductDialogProps) {
  const { addProduct, updateProduct } = useInventoryStore();
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

  const { control, register, handleSubmit, formState, watch, reset: formReset, setValue } = form;

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: control,
    name: "variants",
  });

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        formReset({
          name: editingProduct.name,
          description: editingProduct.description || '',
          category: editingProduct.category || '',
          trackQuantity: editingProduct.trackQuantity,
          initialStock: editingProduct.quantityInStock, // For editing, initialStock is current stock
          costPrice: editingProduct.costPrice,
          sellPrice: editingProduct.sellPrice,
          sku: editingProduct.sku || '',
          expiryDate: editingProduct.expiryDate || '',
          variants: editingProduct.variants?.map(v => ({
            name: v.name,
            options: v.options.map(o => ({ value: o.value }))
          })) || [],
        });
      } else {
        const shouldTrack = initialQuantityForDialog !== undefined; 
        formReset({
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
    }
  }, [
    isOpen, 
    editingProduct,
    initialProductName, 
    initialQuantityForDialog, 
    initialCostPriceForDialog, 
    initialSellPriceForDialog, 
    formReset
  ]);

  const trackQuantityValue = watch('trackQuantity');

  const onSubmit = (data: NewProductFormData) => {
    // The variants data from the form is already in the desired structure:
    // { name: string, options: { value: string }[] }
    // The store will handle adding IDs.

    const productPayload = {
        name: data.name,
        description: data.description,
        category: data.category,
        trackQuantity: data.trackQuantity,
        initialStock: data.trackQuantity ? data.initialStock : 0, // For new products
        quantityInStock: data.trackQuantity ? data.initialStock : 0, // For updates, initialStock field holds the value
        costPrice: data.costPrice || 0,
        sellPrice: data.sellPrice || 0,
        sku: data.sku,
        expiryDate: data.expiryDate,
        variants: data.variants, // Pass the form's variants structure
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload as Partial<Omit<Product, 'id' | 'imageUrl'>> & { variants?: Array<{ name: string, options: Array<{ value: string}> }> });
      toast({ title: "Product Updated", description: `${data.name} has been updated.` });
      onProductAdd?.( { ...editingProduct, ...productPayload } as Product); // Call with potentially updated product
    } else {
      const addedProduct = addProduct(productPayload as Omit<Product, 'id' | 'imageUrl'> & { initialStock?: number; variants?: Array<{ name: string, options: Array<{ value: string}> }> });
      toast({ title: "Product Added", description: `${addedProduct.name} has been added to your inventory.` });
      onProductAdd?.(addedProduct);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        formReset(); // Reset form when dialog is closed without submit
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the product. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}> {/* Provide form context for VariantFormSection */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name*</Label>
              <Input id="name" {...register("name")} />
              {formState.errors.name && <p className="text-sm text-destructive mt-1">{formState.errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} placeholder="Enter product description..."/>
            </div>
            
            <div className="flex items-end gap-2">
              <div className="flex-grow">
                <Label htmlFor="category">Category</Label>
                <Controller
                  name="category"
                  control={control}
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
                {formState.errors.category && <p className="text-sm text-destructive mt-1">{formState.errors.category.message}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="trackQuantity"
                control={control}
                render={({ field }) => (
                  <Checkbox id="trackQuantity" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="trackQuantity" className="font-normal">Track Quantity</Label>
            </div>

            {trackQuantityValue && (
              <>
                <div>
                  <Label htmlFor="initialStock">{editingProduct ? 'Current Stock Quantity*' : 'Initial Stock Quantity*'}</Label>
                  <Input id="initialStock" type="number" {...register("initialStock")} />
                  {formState.errors.initialStock && <p className="text-sm text-destructive mt-1">{formState.errors.initialStock.message}</p>}
                </div>
                <div>
                  <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                  <Input id="sku" {...register("sku")} />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input id="expiryDate" type="date" {...register("expiryDate")} />
                </div>
              </>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costPrice">Cost Price*</Label>
                <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} />
                {formState.errors.costPrice && <p className="text-sm text-destructive mt-1">{formState.errors.costPrice.message}</p>}
              </div>
              <div>
                <Label htmlFor="sellPrice">Sell Price*</Label>
                <Input id="sellPrice" type="number" step="0.01" {...register("sellPrice")} />
                {formState.errors.sellPrice && <p className="text-sm text-destructive mt-1">{formState.errors.sellPrice.message}</p>}
              </div>
            </div>

            <Separator/>
            <Label className="text-lg font-semibold">Variants (Max 2)</Label>
            {formState.errors.variants?.root && <p className="text-sm text-destructive mt-1">{formState.errors.variants.root.message}</p>}

            {variantFields.map((variantField, variantIndex) => (
              <VariantFormSection
                key={variantField.id}
                variantIndex={variantIndex}
                removeVariant={removeVariant}
              />
            ))}
            
            {variantFields.length < 2 && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => appendVariant({ name: "", options: [{value: ""}] })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4"/> Add Variant Type
              </Button>
            )}
            {formState.errors.variants && typeof formState.errors.variants.message === 'string' && <p className="text-sm text-destructive mt-1">{formState.errors.variants.message}</p>}


            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">{editingProduct ? 'Save Changes' : 'Add Product'}</Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
