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


type SortableColumns = 'date' | 'id' | 'vendorOrCustomerName' | 'storeName' | 'totalAmount';

export function ExpenseReportTable({ startDate, endDate }: { startDate?: Date, endDate?: Date }) {
  const { getExpenseBillsByDateRange, userProfile } = useInventoryStore(state => ({
    getExpenseBillsByDateRange: state.getExpenseBillsByDateRange,
    userProfile: state.userProfile
  }));
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : undefined;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumns; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  const expenseBills = useMemo(() => {
    return getExpenseBillsByDateRange(startDate, endDate, companyId);
  }, [startDate, endDate, companyId, getExpenseBillsByDateRange]);

  const currencySymbol = getCurrencySymbol(userProfile.companyCurrency);

  const filteredAndSortedBills = useMemo(() => {
    let processBills = [...expenseBills];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processBills = processBills.filter(bill =>
        bill.id.toLowerCase().includes(lowerSearchTerm) ||
        (bill.vendorOrCustomerName && bill.vendorOrCustomerName.toLowerCase().includes(lowerSearchTerm)) ||
        (bill.storeName && bill.storeName.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    processBills.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Bill];
        const valB = b[sortConfig.key as keyof Bill];
        let comparison = 0;

        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else if (a.date && b.date) {
            comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        }

        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
    });

    return processBills;
  }, [expenseBills, searchTerm, sortConfig]);

  const requestSort = (key: SortableColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const totalExpenses = useMemo(() => {
    return filteredAndSortedBills.reduce((acc, bill) => acc + bill.totalAmount, 0);
  }, [filteredAndSortedBills]);

  return (
    <Card className="shadow-lg border-t-2 border-t-destructive">
      <CardHeader>
        <CardTitle>Expense Report</CardTitle>
        <CardDescription>Detailed list of expense/purchase transactions for the selected period.</CardDescription>
        <Input
          placeholder="Search expense report..."
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
              <TableHead onClick={() => requestSort('vendorOrCustomerName')} className="cursor-pointer">Vendor <ArrowUpDown size={12} className="inline"/></TableHead>
              <TableHead onClick={() => requestSort('storeName')} className="cursor-pointer">Store <ArrowUpDown size={12} className="inline"/></TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedBills.map(bill => (
              <TableRow key={bill.id}>
                <TableCell className="text-xs">{format(new Date(bill.date), 'PP')}</TableCell>
                <TableCell className="font-mono text-xs">{bill.id}</TableCell>
                <TableCell>{bill.vendorOrCustomerName || '-'}</TableCell>
                <TableCell>{bill.storeName || '-'}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">{currencySymbol}{bill.totalAmount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted font-bold">
              <TableCell colSpan={4}>Total Expenses for Period</TableCell>
              <TableCell className="text-right text-destructive">{currencySymbol}{totalExpenses.toFixed(2)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}