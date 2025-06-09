
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is now effectively replaced by the embedded login on the homepage.
// It will redirect to the homepage.
export default function AdminLoginPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/'); // Redirect to homepage for login
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <p className="text-lg text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}
