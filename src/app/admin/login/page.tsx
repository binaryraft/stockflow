
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
      // If already logged in, redirect to dashboard
      if (localStorage.getItem('isAdminLoggedIn') === 'true') {
        router.replace('/admin');
      }
    }
  }, [router, hasMounted]);

  const handleLogin = () => {
    if (!hasMounted) return;

    setIsSubmitting(true);
    localStorage.setItem('isAdminLoggedIn', 'true');
    router.push('/admin'); 
  };
  
  if (!hasMounted) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4"> {/* Keep centering for this specific loading state */}
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
    <> {/* Layout handles centering now */}
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
