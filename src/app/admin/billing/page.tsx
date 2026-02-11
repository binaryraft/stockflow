
"use client";

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { BillMode, Store } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { BillHistoryTable, type TimePeriodFilterOption } from '@/components/history/bill-history-table';
import { InventoryLedgerTable } from '@/components/billing/inventory-ledger-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, History as HistoryIcon, ShoppingBag, Send, RotateCcw, Building, ListChecks, BarChart2, CalendarDays, FileSpreadsheet } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, subMonths, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { DateRange } from "react-day-picker";
import { LoadingSpinner } from '@/components/ui/loading-spinner';


type BillingView = 'history' | 'ledger' | 'new';

const HistoryStoreSelector: React.FC<{
  stores: Store[];
  activePlanId?: string;
  currentStoreId?: string;
  onStoreChange: (storeId?: string) => void;
}> = ({ stores, activePlanId, currentStoreId, onStoreChange }) => {
  const isStarterPlan = activePlanId === SUBSCRIPTION_PLAN_IDS.STARTER;

  if (stores.length === 1) {
    return (
      <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50 w-full sm:w-auto">
        <Building size={16} />
        {stores[0].name}
      </span>
    );
  }

  if (stores.length > 1) {
    return (
      <Select
        value={currentStoreId || ""}
        onValueChange={(value) => onStoreChange(value || undefined)}
      >
        <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px] h-9 select-trigger-class">
          <SelectValue placeholder="Select Store..." />
        </SelectTrigger>
        <SelectContent position="popper">
          {stores.map(store => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return null;
};


function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const action = searchParams.get('action');
  const modeFromUrl = searchParams.get('mode') as BillMode | null;
  const storeIdFromUrl = searchParams.get('storeId');
  const currentViewFromUrl = searchParams.get('view') as BillingView | null;

  const {
    getActiveSubscriptionPlan,
    fetchBills,
    fetchStores,
    stores: storesFromZustand,
    companyId: currentCompanyIdFromStore,
  } = useInventoryStore(state => ({
    getActiveSubscriptionPlan: state.getActiveSubscriptionPlan,
    fetchBills: state.fetchBills,
    fetchStores: state.fetchStores,
    stores: state.stores,
    companyId: typeof window !== 'undefined' ? localStorage.getItem('companyId') : null
  }));

  const [allStoresState, setAllStoresState] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);

  const [currentContextStoreId, setCurrentContextStoreId] = useState<string | undefined>(undefined);
  const [selectedStoreForForm, setSelectedStoreForForm] = useState<string | undefined>(undefined);
  const [activeBillingView, setActiveBillingView] = useState<BillingView>(currentViewFromUrl || 'history');

  const [hasMounted, setHasMounted] = useState(false);
  const isAdminContext = true;

  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriodFilterOption>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'standard' | 'excel'>('standard');

  useEffect(() => {
    setHasMounted(true);
    if (currentCompanyIdFromStore) {
      fetchStores(currentCompanyIdFromStore);
    }
  }, [currentCompanyIdFromStore, fetchStores]);

  useEffect(() => {
    if (hasMounted) {
      setAllStoresState(storesFromZustand);
      setActivePlan(getActiveSubscriptionPlan());
      setActiveBillingView(currentViewFromUrl || 'history');
    }
  }, [hasMounted, storesFromZustand, getActiveSubscriptionPlan, currentViewFromUrl]);

  useEffect(() => {
    if (hasMounted && activePlan && allStoresState.length > 0) {
      if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER || allStoresState.length === 1) {
        setCurrentContextStoreId(allStoresState[0].id);
      } else {
        const validStoreId = allStoresState.find(s => s.id === storeIdFromUrl) ? storeIdFromUrl : allStoresState[0].id;
        setCurrentContextStoreId(validStoreId || undefined);
      }
    }
  }, [hasMounted, allStoresState, activePlan, storeIdFromUrl]);

  useEffect(() => {
    if (hasMounted && activePlan && allStoresState.length > 0) {
      const defaultStoreId = allStoresState[0]?.id;
      if (storeIdFromUrl && allStoresState.find(s => s.id === storeIdFromUrl)) {
        setSelectedStoreForForm(storeIdFromUrl);
      } else {
        setSelectedStoreForForm(allStoresState.length === 1 ? defaultStoreId : (storeIdFromUrl || defaultStoreId));
      }
    }
  }, [hasMounted, allStoresState, activePlan, storeIdFromUrl]);

  const handleViewToggle = (view: BillingView) => {
    setActiveBillingView(view);
    const newParams = new URLSearchParams(searchParams.toString());
    if (view === 'history' || view === 'ledger') {
      newParams.set('view', view);
      newParams.delete('action'); newParams.delete('mode'); newParams.delete('storeId');
    }
    router.push(`${pathname}?${newParams.toString()}`);
  };

  const handleTimePeriodChange = (period: TimePeriodFilterOption) => {
    setTimePeriodFilter(period);
    if (period !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  const isNewBillAction = action === 'new' || !!modeFromUrl;
  const isStarterPlan = activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER;

  let effectiveModeForTitle: BillMode = 'sell';
  if (modeFromUrl && ['sell', 'buy', 'return'].includes(modeFromUrl)) {
    effectiveModeForTitle = modeFromUrl;
  }

  const newBillHrefPath = `/admin/billing?action=new&mode=sell${currentContextStoreId ? `&storeId=${currentContextStoreId}` : (allStoresState.length === 1 ? `&storeId=${allStoresState[0].id}` : '')}`;

  if (isNewBillAction) {
    let title = "New Sales Bill";
    let icon = Send;

    if (effectiveModeForTitle === 'buy') { title = "New Expense Bill"; icon = ShoppingBag; }
    else if (effectiveModeForTitle === 'return') { title = "New Return Entry"; icon = RotateCcw; }

    const newBillPageTitleActions = (
      <>
        {(hasMounted && isAdminContext && allStoresState.length > 0) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
            <span className="text-sm font-medium whitespace-nowrap text-muted-foreground shrink-0">Store:</span>
            {!isStarterPlan && allStoresState.length > 1 ? (
              <Select
                value={selectedStoreForForm || ""}
                onValueChange={(value) => setSelectedStoreForForm(value || undefined)}
              >
                <SelectTrigger className="w-full sm:w-auto sm:min-w-[180px] h-9">
                  <SelectValue placeholder="Select Store..." />
                </SelectTrigger>
                <SelectContent>
                  {allStoresState.map(store => (<SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
                <Building size={16} />
                {allStoresState.find(s => s.id === selectedStoreForForm)?.name || allStoresState[0]?.name}
              </span>
            )}
          </div>
        )}
        <Button variant="outline" onClick={() => handleViewToggle('history')}>
          <HistoryIcon className="mr-2 h-4 w-4" /> History
        </Button>
        <Button variant="outline" onClick={() => handleViewToggle('ledger')}>
          <ListChecks className="mr-2 h-4 w-4" /> Ledger
        </Button>
      </>
    );

    return (
      <>
        <PageTitle title={title} icon={icon} actions={newBillPageTitleActions} />
        <BillingForm
          key={`new-bill-form-${selectedStoreForForm}`}
          initialModeProp={modeFromUrl}
          isAdminContext={true}
          preselectedStoreId={selectedStoreForForm}
        />
      </>
    );
  }

  const mainPageActions = (
    <>
      {activeBillingView === 'history' && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full">
          <div className="flex bg-muted p-1 rounded-md border text-xs h-9">
            <Button variant={viewMode === 'standard' ? "secondary" : "ghost"} size="sm" className="h-full gap-2" onClick={() => setViewMode('standard')}>
              <ListChecks size={14} /> Standard
            </Button>
            <Button variant={viewMode === 'excel' ? "secondary" : "ghost"} size="sm" className="h-full gap-2" onClick={() => setViewMode('excel')}>
              <FileSpreadsheet size={14} /> Bulk View
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Store:</span>
            <HistoryStoreSelector stores={allStoresState} activePlanId={activePlan?.id} currentStoreId={currentContextStoreId} onStoreChange={setCurrentContextStoreId} />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Select value={timePeriodFilter} onValueChange={(value) => handleTimePeriodChange(value as TimePeriodFilterOption)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Time filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {timePeriodFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] h-9 text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {customDateRange?.from ? (customDateRange.to ? `${format(customDateRange.from, "LLL dd")} - ${format(customDateRange.to, "LLL dd")}` : format(customDateRange.from, "LLL dd")) : "Pick dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="range" selected={customDateRange} onSelect={setCustomDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      )}
      <Button onClick={() => handleViewToggle(activeBillingView === 'history' ? 'ledger' : 'history')} variant="outline">
        {activeBillingView === 'history' ? <BarChart2 className="mr-2 h-4 w-4" /> : <HistoryIcon className="mr-2 h-4 w-4" />}
        {activeBillingView === 'history' ? 'Ledger' : 'History'}
      </Button>
      <Button asChild>
        <Link href={newBillHrefPath}><PlusCircle className="mr-2 h-4 w-4" /> New Bill</Link>
      </Button>
    </>
  );

  return (
    <>
      <PageTitle title={activeBillingView === 'ledger' ? 'Inventory Ledger' : 'Bill History'} icon={activeBillingView === 'ledger' ? BarChart2 : HistoryIcon} actions={mainPageActions} />
      {activeBillingView === 'ledger' ? <InventoryLedgerTable /> :
        <BillHistoryTable
          key={`${timePeriodFilter}-${customDateRange?.from?.toISOString()}-${currentContextStoreId}`}
          filterByStoreId={currentContextStoreId}
          timePeriodFilter={timePeriodFilter}
          customStartDate={customDateRange?.from}
          customEndDate={customDateRange?.to}
          viewMode={viewMode}
        />
      }
    </>
  );
}

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center p-12">
    <LoadingSpinner text="Loading Billing Information..." />
  </div>
);


export default function AdminBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<LoadingFallback />}>
        <BillingContent />
      </Suspense>
    </div>
  );
}
