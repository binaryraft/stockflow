
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/utils';
import type { MonthlyProductFinancials } from '@/types';

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(142.1 76.2% 36.3%)" }, // Green
  cogs: { label: "Cost", color: "hsl(0 72.2% 50.6%)" }, // Red
  profit: { label: "Profit", color: "hsl(221.2 83.2% 53.3%)" }, // Blue
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload, label, currencySymbol }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-background border border-border rounded-lg shadow-lg text-xs">
        <p className="font-bold mb-2 text-sm text-foreground">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex justify-between items-center my-0.5">
            <span className="flex items-center">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color, marginRight: '6px' }}></span>
              <span className="text-muted-foreground capitalize">{entry.name}:</span>
            </span>
            <span className={cn("font-semibold", entry.dataKey === 'cogs' ? 'text-red-600' : (entry.dataKey === 'profit' ? 'text-blue-600' : 'text-green-600'))}>
              {currencySymbol}{(Number(entry.value || 0)).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};


export function ProductFinancialsChart({ productId }: { productId: string }) {
  const { getProductFinancialsByMonth, userProfile } = useInventoryStore(state => ({
    getProductFinancialsByMonth: state.getProductFinancialsByMonth,
    userProfile: state.userProfile,
  }));
  const [chartData, setChartData] = useState<MonthlyProductFinancials[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
    const data = getProductFinancialsByMonth(productId);
    // Show last 12 months max
    setChartData(data.slice(-12));
  }, [productId, getProductFinancialsByMonth, userProfile.companyCurrency]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No monthly financial data available for this product.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full min-h-[300px]">
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 10, left: -10, bottom: 5, }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
        />
        <YAxis
          tickFormatter={(value) => `${currencySymbol}${Number(value) / 1000}k`}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          content={<CustomTooltip currencySymbol={currencySymbol} />}
        />
        <Legend verticalAlign="top" align="right" />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cogs" fill="var(--color-cogs)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" fill="var(--color-profit)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
