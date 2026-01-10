
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Delete, LogIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeePasskeyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  companyId?: string | null;
  onAuthenticated: (employee: any) => void;
}

export function EmployeePasskeyDialog({
  isOpen,
  onOpenChange,
  storeId,
  companyId: companyIdProp,
  onAuthenticated,
}: EmployeePasskeyDialogProps) {
  const [employeePassword, setEmployeePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isErrorShake, setIsErrorShake] = useState(false);
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (companyIdProp) {
        setCompanyId(companyIdProp);
      } else if (typeof window !== 'undefined') {
        const storedCompanyId = localStorage.getItem('companyId');
        if (storedCompanyId) {
          setCompanyId(storedCompanyId);
        } else {
          // Minimal logging to avoid console spam in prod
        }
      }
      // Focus input on open for keyboard users
      setTimeout(() => inputRef.current?.focus(), 100);
      setEmployeePassword('');
      setIsErrorShake(false);
    }
  }, [isOpen, companyIdProp]);

  const handlePinClick = (digit: string) => {
    setEmployeePassword((prev) => prev + digit);
  };

  const handleClear = () => {
    setEmployeePassword('');
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setEmployeePassword((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const cancelDialog = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!companyId) {
      toast({ variant: "destructive", title: "Error", description: "Company context missing." });
      return;
    }
    if (!employeePassword) return;

    setIsLoading(true);
    setIsErrorShake(false);

    try {
      const response = await fetch('/api/auth/verify-employee-passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeePassword: employeePassword,
          storeId: storeId,
          companyId: companyId,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success && data.employee) {
        toast({ title: "Authorized", description: `Transacting as ${data.employee.name}` });
        onAuthenticated(data.employee);
        setEmployeePassword('');
        onOpenChange(false);
      } else {
        setIsErrorShake(true);
        // Clear password on error after a brief delay so user sees shake
        setTimeout(() => setEmployeePassword(''), 500);
        setTimeout(() => setIsErrorShake(false), 600);
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "Invalid credentials.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast({ variant: "destructive", title: "Error", description: "Connection failed." });
    }
    setIsLoading(false);
    // Keep focus
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isLoading) onOpenChange(open); }}>
      <DialogContent className={cn("sm:max-w-xs p-0 border-0 bg-transparent shadow-none [&>button]:hidden")}>
        <div className={cn(
          "bg-background border rounded-lg shadow-2xl overflow-hidden transition-transform",
          isErrorShake ? "animate-shake border-destructive/50" : "border-border"
        )}>
          <DialogHeader className="p-4 pb-2 text-center bg-muted/30">
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Authorization
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your staff passkey.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="relative">
              <Input
                ref={inputRef}
                type="password"
                value={employeePassword}
                onChange={(e) => setEmployeePassword(e.target.value)}
                className="text-center text-2xl tracking-widest font-mono h-12 bg-muted/50 focus-visible:ring-offset-0"
                placeholder="••••••"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant="outline"
                  className="h-14 text-xl font-medium bg-background hover:bg-muted/50 active:scale-95 transition-all"
                  onClick={() => handlePinClick(num.toString())}
                  disabled={isLoading}
                >
                  {num}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                className="h-14 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClear}
                disabled={isLoading}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 text-xl font-medium bg-background hover:bg-muted/50 active:scale-95 transition-all"
                onClick={() => handlePinClick('0')}
                disabled={isLoading}
              >
                0
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-14 hover:bg-muted/50"
                onClick={handleBackspace}
                disabled={isLoading || employeePassword.length === 0}
              >
                <Delete className="w-6 h-6 text-muted-foreground" />
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={cancelDialog} className="flex-1" disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn("flex-1 bg-primary text-primary-foreground hover:bg-primary/90")}
                disabled={isLoading || employeePassword.length === 0}
              >
                {isLoading ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Verify
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </Dialog>
  );
}
