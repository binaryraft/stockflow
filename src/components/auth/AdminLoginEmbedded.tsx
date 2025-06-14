
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { LogIn, XCircle, Mail, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminLoginEmbeddedProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
  onSwitchToSignup: () => void; // New prop to switch to signup
}

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";

export function AdminLoginEmbedded({ onLoginSuccess, onCancel, onSwitchToSignup }: AdminLoginEmbeddedProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      const token = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const userRole = localStorage.getItem('userRole');
      if (token && userRole === 'admin') {
        // router.replace('/admin'); // Let onLoginSuccess handle redirection to avoid race conditions with HomePage UI mode
        onLoginSuccess();
      }
    }
  }, [router, hasMounted, onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMounted) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginType: 'admin',
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        localStorage.setItem(SHARED_AUTH_TOKEN_KEY, data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userName', data.userName || 'Admin');
        localStorage.setItem('userRole', data.role || 'admin');
        localStorage.setItem('companyId', data.companyId); // Ensure companyId is stored

        toast({ title: "Login Successful", description: `Welcome, ${data.userName || 'Admin'}!` });
        onLoginSuccess(); // Callback will handle UI switch and potential redirection
        router.replace('/admin'); // Explicitly redirect after success callback
      } else {
        toast({ variant: "destructive", title: "Login Failed", description: data.message || "Invalid credentials or server error." });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({ variant: "destructive", title: "Login Error", description: "Could not connect to the server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasMounted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-muted/40">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md animate-pulse"
          data-ai-hint="logo company"
        />
        <p className="text-muted-foreground">Loading Admin Login...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close login">
          <XCircle className="h-6 w-6 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>
      <div className="flex flex-col items-center mb-8">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md"
          data-ai-hint="logo company"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Admin Portal</p>
      </div>
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>Access the administration panel.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">
                <Mail className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">
                <KeyRound className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="mr-2 h-5 w-5" />
              {isSubmitting ? 'Logging In...' : 'Login as Admin'}
            </Button>
            <Button variant="link" size="sm" onClick={onSwitchToSignup} className="text-xs">
              New user? Sign up
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
    