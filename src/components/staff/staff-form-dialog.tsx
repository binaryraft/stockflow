
"use client";

import React, { useEffect, useState } from 'react';
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
import { User as UserIcon, Mail, Phone, KeyRound, Building, Briefcase } from 'lucide-react';
import { Separator } from '../ui/separator';

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
      name: '', email: '', phone: '', password: '', assignedStoreIds: [],
    },
  });

  const selectedStoreIds = watch('assignedStoreIds') || [];

  useEffect(() => {
    if (isOpen) {
      if (editingStaff) {
        reset({
          name: editingStaff.name, email: editingStaff.email, phone: editingStaff.phone || '', password: '',
          assignedStoreIds: editingStaff.assignedStoreIds || [],
        });
      } else {
        reset({
          name: '', email: '', phone: '', password: '', assignedStoreIds: [],
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
      name: data.name, email: data.email, phone: data.phone, assignedStoreIds: data.assignedStoreIds,
    };
    if (passwordToSubmit) staffPayload.password = passwordToSubmit;

    const success = editingStaff
      ? await updateStaff(editingStaff.id, staffPayload, currentCompanyId)
      : await addStaff(staffPayload as Required<typeof staffPayload>, currentCompanyId);

    if (success) {
      toast({ title: `Staff ${editingStaff ? 'Updated' : 'Added'}`, description: `${data.name}'s details have been saved.` });
      onFormSubmit();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) reset(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh] border-t-4 border-t-primary shadow-lg p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-6 w-6 text-primary" />
            {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </DialogTitle>
          <DialogDescription>
            Fill in the staff details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">STAFF INFORMATION</h4>
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1.5"><UserIcon size={14} />Full Name*</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>
                {editingStaff && editingStaff.employeeId && (
                  <div className="space-y-2">
                    <Label htmlFor="employeeIdDisplay" className="flex items-center gap-1.5 text-muted-foreground"><Briefcase size={14} />Employee ID (System Generated)</Label>
                    <Input id="employeeIdDisplay" value={editingStaff.employeeId} readOnly disabled className="bg-muted font-mono" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5"><Mail size={14} />Email Address*</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone size={14} />Phone Number*</Label>
                  <Input id="phone" type="tel" {...register("phone")} />
                  {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">AUTHENTICATION</h4>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-1.5"><KeyRound size={14} />Password*{editingStaff ? <span className="text-xs text-muted-foreground ml-1"> (Leave blank to keep current)</span> : ''}</Label>
                  <Input id="password" type="password" {...register("password")} placeholder={editingStaff ? "Enter new password to change" : "Min. 6 characters"} />
                  {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                </div>
              </div>

              {allStores.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">ASSIGNMENTS</h4>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Building size={14} />Accessible Stores (Optional)</Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Select stores this staff member can access.
                      </p>
                      <ScrollArea className="h-32 border rounded-md p-3 bg-tertiary/50">
                        <div className="space-y-2">
                          {allStores.map((store) => (
                            <div key={store.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`store-${store.id}`}
                                checked={selectedStoreIds.includes(store.id)}
                                onCheckedChange={(checked) => {
                                  const currentIds = selectedStoreIds;
                                  setValue('assignedStoreIds', checked ? [...currentIds, store.id] : currentIds.filter(id => id !== store.id));
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
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 pt-4 border-t bg-muted/30">
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
