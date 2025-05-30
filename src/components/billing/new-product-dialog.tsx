
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
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
import type { Product, ProductVariant as ProductVariantType, ProductOption as ProductOptionType } from '@/types';
import { CategorySearchInput } from './category-search-input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const productOptionSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1, "Option value cannot be empty"),
});

const productVariantFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name cannot be empty"),
  options: z.array(productOptionSchema).min(1, "At least one option is required for a variant."),
});

const newProductDialogSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().optional(),
  category: z.string().optional().default(''),
  trackQuantity: z.boolean().default(true),
  // For non-variant, non-tracked items, or pre-fill from expense bill
  costPrice: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : parseFloat(String(val))),
    z.number({ invalid_type_error: "Cost price must be a number" }).optional()
  ),
  sellPrice: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : parseFloat(String(val))),
    z.number({ invalid_type_error: "Sell price must be a number" }).optional()
  ),
  initialStock: z.preprocess( // Only relevant if trackQuantity and pre-filled from billing
    (val) => (val === "" || val === undefined || val === null ? undefined : parseInt(String(val), 10)),
    z.number({ invalid_type_error: "Initial stock must be a number" }).optional()
  ),
  variants: z.array(productVariantFormSchema).max(2, "Maximum of 2 variant types allowed").optional(),
});

type NewProductDialogFormData = z.infer<typeof newProductDialogSchema>;

interface VariantFormSectionProps {
  variantIndex: number;
  removeVariant: (index: number) => void;
}

const VariantFormSection: React.FC<VariantFormSectionProps> = ({
  variantIndex,
  removeVariant,
}) => {
  const { control, register, formState: { errors }, watch, setFocus } = useFormContext<NewProductDialogFormData>();

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `variants.${variantIndex}.options` as const,
  });

  const variantName = watch(`variants.${variantIndex}.name`);

  const handleOptionEnter = (e: React.KeyboardEvent<HTMLInputElement>, currentOptionIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentOptionValue = watch(`variants.${variantIndex}.options.${currentOptionIndex}.value`);
      if (currentOptionValue && currentOptionValue.trim() !== '') {
        appendOption({ value: '' });
        setTimeout(() => {
          setFocus(`variants.${variantIndex}.options.${optionFields.length}.value`);
        }, 50);
      }
    }
  };
  
  const handleVariantNameEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
       e.preventDefault();
       if (optionFields.length === 0) {
         appendOption({ value: '' });
         setTimeout(() => setFocus(`variants.${variantIndex}.options.0.value`), 50);
       } else {
         setTimeout(() => setFocus(`variants.${variantIndex}.options.0.value`), 50);
       }
     }
  }

  return (
    <div className="space-y-3 border border-primary/20 p-3 rounded-md bg-tertiary shadow-sm">
      <div className="flex justify-between items-center">
        <Label htmlFor={`variants.${variantIndex}.name`} className="text-sm font-medium text-primary">Variant Type {variantIndex + 1}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(variantIndex)} aria-label="Remove Variant Type">
                <Trash2 className="h-4 w-4 text-destructive"/>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Remove this variant type</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        {...register(`variants.${variantIndex}.name`)}
        placeholder="e.g. Color, Size"
        aria-label={`Variant ${variantIndex + 1} Name`}
        onKeyDown={handleVariantNameEnter}
      />
      {errors.variants?.[variantIndex]?.name && <p className="text-xs text-destructive mt-0.5">{errors.variants[variantIndex]?.name?.message}</p>}

      <Label className="text-xs text-muted-foreground mt-1.5 block">Options for {variantName || `Variant Type ${variantIndex+1}`}</Label>
      <div className="space-y-1.5">
        {optionFields.map((optionValueField, optionIndex) => (
          <div key={optionValueField.id} className="flex items-center gap-2">
            <Input
              {...register(`variants.${variantIndex}.options.${optionIndex}.value`)}
              placeholder={`Option ${optionIndex + 1} Value (e.g. Red, Small)`}
              aria-label={`Variant ${variantIndex + 1} Option ${optionIndex + 1} Value`}
              onKeyDown={(e) => handleOptionEnter(e, optionIndex)}
            />
            {optionFields.length > 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} className="h-8 w-8" aria-label="Remove Option Value">
                      <Trash2 className="h-3 w-3 text-destructive"/>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Remove option value</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ))}
        {errors.variants?.[variantIndex]?.options?.root && <p className="text-xs text-destructive mt-0.5">{errors.variants[variantIndex]?.options?.root?.message}</p>}
        {Array.isArray(errors.variants?.[variantIndex]?.options) && (errors.variants?.[variantIndex]?.options as any).map((err: any, i:number) => err?.value?.message && <p key={i} className="text-xs text-destructive mt-0.5">{err.value.message}</p>)}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => {
          appendOption({ value: '' });
          setTimeout(() => {
            setFocus(`variants.${variantIndex}.options.${optionFields.length}.value`);
          }, 50);
        }}
      >
        <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Option Value
      </Button>
    </div>
  );
};

