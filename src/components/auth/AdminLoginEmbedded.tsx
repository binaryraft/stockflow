
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { LogIn, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminLoginEmbeddedProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";

export function AdminLoginEmbedded({ onLoginSuccess, onCancel }: AdminLoginEmbeddedProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Use states for input fields if we were to make them dynamic
  // const [email, setEmail] = useState('admin@stockflow.app');
  // const [password, setPassword] = useState('password123');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      const token = localStorage.getItem(SHARED_AUTH_TOKEN_KEY);
      const userRole = localStorage.getItem('userRole');
      if (token && userRole === 'admin') {
        router.replace('/admin');
        onLoginSuccess();
      }
    }
  }, [router, hasMounted, onLoginSuccess]);

  const handleLogin = async () => {
    if (!hasMounted) return;
    setIsSubmitting(true);

    try {
      // In a real form, these would come from state linked to input fields
      const adminEmail = 'admin@stockflow.app';
      const adminPassword = 'password123';

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginType: 'admin',
          email: adminEmail, // Use dynamic email if form exists
          password: adminPassword, // Use dynamic password if form exists
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        localStorage.setItem(SHARED_AUTH_TOKEN_KEY, data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userName', data.userName || 'Admin');
        localStorage.setItem('userRole', data.role || 'admin');
        localStorage.setItem('companyId', data.companyId || 'comp_default_001'); // Store companyId

        toast({ title: "Login Successful", description: `Welcome, ${data.userName || 'Admin'}!` });
        router.replace('/admin');
        onLoginSuccess();
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
          <CardDescription>Access the administration panel. <br/> (Demo: admin@stockflow.app / password123)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-sm text-muted-foreground text-center">
            For this demo, click the button below to log in as admin.
          </p>
          {/* Future: Add actual input fields here for email and password */}
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} className="w-full" disabled={isSubmitting}>
            <LogIn className="mr-2 h-5 w-5" />
            {isSubmitting ? 'Logging In...' : 'Login as Admin'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
