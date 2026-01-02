
"use client";

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types'; // Changed Staff to User
import { KeyRound, LogIn } from 'lucide-react';

interface EmployeePasskeyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  companyId?: string | null;
  onAuthenticated: (employee: any) => void; // Using any to avoid strict type mismatch with partial object, or we can use Pick<User, ...>
}

export function EmployeePasskeyDialog({
  isOpen,
  onOpenChange,
  storeId,
  companyId: companyIdProp,
  onAuthenticated,
}: EmployeePasskeyDialogProps) {
  const [employeePassword, setEmployeePassword] = useState(''); // Changed from passkey to password
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch companyId from localStorage when component mounts or dialog opens
    if (isOpen) {
      if (companyIdProp) {
        setCompanyId(companyIdProp);
      } else if (typeof window !== 'undefined') {
        const storedCompanyId = localStorage.getItem('companyId');
        if (storedCompanyId) {
          setCompanyId(storedCompanyId);
        } else {
          // This case should ideally not happen if an admin/employee is triggering this
          // from an authenticated session where companyId was stored.
          console.error("Company ID not found in localStorage for employee verification.");
          toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Company context is missing. Cannot verify employee.",
          });
          onOpenChange(false); // Close dialog if company context is missing
        }
      }
    }
  }, [isOpen, toast, onOpenChange, companyIdProp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast({ variant: "destructive", title: "Error", description: "Company context not available." });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-employee-passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeePassword: employeePassword, // Send the entered password
          storeId: storeId,
          companyId: companyId, // Send companyId from the current session
        }),
      });
      const data = await response.json();

      if (response.ok && data.success && data.employee) {
        toast({ title: "Access Granted", description: `Welcome, ${data.employee.name}!` });
        onAuthenticated(data.employee);
        setEmployeePassword('');
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: data.message || "Invalid employee credentials or not authorized.",
        });
      }
    } catch (error) {
      console.error("Employee passkey verification error:", error);
      toast({ variant: "destructive", title: "Verification Error", description: "Could not connect to the server." });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-primary shadow-lg">
        <DialogHeader>
          <DialogTitle>Employee Authentication</DialogTitle>
          <DialogDescription>
            Enter your employee password to authorize this transaction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4 space-y-2">
            <Label htmlFor="employeePasswordAuth">
              <KeyRound className="mr-2 h-4 w-4 text-muted-foreground inline" /> Employee Password
            </Label>
            <Input
              id="employeePasswordAuth"
              type="password"
              value={employeePassword}
              onChange={(e) => setEmployeePassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !companyId} className="w-full">
              <LogIn className="mr-2 h-4 w-4" /> {isLoading ? 'Verifying...' : 'Authorize Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
