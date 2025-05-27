
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
import { MoreHorizontal, Eye, Printer, ArrowUpDown, ShoppingBag, Send, RotateCcw, AlertTriangle, Users, Building as BuildingIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { Bill, ProductSKU, BillMode } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { DEFAULT_COMPANY_NAME, COMPANY_ADDRESS, COMPANY_CONTACT } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type SortableBillColumns = keyof Pick<Bill, 'date' | 'type' | 'totalAmount' | 'vendorOrCustomerName' | 'paymentStatus' | 'billedByStaffName' | 'storeName'>;
type BillFilterType = 'all' | BillMode;

interface BillHistoryTableProps {
  filterByStoreId?: string;
}

export function BillHistoryTable({ filterByStoreId }: BillHistoryTableProps) {
  const { bills, getProductById, userProfile } = useInventoryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableBillColumns; direction: 'ascending' | 'descending' } | null>(null);
  const [filterType, setFilterType] = useState<BillFilterType>('all');


  const filteredAndSortedBills = useMemo(() => {
    let processBills = [...bills];

    if (filterByStoreId) {
      processBills = processBills.filter(bill => bill.storeId === filterByStoreId);
    }

    if (filterType !== 'all') {
      processBills = processBills.filter(bill => bill.type === filterType);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processBills = processBills.filter(bill =>
        bill.id.toLowerCase().includes(lowerSearchTerm) ||
        (bill.vendorOrCustomerName && bill.vendorOrCustomerName.toLowerCase().includes(lowerSearchTerm)) ||
        (bill.customerPhone && bill.customerPhone.toLowerCase().includes(lowerSearchTerm)) ||
        getBillTypeName(bill).toLowerCase().includes(lowerSearchTerm) ||
        format(new Date(bill.date), 'PPpp').toLowerCase().includes(lowerSearchTerm) ||
        bill.totalAmount.toString().includes(lowerSearchTerm) ||
        (bill.paymentStatus && bill.paymentStatus.toLowerCase().includes(lowerSearchTerm)) ||
        bill.items.some(item => item.productName.toLowerCase().includes(lowerSearchTerm)) ||
        (bill.billedByStaffName && bill.billedByStaffName.toLowerCase().includes(lowerSearchTerm)) ||
        (bill.storeName && bill.storeName.toLowerCase().includes(lowerSearchTerm))
      );
    }

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
        
        if (valA === undefined || valA === null) comparison = -1;
        if (valB === undefined || valB === null) comparison = 1;


        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    } else {
        processBills.sort((a,b) => b.timestamp - a.timestamp); 
    }

    return processBills;
  }, [bills, searchTerm, sortConfig, filterType, filterByStoreId]);

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

    const printWindow = window.open('', '_blank', 'height=800,width=600');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print Bill</title>');
      
      const styles =
        "<style>\n" +
        "  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; line-height: 1.6; color: #333; font-size: 10pt; }\n" +
        "  @page { size: auto; margin: 0.5in; }\n" +
        "  .print-container { max-width: 750px; margin: auto; }\n" +
        "  .header, .bill-to, .bill-info, .items-section, .notes-section, .summary-section, .billed-by-section { margin-bottom: 15px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; page-break-inside: avoid; background-color: #fff; }\n" +
        "  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 25px; background-color: transparent; border-radius: 0; border-left: 0; border-right: 0; }\n" +
        "  .header h1 { margin: 0 0 5px 0; font-size: 18pt; font-weight: bold; color: #000; }\n" +
        "  .header p { margin: 2px 0; font-size: 9pt; color: #444; }\n" +
        "  h3, h4 { margin-top: 0; margin-bottom: 8px; font-size: 12pt; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #111; }\n" +
        "  h4 { font-size: 10pt; }\n" +
        "  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }\n" +
        "  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }\n" +
        "  th { background-color: #f7f7f7; font-weight: bold; color: #222; }\n" +
        "  .text-right { text-align: right; }\n" +
        "  .font-medium { font-weight: bold; }\n" +
        "  .text-muted-foreground { color: #555; font-size: 0.9em; }\n" +
        "  .badge { display: inline-block; padding: 0.25em 0.6em; font-size: 0.75em; font-weight: bold; line-height: 1; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.375rem; border: 1px solid transparent; }\n" +
        "  .badge-destructive { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; }\n" +
        "  .badge-success { color: #155724; background-color: #d4edda; border-color: #c3e6cb; }\n" +
        "  .badge-paid { color: #155724; background-color: #d4edda; border-color: #c3e6cb; } \n" +
        "  .badge-unpaid { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; } \n" +
        "  .total-row td { font-weight: bold; background-color: #f7f7f7; font-size: 10pt; }\n" +
        "  .items-section .variant-options { font-size: 0.8em; color: #555; margin-left: 10px; margin-top: 3px; display: block; font-style: italic; }\n" +
        "  .items-section .item-sub-detail { font-size: 0.85em; color: #444; margin-top: 2px; display: block; } \n" +
        "  .notes-content { white-space: pre-wrap; font-style: italic; background-color: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #eee; }\n" +
        "  .no-print { display: none !important; } \n" +
        "</style>\n";
      printWindow.document.write(styles);
      
      printWindow.document.write('</head><body>');
      printWindow.document.write('<div class="print-container">');

      printWindow.document.write('<div class="header">');
      printWindow.document.write(`<h1>${userProfile.companyName || DEFAULT_COMPANY_NAME}</h1>`);
      printWindow.document.write(`<p>${COMPANY_ADDRESS}</p>`);
      printWindow.document.write(`<p>${COMPANY_CONTACT}</p>`);
      printWindow.document.write('</div>');

      printWindow.document.write('<table style="width:100%; margin-bottom: 20px; border:0;"><tr><td style="width:50%; vertical-align:top; border:0;">');
      if (billToPrint.vendorOrCustomerName || billToPrint.customerPhone) {
        printWindow.document.write('<div class="bill-to">');
        printWindow.document.write(`<h4>${getPartyDetailsTitle(billToPrint.type)}</h4>`);
        if (billToPrint.vendorOrCustomerName) printWindow.document.write(`<p><strong>${getPartyNameLabel(billToPrint.type)}:</strong> ${billToPrint.vendorOrCustomerName}</p>`);
        if (billToPrint.customerPhone) printWindow.document.write(`<p><strong>Phone:</strong> ${billToPrint.customerPhone}</p>`);
        printWindow.document.write('</div>');
      }
      printWindow.document.write('</td><td style="width:50%; vertical-align:top; border:0;">');
      printWindow.document.write('<div class="bill-info text-right">');
      printWindow.document.write(`<h4>Bill Information</h4>`);
      printWindow.document.write(`<p><strong>Bill ID:</strong> ${billToPrint.id}</p>`);
      printWindow.document.write(`<p><strong>Date:</strong> ${format(new Date(billToPrint.date), 'PPpp')}</p>`);
      printWindow.document.write(`<p><strong>Type:</strong> ${getBillTypeName(billToPrint)}</p>`);
      if (billToPrint.paymentStatus && (billToPrint.type === 'sell' || billToPrint.type === 'buy')) {
         printWindow.document.write(`<p><strong>Payment:</strong> <span class="badge badge-${billToPrint.paymentStatus === 'paid' ? 'paid' : 'unpaid'}">${billToPrint.paymentStatus.charAt(0).toUpperCase() + billToPrint.paymentStatus.slice(1)}</span></p>`);
      }
      printWindow.document.write('</div>');
      printWindow.document.write('</td></tr></table>');

      if (billToPrint.billedByStaffName || billToPrint.storeName) {
        printWindow.document.write('<div class="billed-by-section">');
        printWindow.document.write(`<h4>Transaction Origin</h4>`);
        if (billToPrint.storeName) printWindow.document.write(`<p><strong>Store:</strong> ${billToPrint.storeName}</p>`);
        if (billToPrint.billedByStaffName) printWindow.document.write(`<p><strong>Billed by:</strong> ${billToPrint.billedByStaffName}</p>`);
        printWindow.document.write('</div>');
      }

      printWindow.document.write('<div class="items-section">');
      printWindow.document.write('<h3>Items</h3>');
      
      if (billToPrint.type === 'buy') { 
        printWindow.document.write('<table><thead><tr><th>#</th><th>Product Details</th><th>Qty Purchased</th><th>Cost/Unit</th><th>Item Total</th></tr></thead><tbody>');
        billToPrint.items.forEach((item, index) => {
            printWindow.document.write('<tr>');
            printWindow.document.write(`<td>${index + 1}</td>`);
            printWindow.document.write(`<td>${item.productName}`);
            if (item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
              printWindow.document.write('<span class="variant-options">');
              printWindow.document.write(Object.entries(item.selectedVariantOptions).map(([key, value]) => `${key}: ${value}`).join(', '));
              printWindow.document.write('</span>');
            }
             printWindow.document.write(`<div class="item-sub-detail">Sell Price set (this bill): ₹${item.sellPrice.toFixed(2)}</div>`);
            printWindow.document.write('</td>');
            printWindow.document.write(`<td class="text-right">${item.quantity}</td>`);
            printWindow.document.write(`<td class="text-right">₹${item.costPrice.toFixed(2)}</td>`);
            printWindow.document.write(`<td class="text-right font-medium">₹${(item.quantity * item.costPrice).toFixed(2)}</td>`);
            printWindow.document.write('</tr>');
        });
      } else if (billToPrint.type === 'sell') {
        printWindow.document.write('<table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Price/Unit</th><th>Item Total</th></tr></thead><tbody>');
        billToPrint.items.forEach((item, index) => {
            printWindow.document.write('<tr>');
            printWindow.document.write(`<td>${index + 1}</td>`);
            printWindow.document.write(`<td>${item.productName}`);
            if (item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
              printWindow.document.write('<span class="variant-options">');
              printWindow.document.write(Object.entries(item.selectedVariantOptions).map(([key, value]) => `${key}: ${value}`).join(', '));
              printWindow.document.write('</span>');
            }
            printWindow.document.write('</td>');
            printWindow.document.write(`<td class="text-right">${item.quantity}</td>`);
            printWindow.document.write(`<td class="text-right">₹${item.sellPrice.toFixed(2)}</td>`);
            printWindow.document.write(`<td class="text-right font-medium">₹${(item.quantity * item.sellPrice).toFixed(2)}</td>`);
            printWindow.document.write('</tr>');
        });
      } else { // Return bill
        printWindow.document.write('<table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Price/Unit</th><th>Item Total</th></tr></thead><tbody>');
        billToPrint.items.forEach((item, index) => {
            printWindow.document.write('<tr>');
            printWindow.document.write(`<td>${index + 1}</td>`);
            printWindow.document.write(`<td>${item.productName}`);
            if (item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0) {
              printWindow.document.write('<span class="variant-options">');
              printWindow.document.write(Object.entries(item.selectedVariantOptions).map(([key, value]) => `${key}: ${value}`).join(', '));
              printWindow.document.write('</span>');
            }
            if (item.isDefective) {
              printWindow.document.write(' <span class="badge badge-destructive">Defective</span>');
            } else {
              printWindow.document.write(' <span class="badge badge-success">Restocked</span>');
            }
            printWindow.document.write('</td>');
            printWindow.document.write(`<td class="text-right">${item.quantity}</td>`);
            printWindow.document.write(`<td class="text-right">₹${item.sellPrice.toFixed(2)}</td>`);
            printWindow.document.write(`<td class="text-right font-medium">₹${(item.quantity * item.sellPrice).toFixed(2)}</td>`);
            printWindow.document.write('</tr>');
        });
      }
      printWindow.document.write('</tbody></table>');
      printWindow.document.write('</div>');


      if (billToPrint.notes) {
        printWindow.document.write('<div class="notes-section">');
        printWindow.document.write('<h4>Notes</h4>');
        printWindow.document.write(`<p class="notes-content">${billToPrint.notes}</p>`);
        printWindow.document.write('</div>');
      }

      printWindow.document.write('<div class="summary-section">');
      printWindow.document.write('<h4>Summary</h4>');
      printWindow.document.write(`<table style="width: auto; margin-left: auto; border: none;">`); 
      
      if (billToPrint.type === 'buy') {
        printWindow.document.write(`<tr class="total-row"><td style="text-align:right; border: none; color: #b91c1c;"><strong>Total Cost (This Expense Bill):</strong></td><td class="text-right" style="border: none; color: #b91c1c;"><strong>₹${billToPrint.totalAmount.toFixed(2)}</strong></td></tr>`);
        const expectedRevenue = calculatePotentialRevenue(billToPrint);
        const expectedProfitOrLoss = expectedRevenue - billToPrint.totalAmount;
        const profitLossColor = expectedProfitOrLoss >= 0 ? '#166534' : '#b91c1c'; // Darker green/red for print
        printWindow.document.write(`<tr><td style="text-align:right; border: none;">Expected Revenue (from items in this bill):</td><td class="text-right" style="border: none;">₹${expectedRevenue.toFixed(2)}</td></tr>`);
        printWindow.document.write(`<tr><td style="text-align:right; border: none;">Expected Profit/(Loss) (from items in this bill):</td><td class="text-right" style="color:${profitLossColor}; border: none; font-weight: bold;">₹${expectedProfitOrLoss.toFixed(2)}</td></tr>`);
      } else if (billToPrint.type === 'sell') {
        printWindow.document.write(`<tr class="total-row"><td style="text-align:right; border: none; color: #166534;"><strong>Total Sales Amount:</strong></td><td class="text-right" style="border: none; color: #166534;"><strong>₹${billToPrint.totalAmount.toFixed(2)}</strong></td></tr>`);
      } else { 
         printWindow.document.write(`<tr class="total-row"><td style="text-align:right; border: none; color: #b45309;"><strong>Total Return Value:</strong></td><td class="text-right" style="border: none; color: #b45309;"><strong>₹${billToPrint.totalAmount.toFixed(2)}</strong></td></tr>`);
      }
      printWindow.document.write('</table>');
      printWindow.document.write('</div>');


      printWindow.document.write('</div>'); 
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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


  const calculatePotentialRevenue = (bill: Bill): number => {
    if (!bill || !bill.items) return 0;
    return bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
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

  const findProductSKU = (productId: string, selectedOptions?: Record<string, string>): ProductSKU | undefined => {
    const product = getProductById(productId);
    if (!product) return undefined;
    if (productId.startsWith('SERVICE_ITEM_')) return undefined;

    const targetOptionValues = selectedOptions || {};
    return product.productSKUs.find(sku => 
      JSON.stringify(Object.entries(sku.optionValues).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string,string>)) === 
      JSON.stringify(Object.entries(targetOptionValues).sort().reduce((r, [k, v]) => (r[k] = v, r), {} as Record<string,string>))
    );
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
                  <h3 className="text-lg font-semibold text-primary mb-2">{userProfile.companyName || DEFAULT_COMPANY_NAME}</h3>
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
                    {selectedBill.paymentStatus && (selectedBill.type === 'sell' || selectedBill.type === 'buy') && (
                        <div>
                            <p className="text-xs text-muted-foreground">Payment Status</p>
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


              <div className="p-4 border rounded-md bg-card shadow-sm">
                <h4 className="text-md font-semibold text-foreground mb-3">Items</h4>
                <Table className="mt-0">
                 {selectedBill.type === 'buy' ? ( 
                    <>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Details</TableHead>
                          <TableHead className="text-right">Qty Purchased</TableHead>
                          <TableHead className="text-right">Cost/Unit</TableHead>
                          <TableHead className="text-right">Item Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBill.items.map(item => {
                            return (
                            <TableRow key={item.id || item.productId}>
                                <TableCell className="py-3 align-top">
                                <div>{item.productName}</div>
                                {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                    {Object.entries(item.selectedVariantOptions)
                                        .map(([key, value]) => `${key}: ${value}`)
                                        .join('; ')}
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                    Sell Price set (this bill): ₹{item.sellPrice.toFixed(2)}
                                </div>
                                {/* Removed SKU stock from here */}
                                </TableCell>
                                <TableCell className="text-right py-3 align-top">{item.quantity}</TableCell>
                                <TableCell className="text-right py-3 align-top">₹{item.costPrice.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium py-3 align-top">₹{(item.quantity * item.costPrice).toFixed(2)}</TableCell>
                            </TableRow>
                            );
                        })}
                      </TableBody>
                    </>
                  ) : selectedBill.type === 'sell' ? ( 
                    <>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price/Unit</TableHead>
                          <TableHead className="text-right">Item Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBill.items.map(item => (
                          <TableRow key={item.id || item.productId}>
                            <TableCell className="py-3 align-top">
                              <div>{item.productName}</div>
                              {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {Object.entries(item.selectedVariantOptions)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join('; ')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-3 align-top">{item.quantity}</TableCell>
                            <TableCell className="text-right py-3 align-top">₹{item.sellPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium py-3 align-top">₹{(item.quantity * item.sellPrice).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </>
                  ) : ( // Return Bill
                    <>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price/Unit</TableHead> {/* Removed Cost/Unit for Return */}
                          <TableHead className="text-right">Item Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBill.items.map(item => (
                          <TableRow key={item.id || item.productId}>
                            <TableCell className="py-3 align-top">
                              <div>{item.productName}</div>
                              {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {Object.entries(item.selectedVariantOptions)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join('; ')}
                                </div>
                              )}
                              {item.isDefective ? (
                                <Badge variant="destructive" className="text-xs mt-1">Defective</Badge>
                              ) : (
                                <Badge className="text-xs mt-1 bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-200/80 dark:hover:bg-green-700/30">Restocked</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-3 align-top">{item.quantity}</TableCell>
                            <TableCell className="text-right py-3 align-top">₹{item.sellPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium py-3 align-top">₹{(item.quantity * item.sellPrice).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </>
                  )}
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
                <div className="space-y-1 text-sm">
                    {selectedBill.type === 'buy' ? ( 
                        <>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Cost (This Expense Bill):</span>
                                <span className="font-semibold text-destructive">₹{selectedBill.totalAmount.toFixed(2)}</span>
                            </div>
                            {(() => {
                                const expectedRevenue = calculatePotentialRevenue(selectedBill);
                                const expectedProfitOrLoss = expectedRevenue - selectedBill.totalAmount;
                                return (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Expected Revenue (from items in this bill):</span>
                                        <span className="font-semibold">₹{expectedRevenue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Expected Profit/(Loss) (from items in this bill):</span>
                                        <span className={cn("font-semibold", expectedProfitOrLoss >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500')}>
                                            ₹{expectedProfitOrLoss.toFixed(2)}
                                        </span>
                                    </div>
                                </>
                                );
                            })()}
                        </>
                    ) : selectedBill.type === 'sell' ? ( 
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Sales Amount:</span>
                            <span className="font-semibold text-primary">₹{selectedBill.totalAmount.toFixed(2)}</span>
                        </div>
                    ) : ( 
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Return Value:</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-500">₹{selectedBill.totalAmount.toFixed(2)}</span>
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
          placeholder="Search bills (ID, Name, Phone, Type, Date, Amount, Payment Status, Product, Staff, Store)..."
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
              <TableHead className="w-[150px] py-3 px-4">
                Date / Time
              </TableHead>
              <TableHead className="w-[140px] py-3 px-4">ID</TableHead>
              <TableHead onClick={() => requestSort('type')} className="cursor-pointer hover:bg-muted/50 w-[120px] py-3 px-4">
                Type <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
               <TableHead onClick={() => requestSort('billedByStaffName')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Billed By <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('storeName')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Store <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('vendorOrCustomerName')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Name/Phone <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right w-[80px] py-3 px-4">Items</TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-muted/50 w-[120px] py-3 px-4" onClick={() => requestSort('totalAmount')} >
                Total <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
               <TableHead className="text-center cursor-pointer hover:bg-muted/50 w-[120px] py-3 px-4" onClick={() => requestSort('paymentStatus')}>
                Payment <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right w-[80px] py-3 px-4">Actions</TableHead>
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
                      <span className="text-lg font-bold text-primary">{format(billDate, 'EEE').toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground">{format(billDate, 'MMM dd, yyyy')}</span>
                      <span className="text-xs text-muted-foreground">{format(billDate, 'p')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs py-3 px-4 w-[140px]">{bill.id}</TableCell>
                  <TableCell className="py-3 px-4 w-[120px]">
                    <Badge
                      className={cn(
                        "capitalize flex items-center gap-1.5 w-fit min-w-[100px] justify-center px-2.5 py-1 text-xs", 
                        billDisplayInfo.className
                      )}
                    >
                      {React.cloneElement(billDisplayInfo.icon, {className: cn(billDisplayInfo.icon.props.className, "mr-1")})}
                      {billDisplayInfo.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    {bill.billedByStaffName ? (
                        <div className="text-sm flex items-center gap-1">
                            <Users size={14} className="text-muted-foreground shrink-0" />
                            {bill.billedByStaffName}
                        </div>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="py-3 px-4">
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
                  <TableCell className="text-right py-3 px-4 w-[80px]">{bill.items.length}</TableCell>
                  <TableCell className="text-right font-semibold text-primary py-3 px-4 w-[120px]">₹{bill.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-center py-3 px-4 w-[120px]">
                    {(bill.type === 'sell' || bill.type === 'buy') && bill.paymentStatus ? (
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
                <TableCell colSpan={10} className="h-24 text-center">
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
