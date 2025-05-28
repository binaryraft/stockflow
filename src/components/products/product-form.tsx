
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductVariant as ProductVariantType, ProductOption as ProductOptionType, ProductSKU } from '@/types';
import { CategorySearchInput } from '@/components/billing/category-search-input'; // Re-use from billing
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const productOptionSchema = z.object({
  id: z.string().optional(), // Keep ID for existing options during edits
  value: z.string().min(1, "Option value cannot be empty"),
});

const productVariantFormSchema = z.object({
  id: z.string().optional(), // Keep ID for existing variants during edits
  name: z.string().min(1, "Variant name cannot be empty"),
  options: z.array(productOptionSchema).min(1, "At least one option is required for a variant."),
});

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().optional(),
  category: z.string().optional().default(''),
  trackQuantity: z.boolean().default(false),
  // Fields for non-variant product's default SKU
  initialStock: z.coerce.number().min(0).optional().default(0),
  costPrice: z.coerce.number().min(0).optional().default(0),
  sellPrice: z.coerce.number().min(0).optional().default(0),
  sku: z.string().optional(), // Base SKU
  expiryDate: z.string().optional(),
  variants: z.array(productVariantFormSchema).max(2, "Maximum of 2 variant types allowed").optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface VariantFormSectionProps {
  variantIndex: number;
  removeVariant: (index: number) => void;
  control: any; // Control from useForm
  register: any;
  formState: any;
  watch: any;
  setFocus: any;
}

