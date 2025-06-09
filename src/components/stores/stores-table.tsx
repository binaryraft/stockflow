
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
import { MoreHorizontal, Edit3, Trash2, PlusCircle, ArrowUpDown, LogIn } from 'lucide-react';
import type { Store, Staff } from '@/types'; // Added Staff
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { StoreFormDialog } from './store-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { getAllStoresToServer } from '@/api/storeHandler';

type SortableStoreColumns = keyof Pick<Store, 'name' | 'location' | 'email' | 'phone'>;

export function StoresTable() {
  const { stores, deleteStore, getAllStaff, getActiveSubscriptionPlan, getStaffDetailsByIds } = useInventoryStore();
  const { toast } = useToast();


  useEffect(() => {
    const fetchStores = async () => {
      try {
        const stores =await getAllStoresToServer();
        console.log('Stores ', stores)
      } catch (err) {
        console.error('Failed to fetch stores:', err);
      }
    };
    fetchStores();
  }, []);

  

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableStoreColumns; direction: 'ascending' | 'descending' } | null>(null);

  const staffMembers = getAllStaff();
  const activePlan = getActiveSubscriptionPlan();
  const userCanAddStore = activePlan ? stores.length < activePlan.maxStores : false;
  const isAdminOnlyPlan = activePlan?.id === SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY;

  const filteredAndSortedStores = useMemo(() => {
    let sortableStores = [...stores];
    if (searchTerm) {
      sortableStores = sortableStores.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.phone.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig !== null) {
      sortableStores.sort((a, b) => {
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
    return sortableStores;
  }, [stores, searchTerm, sortConfig]);

  const requestSort = (key: SortableStoreColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenEditDialog = (store: Store) => {
    if (isAdminOnlyPlan) {
      toast({variant: "destructive", title: "Feature Locked", description: "Store management is not available on the Basic Admin plan. Please upgrade."});
      return;
    }
    setEditingStore(store);
    setIsFormDialogOpen(true);
  };

  const handleDeleteStore = (storeId: string, storeName: string) => {
     if (isAdminOnlyPlan) {
      toast({variant: "destructive", title: "Feature Locked", description: "Store management is not available on the Basic Admin plan. Please upgrade."});
      return;
    }
    deleteStore(storeId);
    toast({ title: "Store Deleted", description: `${storeName} has been removed.` });
  };

  const onFormDialogSubmit = () => {
    setIsFormDialogOpen(false);
    setEditingStore(null);
  };

  const addStoreButtonTooltipContent = isAdminOnlyPlan
    ? "Store management is not available on the Basic Admin plan. Please upgrade."
    : !userCanAddStore
    ? `You have reached the maximum of ${activePlan?.maxStores} stores for your current plan. Please upgrade.`
    : "Add New Store";

  return (
    <TooltipProvider>
      <StoreFormDialog
        isOpen={isFormDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingStore(null);
          setIsFormDialogOpen(open);
        }}
        editingStore={editingStore}
        onFormSubmit={onFormDialogSubmit}
        allStaff={staffMembers}
      />
      <div className="flex items-center justify-between mb-4 gap-2">
        <Input
          placeholder="Search stores (name, location, email, phone)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-block">
              <Button
                onClick={() => {
                  if (isAdminOnlyPlan) {
                    toast({variant: "destructive", title: "Feature Locked", description: "Store management is not available on the Basic Admin plan. Please upgrade."});
                    return;
                  }
                  if (!userCanAddStore) {
                     toast({variant: "destructive", title: "Limit Reached", description: `Cannot add more stores. Max ${activePlan?.maxStores} allowed on current plan.`});
                    return;
                  }
                  setEditingStore(null);
                  setIsFormDialogOpen(true);
                }}
                disabled={!userCanAddStore || isAdminOnlyPlan}
                aria-disabled={!userCanAddStore || isAdminOnlyPlan}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Store
              </Button>
            </div>
          </TooltipTrigger>
          {(!userCanAddStore || isAdminOnlyPlan) && (
            <TooltipContent side="bottom" align="end">
              <p>{addStoreButtonTooltipContent}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
      <div className="border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('location')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Location <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('email')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Email <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('phone')} className="cursor-pointer hover:bg-muted/50 py-3 px-4">
                Phone <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="py-3 px-4">Allowed Staff</TableHead>
              <TableHead className="py-3 px-4">Operations</TableHead>
              <TableHead className="text-right py-3 px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedStores.length > 0 ? (
              filteredAndSortedStores.map((store) => {
                const allowedStaff = getStaffDetailsByIds(store.allowedStaffIds);
                return (
                <TableRow key={store.id}>
                  <TableCell className="font-medium py-3 px-4">{store.name}</TableCell>
                  <TableCell className="py-3 px-4">{store.location}</TableCell>
                  <TableCell className="py-3 px-4">{store.email}</TableCell>
                  <TableCell className="py-3 px-4">{store.phone}</TableCell>
                   <TableCell className="py-3 px-4 text-xs">
                    {store.allowedStaffIds.length === 0
                      ? <span className="text-muted-foreground">All staff with general access</span>
                      : allowedStaff.map(staff => staff.name).join(', ') || <span className="text-muted-foreground">None explicitly</span>
                    }
                  </TableCell>
                  <TableCell className="py-3 px-4 text-xs capitalize">
                    {store.allowedOperations.join(', ')}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isAdminOnlyPlan} aria-disabled={isAdminOnlyPlan}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                         <DropdownMenuItem asChild>
                          <Link href={`/storeportal/${store.id}/login`}>
                            <LogIn className="mr-2 h-4 w-4" /> View Store Terminal
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEditDialog(store)} disabled={isAdminOnlyPlan}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  disabled={isAdminOnlyPlan}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the store "{store.name}".
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteStore(store.id, store.name)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No stores found. {isAdminOnlyPlan && "Store management is not available on your current plan."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
