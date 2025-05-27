
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
import type { Staff, Store } from '@/types';

const staffFormSchema = z.object({
  name: z.string().min(2, { message: "Staff name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  passkey: z.string().min(4, { message: "Passkey must be at least 4 characters." }),
  accessibleStoreIds: z.array(z.string()).optional().default([]),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

interface StaffFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFormSubmit: () => void;
  editingStaff?: Staff | null;
  allStores: Store[];
}

export function StaffFormDialog({ 
  isOpen, 
  onOpenChange, 
  onFormSubmit,
  editingStaff,
  allStores
}: StaffFormDialogProps) {
  const { addStaff, updateStaff } = useInventoryStore();
  const { toast } = useToast();
  
  const { control, register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      passkey: '',
      accessibleStoreIds: [],
    },
  });

  const selectedStoreIds = watch('accessibleStoreIds') || [];

  useEffect(() => {
    if (isOpen) {
      if (editingStaff) {
        reset({
          name: editingStaff.name,
          email: editingStaff.email,
          phone: editingStaff.phone,
          passkey: editingStaff.passkey, // For editing, prefill might be sensitive. Consider if passkey should be re-entered.
          accessibleStoreIds: editingStaff.accessibleStoreIds || [],
        });
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          passkey: '',
          accessibleStoreIds: [],
        });
      }
    }
  }, [isOpen, editingStaff, reset]);

  const onSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      updateStaff(editingStaff.id, data);
      toast({ title: "Staff Updated", description: `${data.name}'s details have been updated.` });
    } else {
      addStaff(data);
      toast({ title: "Staff Added", description: `${data.name} has been added.` });
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
          <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
          <DialogDescription>
            Fill in the staff details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="name">Full Name*</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
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
            <Label htmlFor="passkey">Passkey* {editingStaff && <span className="text-xs text-muted-foreground">(Leave blank to keep current)</span>}</Label>
            <Input id="passkey" type="password" {...register("passkey")} placeholder={editingStaff ? "Enter new passkey to change" : ""}/>
            {errors.passkey && <p className="text-sm text-destructive mt-1">{errors.passkey.message}</p>}
          </div>

          {allStores.length > 0 && (
            <div className="space-y-2">
              <Label>Accessible Stores (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select stores this staff member can access. If none selected, they can access all.
              </p>
              <ScrollArea className="h-32 border rounded-md p-2 bg-tertiary">
                <div className="space-y-1">
                {allStores.map((store) => (
                  <div key={store.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`store-${store.id}`}
                      checked={selectedStoreIds.includes(store.id)}
                      onCheckedChange={(checked) => {
                        const currentIds = selectedStoreIds;
                        if (checked) {
                          setValue('accessibleStoreIds', [...currentIds, store.id]);
                        } else {
                          setValue('accessibleStoreIds', currentIds.filter(id => id !== store.id));
                        }
                      }}
                    />
                    <Label htmlFor={`store-${store.id}`} className="font-normal text-sm">
                      {store.name} <span className="text-xs text-muted-foreground">({store.location})</span>
                    </Label>
                  </div>
                ))}
                </div>
              </ScrollArea>
               {errors.accessibleStoreIds && <p className="text-sm text-destructive mt-1">{errors.accessibleStoreIds.message}</p>}
            </div>
          )}


          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="default">{editingStaff ? 'Save Changes' : 'Add Staff'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
