
"use client";

import React, { useEffect, useState } from 'react'; // Added useState
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import type { Store, Staff, BillMode } from '@/types';
import { Separator } from '@/components/ui/separator';

const billModeSchema = z.enum(['sell', 'buy', 'return']);

const storeFormSchema = z.object({
  name: z.string().min(2, { message: "Store name must be at least 2 characters." }),
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  passkey: z.string().min(4, { message: "Passkey must be at least 4 characters for new stores, or leave blank to keep current on edit." }).or(z.literal('')).optional(),
  allowedStaffIds: z.array(z.string()).optional().default([]),
  allowedOperations: z.array(billModeSchema).min(1, "At least one operation must be allowed.").default(['sell', 'buy', 'return']),
});

type StoreFormData = z.infer<typeof storeFormSchema>;

interface StoreFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFormSubmit: () => void;
  editingStore?: Store | null;
  allStaff: Staff[];
}

const operationOptions: { id: BillMode; label: string }[] = [
  { id: 'sell', label: 'Sales Transactions' },
  { id: 'buy', label: 'Expense Transactions (Purchases)' },
  { id: 'return', label: 'Returns Processing' },
];

export function StoreFormDialog({
  isOpen,
  onOpenChange,
  onFormSubmit,
  editingStore,
  allStaff
}: StoreFormDialogProps) {
  const { addStore, updateStore } = useInventoryStore();
  const { toast } = useToast();
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: '',
      location: '',
      email: '',
      phone: '',
      passkey: '',
      allowedStaffIds: [],
      allowedOperations: ['sell', 'buy', 'return'],
    },
  });

  const selectedStaffIds = watch('allowedStaffIds') || [];
  const selectedOperations = watch('allowedOperations') || [];

  useEffect(() => {
    if (isOpen) {
      const companyIdFromStorage = localStorage.getItem('companyId');
      if (companyIdFromStorage) {
        setCurrentCompanyId(companyIdFromStorage);
      } else {
        console.error("StoreFormDialog: Company ID not found in localStorage.");
        toast({ variant: "destructive", title: "Error", description: "Company context is missing. Cannot manage stores."});
        onOpenChange(false); // Close dialog if no company context
        return;
      }

      if (editingStore) {
        reset({
          name: editingStore.name,
          location: editingStore.location,
          email: editingStore.email,
          phone: editingStore.phone,
          passkey: '', // Always start passkey empty for edits
          allowedStaffIds: editingStore.allowedStaffIds || [],
          allowedOperations: editingStore.allowedOperations || ['sell', 'buy', 'return'],
        });
      } else {
        reset({
          name: '',
          location: '',
          email: '',
          phone: '',
          passkey: '', // Ensure passkey is empty for new store default in form
          allowedStaffIds: [],
          allowedOperations: ['sell', 'buy', 'return'],
        });
      }
    }
  }, [isOpen, editingStore, reset, toast, onOpenChange]);

  const onSubmit = async (data: StoreFormData) => {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "Company context is missing. Cannot save store." });
      return;
    }

    const passkeyToSubmit = data.passkey?.trim();

    if (!editingStore && (!passkeyToSubmit || passkeyToSubmit.length < 4)) {
        toast({ variant: "destructive", title: "Validation Error", description: "A passkey of at least 4 characters is required for new stores." });
        return;
    }

    const storePayload: Omit<Store, 'id' | 'companyId'> & { passkey?: string } = {
        name: data.name,
        location: data.location,
        email: data.email,
        phone: data.phone,
        allowedStaffIds: data.allowedStaffIds || [],
        allowedOperations: data.allowedOperations,
    };

    if (passkeyToSubmit && passkeyToSubmit.length >= 4) {
        storePayload.passkey = passkeyToSubmit;
    } else if (!editingStore) {
        // This case should be caught above, but as a safeguard:
        toast({ variant: "destructive", title: "Validation Error", description: "Passkey is required for new stores." });
        return;
    }
    // If editing and passkeyToSubmit is empty, storePayload will not have passkey, so API won't update it.

    let success = false;
    if (editingStore) {
      const updatedStore = await updateStore(editingStore.id, storePayload, currentCompanyId);
      if (updatedStore) {
        toast({ title: "Store Updated", description: `${data.name}'s details have been updated.` });
        success = true;
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: "Could not update store." });
      }
    } else {
      if (!storePayload.passkey) { // Final explicit check before API call
        toast({ variant: "destructive", title: "Validation Error", description: "Passkey is missing for new store." });
        return;
      }
      const newStore = await addStore(storePayload as Omit<Store, 'id' | 'companyId'>, currentCompanyId);
      if (newStore) {
        toast({ title: "Store Added", description: `${data.name} has been added.` });
        success = true;
      } else {
        // Error is already logged by addStore in store hook if API fails
      }
    }

    if (success) {
      onFormSubmit();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh] border-t-4 border-t-primary shadow-lg">
        <DialogHeader>
          <DialogTitle>{editingStore ? 'Edit Store' : 'Add New Store'}</DialogTitle>
          <DialogDescription>
            Fill in the store details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 my-1 -mx-6 px-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Store Name*</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="location">Location*</Label>
              <Input id="location" {...register("location")} />
              {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email Address*</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number*</Label>
              <Input id="phone" type="tel" {...register("phone")} />
              {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <Label htmlFor="passkey">Store Passkey*{editingStore ? <span className="text-xs text-muted-foreground"> (Leave blank to keep current)</span> : ''}</Label>
              <Input id="passkey" type="password" {...register("passkey")} placeholder={editingStore ? "Enter new passkey to change" : "Min. 4 characters"}/>
              {errors.passkey && <p className="text-sm text-destructive mt-1">{errors.passkey.message}</p>}
            </div>

            <Separator />

            <div className="space-y-2 pt-1">
              <Label>Allowed Operations*</Label>
              <p className="text-xs text-muted-foreground">
                Select which types of transactions are permitted at this store terminal.
              </p>
              {operationOptions.map((op) => (
                <div key={op.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`operation-${op.id}`}
                    checked={selectedOperations.includes(op.id)}
                    onCheckedChange={(checked) => {
                      const currentOps = selectedOperations;
                      if (checked) {
                        setValue('allowedOperations', [...currentOps, op.id]);
                      } else {
                        if (currentOps.length > 1) {
                          setValue('allowedOperations', currentOps.filter(id => id !== op.id));
                        } else {
                          toast({ variant: "destructive", title: "Validation Error", description: "At least one operation must be allowed."});
                        }
                      }
                    }}
                  />
                  <Label htmlFor={`operation-${op.id}`} className="font-normal text-sm">
                    {op.label}
                  </Label>
                </div>
              ))}
              {errors.allowedOperations && <p className="text-sm text-destructive mt-1">{errors.allowedOperations.message}</p>}
            </div>

            {allStaff.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2 pt-1">
                  <Label>Allowed Staff (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select staff members allowed to operate this store. If none selected, any staff member assigned to this store (or all stores if no specific assignment) can use their passkey.
                  </p>
                  <ScrollArea className="h-32 border rounded-md p-2 bg-tertiary">
                    <div className="space-y-1">
                    {allStaff.map((staff) => (
                      <div key={staff.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`staff-${staff.id}`}
                          checked={selectedStaffIds.includes(staff.id)}
                          onCheckedChange={(checked) => {
                            const currentIds = selectedStaffIds;
                            if (checked) {
                              setValue('allowedStaffIds', [...currentIds, staff.id]);
                            } else {
                              setValue('allowedStaffIds', currentIds.filter(id => id !== staff.id));
                            }
                          }}
                        />
                        <Label htmlFor={`staff-${staff.id}`} className="font-normal text-sm">
                          {staff.name} <span className="text-xs text-muted-foreground">({staff.email})</span>
                        </Label>
                      </div>
                    ))}
                    </div>
                  </ScrollArea>
                  {errors.allowedStaffIds && <p className="text-sm text-destructive mt-1">{errors.allowedStaffIds.message}</p>}
                </div>
              </>
            )}
          </form>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={!currentCompanyId || isSubmitting}>
            {isSubmitting ? (editingStore ? 'Saving...' : 'Adding...') : (editingStore ? 'Save Changes' : 'Add Store')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
