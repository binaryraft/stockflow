
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrencySymbol } from '@/lib/utils';
import type { TimePeriod, ProductRevenueData } from '@/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


const CustomTooltip = ({ active, payload, label, currencySymbol }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-background border border-border rounded-lg shadow-lg text-xs">
        <p className="font-bold mb-2 text-sm text-foreground">{data.name}</p>
        <p className="text-muted-foreground">
          Revenue: <span className="font-semibold text-foreground">{currencySymbol}{data.revenue.toFixed(2)}</span>
        </p>
        <p className="text-muted-foreground">
          Quantity Sold: <span className="font-semibold text-foreground">{data.quantity}</span>
        </p>
      </div>
    );
  }
  return null;
};


export function TopProductsChart({ period }: { period: TimePeriod }) {
  const { dashboardAnalytics, userProfile } = useInventoryStore((state) => ({
    dashboardAnalytics: state.dashboardAnalytics,
    userProfile: state.userProfile,
  }));

  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);

  const chartData = dashboardAnalytics?.topProducts || [];
  const isLoading = !dashboardAnalytics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full"><p>No product sales data available for this period.</p></div>;
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{
          top: 5,
          right: 10,
          left: 5,
          bottom: 0,
        }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="revenue"
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
          width={100}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          content={<CustomTooltip currencySymbol={currencySymbol} />}
        />
        <Bar dataKey="revenue" fill={chartConfig.revenue.color} radius={4} barSize={30} />
      </BarChart>
    </ChartContainer>
  );
}
