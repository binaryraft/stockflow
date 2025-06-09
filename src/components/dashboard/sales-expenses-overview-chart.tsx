
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

interface DailyData {
  date: string;
  sales: number;
  expenses: number;
}

export function SalesExpensesOverviewChart() {
  const getDailySalesAndExpenses = useInventoryStore((state) => state.getDailySalesAndExpenses);
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const data = getDailySalesAndExpenses(7); // Get data for the last 7 days
    setChartData(data);
    setIsLoading(false);
  }, [getDailySalesAndExpenses]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading chart data...</p></div>;
  }

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full"><p>No sales or expense data available for the last 7 days.</p></div>;
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 10,
          left: -25, // Adjust to show Y-axis labels if cut off
          bottom: 0,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value} // Already formatted 'MMM d'
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `₹${value / 1000}k`} // Format as thousands
        />
        <Tooltip
          cursor={true}
          content={<ChartTooltipContent 
            indicator="dot" 
            formatter={(value, name) => (
              <div className="flex flex-col">
                <span className="capitalize">{name}</span>
                <span>₹{Number(value).toFixed(2)}</span>
              </div>
            )}
          />}
        />
        <Legend />
        <Line
          dataKey="sales"
          type="monotone"
          stroke={chartConfig.sales.color}
          strokeWidth={2}
          dot={{
            fill: chartConfig.sales.color,
          }}
          activeDot={{
            r: 6,
          }}
        />
        <Line
          dataKey="expenses"
          type="monotone"
          stroke={chartConfig.expenses.color}
          strokeWidth={2}
          dot={{
            fill: chartConfig.expenses.color,
          }}
          activeDot={{
            r: 6,
          }}
        />
      </LineChart>
    </ChartContainer>
  );
}
