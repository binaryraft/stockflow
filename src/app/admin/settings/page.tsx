
"use client";

import { useState, useEffect } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Company } from '@/types';
import { Settings as SettingsIcon, Save, StickyNote, CreditCard, Palette, Info } from 'lucide-react';
import { useTheme } from "next-themes";
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function SettingsPage() {
  const { 
    userProfile, // Client-side cache of Company data
    updateUserProfileFields, // Updates Company on server
    fetchCompanyProfile 
  } = useInventoryStore();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [defaultBillNotes, setDefaultBillNotes] = useState('');
  const [defaultSalesPaymentStatus, setDefaultSalesPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [defaultPurchasePaymentStatus, setDefaultPurchasePaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
    const companyIdFromStorage = localStorage.getItem('companyId');
    if (companyIdFromStorage) {
      setCurrentCompanyId(companyIdFromStorage);
      setIsLoading(true);
      fetchCompanyProfile(companyIdFromStorage) // Fetch full company data
        .then(() => setIsLoading(false))
        .catch(() => {
          toast({ variant: "destructive", title: "Error", description: "Could not load company settings." });
          setIsLoading(false);
        });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Company context not found."});
      setIsLoading(false);
    }
  }, [fetchCompanyProfile, toast]);

  useEffect(() => {
    // Populate local state from userProfile (which is updated by fetchCompanyProfile)
    if (hasMounted && !isLoading && userProfile) {
      setDefaultBillNotes(userProfile.defaultBillNotes || '');
      setDefaultSalesPaymentStatus(userProfile.defaultSalesPaymentStatus || 'paid');
      setDefaultPurchasePaymentStatus(userProfile.defaultPurchasePaymentStatus || 'paid');
    }
  }, [hasMounted, isLoading, userProfile]);

  const handleSaveSetting = async (
    field: keyof Pick<Company, 'defaultBillNotes' | 'defaultSalesPaymentStatus' | 'defaultPurchasePaymentStatus'>, 
    value: any, 
    successMessage: string
  ) => {
    if (!currentCompanyId) {
      toast({ variant: "destructive", title: "Error", description: "Company context missing. Cannot save settings."});
      return;
    }
    try {
      // updateUserProfileFields now syncs to the Company record on the server
      await updateUserProfileFields({ [field]: value } as Partial<Omit<Company, 'id'|'token'>>, currentCompanyId);
      toast({ title: 'Setting Saved', description: successMessage });
      // No need to manually update local state if userProfile in store is source of truth and re-renders
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save setting." });
    }
  };

  if (!hasMounted || isLoading || !userProfile || !currentCompanyId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <SettingsIcon className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
        <p className="text-lg text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Application Settings" icon={SettingsIcon} />

      <Card className="shadow-md border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5 text-primary"/>Billing Defaults</CardTitle>
          <CardDescription>Set default values for new bills to speed up your workflow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="defaultBillNotes">Default Bill Notes</Label>
            <Textarea
              id="defaultBillNotes"
              value={defaultBillNotes}
              onChange={(e) => setDefaultBillNotes(e.target.value)}
              placeholder="e.g., Thank you for your business!"
              rows={3}
            />
             <Button 
              size="sm" 
              onClick={() => handleSaveSetting('defaultBillNotes', defaultBillNotes, 'Default bill notes updated.')}
              className="mt-2"
            >
              <Save className="mr-2 h-4 w-4"/> Save Notes
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="defaultSalesStatus">Default Sales Bill Payment Status</Label>
              <Select
                value={defaultSalesPaymentStatus}
                onValueChange={(value: 'paid' | 'unpaid') => {
                  setDefaultSalesPaymentStatus(value); // Optimistic UI update
                  handleSaveSetting('defaultSalesPaymentStatus', value, 'Default sales payment status updated.');
                }}
              >
                <SelectTrigger id="defaultSalesStatus" className="select-trigger-class">
                  <SelectValue placeholder="Select default status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="defaultPurchaseStatus">Default Purchase Bill Payment Status</Label>
              <Select
                value={defaultPurchasePaymentStatus}
                onValueChange={(value: 'paid' | 'unpaid') => {
                  setDefaultPurchasePaymentStatus(value); // Optimistic UI update
                  handleSaveSetting('defaultPurchasePaymentStatus', value, 'Default purchase payment status updated.');
                }}
              >
                <SelectTrigger id="defaultPurchaseStatus" className="select-trigger-class">
                  <SelectValue placeholder="Select default status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary"/>Appearance</CardTitle>
          <CardDescription>Manage application theme preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                <div className="space-y-0.5">
                    <Label className="text-sm">Theme Preference</Label>
                    <p className="text-xs text-muted-foreground">
                        Current theme: <span className="font-semibold capitalize text-foreground">{theme}</span>. Use the toggle in the header to change.
                    </p>
                </div>
                <ThemeToggle />
            </div>
        </CardContent>
      </Card>
      
       <Card className="shadow-md border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>More Settings</CardTitle>
          <CardDescription>
            This section can be expanded with more application-wide settings as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Examples of future settings:
          </p>
          <ul className="list-disc list-inside mt-2 text-xs text-muted-foreground space-y-1">
            <li>Default currency and number formatting.</li>
            <li>Date and time zone settings.</li>
            <li>Notification preferences (e.g., low stock alerts).</li>
            <li>Data import/export options.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
    