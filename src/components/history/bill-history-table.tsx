
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
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Printer, ArrowUpDown, ShoppingBag, Send, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import type { Bill } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      sortableBills = sortableBills.filter(bill =>
        bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.vendorOrCustomerName && bill.vendorOrCustomerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        bill.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        format(new Date(bill.date), 'PPpp').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (sortConfig !== null) {
        sortableBills.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'date') {
            valA = a.timestamp;
            valB = b.timestamp;
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
        sortableBills.sort((a,b) => b.timestamp - a.timestamp);
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

  const getBillTypeIcon = (type: Bill['type']) => {
    if (type === 'buy') return <ShoppingBag className="h-4 w-4 text-blue-500" />;
    if (type === 'sell') return <Send className="h-4 w-4 text-green-500" />;
    if (type === 'return') return <RotateCcw className="h-4 w-4 text-orange-500" />;
    return null;
  };

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
              <DialogTitle>Bill Details (ID: {selectedBill.id.substring(0,8)})</DialogTitle>
              <DialogDescription>
                {selectedBill.type.toUpperCase()} Bill dated {format(new Date(selectedBill.date), 'PPpp')}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] p-1 -mx-1">
            <div className="space-y-4 py-4">
              {selectedBill.vendorOrCustomerName && (
                <p><strong>{selectedBill.type === 'buy' ? 'Vendor' : 'Customer'}:</strong> {selectedBill.vendorOrCustomerName}</p>
              )}
              <Table>
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
                        {item.productName}
                        {selectedBill.type === 'return' && (
                          item.isDefective ? (
                            <Badge variant="destructive" className="ml-2">Defective</Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-2">Restocked</Badge>
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.costPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${item.sellPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${(item.quantity * (selectedBill.type === 'buy' ? item.costPrice : item.sellPrice)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right font-semibold text-lg mt-4">
                Total: ${selectedBill.totalAmount.toFixed(2)}
              </div>
              {selectedBill.type === 'buy' && calculatePotentialSellTotal(selectedBill) !== null && (
                <div className="text-right text-sm text-muted-foreground">
                    Potential Sell Value: ${calculatePotentialSellTotal(selectedBill)!.toFixed(2)}
                </div>
              )}
              {selectedBill.notes && (
                <div className="pt-2">
                    <p className="font-semibold text-sm">Notes:</p>
                    <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/30">{selectedBill.notes}</p>
                </div>
              )}
            </div>
            </ScrollArea>
            <DialogFooter>
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
          placeholder="Search bills (ID, Name, Type, Date)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Card className="shadow-md">
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
                Vendor/Customer <ArrowUpDown className="ml-2 h-3 w-3 inline" />
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
                  <TableCell className="font-mono text-xs">{bill.id.substring(0,8)}...</TableCell>
                  <TableCell>
                    <Badge variant={
                      bill.type === 'buy' ? 'default' : bill.type === 'sell' ? 'secondary' : 'outline'
                    } className="capitalize flex items-center gap-1 w-fit">
                      {getBillTypeIcon(bill.type)}
                      {bill.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{bill.vendorOrCustomerName || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-right">{bill.items.length}</TableCell>
                  <TableCell className="text-right font-semibold">${bill.totalAmount.toFixed(2)}</TableCell>
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
      </Card>
    </>
  );
}

    