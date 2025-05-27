
"use client";

import React, { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Printer, ArrowUpDown, ShoppingBag, Send, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { Bill } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { COMPANY_NAME, COMPANY_ADDRESS, COMPANY_CONTACT } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type SortableBillColumns = keyof Pick<Bill, 'date' | 'type' | 'totalAmount' | 'vendorOrCustomerName'>;
type BillFilterType = 'all' | 'sell' | 'buy' | 'return';


export function BillHistoryTable() {
  const { bills } = useInventoryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableBillColumns; direction: 'ascending' | 'descending' } | null>(null);
  const [filterType, setFilterType] = useState<BillFilterType>('all');


  const filteredAndSortedBills = useMemo(() => {
    let processBills = [...bills];

    // 1. Filter by type
    if (filterType !== 'all') {
      processBills = processBills.filter(bill => bill.type === filterType);
    }

    // 2. Filter by search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processBills = processBills.filter(bill =>
        bill.id.toLowerCase().includes(lowerSearchTerm) ||
        (bill.vendorOrCustomerName && bill.vendorOrCustomerName.toLowerCase().includes(lowerSearchTerm)) ||
        (bill.customerPhone && bill.customerPhone.toLowerCase().includes(lowerSearchTerm)) ||
        getBillTypeName(bill).toLowerCase().includes(lowerSearchTerm) ||
        format(new Date(bill.date), 'PPpp').toLowerCase().includes(lowerSearchTerm) ||
        bill.totalAmount.toString().includes(lowerSearchTerm) ||
        bill.items.some(item => item.productName.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // 3. Sort
    if (sortConfig !== null) {
        processBills.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'date') {
            valA = a.timestamp;
            valB = b.timestamp;
        } else if (sortConfig.key === 'type') {
            valA = getBillTypeName(a);
            valB = getBillTypeName(b);
        }


        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }

        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    } else {
        processBills.sort((a,b) => b.timestamp - a.timestamp); // Default sort: newest first
    }

    return processBills;
  }, [bills, searchTerm, sortConfig, filterType]);

  const requestSort = (key: SortableBillColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setIsViewDialogOpen(true);
  };

  const handlePrintBill = (billToPrint: Bill | null) => {
    if (!billToPrint) return;

    const printWindow = window.open('', '_blank', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Bill</title>');
      
      const styles =
        "<style>\n" +
        "  body { font-family: Arial, sans-serif; margin: 20px; color: #000; font-size: 10pt; }\n" +
        "  @page { size: auto; margin: 0.5in; }\n" +
        "  .print-container { width: 100%; margin: 0; padding:0; }\n" +
        "  .header, .bill-to, .bill-info, .items-section, .notes-section, .summary-section { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; page-break-inside: avoid; }\n" +
        "  .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 20px; }\n" +
        "  .header h1 { margin: 0 0 3px 0; font-size: 16pt; font-weight: bold; }\n" +
        "  .header p { margin: 0; font-size: 9pt; color: #333; }\n" +
        "  h2, h3, h4 { margin-top: 0; margin-bottom: 8px; font-size: 12pt; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 3px; }\n" +
        "  h4 { font-size: 11pt; }\n" +
        "  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }\n" +
        "  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }\n" +
        "  th { background-color: #f2f2f2; font-weight: bold; }\n" +
        "  .text-right { text-align: right; }\n" +
        "  .font-medium { font-weight: bold; }\n" +
        "  .text-muted-foreground { color: #555; font-size: 0.9em; }\n" +
        "  .badge { display: inline-block; padding: 0.2em 0.5em; font-size: 0.8em; font-weight: bold; line-height: 1; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.25rem; border: 1px solid #ccc; }\n" +
        "  .badge-destructive { color: #000; background-color: #fdd; border-color: #fbb; }\n" +
        "  .badge-success { color: #000; background-color: #dfd; border-color: #bfb; }\n" +
        "  .total-row td { font-weight: bold; background-color: #f2f2f2; }\n" +
        "  .items-section .variant-options { font-size: 0.8em; color: #444; margin-left: 8px; margin-top: 2px; display: block; }\n" +
        "  .notes-content { white-space: pre-wrap; font-style: italic; background-color: #f9f9f9; padding: 8px; border-radius: 3px; border: 1px solid #eee; }\n" +
        "  .no-print { display: none !important; } \n" +
        "</style>\n";
      printWindow.document.write(styles);
      
      printWindow.document.write('</head><body>');
      printWindow.document.write('<div class="print-container">');

      // Company Header
      printWindow.document.write('<div class="header">');
      printWindow.document.write(`<h1>${COMPANY_NAME}</h1>`);
      printWindow.document.write(`<p>${COMPANY_ADDRESS}</p>`);
      printWindow.document.write(`<p>${COMPANY_CONTACT}</p>`);
      printWindow.document.write('</div>');

      // Bill Info & Party Details
      printWindow.document.write('<table><tr><td style="width:50%; vertical-align:top;">');
      if (billToPrint.vendorOrCustomerName || billToPrint.customerPhone) {
        printWindow.document.write('<div class="bill-to">');
        printWindow.document.write(`<h4>${getPartyDetailsTitle(billToPrint.type)}</h4>`);
        if (billToPrint.vendorOrCustomerName) printWindow.document.write(`<p><strong>${getPartyNameLabel(billToPrint.type)}:</strong> ${billToPrint.vendorOrCustomerName}</p>`);
        if (billToPrint.customerPhone) printWindow.document.write(`<p><strong>Phone:</strong> ${billToPrint.customerPhone}</p>`);
        printWindow.document.write('</div>');
      }
      printWindow.document.write('</td><td style="width:50%; vertical-align:top;">');
      printWindow.document.write('<div class="bill-info text-right">');
      printWindow.document.write(`<h4>Bill Information</h4>`);
      printWindow.document.write(`<p><strong>Bill ID:</strong> ${billToPrint.id}</p>`);
      printWindow.document.write(`<p><strong>Date:</strong> ${format(new Date(billToPrint.date), 'PPpp')}</p>`);
      printWindow.document.write(`<p><strong>Type:</strong> ${getBillTypeName(billToPrint)}</p>`);
      printWindow.document.write('</div>');
      printWindow.document.write('</td></tr></table>');


      // Items Table
      printWindow.document.write('<div class="items-section">');
      printWindow.document.write('<h3>Items</h3>');
      printWindow.document.write('<table><thead><tr><th>Product</th><th>Qty</th><th>Cost/Unit</th><th>Price/Unit</th><th>Item Total</th></tr></thead><tbody>');
      billToPrint.items.forEach(item => {
        printWindow.document.write('<tr>');
        printWindow.document.write(`<td>${item.productName}`);
        if (item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
          printWindow.document.write('<div class="variant-options">');
          printWindow.document.write(Object.entries(item.selectedVariantOptions).map(([key, value]) => `${key}: ${value}`).join(', '));
          printWindow.document.write('</div>');
        }
        if (billToPrint.type === 'return') {
          if (item.isDefective) {
            printWindow.document.write(' <span class="badge badge-destructive">Defective</span>');
          } else {
            printWindow.document.write(' <span class="badge badge-success">Restocked</span>');
          }
        }
        printWindow.document.write('</td>');
        printWindow.document.write(`<td class="text-right">${item.quantity}</td>`);
        printWindow.document.write(`<td class="text-right">₹${item.costPrice.toFixed(2)}</td>`);
        printWindow.document.write(`<td class="text-right">₹${item.sellPrice.toFixed(2)}</td>`);
        printWindow.document.write(`<td class="text-right font-medium">₹${(item.quantity * (billToPrint.type === 'buy' ? item.costPrice : item.sellPrice)).toFixed(2)}</td>`);
        printWindow.document.write('</tr>');
      });
      printWindow.document.write('</tbody></table>');
      printWindow.document.write('</div>');

      // Notes
      if (billToPrint.notes) {
        printWindow.document.write('<div class="notes-section">');
        printWindow.document.write('<h4>Notes</h4>');
        printWindow.document.write(`<p class="notes-content">${billToPrint.notes}</p>`);
        printWindow.document.write('</div>');
      }

      // Summary
      printWindow.document.write('<div class="summary-section">');
      printWindow.document.write('<h4>Summary</h4>');
      printWindow.document.write(`<table><tr class="total-row"><td><strong>Total Amount:</strong></td><td class="text-right"><strong>₹${billToPrint.totalAmount.toFixed(2)}</strong></td></tr>`);
      if (billToPrint.type === 'buy' && calculatePotentialSellTotal(billToPrint) !== null) {
        printWindow.document.write(`<tr><td>Potential Sell Value:</td><td class="text-right">₹${calculatePotentialSellTotal(billToPrint)!.toFixed(2)}</td></tr>`);
      }
      printWindow.document.write('</table>');
      printWindow.document.write('</div>');


      printWindow.document.write('</div>'); // End print-container
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const getBillTypeIconAndColor = (bill: Bill): { icon: JSX.Element; className: string; name: string } => {
    const isDefectiveReturn = bill.type === 'return' && bill.items.some(item => item.isDefective === true);
    if (bill.type === 'buy') return { icon: <ShoppingBag className="h-4 w-4" />, className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', name: 'Expense' };
    if (bill.type === 'sell') return { icon: <Send className="h-4 w-4" />, className: 'bg-primary text-primary-foreground hover:bg-primary/90', name: 'Sales' };
    if (isDefectiveReturn) return { icon: <AlertTriangle className="h-4 w-4 text-destructive" />, className: 'bg-amber-400 text-amber-900 hover:bg-amber-500 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-600', name: 'Return (Defective)' };
    return { icon: <RotateCcw className="h-4 w-4" />, className: 'bg-amber-400 text-amber-900 hover:bg-amber-500 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-600', name: 'Return' };
  };

  const getBillTypeName = (bill: Bill): string => {
    return getBillTypeIconAndColor(bill).name;
  }


  const calculatePotentialSellTotal = (bill: Bill): number | null => {
    if (bill.type !== 'buy') return null;
    return bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  };

  const getPartyDetailsTitle = (billType?: Bill['type']): string => {
    if (billType === 'buy') return 'Vendor Details';
    if (billType === 'sell' || billType === 'return') return 'Customer Details';
    return 'Party Details';
  };

  const getPartyNameLabel = (billType?: Bill['type']): string => {
    if (billType === 'buy') return 'Vendor Name';
    if (billType === 'sell' || billType === 'return') return 'Customer Name';
    return 'Name';
  };


  return (
    <>
      {selectedBill && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh]"> 
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="flex items-center gap-2 text-xl">
                {React.cloneElement(getBillTypeIconAndColor(selectedBill).icon, { className: cn(getBillTypeIconAndColor(selectedBill).icon.props.className, "h-5 w-5")})}
                Bill Details
              </DialogTitle>
              <DialogDescription>
                {getBillTypeName(selectedBill)} Bill (ID: {selectedBill.id})
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] p-1 -mx-1">
            <div className="space-y-6 py-2 px-2">

              <div className="p-4 border rounded-md bg-card shadow-sm">
                  <h3 className="text-lg font-semibold text-primary mb-2">{COMPANY_NAME}</h3>
                  <p className="text-sm text-muted-foreground">{COMPANY_ADDRESS}</p>
                  <p className="text-sm text-muted-foreground">{COMPANY_CONTACT}</p>
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
                        <p className="font-mono text-sm">{selectedBill.id}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Date & Time</p>
                        <p className="font-medium text-sm">{format(new Date(selectedBill.date), 'PPpp')}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Bill Type</p>
                        <p className="font-medium text-sm">{getBillTypeName(selectedBill)}</p>
                    </div>
                </div>
              </div>


              <div className="p-4 border rounded-md bg-card shadow-sm">
                <h4 className="text-md font-semibold text-foreground mb-3">Items</h4>
                <Table className="mt-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">Price/Unit</TableHead>
                      <TableHead className="text-right">Item Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBill.items.map(item => (
                      <TableRow key={item.id || item.productId}> 
                        <TableCell className="py-3">
                          <div>{item.productName}</div>
                          {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {Object.entries(item.selectedVariantOptions)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join('; ')}
                            </div>
                          )}
                          {selectedBill.type === 'return' && (
                            item.isDefective ? (
                              <Badge variant="destructive" className="text-xs mt-1">Defective</Badge>
                            ) : (
                              <Badge className="text-xs mt-1 bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-200/80 dark:hover:bg-green-700/30">Restocked</Badge>
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right py-3">{item.quantity}</TableCell>
                        <TableCell className="text-right py-3">₹{item.costPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right py-3">₹{item.sellPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium py-3">₹{(item.quantity * (selectedBill.type === 'buy' ? item.costPrice : item.sellPrice)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedBill.notes && (
                <div className="p-4 border rounded-md bg-tertiary shadow-sm">
                    <h4 className="text-md font-semibold text-tertiary-foreground mb-1">Notes:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedBill.notes}
                    </p>
                </div>
              )}

              <div className="p-4 border rounded-md bg-card shadow-sm">
                <h4 className="text-md font-semibold text-foreground mb-2">Summary</h4>
                <div className="space-y-1">
                    <div className="flex justify-between text-lg font-semibold text-foreground">
                        <span>Total Amount:</span>
                        <span className="text-primary">₹{selectedBill.totalAmount.toFixed(2)}</span>
                    </div>
                    {selectedBill.type === 'buy' && calculatePotentialSellTotal(selectedBill) !== null && (
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                            <span>Potential Sell Value:</span>
                            <span>₹{calculatePotentialSellTotal(selectedBill)!.toFixed(2)}</span>
                        </div>
                    )}
                </div>
              </div>

            </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => handlePrintBill(selectedBill)}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <DialogClose asChild>
                <Button type="button">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <Input
          placeholder="Search bills (ID, Name, Phone, Type, Date, Amount, Product)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md w-full md:w-auto"
        />
        <Select value={filterType} onValueChange={(value) => setFilterType(value as BillFilterType)}>
            <SelectTrigger className="w-full md:w-[180px] select-trigger-class">
                <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Bills</SelectItem>
                <SelectItem value="sell">Sales Bills</SelectItem>
                <SelectItem value="buy">Expense Bills</SelectItem>
                <SelectItem value="return">Return Bills</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:bg-muted/50 w-[150px]">
                Date / Time <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="w-[140px]">ID</TableHead>
              <TableHead onClick={() => requestSort('type')} className="cursor-pointer hover:bg-muted/50 w-[180px]">
                Type <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('vendorOrCustomerName')} className="cursor-pointer hover:bg-muted/50">
                Name/Phone <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right w-[80px]">Items</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 w-[120px]" onClick={() => requestSort('totalAmount')} >
                Total <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedBills.length > 0 ? (
              filteredAndSortedBills.map((bill) => {
                const billDisplayInfo = getBillTypeIconAndColor(bill);
                const billDate = new Date(bill.date);
                return (
                <TableRow key={bill.id}>
                  <TableCell className="py-2 px-3 w-[150px]">
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-lg font-bold text-primary">{format(billDate, 'EEE')}</span>
                      <span className="text-xs text-muted-foreground">{format(billDate, 'MMM dd, yyyy')}</span>
                      <span className="text-xs text-muted-foreground">{format(billDate, 'p')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs py-3 px-4 w-[140px]">{bill.id}</TableCell>
                  <TableCell className="py-3 px-4 w-[180px]">
                    <Badge
                      className={cn("capitalize flex items-center gap-1.5 w-fit min-w-[100px] justify-center px-2.5 py-1 text-xs", billDisplayInfo.className)}
                    >
                      {React.cloneElement(billDisplayInfo.icon, {className: cn(billDisplayInfo.icon.props.className, "mr-1")})}
                      {billDisplayInfo.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                      <div>{bill.vendorOrCustomerName || <span className="text-muted-foreground">-</span>}</div>
                      {bill.customerPhone && <div className="text-xs text-muted-foreground">{bill.customerPhone}</div>}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 w-[80px]">{bill.items.length}</TableCell>
                  <TableCell className="text-right font-semibold text-primary py-3 px-4 w-[120px]">₹{bill.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right py-3 px-4 w-[80px]">
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
                        <DropdownMenuItem onClick={() => handlePrintBill(bill)}>
                          <Printer className="mr-2 h-4 w-4" /> Print Bill
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No bills found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

    