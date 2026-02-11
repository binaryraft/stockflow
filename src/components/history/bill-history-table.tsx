
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { MoreHorizontal, Eye, Printer, ArrowUpDown, ShoppingBag, Send, RotateCcw, AlertTriangle, Users, Building as BuildingIcon, Trash2, Edit2, Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight, FileSpreadsheet, ListChecks } from 'lucide-react';
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
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const getBillTypeIconAndColor = (billType: Bill['type'], items: BillItem[], isEstimate?: boolean): { icon: JSX.Element; className: string; name: string, titleColor: string } => {
  const isDefectiveReturn = billType === 'return' && items.some(item => item.isDefective === true);
  if (billType === 'buy') return { icon: <ShoppingBag size={14} />, className: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20', name: 'Expense', titleColor: 'text-destructive' };
  if (billType === 'sell' && isEstimate) return { icon: <Send size={14} />, className: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800', name: 'Estimate', titleColor: 'text-blue-600 dark:text-blue-400' };
  if (billType === 'sell') return { icon: <Send size={14} />, className: 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20', name: 'Sales Invoice', titleColor: 'text-primary' };
  if (isDefectiveReturn) return { icon: <AlertTriangle size={14} className="text-destructive" />, className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300', name: 'Return (Defective)', titleColor: 'text-amber-700' };
  return { icon: <RotateCcw size={14} />, className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300', name: 'Return', titleColor: 'text-amber-700' };
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
  viewMode?: 'standard' | 'excel';
}

export function BillHistoryTable({ filterByStoreId, timePeriodFilter, customStartDate, customEndDate, viewMode = 'standard' }: BillHistoryTableProps) {
  const {
    bills,
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
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableBillColumns; direction: 'ascending' | 'descending' } | null>(null);

  type SortableBillColumns = keyof Pick<Bill, 'date' | 'type' | 'totalAmount' | 'vendorOrCustomerName' | 'paymentStatus' | 'billedByStaffName' | 'storeName'> | 'id';

  type BillTypeFilter = 'all' | BillMode | 'estimate';
  const [billTypeFilter, setBillTypeFilter] = useState<BillTypeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const dateParams = useMemo(() => {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    switch (timePeriodFilter) {
      case 'today': start = startOfDay(now); end = endOfDay(now); break;
      case 'thisWeek': start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); break;
      case 'thisMonth': start = startOfMonth(now); end = endOfMonth(now); break;
      case 'lastMonth': start = startOfMonth(subMonths(now, 1)); end = endOfMonth(subMonths(now, 1)); break;
      case 'thisYear': start = startOfYear(now); end = endOfYear(now); break;
      case 'lastYear': start = startOfYear(subYears(now, 1)); end = endOfYear(subYears(now, 1)); break;
      case 'custom': if (customStartDate && customEndDate) { start = startOfDay(customStartDate); end = endOfDay(customEndDate); } break;
      default: break;
    }

    return { startDate: start?.toISOString(), endDate: end?.toISOString() };
  }, [timePeriodFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (currentCompanyId) {
      setIsLoading(true);
      const options = {
        storeId: filterByStoreId,
        search: debouncedSearchTerm,
        startDate: dateParams.startDate,
        endDate: dateParams.endDate,
        type: billTypeFilter === 'all' ? undefined : (billTypeFilter === 'estimate' ? 'sell' : billTypeFilter),
        isEstimate: billTypeFilter === 'estimate' ? true : (billTypeFilter === 'all' ? undefined : false)
      };
      fetchBillsPaginated(currentCompanyId, currentPage, 50, options).finally(() => setIsLoading(false));
    }
  }, [currentCompanyId, currentPage, debouncedSearchTerm, billTypeFilter, filterByStoreId, dateParams, fetchBillsPaginated]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearchTerm, billTypeFilter, filterByStoreId, dateParams]);

  const findProductSKUfromStore = useCallback((productId: string, selectedOptions?: Record<string, string>): ProductSKU | undefined => {
    const product = getProductById(productId);
    if (!product) return undefined;
    const targetOptionValues = selectedOptions || {};
    return product.productSKUs.find(sku =>
      JSON.stringify(Object.fromEntries(Object.entries(sku.optionValues).sort())) ===
      JSON.stringify(Object.fromEntries(Object.entries(targetOptionValues).sort()))
    );
  }, [getProductById]);

  const requestSort = (key: SortableBillColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
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
    if (!currentCompanyId) return;
    const success = await deleteBillFromStore(billId, currentCompanyId);
    if (success) toast({ title: "Bill Deleted", description: `Bill ${billDisplayId} has been removed.` });
    else toast({ variant: "destructive", title: "Deletion Failed", description: `Could not delete bill ${billDisplayId}.` });
  };

  const handleEnterEditMode = () => {
    if (selectedBill) {
      setEditablePaymentStatus(selectedBill.paymentStatus);
      setEditableNotes(selectedBill.notes || '');
      setIsEditingBillDetails(true);
    }
  };

  const handleCancelEditMode = () => setIsEditingBillDetails(false);

  const handleSaveBillDetails = async () => {
    if (selectedBill && currentCompanyId) {
      const updatedBill = await updateBillDetailsInStore(selectedBill.id, {
        paymentStatus: editablePaymentStatus,
        notes: editableNotes,
      }, currentCompanyId);
      if (updatedBill) {
        setSelectedBill(updatedBill);
        toast({ title: "Bill Updated", description: "Details updated." });
        setIsEditingBillDetails(false);
      } else toast({ variant: "destructive", title: "Update Failed", description: "Could not update." });
    }
  };

  const handlePrintSelectedBill = (bill: Bill | null) => {
    if (!bill || !userProfile) return;
    const printContent = generateBillPrintContent(bill, userProfile, allProductsStore);
    triggerPrint(printContent);
  };

  const filteredAndSortedBills = useMemo(() => {
    if (!bills) return [];
    const res = [...bills];
    if (sortConfig) {
      res.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Bill];
        let bValue: any = b[sortConfig.key as keyof Bill];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return res;
  }, [bills, sortConfig]);

  if (isLoading) return (<div className="flex-1 flex items-center justify-center p-12"><LoadingSpinner text="Loading bill history..." /></div>);
  if (!currentCompanyId && !isLoading) return <div className="flex-1 flex items-center justify-center p-6 text-destructive">Error: Company ID not found.</div>;

  return (
    <>
      {selectedBill && (
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          if (!open) { setIsEditingBillDetails(false); setSelectedBill(null); }
          setIsViewDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] border-t-4 border-t-primary shadow-lg">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className={cn("flex items-center gap-2 text-xl", getBillTypeIconAndColor(selectedBill.type, selectedBill.items, selectedBill.isEstimate).titleColor)}>
                {React.cloneElement(getBillTypeIconAndColor(selectedBill.type, selectedBill.items, selectedBill.isEstimate).icon, { className: "h-6 w-6" })}
                Bill Details {selectedBill.type === 'sell' && selectedBill.isEstimate && "(Estimate)"}
              </DialogTitle>
              <DialogDescription>{getBillTypeName(selectedBill)} (ID: <span className="font-mono text-muted-foreground">{selectedBill.id}</span>)</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] p-1">
              <div className="space-y-6 py-2 px-2">
                <div className="p-4 border rounded-md bg-card shadow-sm">
                  <h3 className="text-lg font-semibold text-primary mb-2">{userProfile?.companyName}</h3>
                  {userProfile?.companyAddress && <p className="text-sm text-muted-foreground">{userProfile.companyAddress}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border rounded-md bg-card space-y-2 shadow-sm">
                    <h4 className="text-md font-semibold mb-1">{getPartyDetailsTitle(selectedBill.type)}</h4>
                    <p className="text-sm font-medium">{selectedBill.vendorOrCustomerName || 'Walk-in'}</p>
                    {selectedBill.customerPhone && <p className="text-xs text-muted-foreground">{selectedBill.customerPhone}</p>}
                  </div>
                  <div className="p-4 border rounded-md bg-card space-y-2 shadow-sm">
                    <h4 className="text-md font-semibold mb-1">Bill Info</h4>
                    <p className="text-xs text-muted-foreground">Date: {format(new Date(selectedBill.date), 'PPpp')}</p>
                    {isEditingBillDetails ? (
                      <div className="space-y-2 pt-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Payment Status</Label>
                        <Select value={editablePaymentStatus} onValueChange={(val) => setEditablePaymentStatus(val as any)}>
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Badge variant={selectedBill.paymentStatus === 'paid' ? 'default' : 'destructive'}>{selectedBill.paymentStatus || 'unpaid'}</Badge>
                    )}
                  </div>
                </div>

                {isEditingBillDetails && (
                  <div className="p-4 border rounded-md bg-card space-y-2 shadow-sm">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Internal Notes / Remarks</Label>
                    <Textarea
                      value={editableNotes}
                      onChange={(e) => setEditableNotes(e.target.value)}
                      placeholder="Add notes about this bill..."
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                )}
                <Accordion type="single" collapsible className="w-full" defaultValue="bill-items">
                  <AccordionItem value="bill-items">
                    <AccordionTrigger className="p-4 bg-muted/50">Items ({selectedBill.items.length})</AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedBill.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">₹{item.sellPrice.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">₹{(item.quantity * item.sellPrice).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="p-4 border rounded-md bg-card shadow-sm text-right">
                  <span className="text-lg font-bold">Total: ₹{selectedBill.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="gap-2">
              {isEditingBillDetails ? (
                <>
                  <Button variant="outline" onClick={handleCancelEditMode}>Cancel</Button>
                  <Button onClick={handleSaveBillDetails}><Save size={14} className="mr-2" /> Save Changes</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleEnterEditMode}><Edit2 size={14} className="mr-2" /> Edit</Button>
                  <Button variant="outline" onClick={() => handlePrintSelectedBill(selectedBill)}><Printer size={14} className="mr-2" /> Print</Button>
                  <Button variant="destructive" onClick={() => handleDeleteBillClick(selectedBill.id, selectedBill.id)}><Trash2 size={14} className="mr-2" /> Delete</Button>
                  <DialogClose asChild><Button>Close</Button></DialogClose>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4 p-4 border rounded-lg bg-muted/50 shadow">
        <Input
          placeholder="Search bills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md bg-background"
        />
        <Select value={billTypeFilter} onValueChange={(value) => setBillTypeFilter(value as BillTypeFilter)}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sell">Sales</SelectItem>
            <SelectItem value="buy">Expenses</SelectItem>
            <SelectItem value="return">Returns</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === 'standard' && (
        <div className="hidden md:block border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedBills.length > 0 ? filteredAndSortedBills.map((bill) => {
                const info = getBillTypeIconAndColor(bill.type, bill.items, bill.isEstimate);
                return (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{format(new Date(bill.date), 'dd/MM/yy')}</TableCell>
                    <TableCell><Badge className={cn("gap-1.5", info.className)}>{info.icon}{info.name}</Badge></TableCell>
                    <TableCell>{bill.vendorOrCustomerName || 'Walk-in'}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">₹{bill.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={bill.paymentStatus === 'paid' ? 'default' : 'destructive'}>{bill.paymentStatus || 'unpaid'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal size={14} /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewBill(bill)}><Eye size={14} className="mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintSelectedBill(bill)}><Printer size={14} className="mr-2" /> Print</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No bills found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      {viewMode === 'excel' && (
        <div className="hidden md:flex flex-col border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary bg-card min-h-[400px]">
          <div className="flex w-full bg-muted border-b text-[10px] font-bold text-muted-foreground uppercase sticky top-0 z-10">
            <div className="w-10 p-2 text-center border-r">#</div>
            <div className="w-24 p-2 border-r">Time</div>
            <div className="w-32 p-2 border-r">Party / Store</div>
            <div className="flex-1 p-2 border-r">Product Description</div>
            <div className="w-20 p-2 border-r text-right">Qty</div>
            <div className="w-24 p-2 border-r text-right">Rate</div>
            <div className="w-28 p-2 text-right">Total</div>
            <div className="w-10 p-2"></div>
          </div>
          <div className="flex-1 overflow-auto max-h-[600px]">
            {filteredAndSortedBills.map((bill, bIdx) => (
              <div key={bill.id} className="border-b last:border-0">
                <div className="bg-muted/30 px-3 py-1.5 flex items-center justify-between text-[11px] font-bold border-b">
                  <div className="flex gap-3 items-center">
                    <span className="text-primary">BILL #{bIdx + 1}</span>
                    <span className="opacity-60">{format(new Date(bill.date), 'dd/MM/yy hh:mm a')}</span>
                    <span className="opacity-60">|</span>
                    <span>{getBillTypeName(bill)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { handleViewBill(bill); setTimeout(() => setIsEditingBillDetails(true), 50); }}><Edit2 size={12} className="mr-1" />Edit</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handleViewBill(bill)}><Eye size={12} className="mr-1" />View</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handlePrintSelectedBill(bill)}><Printer size={12} className="mr-1" />Print</Button>
                  </div>
                </div>
                {bill.items.map((item, iIdx) => (
                  <div key={item.id} className="flex w-full text-[11px] hover:bg-muted/5 border-b last:border-0 border-dashed">
                    <div className="w-10 p-2 text-center border-r bg-muted/5 opacity-50">{iIdx + 1}</div>
                    <div className="w-24 p-2 border-r bg-muted/5 opacity-0">--</div>
                    <div className="w-32 p-2 border-r bg-muted/5 truncate">
                      {iIdx === 0 ? bill.vendorOrCustomerName || 'Walk-in' : ''}
                    </div>
                    <div className="flex-1 p-2 border-r font-medium">{item.productName}</div>
                    <div className="w-20 p-2 border-r text-right font-mono">{item.quantity}</div>
                    <div className="w-24 p-2 border-r text-right font-mono">₹{item.sellPrice.toFixed(2)}</div>
                    <div className="w-28 p-2 text-right font-mono font-bold">₹{(item.quantity * item.sellPrice).toFixed(2)}</div>
                    <div className="w-10 p-2"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="md:hidden grid grid-cols-1 gap-4">
        {filteredAndSortedBills.map(bill => (
          <Card key={bill.id} className="shadow-sm">
            <CardHeader className="p-4 flex flex-row justify-between items-center">
              <CardTitle className="text-sm">{getBillTypeName(bill)}</CardTitle>
              <Badge>₹{bill.totalAmount.toFixed(2)}</Badge>
            </CardHeader>
            <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
              {format(new Date(bill.date), 'PPpp')}
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
