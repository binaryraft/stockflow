
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  profit: {
    label: "Profit",
    color: "hsl(var(--primary))", // Use primary color for profit
  },
} satisfies ChartConfig;

interface ProductProfitData {
  name: string; // SKU Identifier
  profit: number;
}

export function TopProfitableProductsChart() {
  const getTopProfitableProducts = useInventoryStore((state) => state.getTopProfitableProducts);
  const [chartData, setChartData] = useState<ProductProfitData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const data = getTopProfitableProducts(5); // Get top 5 profitable products/SKUs
    setChartData(data);
    setIsLoading(false);
  }, [getTopProfitableProducts]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading chart data...</p></div>;
  }
  
  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full"><p>No profit data available for products.</p></div>;
  }

  // Ensure product names are not too long for Y-axis display
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
          right: 10,
          left: 10, // Adjusted for potentially longer Y-axis labels
          bottom: 0,
        }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          dataKey="profit" 
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
          width={150} // Give more space for product names
          interval={0} // Ensure all labels are shown
        />
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted))' }} 
          content={<ChartTooltipContent 
            indicator="dot"
            formatter={(value, name, props) => {
                // Find original name for tooltip if truncated
                const originalItem = chartData.find(d => d.name === props.payload.name || `${d.name.substring(0,22)}...` === props.payload.name);
                const displayName = originalItem ? originalItem.name : props.payload.name;
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold">{displayName}</span>
                        <span>Profit: ₹{Number(value).toFixed(2)}</span>
                    </div>
                );
            }}
          />}
        />
        <Bar dataKey="profit" fill={chartConfig.profit.color} radius={4} barSize={25} />
      </BarChart>
    </ChartContainer>
  );
}