interface NewProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: (newProduct: Product) => void;
  initialValues?: {
    name?: string;
    quantity?: string; // Used for initialStock if tracked
    costPrice?: string;
    sellPrice?: string;
  } | null;
}

export function NewProductDialog({
  isOpen,
  onOpenChange,
  onProductAdded,
  initialValues,
}: NewProductDialogProps) {
  const { addProduct, categories, addCategory: addCategoryToStore } = useInventoryStore();
  const { toast } = useToast();

  const form = useForm<NewProductDialogFormData>({
    resolver: zodResolver(newProductDialogSchema),
    defaultValues: {
      name: initialValues?.name || '',
      description: '',
      category: '',
      trackQuantity: initialValues?.quantity ? true : true, // Default to true, or true if quantity is prefilled
      costPrice: initialValues?.costPrice ? parseFloat(initialValues.costPrice) : undefined,
      sellPrice: initialValues?.sellPrice ? parseFloat(initialValues.sellPrice) : undefined,
      initialStock: initialValues?.quantity ? parseInt(initialValues.quantity) : undefined,
      variants: [],
    },
  });

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setFocus, setValue } = form;

  const trackQuantityValue = watch('trackQuantity');
  const currentVariants = watch('variants');
  const hasVariants = Array.isArray(currentVariants) && currentVariants.length > 0;

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: "variants",
  });

  useEffect(() => {
    if (isOpen) {
      const defaultTrackQuantity = initialValues?.quantity ? true : true;
      reset({
        name: initialValues?.name || '',
        description: '',
        category: '',
        trackQuantity: defaultTrackQuantity,
        costPrice: initialValues?.costPrice ? parseFloat(initialValues.costPrice) : undefined,
        sellPrice: initialValues?.sellPrice ? parseFloat(initialValues.sellPrice) : undefined,
        initialStock: defaultTrackQuantity && initialValues?.quantity ? parseInt(initialValues.quantity) : undefined,
        variants: [],
      });
      setTimeout(() => setFocus('name'), 100);
    }
  }, [isOpen, initialValues, reset, setFocus]);

  const onSubmit = (data: NewProductDialogFormData) => {
    const productVariantsPayload: ProductVariantType[] = (data.variants || []).map(v_form => ({
        id: v_form.id || `variant-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: v_form.name,
        options: v_form.options.map(opt_form => ({
          id: opt_form.id || `option-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          value: opt_form.value
        }))
    }));

    if (data.category && !categories.some(c => c.name.toLowerCase() === data.category!.toLowerCase())) {
      addCategoryToStore(data.category!);
    }

    const productToSaveBase: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { costPriceForNonTracked?: number, sellPriceForNonTracked?: number, initialStockForTrackedNonVariant?: number } = {
      name: data.name,
      description: data.description,
      category: data.category,
      trackQuantity: data.trackQuantity,
      variants: productVariantsPayload,
    };
    
    if (!data.trackQuantity && (!productVariantsPayload || productVariantsPayload.length === 0)) {
        productToSaveBase.costPriceForNonTracked = data.costPrice;
        productToSaveBase.sellPriceForNonTracked = data.sellPrice;
    }
    if (data.trackQuantity && (!productVariantsPayload || productVariantsPayload.length === 0) && data.initialStock !== undefined) {
        productToSaveBase.initialStockForTrackedNonVariant = data.initialStock;
    }


    const newProduct = addProduct(productToSaveBase);
    toast({ title: "Product Added", description: `${newProduct.name} has been added.` });
    onProductAdded(newProduct);
    onOpenChange(false); // Close dialog
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh] border-t-4 border-t-primary shadow-lg p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Add New Product (Quick Add)</DialogTitle>
          <DialogDescription>
            Quickly add a new product. For more detailed setup, use the main Products page.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
              <div>
                <Label htmlFor="dialog-product-name">Product Name*</Label>
                <Input id="dialog-product-name" {...register("name")} placeholder="Enter product name" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="dialog-category">Category</Label>
                    <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                        <CategorySearchInput
                        id="dialog-category"
                        value={field.value || ''}
                        onValueChange={(value) => field.onChange(value)}
                        onCategorySelect={(categoryName) => field.onChange(categoryName)}
                        placeholder="Type or select category"
                        />
                    )}
                    />
                </div>
                <div className="space-y-1.5 flex items-center pt-6">
                    <Controller
                        name="trackQuantity"
                        control={control}
                        render={({ field }) => (
                        <Checkbox id="dialog-trackQuantity" checked={field.value} onCheckedChange={field.onChange} />
                        )}
                    />
                    <Label htmlFor="dialog-trackQuantity" className="font-normal text-sm ml-2">Track inventory quantity</Label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dialog-description">Description</Label>
                <Textarea id="dialog-description" {...register("description")} placeholder="Enter product description (optional)" rows={2}/>
              </div>

              {!hasVariants && (
                <>
                  {trackQuantityValue && initialValues?.quantity !== undefined && (
                     <div className="space-y-1.5">
                        <Label htmlFor="dialog-initialStock">Initial Stock (from billing)</Label>
                        <Input id="dialog-initialStock" type="number" {...register("initialStock")} disabled />
                        <p className="text-xs text-muted-foreground">Stock will be added via the Expense Bill.</p>
                     </div>
                  )}
                  {(!trackQuantityValue || initialValues?.costPrice !== undefined || initialValues?.sellPrice !== undefined) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="dialog-costPrice">Cost Price {trackQuantityValue ? "(Optional for first batch)" : ""}</Label>
                            <Input id="dialog-costPrice" type="number" step="0.01" {...register("costPrice")} placeholder="0.00" />
                            {errors.costPrice && <p className="text-xs text-destructive mt-1">{errors.costPrice.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="dialog-sellPrice">Sell Price {trackQuantityValue ? "(Optional for first batch)" : ""}</Label>
                            <Input id="dialog-sellPrice" type="number" step="0.01" {...register("sellPrice")} placeholder="0.00" />
                            {errors.sellPrice && <p className="text-xs text-destructive mt-1">{errors.sellPrice.message}</p>}
                        </div>
                    </div>
                  )}
                </>
              )}
              {trackQuantityValue && hasVariants && (
                 <p className="text-xs text-muted-foreground">For products with variants, stock and pricing are managed per specific combination (SKU) via Expense Bills.</p>
              )}


              <Separator className="my-4"/>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-md font-semibold text-primary">Variants (Max 2)</Label>
                    {variantFields.length < 2 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendVariant({ name: "", options: [{value: ""}] })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Variant Type
                    </Button>
                    )}
                </div>
                {errors.variants?.root && <p className="text-xs text-destructive mt-1">{errors.variants.root.message}</p>}
                {variantFields.map((variantField, variantIndex) => (
                    <VariantFormSection
                    key={variantField.id}
                    variantIndex={variantIndex}
                    removeVariant={removeVariant}
                    />
                ))}
                {errors.variants && typeof errors.variants.message === 'string' && <p className="text-xs text-destructive mt-1">{errors.variants.message}</p>}
              </div>
              <DialogFooter className="pt-6 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Product'}</Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
    
    