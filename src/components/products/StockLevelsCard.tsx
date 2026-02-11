
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInventoryStore } from '@/hooks/use-inventory-store'
import type { Product } from '@/types'
import { cn, getCurrencySymbol } from '@/lib/utils'

interface StockLevelsCardProps {
  product: Product
}

export function StockLevelsCard({ product }: StockLevelsCardProps) {
  const { getSkuDetails, userProfile } = useInventoryStore()
  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency)

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{product.trackQuantity ? 'Stock & Pricing' : 'Variant Pricing'}</CardTitle>
        <CardDescription>
          {product.trackQuantity
            ? 'Available stock and prices for each product variant.'
            : 'Standard prices for each product variant.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs uppercase font-bold">Variant / SKU</TableHead>
                {product.trackQuantity && <TableHead className="text-right text-xs uppercase font-bold whitespace-nowrap">Stock</TableHead>}
                <TableHead className="text-right text-xs uppercase font-bold whitespace-nowrap">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.productSKUs.length > 0 ? (
                product.productSKUs.map(sku => {
                  const skuDetails = getSkuDetails(sku)
                  return (
                    <TableRow key={sku.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm py-3">
                        {sku.skuIdentifier || product.name}
                      </TableCell>
                      {product.trackQuantity && (
                        <TableCell className={cn(
                          "text-right font-bold text-base",
                          (skuDetails.totalStock ?? 0) <= 0 ? "text-destructive" : "text-primary"
                        )}>
                          {skuDetails.totalStock?.toFixed(0) ?? '0'}
                        </TableCell>
                      )}
                      <TableCell className="text-right py-3 space-y-0.5">
                        <div className="font-bold text-primary">{currencySymbol}{skuDetails.currentSellPrice?.toFixed(2) ?? '0.00'}</div>
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">Cost: {currencySymbol}{skuDetails.averageCostPrice?.toFixed(2) ?? '0.00'}</div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={product.trackQuantity ? 3 : 2} className="h-24 text-center text-muted-foreground">
                    No SKUs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!product.trackQuantity && (
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            * Inventory tracking is disabled. Prices shown are fallback/base rates.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
