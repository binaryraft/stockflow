
"use client"; 

import { AppShell } from '@/components/layout/app-shell';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start true: always check auth on mount
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      // Don't access localStorage or router until mounted
      return;
    }

    // Indicate we are actively checking authentication now
    setIsLoadingAuth(true); 

    const adminLoggedIn = localStorage.getItem('isAdminLoggedIn');
    if (adminLoggedIn === 'true') {
      setIsAuthenticated(true);
      setIsLoadingAuth(false); // Finished check, user is authenticated
    } else {
      setIsAuthenticated(false); // User is not authenticated
      router.replace('/admin/login');
      // Set loading to false AFTER initiating redirect.
      // The component will likely re-render and hit the !isAuthenticated condition below.
      setIsLoadingAuth(false); 
    }
  }, [router, hasMounted]);

  if (!hasMounted || isLoadingAuth) { 
    // Show loading UI if not yet mounted OR if actively checking authentication
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Image 
          src="https://placehold.co/128x128.png" 
          alt={`${APP_NAME} Logo`} 
          width={80} 
          height={80} 
          className="mb-6 rounded-xl shadow-lg animate-pulse"
          data-ai-hint="logo company"
        />
        <p className="text-lg text-muted-foreground">
          {!hasMounted ? "Initializing Admin Portal..." : "Checking authentication..."}
        </p>
      </div>
    );
  }

  // At this point, hasMounted is true AND isLoadingAuth is false.
  // We can reliably use the isAuthenticated state.
  if (!isAuthenticated) {
    // If not authenticated, AdminLayout should not render its children.
    // The router.replace('/admin/login') should have been called by the effect above.
    // Returning null allows the router to take over and render the login page.
    return null; 
  }

  // If authenticated and loading is complete:
  return <AppShell>{children}</AppShell>;
}
