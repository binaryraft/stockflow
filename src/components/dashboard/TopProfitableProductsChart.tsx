
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

// Interface for the data structure returned by the store
interface ProductFinancialData {
  name: string; // SKU Identifier
  revenue: number;
  cogs: number;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))", 
  },
  cogs: {
    label: "Cost",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

// Custom Tooltip Content
const CustomTooltip = ({ active, payload, label, chartData }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // The original data object for this category (product)
    
    // Find the original full name if it was truncated for Y-axis display
    const originalItem = chartData.find((d: ProductFinancialData) => d.name === data.name || `${d.name.substring(0, 22)}...` === data.name);
    const displayName = originalItem ? originalItem.name : data.name;
    const profit = data.revenue - data.cogs;

    return (
      <div className="p-3 bg-background border border-border rounded-lg shadow-lg text-xs">
        <p className="font-bold mb-2 text-sm text-foreground">{displayName}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex justify-between items-center my-0.5">
            <span className="flex items-center">
              <span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color, marginRight: '6px'}}></span>
              <span className="text-muted-foreground">{entry.dataKey === 'cogs' ? 'Total Cost (COGS)' : 'Total Revenue'}:</span>
            </span>
            <span className={cn("font-semibold", entry.dataKey === 'cogs' ? 'text-destructive' : 'text-primary')}>
              ₹{Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
          <span className="text-muted-foreground">Net Profit:</span>
          <span className={cn("font-bold", profit >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive")}>
            ₹{profit.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function TopProfitableProductsChart() {
  const getTopProfitableProducts = useInventoryStore((state) => state.getTopProfitableProducts);
  const [chartData, setChartData] = useState<ProductFinancialData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const data = getTopProfitableProducts(5); 
    setChartData(data);
    setIsLoading(false);
  }, [getTopProfitableProducts]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading chart data...</p></div>;
  }
  
  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full"><p>No profit data available for products.</p></div>;
  }

  const formattedChartData = chartData.map(item => ({
    ...item,
    name: item.name.length > 25 ? `${item.name.substring(0, 22)}...` : item.name,
  }));

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart 
        data={formattedChartData}
        layout="vertical"
        margin={{
          top: 5,
          right: 20, // Increased right margin for values
          left: 10, 
          bottom: 5,
        }}
        barGap={4} // Add gap between groups of bars
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          tickFormatter={(value) => `₹${value / 1000}k`} 
          axisLine={false} 
          tickLine={false}
        />
        <YAxis 
          dataKey="name" 
          type="category" 
          tickLine={false} 
          axisLine={false} 
          tickMargin={5}
          width={150} 
          interval={0} 
        />
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted))' }} 
          content={<CustomTooltip chartData={chartData} />} // Pass original chartData for full names
        />
        <Legend verticalAlign="top" height={36}/>
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} barSize={15} name="Revenue" />
        <Bar dataKey="cogs" fill="var(--color-cogs)" radius={4} barSize={15} name="Cost" />
      </BarChart>
    </ChartContainer>
  );
}
