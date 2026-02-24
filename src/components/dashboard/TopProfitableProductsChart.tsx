
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/utils';
import type { TimePeriod } from '@/types';
import { AIInsightLoading } from '@/components/common/AIInsightLoading';

interface ProductFinancialData {
  name: string;
  revenue: number;
  cogs: number;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(142.1 76.2% 36.3%)", // Green
  },
  cogs: {
    label: "Cost",
    color: "hsl(0 72.2% 50.6%)", // Red
  },
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload, label, chartData, currencySymbol }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const originalItem = chartData.find((d: ProductFinancialData) => d.name === data.name || (typeof data.name === 'string' && typeof d.name === 'string' && `${d.name.substring(0, 22)}...` === data.name));
    const displayName = originalItem && typeof originalItem.name === 'string' ? originalItem.name : (typeof data.name === 'string' ? data.name : "Unknown Product");
    const profit = data.revenue - data.cogs;

    return (
      <div className="p-3 bg-background border border-border rounded-lg shadow-lg text-xs">
        <p className="font-bold mb-2 text-sm text-foreground">{displayName}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex justify-between items-center my-0.5">
            <span className="flex items-center">
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color, marginRight: '6px' }}></span>
              <span className="text-muted-foreground">{entry.dataKey === 'cogs' ? 'Total Cost (COGS)' : 'Total Revenue'}:</span>
            </span>
            <span className={cn("font-semibold", entry.dataKey === 'cogs' ? 'text-red-600' : 'text-green-600')}>
              {currencySymbol}{Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
          <span className="text-muted-foreground">Net Profit:</span>
          <span className={cn("font-bold", profit >= 0 ? "text-green-600 dark:text-green-500" : "text-destructive")}>
            {currencySymbol}{profit.toFixed(2)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function TopProfitableProductsChart({ period }: { period: TimePeriod }) {
  const { dashboardAnalytics, userProfile } = useInventoryStore((state) => ({
    dashboardAnalytics: state.dashboardAnalytics,
    userProfile: state.userProfile,
  }));

  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);

  const chartData = (dashboardAnalytics?.topProducts || []).map(p => ({
    name: p.name,
    revenue: p.revenue,
    cogs: p.revenue - (p.profit || 0),
  }));
  const hasData = chartData.length > 0;

  if (!hasData && !dashboardAnalytics) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <AIInsightLoading context="dashboard" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full"><p>No profit data available for products in this period.</p></div>;
  }

  const formattedChartData = chartData
    .filter(item => typeof item.name === 'string' && item.name.trim() !== '')
    .map(item => ({
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
          right: 20,
          left: 10,
          bottom: 5,
        }}
        barGap={4}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
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
          content={<CustomTooltip chartData={chartData} currencySymbol={currencySymbol} />}
        />
        <Legend verticalAlign="top" height={36} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} barSize={15} name="Revenue" />
        <Bar dataKey="cogs" fill="var(--color-cogs)" radius={4} barSize={15} name="Cost" />
      </BarChart>
    </ChartContainer>
  );
}
