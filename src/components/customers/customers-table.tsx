
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit3, Trash2, Eye, ArrowUpDown, User } from 'lucide-react';
import type { Customer } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link'; // Import Link
import { Badge } from '@/components/ui/badge';

type SortableCustomerColumns = keyof Pick<Customer, 'name' | 'phone' | 'email' | 'firstSeen' | 'lastSeen'>;

export function CustomersTable() {
  const { customers: allCustomers, companyId } = useInventoryStore((state) => ({
    customers: state.getAllCustomers(localStorage.getItem('companyId') || undefined),
    companyId: localStorage.getItem('companyId'),
  }));
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableCustomerColumns; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

  const filteredAndSortedCustomers = useMemo(() => {
    let sortableCustomers = [...allCustomers];
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      sortableCustomers = sortableCustomers.filter(customer =>
        (customer.name && customer.name.toLowerCase().includes(lowerSearchTerm)) ||
        (customer.phone && customer.phone.toLowerCase().includes(lowerSearchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (sortConfig !== null) {
      sortableCustomers.sort((a, b) => {
        const valA = a[sortConfig.key] || ''; // Default to empty string for undefined values
        const valB = b[sortConfig.key] || ''; // Default to empty string for undefined values
        
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          if (sortConfig.key === 'firstSeen' || sortConfig.key === 'lastSeen') {
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
          } else {
            comparison = valA.localeCompare(valB);
          }
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    } else {
        // Default sort by lastSeen descending, then name ascending
        sortableCustomers.sort((a, b) => {
            const lastSeenComp = new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
            if (lastSeenComp !== 0) return lastSeenComp;
            return (a.name || '').localeCompare(b.name || '');
        });
    }
    return sortableCustomers;
  }, [allCustomers, searchTerm, sortConfig]);

  const requestSort = (key: SortableCustomerColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Placeholder for future actions
  const handleEditCustomer = (customerId: string) => {
    toast({ title: "Edit Customer", description: `Editing for customer ${customerId} coming soon.` });
  };
  const handleDeleteCustomer = (customerId: string, customerName?: string) => {
    toast({ title: "Delete Customer", description: `Deletion for ${customerName || customerId} coming soon.` });
  };


  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-2">
        <Input
          placeholder="Search customers (name, phone, email)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {/* Add Customer button will be here later */}
      </div>
      <div className="border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">Icon</TableHead>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('phone')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Phone <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('email')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden md:table-cell">
                Email <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('firstSeen')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden sm:table-cell">
                First Seen <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('lastSeen')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden sm:table-cell">
                Last Seen <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right py-3 px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCustomers.length > 0 ? (
              filteredAndSortedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="py-3 px-4 text-center">
                    <User className="h-5 w-5 text-muted-foreground mx-auto" />
                  </TableCell>
                  <TableCell className="font-medium py-3 px-4">{customer.name || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                  <TableCell className="py-3 px-4">{customer.phone || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                  <TableCell className="py-3 px-4 hidden md:table-cell">{customer.email || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                  <TableCell className="py-3 px-4 hidden sm:table-cell text-xs">{format(new Date(customer.firstSeen), 'PP')}</TableCell>
                  <TableCell className="py-3 px-4 hidden sm:table-cell text-xs">{format(new Date(customer.lastSeen), 'PP')}</TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/customers/${customer.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleEditCustomer(customer.id)} disabled>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit (Soon)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete (Soon)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
