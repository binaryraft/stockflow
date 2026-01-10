
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
import type { Store, User, BillMode } from '@/types';
import { Separator } from '../ui/separator';
import { Building, MapPin, Mail, Phone, KeyRound, Briefcase, ShoppingBag, Send, RotateCcw, User as UserIcon } from 'lucide-react';

const billModeSchema = z.enum(['sell', 'buy', 'return']);

const storeFormSchema = z.object({
  name: z.string().min(2, { message: "Store name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).regex(/^[a-z0-9_]+$/, "Username must be lowercase, alphanumeric, and underscores only."),
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
  allStaff: User[];
}

const operationOptions: { id: BillMode; label: string, icon: React.ElementType }[] = [
  { id: 'sell', label: 'Sales Transactions', icon: Send },
  { id: 'buy', label: 'Expense Transactions (Purchases)', icon: ShoppingBag },
  { id: 'return', label: 'Returns Processing', icon: RotateCcw },
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
      name: '', username: '', location: '', email: '', phone: '', passkey: '',
      allowedStaffIds: [], allowedOperations: ['sell', 'buy', 'return'],
    },
  });

  const selectedStaffIds = watch('allowedStaffIds') || [];
  const selectedOperations = watch('allowedOperations') || [];

  useEffect(() => {
    if (isOpen) {
      const companyIdFromStorage = localStorage.getItem('companyId');
      if (companyIdFromStorage) setCurrentCompanyId(companyIdFromStorage);
      else {
        console.error("StoreFormDialog: Company ID not found in localStorage.");
        toast({ variant: "destructive", title: "Error", description: "Company context is missing. Cannot manage stores." });
        onOpenChange(false);
        return;
      }
      if (editingStore) {
        reset({
          name: editingStore.name, username: editingStore.username || '', location: editingStore.location, email: editingStore.email, phone: editingStore.phone, passkey: '',
          allowedStaffIds: editingStore.allowedStaffIds || [], allowedOperations: editingStore.allowedOperations || ['sell', 'buy', 'return'],
        });
      } else {
        reset({
          name: '', username: '', location: '', email: '', phone: '', passkey: '', allowedStaffIds: [], allowedOperations: ['sell', 'buy', 'return'],
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
    const storePayload: Partial<Omit<Store, 'id' | 'companyId'>> = {
      name: data.name, username: data.username, location: data.location, email: data.email, phone: data.phone,
      allowedStaffIds: data.allowedStaffIds || [], allowedOperations: data.allowedOperations,
    };
    if (passkeyToSubmit && passkeyToSubmit.length >= 4) (storePayload as any).passkey = passkeyToSubmit;
    else if (!editingStore) {
      toast({ variant: "destructive", title: "Validation Error", description: "Passkey is required for new stores." });
      return;
    }
    const success = editingStore
      ? await updateStore(editingStore.id, storePayload, currentCompanyId)
      : await addStore(storePayload as Omit<Store, 'id' | 'companyId'>, currentCompanyId);

    if (success) {
      toast({ title: `Store ${editingStore ? 'Updated' : 'Added'}`, description: `${data.name}'s details have been saved.` });
      onFormSubmit();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) reset(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[90vh] border-t-4 border-t-primary shadow-lg p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building className="h-6 w-6 text-primary" />
            {editingStore ? 'Edit Store' : 'Add New Store'}
          </DialogTitle>
          <DialogDescription>Fill in the store details. Fields marked with * are required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">STORE DETAILS</h4>
                {editingStore && editingStore.accessCode && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                      <Label className="text-xs text-primary font-bold uppercase tracking-wider block mb-1">Store Username</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold text-primary">{editingStore.username || 'N/A'}</code>
                      </div>
                    </div>
                    <div className="p-3 bg-muted border border-muted-foreground/20 rounded-md">
                      <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">Store Passkey</Label>
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-mono font-bold text-muted-foreground">{editingStore.passkey}</code>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-1.5"><Building size={14} />Store Name*</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-1.5"><UserIcon size={14} />Store Username*</Label>
                    <Input id="username" {...register("username")} placeholder="Unique ID for login" />
                    {errors.username && <p className="text-sm text-destructive mt-1">{errors.username.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1.5"><MapPin size={14} />Location*</Label>
                  <Input id="location" {...register("location")} />
                  {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">SECURITY</h4>
                <div className="space-y-2">
                  <Label htmlFor="passkey" className="flex items-center gap-1.5"><KeyRound size={14} />Store Passkey*{editingStore ? <span className="text-xs text-muted-foreground ml-1"> (Leave blank to keep current)</span> : ''}</Label>
                  <Input id="passkey" type="password" {...register("passkey")} placeholder={editingStore ? "Enter new passkey to change" : "Min. 4 characters"} />
                  {errors.passkey && <p className="text-sm text-destructive mt-1">{errors.passkey.message}</p>}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground">PERMISSIONS</h4>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Briefcase size={14} />Allowed Operations*</Label>
                  <p className="text-xs text-muted-foreground -mt-1">Select which transaction types are permitted at this store terminal.</p>
                  <div className="space-y-2 pt-1">
                    {operationOptions.map((op) => (
                      <div key={op.id} className="flex items-center space-x-2">
                        <Checkbox id={`operation-${op.id}`} checked={selectedOperations.includes(op.id)} onCheckedChange={(checked) => {
                          const currentOps = selectedOperations;
                          if (checked) setValue('allowedOperations', [...currentOps, op.id]);
                          else if (currentOps.length > 1) setValue('allowedOperations', currentOps.filter(id => id !== op.id));
                          else toast({ variant: "destructive", title: "Validation Error", description: "At least one operation must be allowed." });
                        }} />
                        <Label htmlFor={`operation-${op.id}`} className="font-normal text-sm flex items-center gap-1.5"><op.icon size={16} />{op.label}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.allowedOperations && <p className="text-sm text-destructive mt-1">{errors.allowedOperations.message}</p>}
                </div>
                {allStaff.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label className="flex items-center gap-1.5"><UserIcon size={14} />Allowed Staff (Optional)</Label>
                    <p className="text-xs text-muted-foreground -mt-1">Select specific staff members allowed to access this store. If none are selected, any assigned staff can access it.</p>
                    <div className="h-32 border rounded-md p-3 bg-tertiary/50 overflow-y-auto">
                      <div className="space-y-2">
                        {allStaff.map((staff) => (
                          <div key={staff.id} className="flex items-center space-x-2">
                            <Checkbox id={`staff-${staff.id}`} checked={selectedStaffIds.includes(staff.id)} onCheckedChange={(checked) => {
                              const currentIds = selectedStaffIds;
                              setValue('allowedStaffIds', checked ? [...currentIds, staff.id] : currentIds.filter(id => id !== staff.id));
                            }} />
                            <Label htmlFor={`staff-${staff.id}`} className="font-normal text-sm">{staff.name} <span className="text-xs text-muted-foreground">({staff.email})</span></Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {errors.allowedStaffIds && <p className="text-sm text-destructive mt-1">{errors.allowedStaffIds.message}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t bg-muted/30">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={!currentCompanyId || isSubmitting}>{isSubmitting ? 'Saving...' : (editingStore ? 'Save Changes' : 'Add Store')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
