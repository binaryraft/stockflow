
"use client"; 

import { AppShell } from '@/components/layout/app-shell';
import { useEffect } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure Zustand store is hydrated on client for admin section
  useEffect(() => {
    // Zustand's persist middleware handles rehydration automatically.
    // The _hydrate method in the store is called via onRehydrateStorage.
  }, []);

  return <AppShell>{children}</AppShell>;
}
