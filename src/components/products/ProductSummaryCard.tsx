
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductAnalytics } from '@/types'

interface StatRowProps {
  icon: React.ElementType
  label: string
  value: string | number
  valueClassName?: string
}

const StatRow: React.FC<StatRowProps> = ({ icon: Icon, label, value, valueClassName }) => (
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    <span className={cn("font-semibold text-foreground", valueClassName)}>{value}</span>
  </div>
)

interface ProductSummaryCardProps {
  analytics: ProductAnalytics | null
  currencySymbol: string
}

export function ProductSummaryCard({ analytics, currencySymbol }: ProductSummaryCardProps) {
  if (!analytics) {
    return <Card className="shadow-lg"><CardContent className="p-6">Loading summary...</CardContent></Card>
  }

  const profitColor = analytics.grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
  const profitLabel = analytics.grossProfit >= 0 ? "Gross Profit" : "Gross Loss"

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <CardDescription>Key lifetime metrics for this product.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn("p-4 rounded-lg text-center", analytics.grossProfit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
          <p className={cn("text-sm font-medium", profitColor)}>{profitLabel}</p>
          <p className={cn("text-3xl font-bold", profitColor)}>
            {currencySymbol}{analytics.grossProfit.toFixed(2)}
          </p>
        </div>
        <div className="space-y-3 pt-2">
          <StatRow 
            icon={TrendingUp} 
            label="Lifetime Revenue" 
            value={`${currencySymbol}${analytics.totalRevenue.toFixed(2)}`} 
          />
          <StatRow 
            icon={TrendingDown} 
            label="Lifetime COGS" 
            value={`${currencySymbol}${analytics.totalCostOfGoodsSold.toFixed(2)}`} 
          />
          <StatRow 
            icon={ShoppingCart} 
            label="Units Sold" 
            value={analytics.totalSold} 
          />
          <StatRow 
            icon={RotateCcw} 
            label="Units Returned" 
            value={analytics.totalReturned}
            valueClassName={analytics.totalReturned > 0 ? "text-amber-600 dark:text-amber-500" : ""}
          />
        </div>
      </CardContent>
    </Card>
  )
}
