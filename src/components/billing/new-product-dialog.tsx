
"use client";

import React, { useEffect } from 'react';
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
import type { Product, ProductVariant as ProductVariantType, ProductSKU } from '@/types';
import { CategorySearchInput } from './category-search-input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';


const productOptionSchema = z.object({
  value: z.string().min(1, "Option value cannot be empty"),
  // id: z.string().optional(), // Keep track of existing option IDs for edits
});

const productVariantFormSchema = z.object({
  name: z.string().min(1, "Variant name cannot be empty"),
  options: z.array(productOptionSchema).min(1, "At least one option is required for a variant."),
  // id: z.string().optional(), // Keep track of existing variant IDs for edits
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
}

const VariantFormSection: React.FC<VariantFormSectionProps> = ({
  variantIndex,
  removeVariant
}) => {
  const { control, register, formState: { errors }, watch, setFocus } = useFormContext<NewProductFormData>();

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
      }, 50); // Added a slight delay for DOM update
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
    <div className="space-y-3 border border-primary/20 p-4 rounded-md bg-tertiary">
      <div className="flex justify-between items-center">
        <Label htmlFor={`variants.${variantIndex}.name`} className="text-base font-medium">Variant {variantIndex + 1}</Label>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(variantIndex)} aria-label="Remove Variant">
                    <Trash2 className="h-4 w-4 text-destructive"/>
                </Button>
            </TooltipTrigger>
            <TooltipContent><p>Remove this variant type</p></TooltipContent>
        </Tooltip>
      </div>
      <Input
        {...register(`variants.${variantIndex}.name`)}
        placeholder="e.g. Color, Size"
        aria-label={`Variant ${variantIndex + 1} Name`}
        onKeyDown={handleVariantNameEnter}
      />
      {errors.variants?.[variantIndex]?.name && <p className="text-sm text-destructive mt-1">{errors.variants[variantIndex]?.name?.message}</p>}

      <Label className="text-sm text-muted-foreground mt-2 block">Options for {variantName || `Variant ${variantIndex+1}`}</Label>
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
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} className="h-8 w-8" aria-label="Remove Option">
                        <Trash2 className="h-3 w-3 text-destructive"/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Remove this option</p></TooltipContent>
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

  const { control, register, handleSubmit, formState: { errors }, watch, reset: formReset, setValue, setFocus } = form;

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: control,
    name: "variants",
  });

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        const defaultSku = (!editingProduct.variants || editingProduct.variants.length === 0)
                            ? editingProduct.productSKUs.find(s => Object.keys(s.optionValues).length === 0)
                            : null;
        formReset({
          name: editingProduct.name,
          description: editingProduct.description || '',
          category: editingProduct.category || '',
          trackQuantity: editingProduct.trackQuantity,
          initialStock: defaultSku ? defaultSku.quantityInStock : 0,
          costPrice: defaultSku ? defaultSku.costPrice : 0,
          sellPrice: defaultSku ? defaultSku.sellPrice : 0,
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
      setTimeout(() => setFocus('name'), 50); // Auto-focus name field on open
    }
  }, [
    isOpen,
    editingProduct,
    initialProductName,
    initialQuantityForDialog,
    initialCostPriceForDialog,
    initialSellPriceForDialog,
    formReset,
    setFocus
  ]);

  const trackQuantityValue = watch('trackQuantity');
  const currentVariants = watch('variants');
  const hasVariants = Array.isArray(currentVariants) && currentVariants.length > 0;


  const onSubmit = (data: NewProductFormData) => {
    const productVariantsPayload = data.variants?.map(v => ({
        name: v.name,
        options: v.options.map(opt => ({ value: opt.value }))
    }));

    if (editingProduct) {
      const payloadForUpdate: Partial<Omit<Product, 'id' | 'imageUrl' | 'productSKUs'>> & { variants?: any[], initialStock?: number, costPrice?: number, sellPrice?: number } = {
        name: data.name,
        description: data.description,
        category: data.category,
        trackQuantity: data.trackQuantity,
        sku: data.sku,
        expiryDate: data.expiryDate,
        variants: productVariantsPayload,
      };
      if (!hasVariants) {
        payloadForUpdate.costPrice = data.costPrice;
        payloadForUpdate.sellPrice = data.sellPrice;
        payloadForUpdate.initialStock = data.trackQuantity ? data.initialStock : 0;
      }

      updateProduct(editingProduct.id, payloadForUpdate);
      toast({ title: "Product Updated", description: `${data.name} has been updated.` });
      const updatedProductData = useInventoryStore.getState().getProductById(editingProduct.id) || { ...editingProduct, ...payloadForUpdate } as Product;
      onProductAdd?.(updatedProductData);
    } else {
      const payloadForAdd: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> & { initialStock?: number; costPrice?: number; sellPrice?: number; variants?: any[] } = {
        name: data.name,
        description: data.description,
        category: data.category,
        trackQuantity: data.trackQuantity,
        sku: data.sku,
        expiryDate: data.expiryDate,
        variants: productVariantsPayload,
      };
       if (!hasVariants) {
        payloadForAdd.costPrice = data.costPrice;
        payloadForAdd.sellPrice = data.sellPrice;
        payloadForAdd.initialStock = data.trackQuantity ? data.initialStock : 0;
      }
      const addedProduct = addProduct(payloadForAdd);
      toast({ title: "Product Added", description: `${addedProduct.name} has been added to your inventory.` });
      onProductAdd?.(addedProduct);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        formReset();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh] border-t-4 border-t-primary shadow-lg">
        <DialogHeader>
          <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the product. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 my-1 -mx-6 px-6">
          <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Product Name*</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
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
                  {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
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

              {!hasVariants && (
                <>
                  {trackQuantityValue && (
                    <div>
                      <Label htmlFor="initialStock">{editingProduct ? 'Current Stock*' : 'Initial Stock*'}</Label>
                      <Input id="initialStock" type="number" {...register("initialStock")} placeholder="0" />
                      {errors.initialStock && <p className="text-sm text-destructive mt-1">{errors.initialStock.message}</p>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="costPrice">Cost Price*</Label>
                      <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} placeholder="0.00" />
                      {errors.costPrice && <p className="text-sm text-destructive mt-1">{errors.costPrice.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="sellPrice">Sell Price*</Label>
                      <Input id="sellPrice" type="number" step="0.01" {...register("sellPrice")} placeholder="0.00" />
                      {errors.sellPrice && <p className="text-sm text-destructive mt-1">{errors.sellPrice.message}</p>}
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="sku">SKU (Stock Keeping Unit) <span className="text-xs text-muted-foreground">(Optional - for base product)</span></Label>
                <Input id="sku" {...register("sku")} />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry Date <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                <Input id="expiryDate" type="date" {...register("expiryDate")} />
              </div>

              {hasVariants && (
                  <p className="text-xs text-muted-foreground italic">
                      For products with variants, stock and pricing are managed per specific combination (SKU) and primarily set/updated via Expense Bills.
                  </p>
              )}

              <Separator/>
              <Label className="text-lg font-semibold text-primary">Variants (Max 2)</Label>
              <p className="text-xs text-muted-foreground -mt-2 mb-2">
                  Define variant types like 'Color' or 'Size'. Options for each variant (e.g., Red, Blue; Small, Medium) are added below.
              </p>
              {errors.variants?.root && <p className="text-sm text-destructive mt-1">{errors.variants.root.message}</p>}

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
              {errors.variants && typeof errors.variants.message === 'string' && <p className="text-sm text-destructive mt-1">{errors.variants.message}</p>}

            </form>
          </FormProvider>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
            <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit(onSubmit)} variant="default">{editingProduct ? 'Save Changes' : 'Add Product'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
