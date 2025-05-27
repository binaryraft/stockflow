
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import type { Staff } from '@/types';
import { KeyRound, LogIn } from 'lucide-react';

interface EmployeePasskeyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onAuthenticated: (staff: Staff) => void;
}

export function EmployeePasskeyDialog({
  isOpen,
  onOpenChange,
  storeId,
  onAuthenticated,
}: EmployeePasskeyDialogProps) {
  const [passkey, setPasskey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getAllStaff } = useInventoryStore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const allStaff = getAllStaff();
    const staffMember = allStaff.find(
      (s) => s.passkey === passkey && (s.accessibleStoreIds.length === 0 || s.accessibleStoreIds.includes(storeId))
    );

    if (staffMember) {
      toast({ title: "Access Granted", description: `Welcome, ${staffMember.name}!` });
      onAuthenticated(staffMember);
      setPasskey(''); // Clear passkey for next time
      onOpenChange(false);
    } else {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Invalid employee passkey or not authorized for this store.",
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-primary shadow-lg">
        <DialogHeader>
          <DialogTitle>Employee Authentication</DialogTitle>
          <DialogDescription>
            Enter your employee passkey to proceed with billing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-2">
            <Label htmlFor="employeePasskey" className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Employee Passkey
            </Label>
            <Input
              id="employeePasskey"
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              required
              placeholder="Enter your passkey"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              <LogIn className="mr-2 h-4 w-4" /> {isLoading ? 'Verifying...' : 'Unlock Billing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
