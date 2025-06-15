
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
import type { UserProfile } from '@/types';
import { Settings as SettingsIcon, Save, StickyNote, CreditCard, Palette, Info } from 'lucide-react';
import { useTheme } from "next-themes";
import { ThemeToggle } from '@/components/layout/theme-toggle'; // Import ThemeToggle

export default function SettingsPage() {
  const { userProfile, updateUserProfileFields } = useInventoryStore();
  const { toast } = useToast();
  const { theme } = useTheme(); // Get current theme

  const [defaultBillNotes, setDefaultBillNotes] = useState('');
  const [defaultSalesPaymentStatus, setDefaultSalesPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [defaultPurchasePaymentStatus, setDefaultPurchasePaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (userProfile) {
      setDefaultBillNotes(userProfile.defaultBillNotes || '');
      setDefaultSalesPaymentStatus(userProfile.defaultSalesPaymentStatus || 'paid');
      setDefaultPurchasePaymentStatus(userProfile.defaultPurchasePaymentStatus || 'paid');
    }
  }, [userProfile]);

  const handleSaveSetting = (field: keyof UserProfile, value: any, successMessage: string) => {
    updateUserProfileFields({ [field]: value });
    toast({ title: 'Setting Saved', description: successMessage });
  };

  if (!hasMounted || !userProfile) {
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
                  setDefaultSalesPaymentStatus(value);
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
                  setDefaultPurchasePaymentStatus(value);
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