const VariantFormSection: React.FC<VariantFormSectionProps> = ({
  variantIndex,
  removeVariant,
  control,
  register,
  formState: { errors },
  watch,
  setFocus
}) => {
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `variants.${variantIndex}.options` as const,
  });

  const variantName = watch(`variants.${variantIndex}.name`);

  const handleOptionEnter = (e: React.KeyboardEvent<HTMLInputElement>, optionIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      appendOption({ value: '' });
      setTimeout(() => {
        setFocus(`variants.${variantIndex}.options.${optionFields.length}.value`);
      }, 50);
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
    <div className="space-y-3 border border-primary/20 p-4 rounded-md bg-tertiary shadow-sm">
      <div className="flex justify-between items-center">
        <Label htmlFor={`variants.${variantIndex}.name`} className="text-base font-medium text-primary">Variant Type {variantIndex + 1}</Label>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(variantIndex)} aria-label="Remove Variant Type">
                    <Trash2 className="h-4 w-4 text-destructive"/>
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Remove this variant type (e.g., Color, Size)</p></TooltipContent>
        </Tooltip>
      </div>
      <Input
        {...register(`variants.${variantIndex}.name`)}
        placeholder="e.g. Color, Size"
        aria-label={`Variant ${variantIndex + 1} Name`}
        onKeyDown={handleVariantNameEnter}
      />
      {errors.variants?.[variantIndex]?.name && <p className="text-sm text-destructive mt-1">{errors.variants[variantIndex]?.name?.message}</p>}

      <Label className="text-sm text-muted-foreground mt-2 block">Options for {variantName || `Variant Type ${variantIndex+1}`}</Label>
      <div className="space-y-2">
        {optionFields.map((optionValueField, optionIndex) => (
          <div key={optionValueField.id} className="flex items-center gap-2">
            <Input
              {...register(`variants.${variantIndex}.options.${optionIndex}.value`)}
              placeholder={`Option ${optionIndex + 1} Value (e.g. Red, Small)`}
              aria-label={`Variant ${variantIndex + 1} Option ${optionIndex + 1} Value`}
              onKeyDown={(e) => handleOptionEnter(e, optionIndex)}
            />
            {optionFields.length > 1 && (
               <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} className="h-8 w-8" aria-label="Remove Option Value">
                        <Trash2 className="h-3 w-3 text-destructive"/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Remove this option value</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        ))}
        {errors.variants?.[variantIndex]?.options?.root && <p className="text-sm text-destructive mt-1">{errors.variants?.[variantIndex]?.options?.root?.message}</p>}
         {Array.isArray(errors.variants?.[variantIndex]?.options) && (errors.variants?.[variantIndex]?.options as any).map((err: any, i:number) => err?.value?.message && <p key={i} className="text-sm text-destructive mt-1">{err.value.message}</p>)}
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

interface ProductFormProps {
  initialData?: Product | null;
  // searchParams used for pre-filling when adding new product from billing
  searchParams?: { [key: string]: string | string[] | undefined }; 
}

export function ProductForm({ initialData, searchParams }: ProductFormProps) {
  const { addProduct, updateProduct, categories, addCategory: addCategoryToStore } = useInventoryStore();
  const { toast } = useToast();
  const router = useRouter();
  const isEditing = !!initialData;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
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

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, watch, reset: formReset, setValue, setFocus } = form;

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: control,
    name: "variants",
  });

  useEffect(() => {
    if (isEditing && initialData) {
      const defaultSku = (!initialData.variants || initialData.variants.length === 0)
                          ? initialData.productSKUs.find(s => Object.keys(s.optionValues).length === 0)
                          : null;
      formReset({
        name: initialData.name,
        description: initialData.description || '',
        category: initialData.category || '',
        trackQuantity: initialData.trackQuantity,
        initialStock: defaultSku ? defaultSku.quantityInStock : 0,
        costPrice: defaultSku ? defaultSku.costPrice : 0,
        sellPrice: defaultSku ? defaultSku.sellPrice : 0,
        sku: initialData.sku || '',
        expiryDate: initialData.expiryDate ? initialData.expiryDate.split('T')[0] : '', // Format for date input
        variants: initialData.variants?.map(v => ({
          id: v.id, // Preserve existing variant IDs
          name: v.name,
          options: v.options.map(o => ({ id: o.id, value: o.value })) // Preserve existing option IDs
        })) || [],
      });
    } else if (!isEditing && searchParams) { // Pre-fill for new product from billing
      formReset({
        name: typeof searchParams.name === 'string' ? searchParams.name : '',
        description: '',
        category: '',
        trackQuantity: searchParams.quantity !== undefined, // Track if quantity was passed
        initialStock: typeof searchParams.quantity === 'string' ? parseInt(searchParams.quantity) : 0,
        costPrice: typeof searchParams.costPrice === 'string' ? parseFloat(searchParams.costPrice) : 0,
        sellPrice: typeof searchParams.sellPrice === 'string' ? parseFloat(searchParams.sellPrice) : 0,
        sku: '',
        expiryDate: '',
        variants: [],
      });
    }
    setTimeout(() => setFocus('name'), 50);
  }, [isEditing, initialData, formReset, setFocus, searchParams]);

  const trackQuantityValue = watch('trackQuantity');
  const currentVariants = watch('variants');
  const hasVariants = Array.isArray(currentVariants) && currentVariants.length > 0;

  const onSubmit = (data: ProductFormData) => {
    const productVariantsPayload: ProductVariantType[] = (data.variants || []).map(v_form => ({
        id: v_form.id || `variant-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Ensure ID exists
        name: v_form.name,
        options: v_form.options.map(opt_form => ({ 
          id: opt_form.id || `option-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Ensure ID exists
          value: opt_form.value 
        }))
    }));

    if (data.category && !categories.some(c => c.name.toLowerCase() === data.category!.toLowerCase())) {
      addCategoryToStore(data.category);
    }
    
    if (isEditing && initialData) {
      // For updates, productSKUs are managed via Expense Bills or potentially a future dedicated SKU management UI.
      // This form primarily updates the base product info and variant structure.
      // If it's a non-variant product, we update its single default SKU.
      const updatedProductData: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs'>> & { variants?: ProductVariantType[], initialStock?: number, costPrice?: number, sellPrice?: number } = {
        name: data.name,
        description: data.description,
        category: data.category,
        trackQuantity: data.trackQuantity,
        sku: data.sku,
        expiryDate: data.expiryDate,
        variants: productVariantsPayload,
      };
      if (!hasVariants) { // Non-variant product: update its default SKU
        updatedProductData.costPrice = data.costPrice;
        updatedProductData.sellPrice = data.sellPrice;
        updatedProductData.initialStock = data.trackQuantity ? data.initialStock : 0;
      }
      updateProduct(initialData.id, updatedProductData);
      toast({ title: "Product Updated", description: `${data.name} has been updated successfully.` });
    } else {
      const newProductData: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { initialStock?: number; costPrice?: number; sellPrice?: number; variants?: ProductVariantType[] } = {
        name: data.name,
        description: data.description,
        category: data.category,
        trackQuantity: data.trackQuantity,
        sku: data.sku,
        expiryDate: data.expiryDate,
        variants: productVariantsPayload,
      };
      if (!hasVariants) { // Non-variant product: set details for its default SKU
        newProductData.costPrice = data.costPrice;
        newProductData.sellPrice = data.sellPrice;
        newProductData.initialStock = data.trackQuantity ? data.initialStock : 0;
      }
      addProduct(newProductData);
      toast({ title: "Product Added", description: `${data.name} has been added to your inventory.` });
    }
    router.push('/admin/products');
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-t-2 border-t-primary">
      <CardContent className="pt-6">
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="name">Product Name*</Label>
                <Input id="name" {...register("name")} placeholder="Enter product name" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
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
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} placeholder="Enter detailed product description..." rows={4}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-1.5">
                <Label htmlFor="sku">Product SKU / Code <span className="text-xs text-muted-foreground">(Optional - for base product)</span></Label>
                <Input id="sku" {...register("sku")} placeholder="e.g., PRD-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input id="expiryDate" type="date" {...register("expiryDate")} />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2 pb-2">
              <Controller
                name="trackQuantity"
                control={control}
                render={({ field }) => (
                  <Checkbox id="trackQuantity" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="trackQuantity" className="font-normal text-sm">Track inventory quantity for this product</Label>
            </div>

            {!hasVariants && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 border rounded-md bg-tertiary/50 shadow-sm">
                {trackQuantityValue && (
                  <div className="space-y-1.5">
                    <Label htmlFor="initialStock">{isEditing ? 'Current Stock*' : 'Initial Stock*'}</Label>
                    <Input id="initialStock" type="number" {...register("initialStock")} placeholder="0" />
                    {errors.initialStock && <p className="text-sm text-destructive mt-1">{errors.initialStock.message}</p>}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="costPrice">Cost Price* (Default)</Label>
                  <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} placeholder="0.00" />
                  {errors.costPrice && <p className="text-sm text-destructive mt-1">{errors.costPrice.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sellPrice">Sell Price* (Default)</Label>
                  <Input id="sellPrice" type="number" step="0.01" {...register("sellPrice")} placeholder="0.00" />
                  {errors.sellPrice && <p className="text-sm text-destructive mt-1">{errors.sellPrice.message}</p>}
                </div>
              </div>
            )}
            
            {hasVariants && (
                <p className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-md bg-tertiary/30">
                    For products with variants, stock and pricing are managed per specific combination (SKU) and are primarily set/updated via Expense Bills. The default prices above will not apply if variants are defined.
                </p>
            )}

            <Separator className="my-6"/>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold text-primary">Variants (Max 2)</Label>
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
              <p className="text-xs text-muted-foreground -mt-2 mb-2">
                  Define variant types like 'Color' or 'Size'. Options for each variant type (e.g., Red, Blue; Small, Medium) are added below each type.
              </p>
              {errors.variants?.root && <p className="text-sm text-destructive mt-1">{errors.variants.root.message}</p>}

              {variantFields.map((variantField, variantIndex) => (
                <VariantFormSection
                  key={variantField.id}
                  variantIndex={variantIndex}
                  removeVariant={removeVariant}
                  control={control}
                  register={register}
                  formState={form.formState}
                  watch={watch}
                  setFocus={setFocus}
                />
              ))}
              {errors.variants && typeof errors.variants.message === 'string' && <p className="text-sm text-destructive mt-1">{errors.variants.message}</p>}
            </div>
            
            <div className="flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/admin/products')} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Product')}
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}

    