
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
    if (bill.type === 'buy') return <ShoppingBag className="h-4 w-4 text-red-500" />; // Expense
    if (bill.type === 'sell') return <Send className="h-4 w-4 text-green-500" />; // Sales
    if (bill.type === 'return') {
      if (bill.items.some(item => item.isDefective === true)) {
        return <AlertTriangle className="h-4 w-4 text-red-500" />; // Defective Return (Red icon for Alert)
      }
      return <RotateCcw className="h-4 w-4 text-yellow-600" />; // Normal Return (Darker Yellow for contrast on yellow badge)
    }
    return null;
  };
  
  const getBillTypeBadgeVariant = (bill: Bill): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    if (bill.type === 'buy') return 'destructive'; // Expense (Red)
    if (bill.type === 'sell') return 'default'; // Sales (Primary, often green or blueish in themes)
    if (bill.type === 'return') return 'secondary'; // Return (Yellow - using secondary as base, color classes will override)
    return 'outline';
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
            <DialogHeader>
              <DialogTitle>Bill Details (ID: {selectedBill.id})</DialogTitle>
              <DialogDescription>
                {getBillTypeName(selectedBill)} Bill dated {format(new Date(selectedBill.date), 'PPpp')}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 -mx-1">
            <div className="space-y-4 py-4 px-2">
              <div className="grid grid-cols-2 gap-4 mb-3">
                {selectedBill.vendorOrCustomerName && (
                  <div>
                      <p className="text-sm text-muted-foreground">{selectedBill.type === 'buy' ? 'Vendor' : 'Customer'}</p>
                      <p className="font-medium">{selectedBill.vendorOrCustomerName}</p>
                  </div>
                )}
                {selectedBill.customerPhone && (
                  <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedBill.customerPhone}</p>
                  </div>
                )}
              </div>
              <Separator />
              <Table className="mt-2">
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
                            <Badge variant="destructive" className="ml-2 text-xs mt-1">Defective</Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2 text-xs mt-1 bg-green-100 text-green-700">Restocked</Badge>
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
              <Separator className="my-3"/>
              <div className="text-right font-semibold text-lg">
                Total: ₹{selectedBill.totalAmount.toFixed(2)}
              </div>
              {selectedBill.type === 'buy' && calculatePotentialSellTotal(selectedBill) !== null && (
                <div className="text-right text-sm text-muted-foreground mt-1">
                    Potential Sell Value: ₹{calculatePotentialSellTotal(selectedBill)!.toFixed(2)}
                </div>
              )}
              {selectedBill.notes && (
                <div className="pt-3 mt-2 border-t">
                    <p className="font-semibold text-sm mb-1">Notes:</p>
                    <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30 whitespace-pre-wrap">
                        {selectedBill.notes}
                    </p>
                </div>
              )}
            </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
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
      <Card className="shadow-lg">
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
                        variant={getBillTypeBadgeVariant(bill)} 
                        className={`capitalize flex items-center gap-1 w-fit min-w-[80px] justify-center ${
                          bill.type === 'sell' ? 'bg-green-600 hover:bg-green-700 text-white' : 
                          bill.type === 'buy' ? 'bg-red-600 hover:bg-red-700 text-white' : 
                          bill.type === 'return' ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900' : '' // Darker text for yellow
                        }`}
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
