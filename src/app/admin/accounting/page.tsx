"use client";

import React, { useState, Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, CalendarDays, Loader2, FileText, BarChart2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { ProfitLossStatement } from '@/components/accounting/profit-loss-statement';
import { SalesTaxReport } from '@/components/accounting/sales-tax-report';


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
      return { from: new Date(2000, 0, 1), to: endOfYear(subDays(now, -365*5)) }; 
    default:
      return undefined;
  }
}

function AccountingPageContent() {
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
      <PageTitle title="Accounting &amp; Reports" icon={BookOpen} actions={pageActions} />

      <Tabs defaultValue="pnl" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-2">
          <TabsTrigger value="pnl" className="gap-2"><BarChart2 size={16}/>P&amp;L Statement</TabsTrigger>
          <TabsTrigger value="gst" className="gap-2"><FileText size={16}/>GST Report</TabsTrigger>
        </TabsList>
        <TabsContent value="pnl" className="mt-6">
          <ProfitLossStatement startDate={dateRange?.from} endDate={dateRange?.to} />
        </TabsContent>
        <TabsContent value="gst" className="mt-6">
          <SalesTaxReport startDate={dateRange?.from} endDate={dateRange?.to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
    <p className="text-muted-foreground">Loading Accounting Reports...</p>
  </div>
);

export default function AccountingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AccountingPageContent />
    </Suspense>
  );
}
