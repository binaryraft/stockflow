
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreHorizontal, Eye, Printer, ArrowUpDown, ShoppingBag, Send, RotateCcw, AlertTriangle, Users, Building as BuildingIcon, Trash2, Edit2, Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, isThisYear, startOfDay, endOfDay, isValid, parseISO, isWithinInterval, subMonths, subYears, startOfWeek, endOfWeek, getDate, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { Bill, ProductSKU, BillMode, BillItem, StockLayer, Product } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDesc, AlertDialogFooter as AlertDialogFoot, AlertDialogHeader as AlertDialogHead, AlertDialogTitle as AlertDialogTit, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { generateBillPrintContent, triggerPrint } from '@/lib/print-utils';


const getBillTypeIconAndColor = (billType: Bill['type'], items: BillItem[], isEstimate?: boolean): { icon: JSX.Element; className: string; name: string, titleColor: string } => {
  const isDefectiveReturn = billType === 'return' && items.some(item => item.isDefective === true);

  if (billType === 'buy') {
    return { icon: <ShoppingBag />, className: 'border-destructive/50 text-destructive bg-destructive/10 hover:bg-destructive/20', name: 'Expense', titleColor: 'text-destructive' };
  }
  if (billType === 'sell' && isEstimate) {
    return { icon: <Send />, className: 'bg-accent text-accent-foreground hover:bg-accent/90', name: 'Estimate', titleColor: 'text-accent' };
  }
  if (billType === 'sell') {
    return { icon: <Send />, className: 'bg-primary text-primary-foreground hover:bg-primary/90', name: 'Sales Invoice', titleColor: 'text-primary' };
  }
  if (isDefectiveReturn) {
    return { icon: <AlertTriangle />, className: 'bg-warning text-warning-foreground hover:bg-warning/90', name: 'Return (Defective)', titleColor: 'text-warning' };
  }
  // Default return
  return { icon: <RotateCcw />, className: 'bg-warning text-warning-foreground hover:bg-warning/90', name: 'Return', titleColor: 'text-warning' };
};

const getBillTypeName = (bill: Bill): string => {
  return getBillTypeIconAndColor(bill.type, bill.items, bill.isEstimate).name;
};

const getPartyDetailsTitle = (billType?: BillMode): string => {
  if (billType === 'buy') return 'Vendor Details';
  if (billType === 'sell' || billType === 'return') return 'Customer Details';
  return 'Party Details';
};

const getPartyNameLabel = (billType?: BillMode): string => {
  if (billType === 'buy') return 'Vendor Name';
  if (billType === 'sell' || billType === 'return') return 'Customer Name';
  return 'Name';
};


export type TimePeriodFilterOption = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

interface BillHistoryTableProps {
  filterByStoreId?: string;
  timePeriodFilter: TimePeriodFilterOption;
  customStartDate?: Date;
  customEndDate?: Date;
}


