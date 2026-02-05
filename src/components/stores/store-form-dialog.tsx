
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
import { Building, MapPin, Mail, Phone, KeyRound, Briefcase, ShoppingBag, Send, RotateCcw, User as UserIcon, ReceiptText, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const billModeSchema = z.enum(['sell', 'buy', 'return']);

const storeFormSchema = z.object({
  name: z.string().min(2, { message: "Store name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." }).regex(/^[a-z0-9_]+$/, "Username must be lowercase, alphanumeric, and underscores only."),
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  address: z.string().optional(),
  gstin: z.string().optional(),
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
  const { addStore, updateStore, userProfile } = useInventoryStore();
  const { toast } = useToast();
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  const { control, register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: '', username: '', location: '', address: '', gstin: '', email: '', phone: '', passkey: '',
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
          name: editingStore.name, username: editingStore.username || '', location: editingStore.location,
          address: editingStore.address || '', gstin: editingStore.gstin || '',
          email: editingStore.email, phone: editingStore.phone, passkey: '',
          allowedStaffIds: editingStore.allowedStaffIds || [], allowedOperations: editingStore.allowedOperations || ['sell', 'buy', 'return'],
        });
      } else {
        reset({
          name: '', username: '', location: '', address: '', gstin: '', email: '', phone: '', passkey: '', allowedStaffIds: [], allowedOperations: ['sell', 'buy', 'return'],
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
      name: data.name, username: data.username, location: data.location,
      address: data.address, gstin: data.gstin,
      email: data.email, phone: data.phone,
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
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            <div className="space-y-6">
              <div className="p-3 bg-secondary/30 border border-secondary/50 rounded-lg flex gap-3 items-start">
                <Info className="h-5 w-5 text-secondary-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-secondary-foreground">Terminal Login Credentials:</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Terminal users will need the <strong className="text-foreground">Admin Email ({userProfile.companyEmail || 'N/A'})</strong>,
                    the <strong className="text-foreground">Store Username</strong>, and the
                    <strong className="text-foreground"> Store Passkey</strong> to access this terminal.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Building size={14} className="text-primary" /> Store Details
                </h4>

                {editingStore && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl relative group transition-all hover:bg-primary/10">
                      <Label className="text-[10px] text-primary/70 font-bold uppercase tracking-widest block mb-1">Store Username</Label>
                      <div className="flex items-center justify-between">
                        <code className="text-lg font-mono font-bold text-primary tracking-tight">{editingStore.username || 'N/A'}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            navigator.clipboard.writeText(editingStore.username || '');
                            toast({ title: "Copied!", description: "Username copied to clipboard." });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 border border-muted-foreground/20 rounded-xl relative group transition-all hover:bg-muted/50">
                      <Label className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest block mb-1">Store Passkey</Label>
                      <div className="flex items-center justify-between">
                        <code className="text-lg font-mono font-bold text-foreground tracking-tight">{editingStore.passkey || '****'}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            navigator.clipboard.writeText(editingStore.passkey || '');
                            toast({ title: "Copied!", description: "Passkey copied to clipboard." });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        </Button>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1.5"><MapPin size={14} />Location (City)*</Label>
                  <Input id="location" {...register("location")} placeholder="e.g. Mumbai" />
                  {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstin" className="flex items-center gap-1.5"><ReceiptText size={14} />Store GSTIN</Label>
                  <Input id="gstin" {...register("gstin")} placeholder="Store specific GSTIN (optional)" className="uppercase" onChange={(e) => setValue('gstin', e.target.value.toUpperCase())} />
                  {errors.gstin && <p className="text-sm text-destructive mt-1">{errors.gstin.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1.5"><MapPin size={14} />Detailed Address</Label>
                <Input id="address" {...register("address")} placeholder="Full address for bills" />
                {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
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
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col gap-1">
                    <Label className="flex items-center gap-1.5 font-semibold text-foreground">
                      <UserIcon size={14} className="text-primary" /> Allowed Staff (Terminal Access)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Select staff members authorized to operate this store terminal. If empty, all authorized staff can access.</p>
                  </div>

                  {selectedStaffIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-muted/20 border border-dashed rounded-lg">
                      {allStaff.filter(s => selectedStaffIds.includes(s.id)).map(staff => (
                        <div key={staff.id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium border border-primary/20">
                          {staff.name}
                          <button
                            type="button"
                            onClick={() => setValue('allowedStaffIds', selectedStaffIds.filter(id => id !== staff.id))}
                            className="hover:text-destructive transition-colors ml-0.5"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="h-40 border rounded-xl bg-muted/10 overflow-hidden flex flex-col">
                    <div className="bg-muted/30 px-3 py-1.5 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                      <span>Staff Directory</span>
                      <span>{selectedStaffIds.length} Selected</span>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1">
                        {allStaff.map((staff) => (
                          <div
                            key={staff.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
                              selectedStaffIds.includes(staff.id) && "bg-primary/5 border border-primary/10"
                            )}
                            onClick={() => {
                              const checked = selectedStaffIds.includes(staff.id);
                              setValue('allowedStaffIds', checked ? selectedStaffIds.filter(id => id !== staff.id) : [...selectedStaffIds, staff.id]);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn("h-2 w-2 rounded-full", selectedStaffIds.includes(staff.id) ? "bg-primary" : "bg-muted-foreground/30")} />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{staff.name}</span>
                                <span className="text-[10px] text-muted-foreground">{staff.email}</span>
                              </div>
                            </div>
                            <Checkbox
                              id={`staff-${staff.id}`}
                              checked={selectedStaffIds.includes(staff.id)}
                              onCheckedChange={(checked) => {
                                setValue('allowedStaffIds', checked ? [...selectedStaffIds, staff.id] : selectedStaffIds.filter(id => id !== staff.id));
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  {errors.allowedStaffIds && <p className="text-sm text-destructive mt-1">{errors.allowedStaffIds.message}</p>}
                </div>
              )}
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
