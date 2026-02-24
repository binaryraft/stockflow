
"use client"

import React, { useEffect, useState } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { getCurrencySymbol } from '@/lib/utils';
import type { TimePeriod } from '@/types';
import { AIInsightLoading } from '@/components/common/AIInsightLoading';

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(142.1 76.2% 36.3%)", // Green
  },
  expenses: {
    label: "Expenses",
    color: "hsl(0 72.2% 50.6%)", // Red
  },
} satisfies ChartConfig;

interface DailyData {
  date: string;
  sales: number;
  expenses: number;
}

export function SalesExpensesOverviewChart({ period }: { period: TimePeriod }) {
  const { dashboardAnalytics, userProfile } = useInventoryStore((state) => ({
    dashboardAnalytics: state.dashboardAnalytics,
    userProfile: state.userProfile,
  }));

  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);

  const chartData = dashboardAnalytics?.timeSeriesData || [];
  const hasData = chartData.length > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <AIInsightLoading context="sales" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full"><p>No sales or expense data available for the selected period.</p></div>;
  }

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 10,
          left: -15, // Adjust to show Y-axis labels if cut off, considering currency symbol
          bottom: 0,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
        />
        <Tooltip
          cursor={true}
          content={<ChartTooltipContent
            indicator="dot"
            formatter={(value, name) => (
              <div className="flex flex-col">
                <span className="capitalize">{name}</span>
                <span>{currencySymbol}{Number(value).toFixed(2)}</span>
              </div>
            )}
          />}
        />
        <Legend />
        <Line
          dataKey="sales"
          type="monotone"
          stroke="var(--color-sales)"
          strokeWidth={2}
          dot={{
            fill: "var(--color-sales)",
          }}
          activeDot={{
            r: 6,
          }}
        />
        <Line
          dataKey="expenses"
          type="monotone"
          stroke="var(--color-expenses)"
          strokeWidth={2}
          dot={{
            fill: "var(--color-expenses)",
          }}
          activeDot={{
            r: 6,
          }}
        />
      </LineChart>
    </ChartContainer>
  );
}