export function BillHistoryTable({ filterByStoreId, timePeriodFilter, customStartDate, customEndDate }: BillHistoryTableProps) {
  const {
    bills: allBillsFromStore,
    billsPagination,
    userProfile,
    deleteBill: deleteBillFromStore,
    getProductById,
    getSkuDetails,
    updateBillNonCriticalDetails: updateBillDetailsInStore,
    products: allProductsStore,
    fetchBillsPaginated,
    companyId: currentCompanyId,
  } = useInventoryStore(
    (state) => ({
      bills: state.bills,
      billsPagination: state.billsPagination,
      getProductById: state.getProductById,
      userProfile: state.userProfile,
      deleteBill: state.deleteBill,
      getSkuDetails: state.getSkuDetails,
      updateBillNonCriticalDetails: state.updateBillNonCriticalDetails,
      products: state.products,
      fetchBillsPaginated: state.fetchBillsPaginated,
      companyId: typeof window !== 'undefined' ? localStorage.getItem('companyId') : null,
    })
  );
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  /* New Edit Logic */
  const router = useRouter();
  const { setDraftBill } = useInventoryStore(state => ({ setDraftBill: state.setDraftBill }));

  const handleEditBill = (bill: Bill) => {
    // Convert bill to draft format
    const draftItems: BillItem[] = bill.items.map(item => ({
      ...item,
    }));

    setDraftBill({
      billType: bill.type as BillMode,
      items: draftItems,
      vendorOrCustomerName: bill.vendorOrCustomerName || '',
      customerPhone: bill.customerPhone || '',
      notes: bill.notes || '',
      isEstimate: bill.isEstimate || false,
      taxType: bill.taxType || 'intra-state'
    });

    const targetUrl = filterByStoreId
      ? `/storeportal/${filterByStoreId}/billing?mode=${bill.type}`
      : `/admin/billing?mode=${bill.type}`;

    router.push(targetUrl);
  };
  /* End New Edit Logic */

  const [sortConfig, setSortConfig] = useState<{ key: SortableBillColumns; direction: 'ascending' | 'descending' } | null>(null);

  type SortableBillColumns = keyof Pick<Bill, 'date' | 'type' | 'totalAmount' | 'vendorOrCustomerName' | 'paymentStatus' | 'billedByStaffName' | 'storeName'> | 'id';

  type BillTypeFilter = 'all' | BillMode | 'estimate';
  const [billTypeFilter, setBillTypeFilter] = useState<BillTypeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (currentCompanyId) {
      setIsLoading(true);

      let startDateStr: string | undefined = undefined;
      let endDateStr: string | undefined = undefined;

      const now = new Date();
      if (timePeriodFilter === 'today') {
        startDateStr = startOfDay(now).toISOString();
        endDateStr = endOfDay(now).toISOString();
      } else if (timePeriodFilter === 'thisWeek') {
        startDateStr = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
        endDateStr = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      } else if (timePeriodFilter === 'thisMonth') {
        startDateStr = startOfMonth(now).toISOString();
        endDateStr = endOfMonth(now).toISOString();
      } else if (timePeriodFilter === 'lastMonth') {
        startDateStr = startOfMonth(subMonths(now, 1)).toISOString();
        endDateStr = endOfMonth(subMonths(now, 1)).toISOString();
      } else if (timePeriodFilter === 'thisYear') {
        startDateStr = startOfYear(now).toISOString();
        endDateStr = endOfYear(now).toISOString();
      } else if (timePeriodFilter === 'lastYear') {
        startDateStr = startOfYear(subYears(now, 1)).toISOString();
        endDateStr = endOfYear(subYears(now, 1)).toISOString();
      } else if (timePeriodFilter === 'custom' && customStartDate && customEndDate) {
        if (isValid(customStartDate) && isValid(customEndDate)) {
          startDateStr = startOfDay(customStartDate).toISOString();
          endDateStr = endOfDay(customEndDate).toISOString();
        }
      }

      const options = {
        storeId: filterByStoreId,
        search: debouncedSearch,
        type: billTypeFilter === 'estimate' ? 'sell' : (billTypeFilter === 'all' ? undefined : billTypeFilter),
        isEstimate: billTypeFilter === 'estimate' ? true : (billTypeFilter === 'all' ? undefined : false),
        startDate: startDateStr,
        endDate: endDateStr,
      };

      fetchBillsPaginated(currentCompanyId, currentPage, 50, options as any)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [currentCompanyId, fetchBillsPaginated, currentPage, debouncedSearch, billTypeFilter, filterByStoreId, timePeriodFilter, customStartDate, customEndDate]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, billTypeFilter, filterByStoreId, timePeriodFilter]);


  const findProductSKUfromStore = useCallback((productId: string, selectedOptions?: Record<string, string>): ProductSKU | undefined => {
    if (!getProductById) {
      console.error("getProductById function is not available in findProductSKUfromStore in BillHistoryTable");
      return undefined;
    }
    const product = getProductById(productId);
    if (!product) return undefined;
    if (productId.startsWith('SERVICE_ITEM_') || productId.startsWith('CHARGE_ITEM_')) return undefined;

    const targetOptionValues = selectedOptions || {};
    return product.productSKUs.find(sku =>
      JSON.stringify(Object.fromEntries(Object.entries(sku.optionValues).sort())) ===
      JSON.stringify(Object.fromEntries(Object.entries(targetOptionValues).sort()))
    );
  }, [getProductById]);

  const filteredAndSortedBills = useMemo(() => {
    let processBills = [...allBillsFromStore];


    // Filter logic moved to server-side fetching


    if (sortConfig !== null) {
      processBills.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof Bill];
        let valB: any = b[sortConfig.key as keyof Bill];

        if (sortConfig.key === 'id') {
          valA = a.id; valB = b.id;
        } else if (sortConfig.key === 'date') {
          valA = a.timestamp;
          valB = b.timestamp;
        } else if (sortConfig.key === 'type') {
          valA = getBillTypeName(a);
          valB = getBillTypeName(b);
        } else if (sortConfig.key === 'billedByStaffName') {
          valA = a.billedByStaffName || '';
          valB = b.billedByStaffName || '';
        } else if (sortConfig.key === 'storeName') {
          valA = a.storeName || '';
          valB = b.storeName || '';
        } else if (sortConfig.key === 'paymentStatus') {
          valA = a.paymentStatus || '';
          valB = b.paymentStatus || '';
        }

        let comparison = 0;
        if (valA === undefined || valA === null) comparison = sortConfig.direction === 'ascending' ? 1 : -1;
        else if (valB === undefined || valB === null) comparison = sortConfig.direction === 'ascending' ? -1 : 1;
        else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }

        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    } else {
      processBills.sort((a, b) => b.timestamp - a.timestamp);
    }

    return processBills;
  }, [allBillsFromStore, searchTerm, sortConfig, billTypeFilter, filterByStoreId, timePeriodFilter, customStartDate, customEndDate]);

  const requestSort = (key: SortableBillColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const [isEditingBillDetails, setIsEditingBillDetails] = useState(false);
  const [editablePaymentStatus, setEditablePaymentStatus] = useState<Bill['paymentStatus']>(undefined);
  const [editableNotes, setEditableNotes] = useState<string>('');

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setIsEditingBillDetails(false);
    setEditablePaymentStatus(bill.paymentStatus);
    setEditableNotes(bill.notes || '');
    setIsViewDialogOpen(true);
  };

  const handleDeleteBillClick = async (billId: string, billDisplayId: string) => {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "Company context is missing." });
      return;
    }
    const success = await deleteBillFromStore(billId, currentCompanyId);
    if (success) {
      toast({ title: "Bill Deleted", description: `Bill ${billDisplayId} has been removed.` });
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: `Could not delete bill ${billDisplayId}.` });
    }
  };

  const handleEnterEditMode = () => {
    if (selectedBill) {
      setEditablePaymentStatus(selectedBill.paymentStatus);
      setEditableNotes(selectedBill.notes || '');
      setIsEditingBillDetails(true);
    }
  };

  const handleCancelEditMode = () => {
    setIsEditingBillDetails(false);
  };

  const handleSaveBillDetails = async () => {
    if (selectedBill && currentCompanyId) {
      const updatedBill = await updateBillDetailsInStore(selectedBill.id, {
        paymentStatus: editablePaymentStatus,
        notes: editableNotes,
      }, currentCompanyId);

      if (updatedBill) {
        setSelectedBill(updatedBill);
        toast({ title: "Bill Updated", description: "Payment status and/or notes have been updated." });
        setIsEditingBillDetails(false);
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update bill details." });
      }
    }
  };


  const handlePrintSelectedBill = (bill: Bill | null) => {
    if (!bill || !userProfile) return;
    const printContent = generateBillPrintContent(bill, userProfile, allProductsStore);
    triggerPrint(printContent);
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center p-6">Loading bill history...</div>;
  }
  if (!currentCompanyId && !isLoading) {
    return <div className="flex-1 flex items-center justify-center p-6 text-destructive">Error: Company ID not found. Cannot load bills.</div>;
  }

  return (
    <>
      {selectedBill && (
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsEditingBillDetails(false);
            setSelectedBill(null);
          }
          setIsViewDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] border-t-4 border-t-primary shadow-lg">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className={cn(
                "flex items-center gap-2 text-xl",
                getBillTypeIconAndColor(selectedBill.type, selectedBill.items, selectedBill.isEstimate).titleColor
              )}>
                {React.cloneElement(getBillTypeIconAndColor(selectedBill.type, selectedBill.items, selectedBill.isEstimate).icon, { className: cn(getBillTypeIconAndColor(selectedBill.type, selectedBill.items, selectedBill.isEstimate).icon.props.className, "h-6 w-6") })}
                Bill Details {selectedBill.type === 'sell' && selectedBill.isEstimate && "(Estimate)"}
              </DialogTitle>
              <DialogDescription>
                {getBillTypeName(selectedBill)} (ID: <span className="font-mono text-muted-foreground">{selectedBill.id}</span>)
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] p-1 -mx-1">
              <div className="space-y-6 py-2 px-2">
                <div className="p-4 border rounded-md bg-card shadow-sm">
                  <h3 className="text-lg font-semibold text-primary mb-2">{userProfile?.companyName}</h3>
                  {userProfile?.companyAddress && <p className="text-sm text-muted-foreground">{userProfile.companyAddress}</p>}
                  {(userProfile?.companyPhone || userProfile?.companyGstNo) && (
                    <p className="text-sm text-muted-foreground">
                      {userProfile.companyPhone && `Phone: ${userProfile.companyPhone}`}
                      {userProfile.companyPhone && userProfile.companyGstNo && " | "}
                      {userProfile.companyGstNo && `GSTIN: ${userProfile.companyGstNo}`}
                    </p>
                  )}
                </div>
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(selectedBill.vendorOrCustomerName || selectedBill.customerPhone) && (
                    <div className="p-4 border rounded-md bg-card space-y-2 shadow-sm">
                      <h4 className="text-md font-semibold text-foreground mb-1">
                        {getPartyDetailsTitle(selectedBill.type)}
                      </h4>
                      {selectedBill.vendorOrCustomerName && (
                        <div>
                          <p className="text-xs text-muted-foreground">{getPartyNameLabel(selectedBill.type)}</p>
                          <p className="font-medium text-sm">{selectedBill.vendorOrCustomerName}</p>
                        </div>
                      )}
                      {selectedBill.customerPhone && (
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium text-sm">{selectedBill.customerPhone}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={cn("p-4 border rounded-md bg-card space-y-2 shadow-sm", !(selectedBill.vendorOrCustomerName || selectedBill.customerPhone) && "md:col-span-2")}>
                    <h4 className="text-md font-semibold text-foreground mb-1">Bill Information</h4>
                    <div>
                      <p className="text-xs text-muted-foreground">Bill ID</p>
                      <p className="font-mono text-sm text-muted-foreground">{selectedBill.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date & Time</p>
                      <p className="font-medium text-sm">{format(new Date(selectedBill.date), 'PPpp')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bill Type</p>
                      <p className="font-medium text-sm">{getBillTypeName(selectedBill)}</p>
                    </div>
                    {(selectedBill.type === 'sell' || selectedBill.type === 'buy') && !selectedBill.isEstimate && (
                      <div className="space-y-1">
                        <Label htmlFor="paymentStatusView" className="text-xs text-muted-foreground">Payment Status</Label>
                        {isEditingBillDetails ? (
                          <Select
                            value={editablePaymentStatus || undefined}
                            onValueChange={(value) => setEditablePaymentStatus(value as Bill['paymentStatus'])}
                          >
                            <SelectTrigger id="paymentStatusView" className="h-9 text-sm select-trigger-class">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          selectedBill.paymentStatus ? (
                            <Badge
                              className={cn(
                                "capitalize text-xs",
                                selectedBill.paymentStatus === 'paid'
                                  ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600"
                                  : "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300 border-red-300 dark:border-red-600"
                              )}
                            >
                              {selectedBill.paymentStatus}
                            </Badge>
                          ) : <p className="text-sm font-medium text-muted-foreground">-</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {(selectedBill.billedByStaffName || selectedBill.storeName) && (
                  <div className="p-4 border rounded-md bg-card space-y-2 shadow-sm">
                    <h4 className="text-md font-semibold text-foreground mb-1">Transaction Origin</h4>
                    {selectedBill.storeName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Store</p>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <BuildingIcon size={14} className="text-muted-foreground" /> {selectedBill.storeName}
                        </p>
                      </div>
                    )}
                    {selectedBill.billedByStaffName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Billed by</p>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <Users size={14} className="text-muted-foreground" /> {selectedBill.billedByStaffName}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Accordion type="single" collapsible className="w-full" defaultValue="bill-items">
                  <AccordionItem value="bill-items">
                    <AccordionTrigger className="p-4 border rounded-md bg-card shadow-sm hover:no-underline hover:bg-muted/50 data-[state=open]:border-primary data-[state=open]:ring-1 data-[state=open]:ring-primary">
                      <h4 className="text-md font-semibold text-foreground">
                        Bill Items ({selectedBill.items.length} item(s))
                      </h4>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0">
                      <div className="p-4 border border-t-0 rounded-b-md bg-card shadow-sm">
                        <Table className="mt-0">
                          {selectedBill.type === 'buy' ? (
                            <>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="align-top w-[35%]">Product Details</TableHead>
                                  <TableHead className="text-right align-top">Purch. Qty</TableHead>
                                  <TableHead className="text-right align-top">Sold Qty</TableHead>
                                  <TableHead className="text-right align-top">Rem. Qty</TableHead>
                                  <TableHead className="text-right align-top">Cost/Unit</TableHead>
                                  <TableHead className="text-right align-top">Sell Price (Set)</TableHead>
                                  <TableHead className="text-right align-top">Item Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedBill.items.map(item => {
                                  const sku = findProductSKUfromStore(item.productId, item.selectedVariantOptions);
                                  const skuDetails = getSkuDetails(sku);
                                  const layerForThisBillItem = sku?.stockLayers.find(
                                    l => l.purchaseBillId === selectedBill.id &&
                                      l.costPrice === item.costPrice &&
                                      Math.abs(l.initialQuantity - item.quantity) < 0.001
                                  );

                                  const purchasedQty = layerForThisBillItem ? layerForThisBillItem.initialQuantity : item.quantity;
                                  const soldQty = layerForThisBillItem ? layerForThisBillItem.initialQuantity - layerForThisBillItem.quantity : 0;
                                  const remainingQty = layerForThisBillItem ? layerForThisBillItem.quantity : 0;
                                  const costPrice = typeof item.costPrice === 'number' ? item.costPrice : 0;
                                  const sellPriceSet = typeof (layerForThisBillItem?.sellPrice ?? item.sellPrice) === 'number' ? (layerForThisBillItem?.sellPrice ?? item.sellPrice) : 0;


                                  return (
                                    <TableRow key={item.id || item.productId}>
                                      <TableCell className="py-2 align-top w-[35%]">
                                        <div>{item.productName}</div>
                                        {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
                                          <div className="text-xs text-muted-foreground mt-0.5">
                                            {Object.entries(item.selectedVariantOptions)
                                              .map(([key, value]) => `${key}: ${value}`)
                                              .join('; ')}
                                          </div>
                                        )}
                                        {item.isAdditionalCharge && <span className="text-xs text-primary ml-1">(Additional Charge)</span>}
                                        {sku && skuDetails && typeof skuDetails.totalStock === 'number' && !item.isAdditionalCharge && (
                                          <div className="text-xs text-muted-foreground mt-0.5">
                                            Current Total SKU Stock: {skuDetails.totalStock.toFixed(2)}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right py-2 align-top">{purchasedQty.toFixed(2)}</TableCell>
                                      <TableCell className={cn("text-right py-2 align-top font-medium", soldQty > 0 && "text-green-600 dark:text-green-500")}>{soldQty.toFixed(2)}</TableCell>
                                      <TableCell className="text-right py-2 align-top font-semibold">{remainingQty.toFixed(2)}</TableCell>
                                      <TableCell className="text-right py-2 align-top">₹{costPrice.toFixed(2)}</TableCell>
                                      <TableCell className="text-right py-2 align-top">₹{sellPriceSet.toFixed(2)}</TableCell>
                                      <TableCell className="text-right font-medium py-2 align-top">₹{(item.quantity * costPrice).toFixed(2)}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </>
                          ) : (
                            <>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[40%]">Product/Charge</TableHead>
                                  <TableHead className="text-right">Qty</TableHead>
                                  <TableHead className="text-right">Price/Unit</TableHead>
                                  {selectedBill.type === 'sell' && !selectedBill.isEstimate && selectedBill.items.some(i => !i.isAdditionalCharge && !i.productId.startsWith('SERVICE_ITEM_')) && (
                                    <>
                                      <TableHead className="text-right">SGST</TableHead>
                                      <TableHead className="text-right">CGST</TableHead>
                                    </>
                                  )}
                                  <TableHead className="text-right">Item Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedBill.items.map(item => {
                                  const sellPrice = typeof item.sellPrice === 'number' ? item.sellPrice : 0;
                                  const itemPreTaxSubtotal = item.quantity * sellPrice;
                                  const itemSgst = item.sgstAmount || 0;
                                  const itemCgst = item.cgstAmount || 0;
                                  const itemTotalWithTax = itemPreTaxSubtotal + itemSgst + itemCgst;
                                  const showItemTaxCols = selectedBill.type === 'sell' && !selectedBill.isEstimate && !item.isAdditionalCharge && !item.productId.startsWith('SERVICE_ITEM_');
                                  return (
                                    <TableRow key={item.id || item.productId}>
                                      <TableCell className="py-2 align-top w-[40%]">
                                        <div>{item.productName}</div>
                                        {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
                                          <div className="text-xs text-muted-foreground mt-0.5">
                                            {Object.entries(item.selectedVariantOptions)
                                              .map(([key, value]) => `${key}: ${value}`)
                                              .join('; ')}
                                          </div>
                                        )}
                                        {item.isAdditionalCharge && <span className="text-xs text-primary ml-1">(Additional Charge)</span>}
                                        {selectedBill.type === 'return' && item.isDefective && !item.isAdditionalCharge && (
                                          <Badge variant="destructive" className="text-xs mt-1">Defective</Badge>
                                        )}
                                        {selectedBill.type === 'return' && !item.isDefective && !item.isAdditionalCharge && (
                                          <Badge className="text-xs mt-1 bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-200/80 dark:hover:bg-green-700/30">Restocked</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right py-2 align-top">{item.quantity.toFixed(2)}</TableCell>
                                      <TableCell className="text-right py-2 align-top">₹{sellPrice.toFixed(2)}</TableCell>
                                      {selectedBill.type === 'sell' && !selectedBill.isEstimate && selectedBill.items.some(i => !i.isAdditionalCharge && !i.productId.startsWith('SERVICE_ITEM_')) && (
                                        <>
                                          <TableCell className="text-right py-2 align-top">{showItemTaxCols ? `₹${itemSgst.toFixed(2)}` : '-'}</TableCell>
                                          <TableCell className="text-right py-2 align-top">{showItemTaxCols ? `₹${itemCgst.toFixed(2)}` : '-'}</TableCell>
                                        </>
                                      )}
                                      <TableCell className="text-right font-medium py-2 align-top">₹{(showItemTaxCols && !item.isAdditionalCharge ? itemTotalWithTax : itemPreTaxSubtotal).toFixed(2)}</TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </>
                          )}
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className={cn("p-4 border rounded-md shadow-sm", isEditingBillDetails ? "bg-card" : "bg-tertiary")}>
                  <Label htmlFor="notesView" className="text-md font-semibold text-foreground mb-1 block">Notes</Label>
                  {isEditingBillDetails ? (
                    <Textarea
                      id="notesView"
                      value={editableNotes}
                      onChange={(e) => setEditableNotes(e.target.value)}
                      placeholder="Add notes for this bill..."
                      rows={3}
                      className="text-sm"
                    />
                  ) : (
                    selectedBill.notes ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedBill.notes}
                      </p>
                    ) : <p className="text-sm text-muted-foreground italic">No notes for this bill.</p>
                  )}
                </div>

                <div className="p-4 border rounded-md bg-card shadow-sm">
                  <h4 className="text-md font-semibold text-foreground mb-2 border-b pb-2">Summary</h4>
                  <div className="space-y-1 text-sm">
                    {selectedBill.type === 'buy' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Cost (Expense Bill):</span>
                        <span className="font-semibold text-destructive">₹{selectedBill.totalAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {(selectedBill.type === 'sell' || selectedBill.type === 'return') && !selectedBill.isEstimate && ((selectedBill.totalSGST ?? 0) > 0 || (selectedBill.totalCGST ?? 0) > 0 || selectedBill.items.some(i => !i.isAdditionalCharge && !i.productId.startsWith('SERVICE_ITEM_'))) && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal (Before Tax):</span>
                          <span className="font-medium">₹{(selectedBill.subTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total SGST:</span>
                          <span className="font-medium">₹{(selectedBill.totalSGST || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total CGST:</span>
                          <span className="font-medium">₹{(selectedBill.totalCGST || 0).toFixed(2)}</span>
                        </div>
                        <Separator className="my-1.5" />
                      </>
                    )}
                    <div className="flex justify-between font-semibold text-lg">
                      <span>{selectedBill.type === 'sell' && selectedBill.isEstimate ? 'Estimate Total:' : 'Grand Total:'}</span>
                      <span className={getBillTypeIconAndColor(selectedBill.type, selectedBill.items, selectedBill.isEstimate).titleColor}>₹{selectedBill.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t mt-4 flex flex-col-reverse sm:flex-row sm:justify-between items-center">
              <div className="flex gap-2 mt-2 sm:mt-0">
                {!isEditingBillDetails && (
                  <Button variant="outline" onClick={handleEnterEditMode} disabled={(selectedBill.type === 'sell' && selectedBill.isEstimate) || selectedBill.type === 'return'}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
                {isEditingBillDetails && (
                  <>
                    <Button variant="default" onClick={handleSaveBillDetails}>
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancelEditMode}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {!isEditingBillDetails && (
                  <>
                    <Button variant="outline" onClick={() => handlePrintSelectedBill(selectedBill)}>
                      <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Bill
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHead>
                          <AlertDialogTit>Are you sure?</AlertDialogTit>
                          <AlertDialogDesc>
                            This action cannot be undone. This will permanently delete bill ID: {selectedBill.id}.
                            Stock levels will NOT be automatically readjusted.
                          </AlertDialogDesc>
                        </AlertDialogHead>
                        <AlertDialogFoot>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              handleDeleteBillClick(selectedBill.id, selectedBill.id);
                              setIsViewDialogOpen(false);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete Bill
                          </AlertDialogAction>
                        </AlertDialogFoot>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                <DialogClose asChild>
                  <Button type="button" variant={isEditingBillDetails ? "ghost" : "default"}>Close</Button>
                </DialogClose>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4 p-4 border rounded-lg bg-muted/50 shadow">
        <Input
          placeholder="Search bills (ID, Name, Phone, Type, Date, Amount, Payment Status, Product, Staff, Store)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md w-full md:w-auto bg-background"
        />
        <Select value={billTypeFilter} onValueChange={(value) => setBillTypeFilter(value as BillTypeFilter)}>
          <SelectTrigger className="w-full md:w-[180px] select-trigger-class bg-background">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bill Types</SelectItem>
            <SelectItem value="sell">Sales Invoices</SelectItem>
            <SelectItem value="estimate">Estimates</SelectItem>
            <SelectItem value="buy">Expense Bills</SelectItem>
            <SelectItem value="return">Return Bills</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 px-3 w-[90px] md:w-[120px]">Date / ID</TableHead>
              <TableHead onClick={() => requestSort('type')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 w-[150px]">
                Type <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('billedByStaffName')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden lg:table-cell w-[160px]">
                Billed By <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('storeName')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden lg:table-cell w-[160px]">
                Store <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('vendorOrCustomerName')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Name/Phone <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right py-3 px-4 w-[70px]">Items</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4 w-[110px]" onClick={() => requestSort('totalAmount')} >
                Total <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-center cursor-pointer hover:bg-muted/50 py-3 px-4 w-[100px]" onClick={() => requestSort('paymentStatus')}>
                Payment <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right py-3 px-4 w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Loading bills...</TableCell>
              </TableRow>
            ) : filteredAndSortedBills.length > 0 ? (
              filteredAndSortedBills.map((bill) => {
                const billDisplayInfo = getBillTypeIconAndColor(bill.type, bill.items, bill.isEstimate);
                const billDate = new Date(bill.date);
                return (
                  <TableRow key={bill.id}>
                    <TableCell className="py-2 px-3 w-[90px] md:w-[120px]">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xl font-bold text-primary">{getDate(billDate)}</span>
                        <span className="text-xs text-muted-foreground">{format(billDate, 'MMM yyyy')}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{format(billDate, 'p')}</span>
                        <span className="text-xs text-muted-foreground font-mono mt-0.5 opacity-80">{bill.id.slice(-6)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 w-[150px]">
                      <div className="flex flex-col items-start gap-0.5">
                        <Badge
                          className={cn(
                            "capitalize flex items-center gap-1.5 w-fit min-w-[100px] justify-center px-2.5 py-1 text-xs",
                            billDisplayInfo.className
                          )}
                        >
                          {React.cloneElement(billDisplayInfo.icon, { className: cn(billDisplayInfo.icon.props.className, "mr-1 h-4 w-4") })}
                          {billDisplayInfo.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden lg:table-cell w-[160px]">
                      {bill.billedByStaffName ? (
                        <div className="text-sm flex items-center gap-1">
                          <Users size={14} className="text-muted-foreground shrink-0" />
                          {bill.billedByStaffName}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden lg:table-cell w-[160px]">
                      {bill.storeName ? (
                        <div className="text-sm flex items-center gap-1">
                          <BuildingIcon size={14} className="text-muted-foreground shrink-0" />
                          {bill.storeName}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div>{bill.vendorOrCustomerName || <span className="text-muted-foreground">-</span>}</div>
                      {bill.customerPhone && <div className="text-xs text-muted-foreground">{bill.customerPhone}</div>}
                    </TableCell>
                    <TableCell className="text-right py-3 px-4 w-[70px]">{bill.items.length}</TableCell>
                    <TableCell className="text-right font-semibold text-primary py-3 px-4 w-[110px]">₹{bill.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-center py-3 px-4 w-[100px]">
                      {(bill.type === 'sell' || bill.type === 'buy') && bill.paymentStatus && !bill.isEstimate ? (
                        <Badge
                          className={cn(
                            "capitalize text-xs",
                            bill.paymentStatus === 'paid'
                              ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600"
                              : "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300 border-red-300 dark:border-red-600"
                          )}
                        >
                          {bill.paymentStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-3 px-4 w-[70px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewBill(bill)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditBill(bill)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Bill
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintSelectedBill(bill)}>
                            <Printer className="mr-2 h-4 w-4" /> Print Bill
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Bill
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHead>
                                <AlertDialogTit>Are you sure?</AlertDialogTit>
                                <AlertDialogDesc>
                                  This action cannot be undone. This will permanently delete bill ID: {bill.id}.
                                  Stock levels will NOT be automatically readjusted.
                                </AlertDialogDesc>
                              </AlertDialogHead>
                              <AlertDialogFoot>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => { handleDeleteBillClick(bill.id, bill.id); setIsViewDialogOpen(false); }} className="bg-destructive hover:bg-destructive/90">
                                  Delete Bill
                                </AlertDialogAction>
                              </AlertDialogFoot>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No bills found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="flex justify-center items-center py-10"><p className="text-muted-foreground">Loading bills...</p></div>
        ) : filteredAndSortedBills.length > 0 ? (
          filteredAndSortedBills.map((bill) => {
            const billDisplayInfo = getBillTypeIconAndColor(bill.type, bill.items, bill.isEstimate);
            const billDate = new Date(bill.date);
            return (
              <Card key={bill.id} className="shadow-md border-t-2 border-t-primary overflow-hidden">
                <CardHeader className="p-4 flex flex-row items-start justify-between bg-muted/30">
                  <div>
                    <CardTitle className={cn("text-md flex items-center gap-1.5", billDisplayInfo.titleColor)}>
                      {React.cloneElement(billDisplayInfo.icon, { className: "h-4 w-4" })}
                      {billDisplayInfo.name}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono text-muted-foreground mt-1">
                      ID: {bill.id}
                    </CardDescription>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-medium">{format(billDate, 'MMM d, yyyy')}</p>
                    <p className="text-muted-foreground">{format(billDate, 'p')}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-1.5 text-sm">
                  {bill.vendorOrCustomerName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Party:</span>
                      <span className="font-medium truncate text-right">{bill.vendorOrCustomerName}</span>
                    </div>
                  )}
                  {bill.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium text-right">{bill.customerPhone}</span>
                    </div>
                  )}
                  {bill.storeName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Store:</span>
                      <span className="font-medium text-right">{bill.storeName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium text-right">{bill.items.length}</span>
                  </div>
                  {(bill.type === 'sell' || bill.type === 'buy') && bill.paymentStatus && !bill.isEstimate && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Payment:</span>
                      <Badge
                        className={cn(
                          "capitalize text-xs py-0.5 px-1.5",
                          bill.paymentStatus === 'paid'
                            ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600"
                            : "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-300 border-red-300 dark:border-red-600"
                        )}
                      >
                        {bill.paymentStatus}
                      </Badge>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 bg-muted/30 flex justify-between items-center">
                  <p className="text-lg font-bold">
                    <span className={cn(billDisplayInfo.titleColor === 'text-destructive' ? 'text-destructive' : 'text-primary')}>
                      ₹{bill.totalAmount.toFixed(2)}
                    </span>
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewBill(bill)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditBill(bill)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit Bill
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrintSelectedBill(bill)}>
                        <Printer className="mr-2 h-4 w-4" /> Print Bill
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Bill
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHead>
                            <AlertDialogTit>Are you sure?</AlertDialogTit>
                            <AlertDialogDesc>
                              This action cannot be undone. This will permanently delete bill ID: {bill.id}.
                              Stock levels will NOT be automatically readjusted.
                            </AlertDialogDesc>
                          </AlertDialogHead>
                          <AlertDialogFoot>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { handleDeleteBillClick(bill.id, bill.id); setIsViewDialogOpen(false); }} className="bg-destructive hover:bg-destructive/90">
                              Delete Bill
                            </AlertDialogAction>
                          </AlertDialogFoot>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <p className="text-center text-muted-foreground py-10">No bills found for the selected filters.</p>
        )}
      </div>

      {/* Pagination Controls */}
      {billsPagination && billsPagination.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4 px-2 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(p => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} of {billsPagination.totalPages}
            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
              (Total Bills: {billsPagination.totalCount})
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(p => Math.min(billsPagination.totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === billsPagination.totalPages || isLoading}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </>
  );
}
