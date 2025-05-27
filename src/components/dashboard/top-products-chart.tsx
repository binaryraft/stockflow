
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

interface ProductRevenueData {
  name: string;
  revenue: number;
}

export function TopProductsChart() {
  const getTopSellingProductsByRevenue = useInventoryStore((state) => state.getTopSellingProductsByRevenue);
  const [chartData, setChartData] = useState<ProductRevenueData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const data = getTopSellingProductsByRevenue(5); // Get top 5 products
    setChartData(data);
    setIsLoading(false);
  }, [getTopSellingProductsByRevenue]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading chart data...</p></div>;
  }
  
  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full"><p>No product sales data available.</p></div>;
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart 
        data={chartData}
        layout="vertical"
        margin={{
          top: 5,
          right: 10,
          left: 5, // Adjusted for Y-axis labels
          bottom: 0,
        }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          dataKey="revenue" 
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
          width={100} // Give more space for product names
          interval={0} // Ensure all labels are shown
        />
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted))' }} 
          content={<ChartTooltipContent 
            indicator="dot"
             formatter={(value) => `₹${Number(value).toFixed(2)}`}
          />}
        />
        {/* <Legend /> Removed legend as it's clear from context */}
        <Bar dataKey="revenue" fill={chartConfig.revenue.color} radius={4} barSize={30}/>
      </BarChart>
    </ChartContainer>
  );
}
