
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
import type { User, Store } from '@/types';

const staffFormSchema = z.object({
  name: z.string().min(2, { message: "Staff name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).or(z.literal('')).optional(), // Allow empty for not changing
  assignedStoreIds: z.array(z.string()).optional().default([]),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

interface StaffFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFormSubmit: () => void;
  editingStaff?: User | null;
  allStores: Store[];
}

export function StaffFormDialog({ 
  isOpen, 
  onOpenChange, 
  onFormSubmit,
  editingStaff,
  allStores
}: StaffFormDialogProps) {
  const { addStaff, updateStaff, companyId: currentCompanyId } = useInventoryStore(state => ({
    addStaff: state.addStaff,
    updateStaff: state.updateStaff,
    companyId: localStorage.getItem('companyId')
  }));
  const { toast } = useToast();
  
  const { control, register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      assignedStoreIds: [],
    },
  });

  const selectedStoreIds = watch('assignedStoreIds') || [];

  useEffect(() => {
    if (isOpen) {
      if (editingStaff) {
        reset({
          name: editingStaff.name,
          email: editingStaff.email,
          phone: (editingStaff as any).phone || '', // Assuming phone exists on staff type
          password: '', 
          assignedStoreIds: editingStaff.assignedStoreIds || [],
        });
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          password: '',
          assignedStoreIds: [],
        });
      }
    }
  }, [isOpen, editingStaff, reset]);

  const onSubmit = async (data: StaffFormData) => {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "Company context is missing." });
      return;
    }

    const passwordToSubmit = data.password?.trim();
    
    if (!editingStaff && (!passwordToSubmit || passwordToSubmit.length < 6)) {
        toast({ variant: "destructive", title: "Validation Error", description: "A password of at least 6 characters is required for new staff." });
        return;
    }

    const staffPayload: Partial<User> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        assignedStoreIds: data.assignedStoreIds,
    };

    if (passwordToSubmit) {
        staffPayload.password = passwordToSubmit;
    }

    let success = false;
    if (editingStaff) {
      const updatedStaff = await updateStaff(editingStaff.id, staffPayload, currentCompanyId);
      if (updatedStaff) {
        toast({ title: "Staff Updated", description: `${data.name}'s details have been updated.` });
        success = true;
      }
    } else {
      const newStaff = await addStaff(staffPayload as Required<typeof staffPayload>, currentCompanyId);
      if (newStaff) {
        toast({ title: "Staff Added", description: `${data.name} has been added.` });
        success = true;
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
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh] border-t-4 border-t-primary shadow-lg p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
          <DialogDescription>
            Fill in the staff details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="contents">
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-6">
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
                <Label htmlFor="password">Password*{editingStaff ? <span className="text-xs text-muted-foreground"> (Leave blank to keep current)</span> : ''}</Label>
                <Input id="password" type="password" {...register("password")} placeholder={editingStaff ? "Enter new password to change" : "Min. 6 characters"}/>
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>

              {allStores.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label>Accessible Stores (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select stores this staff member can access. If none selected, they cannot access any store terminal.
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
                              setValue('assignedStoreIds', [...currentIds, store.id]);
                            } else {
                              setValue('assignedStoreIds', currentIds.filter(id => id !== store.id));
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
                  {errors.assignedStoreIds && <p className="text-sm text-destructive mt-1">{errors.assignedStoreIds.message}</p>}
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : (editingStaff ? 'Save Changes' : 'Add Staff')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
