
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartConfig, ChartContainer } from '@/components/ui/chart'
import type { ProductAnalytics } from '@/types'

const chartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  cogs: { label: 'COGS', color: 'hsl(var(--destructive))' },
} satisfies ChartConfig

interface ProductPerformanceChartProps {
  analytics: ProductAnalytics | null
  currencySymbol: string
}

export function ProductPerformanceChart({ analytics, currencySymbol }: ProductPerformanceChartProps) {
  if (!analytics) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading chart data...</div>
  }

  const chartData = [
    { name: 'Financials', revenue: analytics.totalRevenue, cogs: analytics.totalCostOfGoodsSold },
  ]

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Performance Overview</CardTitle>
        <CardDescription>All-time revenue vs. cost of goods sold for this product.</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px] pb-4">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              hide
            />
            <XAxis
              type="number"
              tickFormatter={(value) => `${currencySymbol}${value}`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-2 bg-background border rounded-md shadow-sm text-sm">
                      <p className="font-bold text-primary">Revenue: {currencySymbol}{(Number(payload[0].value) || 0).toFixed(2)}</p>
                      <p className="font-bold text-destructive">COGS: {currencySymbol}{(Number(payload[1].value) || 0).toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="revenue" name="Revenue" fill="var(--color-revenue)" radius={5} />
            <Bar dataKey="cogs" name="Cost" fill="var(--color-cogs)" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
