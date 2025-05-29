
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductVariant as ProductVariantType, ProductOption as ProductOptionType, ProductSKU, Bill, StockLayer, BillMode } from '@/types';
import { CategorySearchInput } from '@/components/billing/category-search-input';
import { PlusCircle, Trash2, ListCollapse, PackageSearch, CalendarDays, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const productOptionSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1, "Option value cannot be empty"),
});

const productVariantFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name cannot be empty"),
  options: z.array(productOptionSchema).min(1, "At least one option is required for a variant."),
});

const productFormSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().optional(),
  category: z.string().optional().default(''),
  trackQuantity: z.boolean().default(false),
  sku: z.string().optional(), // Base Product SKU/Code for non-variant or overall product
  expiryDate: z.string().optional(),
  variants: z.array(productVariantFormSchema).max(2, "Maximum of 2 variant types allowed").optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface VariantFormSectionProps {
  variantIndex: number;
  removeVariant: (index: number) => void;
}

const VariantFormSection: React.FC<VariantFormSectionProps> = ({
  variantIndex,
  removeVariant,
}) => {
  const { control, register, formState: { errors }, watch, setFocus } = useFormContext<ProductFormData>();

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `variants.${variantIndex}.options` as const,
  });

  const variantName = watch(`variants.${variantIndex}.name`);

  const handleOptionEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(variantIndex)} aria-label="Remove Variant Type">
                        <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Remove this variant type (e.g., Color, Size)</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
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
              onKeyDown={handleOptionEnter}
            />
            {optionFields.length > 1 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} className="h-8 w-8" aria-label="Remove Option Value">
                          <Trash2 className="h-3 w-3 text-destructive"/>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Remove this option value</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ))}
        {errors.variants?.[variantIndex]?.options?.root && <p className="text-sm text-destructive mt-1">{errors.variants[variantIndex]?.options?.root?.message}</p>}
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
  searchParams?: { [key: string]: string | string[] | undefined };
}

