"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { format } from 'date-fns';
import { getCurrencySymbol } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpDown } from 'lucide-react';
import type { Bill } from '@/types';


type SortableColumns = 'date' | 'id' | 'vendorOrCustomerName' | 'storeName' | 'totalAmount' | 'profit';

export function SalesReportTable({ startDate, endDate }: { startDate?: Date, endDate?: Date }) {
  const { getSalesBillsByDateRange, userProfile } = useInventoryStore(state => ({
    getSalesBillsByDateRange: state.getSalesBillsByDateRange,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  const salesBills = useMemo(() => {
    return getSalesBillsByDateRange(startDate, endDate, companyId);
  }, [startDate, endDate, companyId, getSalesBillsByDateRange]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const filteredAndSortedBills = useMemo(() => {
    let processBills = salesBills.map(bill => {
      const cogs = bill.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
      const revenue = bill.subTotal || bill.totalAmount;
      const profit = revenue - cogs;
      return { ...bill, profit };
    });

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processBills = processBills.filter(bill =>
        bill.id.toLowerCase().includes(lowerSearchTerm) ||
        (bill.vendorOrCustomerName && bill.vendorOrCustomerName.toLowerCase().includes(lowerSearchTerm)) ||
        (bill.storeName && bill.storeName.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    processBills.sort((a, b) => {
        const valA = a[sortConfig.key as keyof typeof a];
        const valB = b[sortConfig.key as keyof typeof b];
        let comparison = 0;

        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else if (valA instanceof Date && valB instanceof Date) {
            comparison = valA.getTime() - valB.getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (a.date && b.date) { // Default to date if key not found
             comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        }

        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
    });

    return processBills;
  }, [salesBills, searchTerm, sortConfig]);

  const requestSort = (key: SortableColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const totals = useMemo(() => {
    return filteredAndSortedBills.reduce((acc, bill) => {
      acc.revenue += bill.subTotal || bill.totalAmount;
      acc.tax += (bill.totalSGST || 0) + (bill.totalCGST || 0);
      acc.total += bill.totalAmount;
      acc.profit += bill.profit;
      return acc;
    }, { revenue: 0, tax: 0, total: 0, profit: 0 });
  }, [filteredAndSortedBills]);

  return (
    <Card className="shadow-lg border-t-2 border-t-primary">
      <CardHeader>
        <CardTitle>Sales Report</CardTitle>
        <CardDescription>Detailed list of sales transactions for the selected period.</CardDescription>
        <Input
          placeholder="Search sales report..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('date')} className="cursor-pointer">Date <ArrowUpDown size={12} className="inline"/></TableHead>
              <TableHead onClick={() => requestSort('id')} className="cursor-pointer">Bill ID <ArrowUpDown size={12} className="inline"/></TableHead>
              <TableHead onClick={() => requestSort('vendorOrCustomerName')} className="cursor-pointer">Customer <ArrowUpDown size={12} className="inline"/></TableHead>
              <TableHead onClick={() => requestSort('storeName')} className="cursor-pointer">Store <ArrowUpDown size={12} className="inline"/></TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead onClick={() => requestSort('totalAmount')} className="cursor-pointer text-right">Total <ArrowUpDown size={12} className="inline"/></TableHead>
              <TableHead onClick={() => requestSort('profit')} className="cursor-pointer text-right">Gross Profit <ArrowUpDown size={12} className="inline"/></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedBills.map(bill => (
              <TableRow key={bill.id}>
                <TableCell className="text-xs">{format(new Date(bill.date), 'PP')}</TableCell>
                <TableCell className="font-mono text-xs">{bill.id}</TableCell>
                <TableCell>{bill.vendorOrCustomerName || '-'}</TableCell>
                <TableCell>{bill.storeName || '-'}</TableCell>
                <TableCell className="text-right">{currencySymbol}{(bill.subTotal || bill.totalAmount).toFixed(2)}</TableCell>
                <TableCell className="text-right">{currencySymbol}{((bill.totalSGST || 0) + (bill.totalCGST || 0)).toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold">{currencySymbol}{bill.totalAmount.toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{currencySymbol}{bill.profit.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted font-bold">
              <TableCell colSpan={4}>Totals for Period</TableCell>
              <TableCell className="text-right">{currencySymbol}{totals.revenue.toFixed(2)}</TableCell>
              <TableCell className="text-right">{currencySymbol}{totals.tax.toFixed(2)}</TableCell>
              <TableCell className="text-right">{currencySymbol}{totals.total.toFixed(2)}</TableCell>
              <TableCell className="text-right text-primary">{currencySymbol}{totals.profit.toFixed(2)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}