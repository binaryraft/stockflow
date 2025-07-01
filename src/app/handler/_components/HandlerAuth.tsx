
"use client";

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { verifyPassword } from '../actions';
import { CustomerList } from './CustomerList';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function HandlerAuth() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAuth = () => {
    startTransition(async () => {
      const result = await verifyPassword(password);
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: result.error,
        });
      }
    });
  };

  if (isAuthenticated) {
    return <CustomerList />;
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-card rounded-lg shadow-lg border-t-4 border-primary">
      <h2 className="text-2xl font-bold text-center mb-4">Enter Access Key</h2>
      <div className="space-y-4">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter handler password"
          onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
        />
        <Button onClick={handleAuth} className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Access Handler
        </Button>
      </div>
    </div>
  );
}