export function ProductForm({ initialData, searchParams }: ProductFormProps) {
  const { addProduct, updateProduct, categories, addCategory: addCategoryToStore, getBillsForProduct, getSkuDetails } = useInventoryStore(
    (state) => ({
      addProduct: state.addProduct,
      updateProduct: state.updateProduct,
      categories: state.categories,
      addCategory: state.addCategory,
      getBillsForProduct: state.getBillsForProduct,
      getSkuDetails: state.getSkuDetails,
    })
  );
  const { toast } = useToast();
  const router = useRouter();
  const isEditing = !!initialData;
  const [productBills, setProductBills] = useState<Bill[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      trackQuantity: false,
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
      formReset({
        name: initialData.name,
        description: initialData.description || '',
        category: initialData.category || '',
        trackQuantity: initialData.trackQuantity,
        sku: initialData.sku || '',
        expiryDate: initialData.expiryDate ? initialData.expiryDate.split('T')[0] : '',
        variants: initialData.variants?.map(v => ({
          id: v.id,
          name: v.name,
          options: v.options.map(o => ({ id: o.id, value: o.value }))
        })) || [],
      });
      setProductBills(getBillsForProduct(initialData.id));
    } else if (!isEditing && searchParams) {
      // Pre-filling from billing form if adding a new product
      const initialQuantity = searchParams.quantity ? parseInt(searchParams.quantity as string) : undefined;
      formReset({
        name: typeof searchParams.name === 'string' ? searchParams.name : '',
        description: '',
        category: '',
        trackQuantity: !!initialQuantity && initialQuantity > 0, // Track if initial quantity suggested
        sku: '',
        expiryDate: '',
        variants: [],
      });
    }
    setTimeout(() => setFocus('name'), 50);
  }, [isEditing, initialData, formReset, setFocus, searchParams, getBillsForProduct]);

  const trackQuantityValue = watch('trackQuantity');
  const currentVariants = watch('variants');
  const hasVariants = Array.isArray(currentVariants) && currentVariants.length > 0;

  const onSubmit = (data: ProductFormData) => {
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
    
    const productToSaveBase: Omit<Product, 'id' | 'imageUrl' | 'productSKUs'> = {
      name: data.name,
      description: data.description,
      category: data.category,
      trackQuantity: data.trackQuantity,
      sku: data.sku,
      expiryDate: data.expiryDate,
      variants: productVariantsPayload,
    };

    if (isEditing && initialData) {
      updateProduct(initialData.id, productToSaveBase);
      toast({ title: "Product Updated", description: `${data.name} has been updated successfully.` });
    } else {
      addProduct(productToSaveBase);
      toast({ title: "Product Added", description: `${data.name} has been added to your inventory.` });
    }
    router.push('/admin/products');
  };

  const getQuantityAndContextualInfoInBill = (bill: Bill, productId: string): { quantity: number; label: string; colorClass: string } => {
    const item = bill.items.find(i => i.productId === productId);
    const quantity = item ? item.quantity : 0;

    switch (bill.type) {
      case 'sell':
        return { quantity, label: 'Sold', colorClass: 'bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600' };
      case 'buy':
        return { quantity, label: 'Purchased', colorClass: 'bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300 border-red-300 dark:border-red-600' };
      case 'return':
        return { quantity, label: 'Returned', colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-700/20 dark:text-amber-300 border-amber-300 dark:border-amber-600' };
      default: // Should not happen
        return { quantity, label: 'Qty', colorClass: 'bg-muted text-muted-foreground' };
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-t-2 border-t-primary">
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
                <Label htmlFor="sku">Product SKU / Code <span className="text-xs text-muted-foreground">(Optional, for overall product)</span></Label>
                <Input id="sku" {...register("sku")} placeholder="e.g., PRD-00123" />
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
            
            {!hasVariants && trackQuantityValue && (
                <div className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-md bg-tertiary/30 flex items-start gap-2">
                    <Info size={20} className="shrink-0 mt-0.5 text-primary"/>
                    <span>
                        Initial stock quantities and pricing (cost & sell price) for this product will be established via the first <strong>Expense Bill</strong> that includes it.
                    </span>
                </div>
            )}
            {hasVariants && (
                <div className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-md bg-tertiary/30 flex items-start gap-2">
                    <Info size={20} className="shrink-0 mt-0.5 text-primary"/>
                    <span>
                        For products with variants, stock and pricing for each specific combination (SKU) are established and managed via <strong>Expense Bills</strong>.
                    </span>
                </div>
            )}
            
            <Separator className="my-6"/>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold text-primary">Variants (Max 2 types, e.g., Color, Size)</Label>
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
                  Define variant types like 'Color' or 'Size'. Options for each variant type (e.g., Red, Blue for Color; Small, Medium for Size) are added below each type.
              </p>
              {errors.variants?.root && <p className="text-sm text-destructive mt-1">{errors.variants.root.message}</p>}

              {variantFields.map((variantField, variantIndex) => (
                <VariantFormSection
                  key={variantField.id}
                  variantIndex={variantIndex}
                  removeVariant={removeVariant}
                />
              ))}
              {errors.variants && typeof errors.variants.message === 'string' && <p className="text-sm text-destructive mt-1">{errors.variants.message}</p>}
            </div>

            {isEditing && initialData && (
              <>
                <Separator className="my-6"/>
                <div className="space-y-4">
                  <Label className="text-lg font-semibold text-primary flex items-center gap-2">
                    <ListCollapse size={20} /> SKU Stock Layers
                  </Label>
                  {initialData.productSKUs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stock layers found. Create an Expense Bill for this product/variant to add stock and set prices.</p>
                  ) : (
                    <ScrollArea className="max-h-[400px] border rounded-md bg-tertiary/30">
                      <div className="p-4 space-y-4">
                        {initialData.productSKUs.map(sku => {
                          const skuDetails = getSkuDetails(sku);
                          return (
                            <Card key={sku.id} className="bg-card shadow-sm">
                              <CardHeader className="pb-2 pt-3 px-4">
                                <CardTitle className="text-md text-primary">
                                  SKU: {sku.skuIdentifier || "Default SKU"}
                                  {Object.keys(sku.optionValues).length > 0 && (
                                    <span className="text-xs font-normal text-muted-foreground ml-2">
                                      ({Object.entries(sku.optionValues).map(([k,v]) => `${k}: ${v}`).join(', ')})
                                    </span>
                                  )}
                                </CardTitle>
                                <CardDescription>Current Total Stock for this SKU: {skuDetails.totalStock}</CardDescription>
                              </CardHeader>
                              <CardContent className="px-4 pb-3">
                                {sku.stockLayers.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No active stock layers for this SKU (might be fully depleted or defined but not yet purchased).</p>
                                ) : (
                                  <Table className="text-xs">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Purchased</TableHead>
                                        <TableHead>From Bill</TableHead>
                                        <TableHead className="text-right">Initial Qty</TableHead>
                                        <TableHead className="text-right">Sold Qty</TableHead>
                                        <TableHead className="text-right">Remaining Qty</TableHead>
                                        <TableHead className="text-right">Cost/Unit</TableHead>
                                        <TableHead className="text-right">Sell Price (Set)</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sku.stockLayers.map(layer => (
                                        <TableRow key={layer.id}>
                                          <TableCell>{format(new Date(layer.purchaseDate), 'MMM d, yyyy')}</TableCell>
                                          <TableCell className="font-mono text-muted-foreground">{layer.purchaseBillId}</TableCell>
                                          <TableCell className="text-right">{layer.initialQuantity}</TableCell>
                                          <TableCell className="text-right font-medium text-green-600 dark:text-green-500">{layer.initialQuantity - layer.quantity}</TableCell>
                                          <TableCell className="text-right font-semibold">{layer.quantity}</TableCell>
                                          <TableCell className="text-right">₹{layer.costPrice.toFixed(2)}</TableCell>
                                          <TableCell className="text-right">₹{layer.sellPrice.toFixed(2)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                <Separator className="my-6"/>
                 <div className="space-y-4">
                    <Label className="text-lg font-semibold text-primary flex items-center gap-2">
                      <PackageSearch size={20} /> Product Transaction History
                    </Label>
                    {productBills.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bill history found for this product.</p>
                    ) : (
                        <ScrollArea className="max-h-[300px] border rounded-md bg-tertiary/30">
                             <Table className="text-xs">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bill ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Transaction Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productBills.map(bill => {
                                      if (!initialData) return null; // Should not happen if productBills is populated
                                      const transactionInfo = getQuantityAndContextualInfoInBill(bill, initialData.id);
                                      return (
                                        <TableRow key={bill.id}>
                                            <TableCell className="font-mono text-muted-foreground">{bill.id}</TableCell>
                                            <TableCell>{format(new Date(bill.date), 'PP p')}</TableCell>
                                            <TableCell className="capitalize">{bill.type}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                              {transactionInfo.quantity} <Badge variant="outline" className={cn("ml-1 text-xs", transactionInfo.colorClass)}>{transactionInfo.label}</Badge>
                                            </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                 </div>
              </>
            )}
            
            <CardFooter className="flex justify-end gap-3 pt-8 border-t">
              <Button type="button" variant="outline" onClick={() => router.push('/admin/products')} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Product')}
              </Button>
            </CardFooter>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
