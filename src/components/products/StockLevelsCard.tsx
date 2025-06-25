
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInventoryStore } from '@/hooks/use-inventory-store'
import type { Product } from '@/types'
import { cn } from '@/lib/utils'

interface StockLevelsCardProps {
  product: Product
}

export function StockLevelsCard({ product }: StockLevelsCardProps) {
  const { getSkuDetails } = useInventoryStore()

  if (!product.trackQuantity) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Inventory tracking is disabled for this product.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Current Stock Levels</CardTitle>
        <CardDescription>Available stock for each product variant/SKU.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant / SKU</TableHead>
                <TableHead className="text-right">Available Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.productSKUs.length > 0 ? (
                product.productSKUs.map(sku => {
                  const skuDetails = getSkuDetails(sku)
                  return (
                    <TableRow key={sku.id}>
                      <TableCell className="font-medium text-sm">
                        {sku.skuIdentifier || product.name}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold text-lg",
                        (skuDetails.totalStock ?? 0) <= 0 ? "text-destructive" : "text-primary"
                      )}>
                        {skuDetails.totalStock?.toFixed(2) ?? '0.00'}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No SKUs found. Add purchases to create stock.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
