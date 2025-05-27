
"use client";

import React, { useEffect } from 'react';
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
  passkey: z.string().min(4, { message: "Passkey must be at least 4 characters." }),
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
  
  const { control, register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<StoreFormData>({
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
      if (editingStore) {
        reset({
          name: editingStore.name,
          location: editingStore.location,
          email: editingStore.email,
          phone: editingStore.phone,
          passkey: editingStore.passkey, 
          allowedStaffIds: editingStore.allowedStaffIds || [],
          allowedOperations: editingStore.allowedOperations || ['sell', 'buy', 'return'],
        });
      } else {
        reset({
          name: '',
          location: '',
          email: '',
          phone: '',
          passkey: '',
          allowedStaffIds: [],
          allowedOperations: ['sell', 'buy', 'return'],
        });
      }
    }
  }, [isOpen, editingStore, reset]);

  const onSubmit = (data: StoreFormData) => {
    if (editingStore) {
      updateStore(editingStore.id, data);
      toast({ title: "Store Updated", description: `${data.name}'s details have been updated.` });
    } else {
      addStore(data);
      toast({ title: "Store Added", description: `${data.name} has been added.` });
    }
    onFormSubmit();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg border-t-4 border-t-primary shadow-lg">
        <DialogHeader>
          <DialogTitle>{editingStore ? 'Edit Store' : 'Add New Store'}</DialogTitle>
          <DialogDescription>
            Fill in the store details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
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
            <Label htmlFor="passkey">Store Passkey* {editingStore && <span className="text-xs text-muted-foreground">(Leave blank to keep current)</span>}</Label>
            <Input id="passkey" type="password" {...register("passkey")} placeholder={editingStore ? "Enter new passkey to change" : ""}/>
            {errors.passkey && <p className="text-sm text-destructive mt-1">{errors.passkey.message}</p>}
          </div>

          <Separator />

          <div className="space-y-2">
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
                      // Ensure at least one operation remains selected
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

          <Separator />

          {allStaff.length > 0 && (
            <div className="space-y-2">
              <Label>Allowed Staff (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select staff members allowed to operate this store. If none selected, any staff with general access to this store can operate it.
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
          )}


          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="default">{editingStore ? 'Save Changes' : 'Add Store'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
