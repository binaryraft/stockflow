"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Building, PenLine, Phone, FileText, Info, Save, LogOut, Mail } from 'lucide-react';
import type { Company } from '@/types';

const recoveryFormSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  slogan: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  gstNo: z.string().optional(),
});

type RecoveryFormData = z.infer<typeof recoveryFormSchema>;

interface CompanyRecoveryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CompanyRecoveryDialog({ isOpen, onOpenChange, onSuccess }: CompanyRecoveryDialogProps) {
  const { toast } = useToast();
  const { updateUserProfileFields, userProfile } = useInventoryStore();
  const [companyId, setCompanyId] = useState<string | null>(null);

  const form = useForm<RecoveryFormData>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: {
      name: '', email: '', slogan: '', address: '', phone: '', gstNo: '',
    },
  });

  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = form;

  useEffect(() => {
    if (isOpen) {
      const storedCompanyId = localStorage.getItem('companyId');
      setCompanyId(storedCompanyId);
      // Even if profile fetch failed, some stale data might be in userProfile.
      reset({
        name: userProfile.companyName || '',
        email: userProfile.companyEmail || localStorage.getItem('userEmail') || '',
        slogan: userProfile.companySlogan || '',
        address: userProfile.companyAddress || '',
        phone: userProfile.companyPhone || '',
        gstNo: userProfile.companyGstNo || '',
      });
    }
  }, [isOpen, userProfile, reset]);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  const onSubmit = async (data: RecoveryFormData) => {
    if (!companyId) {
      toast({ variant: "destructive", title: "Error", description: "Company context is missing. Cannot recover profile." });
      return;
    }

    const updatedCompany = await updateUserProfileFields({
      name: data.name,
      email: data.email,
      slogan: data.slogan,
      address: data.address,
      phone: data.phone,
      gstNo: data.gstNo,
    }, companyId);

    if (updatedCompany) {
      toast({ title: "Profile Recovered", description: "Company details have been saved to the server." });
      onSuccess(); // This will trigger re-fetch in the layout
    } else {
      toast({ variant: "destructive", title: "Recovery Failed", description: "Could not save company details. Please try again or log out." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-2">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-center text-xl">Company Profile Error</DialogTitle>
          <DialogDescription className="text-center">
            We couldn't load your company profile from the server. This may be a temporary issue or your profile might be missing. Please verify your details below to re-save them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-name" className="flex items-center gap-1.5 font-medium"><Building size={14} className="text-primary" /> Company Name*</Label>
              <Input id="rec-name" {...register("name")} placeholder="Your Company Name" />
              {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-email" className="flex items-center gap-1.5 font-medium"><Mail size={14} className="text-primary" /> Official Email*</Label>
              <Input id="rec-email" type="email" {...register("email")} placeholder="admin@company.com" />
              {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rec-phone" className="flex items-center gap-1.5 font-medium"><Phone size={14} className="text-primary" /> Phone</Label>
                <Input id="rec-phone" type="tel" {...register("phone")} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-gst" className="flex items-center gap-1.5 font-medium"><FileText size={14} className="text-primary" /> GST No.</Label>
                <Input id="rec-gst" {...register("gstNo")} placeholder="GSTIN if applicable" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-slogan" className="flex items-center gap-1.5 font-medium"><PenLine size={14} className="text-primary" /> Slogan</Label>
              <Input id="rec-slogan" {...register("slogan")} placeholder="Optional company tagline" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-address" className="flex items-center gap-1.5 font-medium"><Info size={14} className="text-primary" /> Address</Label>
              <Input id="rec-address" {...register("address")} placeholder="Full business address" />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 pt-6">
            <Button type="button" variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full shadow-md shadow-primary/20">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save & Repair
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
