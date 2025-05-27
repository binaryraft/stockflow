
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
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Printer, ArrowUpDown, ShoppingBag, Send, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { Bill } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type SortableBillColumns = keyof Pick<Bill, 'date' | 'type' | 'totalAmount' | 'vendorOrCustomerName'>;


export function BillHistoryTable() {
  const { bills } = useInventoryStore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableBillColumns; direction: 'ascending' | 'descending' } | null>(null);


  const filteredAndSortedBills = useMemo(() => {
    let sortableBills = [...bills];
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      sortableBills = sortableBills.filter(bill =>
        bill.id.toLowerCase().includes(lowerSearchTerm) ||
        (bill.vendorOrCustomerName && bill.vendorOrCustomerName.toLowerCase().includes(lowerSearchTerm)) ||
        (bill.customerPhone && bill.customerPhone.toLowerCase().includes(lowerSearchTerm)) ||
        getBillTypeName(bill).toLowerCase().includes(lowerSearchTerm) || 
        format(new Date(bill.date), 'PPpp').toLowerCase().includes(lowerSearchTerm) ||
        bill.totalAmount.toString().includes(lowerSearchTerm) ||
        bill.items.some(item => item.productName.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    if (sortConfig !== null) {
        sortableBills.sort((a, b) => {
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
        sortableBills.sort((a,b) => b.timestamp - a.timestamp); // Default sort: newest first
    }

    return sortableBills;
  }, [bills, searchTerm, sortConfig]);

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

  const handlePrintBill = (billId: string) => {
    toast({ title: "Print Bill", description: `Printing bill ${billId}. (Not implemented)` });
  };

  const getBillTypeIcon = (bill: Bill) => {
    if (bill.type === 'buy') return <ShoppingBag className="h-4 w-4 text-destructive-foreground" />; 
    if (bill.type === 'sell') return <Send className="h-4 w-4 text-primary-foreground" />; 
    if (bill.type === 'return') {
      if (bill.items.some(item => item.isDefective === true)) {
        return <AlertTriangle className="h-4 w-4 text-destructive" />; 
      }
      return <RotateCcw className="h-4 w-4 text-amber-900 dark:text-amber-950" />; 
    }
    return null;
  };
  
  const getBillTypeBadgeClassName = (bill: Bill): string => {
    if (bill.type === 'buy') return 'bg-destructive text-destructive-foreground hover:bg-destructive/90'; 
    if (bill.type === 'sell') return 'bg-primary text-primary-foreground hover:bg-primary/90'; 
    if (bill.type === 'return') return 'bg-amber-400 text-amber-900 hover:bg-amber-500 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-600';
    return 'bg-muted text-muted-foreground';
  };

  const getBillTypeName = (bill: Bill): string => {
    if (bill.type === 'buy') return 'Expense';
    if (bill.type === 'sell') return 'Sales';
    if (bill.type === 'return') {
      if (bill.items.some(item => item.isDefective === true)) {
        return 'Return (Defective)';
      }
      return 'Return';
    }
    return bill.type;
  }


  const calculatePotentialSellTotal = (bill: Bill): number | null => {
    if (bill.type !== 'buy') return null;
    return bill.items.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  };

  return (
    <>
      {selectedBill && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh]">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="flex items-center gap-2">
                {getBillTypeIcon(selectedBill)}
                Bill Details (ID: {selectedBill.id})
              </DialogTitle>
              <DialogDescription>
                {getBillTypeName(selectedBill)} Bill dated {format(new Date(selectedBill.date), 'PPpp')}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 -mx-1">
            <div className="space-y-6 py-2 px-2">
              
              {(selectedBill.vendorOrCustomerName || selectedBill.customerPhone) && (
                <div className="p-4 border rounded-md bg-card">
                  <h4 className="text-sm font-semibold text-primary mb-2">
                    {selectedBill.type === 'buy' ? 'Vendor Details' : 'Customer Details'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {selectedBill.vendorOrCustomerName && (
                      <div>
                          <p className="text-xs text-muted-foreground">{selectedBill.type === 'buy' ? 'Vendor Name' : 'Customer Name'}</p>
                          <p className="font-medium">{selectedBill.vendorOrCustomerName}</p>
                      </div>
                    )}
                    {selectedBill.customerPhone && (
                      <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedBill.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2 ml-1">Items</h4>
                <Table className="mt-0 border rounded-md">
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
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>{item.productName}</div>
                          {item.selectedVariantOptions && Object.keys(item.selectedVariantOptions).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {Object.entries(item.selectedVariantOptions)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                            </div>
                          )}
                          {selectedBill.type === 'return' && (
                            item.isDefective ? (
                              <Badge variant="destructive" className="text-xs mt-1">Defective</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs mt-1 bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-200/80 dark:hover:bg-green-700/30">Restocked</Badge>
                            )
                          )}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.costPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{item.sellPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">₹{(item.quantity * (selectedBill.type === 'buy' ? item.costPrice : item.sellPrice)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
             
              {selectedBill.notes && (
                <div className="p-4 border rounded-md bg-tertiary">
                    <h4 className="text-sm font-semibold text-primary mb-1">Notes:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedBill.notes}
                    </p>
                </div>
              )}

              <div className="p-4 border rounded-md bg-card">
                <h4 className="text-sm font-semibold text-primary mb-2">Summary</h4>
                <div className="space-y-1">
                    <div className="flex justify-between text-lg font-semibold text-foreground">
                        <span>Total Amount:</span>
                        <span>₹{selectedBill.totalAmount.toFixed(2)}</span>
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
              <Button variant="outline" onClick={() => handlePrintBill(selectedBill.id)}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <DialogClose asChild>
                <Button type="button">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="mb-4">
        <Input
          placeholder="Search bills (ID, Name, Phone, Type, Date, Amount, Product)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      <Card className="shadow-lg border-t-2 border-t-primary">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:bg-muted/50">
                  Date <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead onClick={() => requestSort('type')} className="cursor-pointer hover:bg-muted/50">
                  Type <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                </TableHead>
                <TableHead onClick={() => requestSort('vendorOrCustomerName')} className="cursor-pointer hover:bg-muted/50">
                  Name/Phone <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => requestSort('totalAmount')} >
                  Total Amount <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedBills.length > 0 ? (
                filteredAndSortedBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{format(new Date(bill.date), 'PPp')}</TableCell>
                    <TableCell className="font-mono text-xs">{bill.id}</TableCell>
                    <TableCell>
                      <Badge 
                        className={cn("capitalize flex items-center gap-1.5 w-fit min-w-[100px] justify-center px-2.5 py-1 text-xs", getBillTypeBadgeClassName(bill))}
                      >
                        {getBillTypeIcon(bill)}
                        {getBillTypeName(bill)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        {bill.vendorOrCustomerName || <span className="text-muted-foreground">-</span>}
                        {bill.customerPhone && <div className="text-xs text-muted-foreground">{bill.customerPhone}</div>}
                    </TableCell>
                    <TableCell className="text-right">{bill.items.length}</TableCell>
                    <TableCell className="text-right font-semibold">₹{bill.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
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
                          <DropdownMenuItem onClick={() => handlePrintBill(bill.id)}>
                            <Printer className="mr-2 h-4 w-4" /> Print Bill
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No bills found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
