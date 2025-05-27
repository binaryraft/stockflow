
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      if (localStorage.getItem('isAdminLoggedIn') === 'true') {
        router.replace('/admin');
      }
    }
  }, [router, hasMounted]);

  const handleLogin = () => {
    if (!hasMounted) return;

    setIsSubmitting(true);
    localStorage.setItem('isAdminLoggedIn', 'true');
    // Use replace to avoid login page in history after successful login
    router.replace('/admin'); 
  };
  
  if (!hasMounted) {
    // Simplified loading state, actual centering is handled by AdminLoginLayout
    return (
       <div className="flex flex-col items-center justify-center p-4">
         <Image 
          src="https://placehold.co/128x128.png" 
          alt={`${APP_NAME} Logo`} 
          width={64} 
          height={64} 
          className="mb-3 rounded-lg shadow-md animate-pulse"
          data-ai-hint="logo company"
        />
        <p className="text-muted-foreground">Loading login...</p>
      </div>
    );
  }

  // If hasMounted and not redirected by the effect above, show the login form
  return (
    <> {/* AdminLoginLayout handles overall centering */}
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
        <CardContent className="space-y-4">
           <p className="text-sm text-muted-foreground text-center">
            For this demo, click the button below to log in as admin.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} className="w-full" disabled={isSubmitting}>
            <LogIn className="mr-2 h-5 w-5" />
            {isSubmitting ? 'Logging In...' : 'Login as Admin'}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
