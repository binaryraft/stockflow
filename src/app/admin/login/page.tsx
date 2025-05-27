
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // Placeholder if you want actual inputs later
import { Label } from '@/components/ui/label'; // Placeholder
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      // If already logged in, redirect to dashboard
      if (localStorage.getItem('isAdminLoggedIn') === 'true') {
        router.replace('/admin');
      }
    }
  }, [router, hasMounted]);

  const handleLogin = () => {
    if (!hasMounted) return; // Should not happen if button is clickable

    setIsLoading(true);
    localStorage.setItem('isAdminLoggedIn', 'true');
    
    // Use router.push to ensure it adds to history, allowing back button if needed
    // router.replace might be too aggressive if user lands here by mistake.
    // However, for login, typically push is fine.
    router.push('/admin'); 
    
    // No need to setIsLoading(false) here as the page will redirect and unmount.
  };
  
  if (!hasMounted) {
    // Render a minimal loading state or null to prevent rendering form before checks
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4">
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


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
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
          <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
            <LogIn className="mr-2 h-5 w-5" />
            {isLoading ? 'Logging In...' : 'Login as Admin'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
