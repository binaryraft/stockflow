
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit3, Trash2, PlusCircle, ArrowUpDown } from 'lucide-react';
import type { Staff } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { StaffFormDialog } from './staff-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type SortableStaffColumns = keyof Pick<Staff, 'name' | 'email' | 'phone'>;

export function StaffTable() {
  const { staffs, deleteStaff, getAllStores } = useInventoryStore();
  const { toast } = useToast();
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableStaffColumns; direction: 'ascending' | 'descending' } | null>(null);

  const stores = getAllStores(); // Get all stores for the form dialog

  const filteredAndSortedStaff = useMemo(() => {
    let sortableStaff = [...staffs];
    if (searchTerm) {
      sortableStaff = sortableStaff.filter(staff =>
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      sortableStaff.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return sortableStaff;
  }, [staffs, searchTerm, sortConfig]);

  const requestSort = (key: SortableStaffColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenEditDialog = (staff: Staff) => {
    setEditingStaff(staff); 
    setIsFormDialogOpen(true); 
  };

  const handleDeleteStaff = (staffId: string, staffName: string) => {
    deleteStaff(staffId);
    toast({ title: "Staff Deleted", description: `${staffName} has been removed.` });
  };

  const onFormDialogSubmit = () => { 
    setIsFormDialogOpen(false);
    setEditingStaff(null); 
  };

  return (
    <>
      <StaffFormDialog 
        isOpen={isFormDialogOpen} 
        onOpenChange={(open) => {
          if (!open) setEditingStaff(null); 
          setIsFormDialogOpen(open);
        }}
        editingStaff={editingStaff} 
        onFormSubmit={onFormDialogSubmit}
        allStores={stores}
      />
      <div className="flex items-center justify-between mb-4 gap-2">
        <Input
          placeholder="Search staff (name, email, phone)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => { setEditingStaff(null); setIsFormDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </div>
      <div className="border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">
                Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('email')} className="cursor-pointer hover:bg-muted/50">
                Email <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('phone')} className="cursor-pointer hover:bg-muted/50">
                Phone <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead>Accessible Stores</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedStaff.length > 0 ? (
              filteredAndSortedStaff.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium py-3 px-4">{staff.name}</TableCell>
                  <TableCell className="py-3 px-4">{staff.email}</TableCell>
                  <TableCell className="py-3 px-4">{staff.phone}</TableCell>
                  <TableCell className="py-3 px-4">
                    {staff.accessibleStoreIds.length > 0 
                      ? staff.accessibleStoreIds.map(storeId => stores.find(s => s.id === storeId)?.name || 'Unknown Store').join(', ')
                      : <span className="text-muted-foreground">All Stores</span> 
                    }
                  </TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenEditDialog(staff)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the staff member "{staff.name}".
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStaff(staff.id, staff.name)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No staff found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
