
"use client";

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation'; // Added useRouter, usePathname
import type { BillMode, Store } from '@/types';
import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { BillHistoryTable, type TimePeriodFilterOption } from '@/components/history/bill-history-table'; // Import TimePeriodFilterOption
import { InventoryLedgerTable } from '@/components/billing/inventory-ledger-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, History as HistoryIcon, ShoppingBag, Send, RotateCcw, Building, ListChecks, BarChart2, CalendarDays } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, subMonths, subYears } from 'date-fns';
import type { DateRange } from "react-day-picker";


type BillingView = 'history' | 'ledger' | 'new';

const HistoryStoreSelector: React.FC<{
  stores: Store[];
  activePlanId?: string;
  currentStoreId?: string;
  onStoreChange: (storeId?: string) => void;
}> = ({ stores, activePlanId, currentStoreId, onStoreChange }) => {
  const isStarterPlan = activePlanId === SUBSCRIPTION_PLAN_IDS.STARTER;

  if (isStarterPlan && stores.length === 1) {
    return (
      <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
        <Building size={16} />
        {stores[0].name}
      </span>
    );
  }
  if (!isStarterPlan && stores.length === 1) {
     return (
      <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
        <Building size={16} />
        {stores[0].name}
      </span>
    );
  }
  if (!isStarterPlan && stores.length > 1) {
    return (
      <Select
        key={`store-context-select-history-${activePlanId}-${stores.length}`}
        value={currentStoreId || ""}
        onValueChange={(value) => onStoreChange(value || undefined)}
      >
        <SelectTrigger id="store-context-select-history-trigger" className="w-auto min-w-[180px] h-9 select-trigger-class">
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

  const { getAllStores, getActiveSubscriptionPlan, fetchBills, companyId: currentCompanyId } = useInventoryStore(state => ({
    getAllStores: state.getAllStores,
    getActiveSubscriptionPlan: state.getActiveSubscriptionPlan,
    fetchBills: state.fetchBills,
    companyId: typeof window !== 'undefined' ? localStorage.getItem('companyId') : null
  }));

  const [allStoresState, setAllStoresState] = useState<Store[]>([]);
  const [activePlan, setActivePlan] = useState<ReturnType<typeof getActiveSubscriptionPlan>>(undefined);
  
  const [currentContextStoreId, setCurrentContextStoreId] = useState<string | undefined>(undefined);
  const [selectedStoreForForm, setSelectedStoreForForm] = useState<string | undefined>(undefined);
  const [activeBillingView, setActiveBillingView] = useState<BillingView>(currentViewFromUrl || 'history');

  const [hasMounted, setHasMounted] = useState(false);
  const isAdminContext = true; 

  // Date range filter state for BillHistoryTable
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriodFilterOption>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);


  useEffect(() => {
    setHasMounted(true);
    // Initial fetch of bills when component mounts and companyId is available
    if (currentCompanyId) {
      fetchBills(currentCompanyId);
    }
  }, [currentCompanyId, fetchBills]);

  useEffect(() => {
    if (hasMounted) {
      setAllStoresState(getAllStores());
      setActivePlan(getActiveSubscriptionPlan());
      setActiveBillingView(currentViewFromUrl || 'history');
    }
  }, [hasMounted, getAllStores, getActiveSubscriptionPlan, currentViewFromUrl]);

  useEffect(() => {
    if (hasMounted && activePlan && allStoresState.length > 0) {
      if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStoresState.length > 0) {
        setCurrentContextStoreId(allStoresState[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStoresState.length === 1) {
        setCurrentContextStoreId(allStoresState[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStoresState.length > 1) {
        setCurrentContextStoreId(allStoresState[0].id); 
      } else {
        setCurrentContextStoreId(undefined);
      }
    } else if (hasMounted && activePlan && allStoresState.length === 0) {
      setCurrentContextStoreId(undefined);
    }
  }, [hasMounted, allStoresState, activePlan]);

  useEffect(() => {
    if (hasMounted && activePlan && allStoresState.length > 0) {
      if (storeIdFromUrl && allStoresState.find(s => s.id === storeIdFromUrl)) {
        setSelectedStoreForForm(storeIdFromUrl);
      } else if (activePlan.id === SUBSCRIPTION_PLAN_IDS.STARTER && allStoresState.length > 0) {
        setSelectedStoreForForm(allStoresState[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStoresState.length === 1) {
        setSelectedStoreForForm(allStoresState[0].id);
      } else if (activePlan.id !== SUBSCRIPTION_PLAN_IDS.STARTER && allStoresState.length > 1) {
        setSelectedStoreForForm(allStoresState[0].id);
      } else {
        setSelectedStoreForForm(undefined);
      }
    } else if (hasMounted && activePlan && allStoresState.length === 0) {
       setSelectedStoreForForm(undefined);
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
      setCustomDateRange(undefined); // Clear custom range if a predefined period is selected
    }
  };

  const isNewBillAction = action === 'new' || !!modeFromUrl;
  const isStarterPlan = activePlan?.id === SUBSCRIPTION_PLAN_IDS.STARTER;

  let effectiveModeForTitle: BillMode = 'sell'; 
  if (modeFromUrl && ['sell', 'buy', 'return'].includes(modeFromUrl)) {
    effectiveModeForTitle = modeFromUrl;
  }

  if (isNewBillAction) {
    let title = "New Sales Bill";
    let icon = Send;

    if (effectiveModeForTitle === 'buy') { title = "New Expense Bill"; icon = ShoppingBag; }
    else if (effectiveModeForTitle === 'return') { title = "New Return Entry"; icon = RotateCcw; }

    if (isAdminContext && allStoresState.length === 0 && activePlan && activePlan.maxStores > 0) {
      return (
        <>
          <PageTitle title="Cannot Create Bill" icon={Building} actions={<Button asChild variant="outline"><Link href="/admin/stores">Add Store</Link></Button>} />
           <p className="text-center text-destructive">You need to add at least one store before creating bills. Please go to Store Management.</p>
        </>
      );
    }
    
    const newBillPageTitleActions = (
        <div className="flex items-center gap-3">
            {hasMounted && isAdminContext && !isStarterPlan && allStoresState.length > 1 && (
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">Billing For Store:</span>
                    <Select
                        key={`store-select-new-bill-${activePlan?.id}-${allStoresState.length}`}
                        value={selectedStoreForForm || ""}
                        onValueChange={(value) => setSelectedStoreForForm(value || undefined)}
                    >
                        <SelectTrigger id="store-select-new-bill-trigger" className="w-auto min-w-[180px] h-9 select-trigger-class">
                          <SelectValue placeholder="Select Store..." />
                        </SelectTrigger>
                        <SelectContent position="popper">
                        {allStoresState.map(store => ( <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem> ))}
                        </SelectContent>
                    </Select>
                 </div>
            )}
            {hasMounted && isAdminContext && (isStarterPlan || allStoresState.length === 1) && allStoresState.length > 0 && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">Billing For Store:</span>
                    <span className="text-sm font-semibold text-primary flex items-center gap-1 p-2 border border-input rounded-md h-9 bg-muted/50">
                        <Building size={16} />
                        {allStoresState.find(s => s.id === selectedStoreForForm)?.name || allStoresState[0]?.name}
                    </span>
                </div>
            )}
            <Button variant="outline" onClick={() => handleViewToggle('history')}>
              <HistoryIcon className="mr-2 h-4 w-4" /> Bill History
            </Button>
            <Button variant="outline" onClick={() => handleViewToggle('ledger')}>
              <ListChecks className="mr-2 h-4 w-4" /> Inventory Ledger
            </Button>
        </div>
    );

    return (
      <>
        <PageTitle title={title} icon={icon} actions={newBillPageTitleActions} />
        <BillingForm
          key={`new-bill-form-${effectiveModeForTitle}-${selectedStoreForForm}`} 
          initialModeProp={modeFromUrl}
          isAdminContext={true}
          preselectedStoreId={selectedStoreForForm}
        />
      </>
    );
  }

  const newBillHrefPath = `/admin/billing?action=new&mode=sell${currentContextStoreId ? `&storeId=${currentContextStoreId}` : (allStoresState.length === 1 ? `&storeId=${allStoresState[0].id}` : '')}`;
  
  const mainPageActions = (
    <div className="flex items-center gap-3">
        {hasMounted && isAdminContext && allStoresState.length > 0 && activeBillingView === 'history' && (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">New Bill Context:</span>
                <HistoryStoreSelector stores={allStoresState} activePlanId={activePlan?.id} currentStoreId={currentContextStoreId} onStoreChange={setCurrentContextStoreId} />
            </div>
        )}
        {activeBillingView === 'history' && (
            <div className="flex items-center gap-2">
                <Select value={timePeriodFilter} onValueChange={(value) => handleTimePeriodChange(value as TimePeriodFilterOption)}>
                    <SelectTrigger className="w-[180px] h-9 select-trigger-class">
                        <SelectValue placeholder="Filter by time" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="thisWeek">This Week</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                        <SelectItem value="lastMonth">Last Month</SelectItem>
                        <SelectItem value="thisYear">This Year</SelectItem>
                        <SelectItem value="lastYear">Last Year</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                </Select>
                {timePeriodFilter === 'custom' && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal h-9", !customDateRange && "text-muted-foreground" )}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {customDateRange?.from ? (
                                    customDateRange.to ? (
                                        <>{format(customDateRange.from, "LLL dd, y")} - {format(customDateRange.to, "LLL dd, y")}</>
                                    ) : ( format(customDateRange.from, "LLL dd, y") )
                                ) : ( <span>Pick a date range</span> )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={customDateRange?.from} selected={customDateRange} onSelect={setCustomDateRange} numberOfMonths={2} />
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        )}
        <Button onClick={() => handleViewToggle(activeBillingView === 'history' ? 'ledger' : 'history')} variant="outline">
            {activeBillingView === 'history' ? <ListChecks className="mr-2 h-4 w-4" /> : <HistoryIcon className="mr-2 h-4 w-4" />}
            {activeBillingView === 'history' ? 'Inventory Ledger' : 'Bill History'}
        </Button>
        <Button asChild disabled={isAdminContext && allStoresState.length === 0 && activePlan && activePlan.maxStores > 0}>
            <Link href={newBillHrefPath}><PlusCircle className="mr-2 h-4 w-4" /> Create New Bill</Link>
        </Button>
        {isAdminContext && allStoresState.length === 0 && activePlan && activePlan.maxStores > 0 && (<p className="text-xs text-muted-foreground">Add a store first</p>)}
    </div>
  );

  const pageTitleText = activeBillingView === 'ledger' ? 'Inventory Ledger' : 'Bill History';
  const pageTitleIcon = activeBillingView === 'ledger' ? BarChart2 : HistoryIcon;

  return (
    <>
      <PageTitle title={pageTitleText} icon={pageTitleIcon} actions={mainPageActions} />
      {activeBillingView === 'ledger' ? <InventoryLedgerTable /> : 
        <BillHistoryTable 
            key={`${timePeriodFilter}-${customDateRange?.from?.toISOString()}-${customDateRange?.to?.toISOString()}`} // Re-render if filter changes
            timePeriodFilter={timePeriodFilter} 
            customStartDate={customDateRange?.from} 
            customEndDate={customDateRange?.to}
        />
      }
    </>
  );
}

export default function AdminBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Bill Information...</div>}>
        <BillingContent />
      </Suspense>
    </div>
  );
}
