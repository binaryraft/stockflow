"use client";

import React, { useState, Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { FinancialSummaryCards } from '@/components/reports/FinancialSummaryCards';
import { SalesReportTable } from '@/components/reports/SalesReportTable';
import { ExpenseReportTable } from '@/components/reports/ExpenseReportTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChartHorizontal, CalendarDays, Loader2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';


type TimePeriodPreset = 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'all' | 'custom';

function getDatesFromPreset(preset: TimePeriodPreset): DateRange | undefined {
  const now = new Date();
  switch (preset) {
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth':
      const lastMonthStart = startOfMonth(subDays(now, now.getDate() + 1));
      return { from: lastMonthStart, to: endOfMonth(lastMonthStart) };
    case 'thisYear':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'lastYear':
       const lastYearStart = startOfYear(subDays(now, 365));
       return { from: lastYearStart, to: endOfYear(lastYearStart) };
    case 'all':
      // Using a very old date to signify all time
      return { from: new Date(2000, 0, 1), to: endOfYear(subDays(now, -365*5)) }; // Far in future
    default:
      return undefined;
  }
}

function ReportsPageContent() {
  const [timePeriodPreset, setTimePeriodPreset] = useState<TimePeriodPreset>('thisMonth');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDatesFromPreset('thisMonth'));

  const handlePresetChange = (preset: TimePeriodPreset) => {
    setTimePeriodPreset(preset);
    if (preset !== 'custom') {
      setDateRange(getDatesFromPreset(preset));
    }
  };
  
  const handleCustomDateChange = (newRange: DateRange | undefined) => {
    setTimePeriodPreset('custom');
    setDateRange(newRange);
  }

  const pageActions = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
        <Select value={timePeriodPreset} onValueChange={(value) => handlePresetChange(value as TimePeriodPreset)}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px] h-9 select-trigger-class">
                <SelectValue placeholder="Filter by time" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="lastYear">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
        </Select>
        {timePeriodPreset === 'custom' && (
            <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full sm:w-auto sm:min-w-[260px] justify-start text-left font-normal h-9", !dateRange && "text-muted-foreground" )}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                            ) : ( format(dateRange.from, "LLL dd, y") )
                        ) : ( <span>Pick a date range</span> )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={handleCustomDateChange} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
        )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Financial Reports" icon={BarChartHorizontal} actions={pageActions} />

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">P&L Summary</TabsTrigger>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="expenses">Expense Report</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-6">
          <FinancialSummaryCards startDate={dateRange?.from} endDate={dateRange?.to} />
        </TabsContent>
        <TabsContent value="sales" className="mt-6">
          <SalesReportTable startDate={dateRange?.from} endDate={dateRange?.to} />
        </TabsContent>
        <TabsContent value="expenses" className="mt-6">
          <ExpenseReportTable startDate={dateRange?.from} endDate={dateRange?.to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
    <p className="text-muted-foreground">Loading Reports...</p>
  </div>
);

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReportsPageContent />
    </Suspense>
  );
}