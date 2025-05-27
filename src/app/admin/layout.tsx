
"use client"; // AppShell uses client-side hooks

import { AppShell } from '@/components/layout/app-shell';
import { useEffect } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure Zustand store is hydrated on client for admin section
  // This was previously in the root AppShell, now specific to admin layout
  useEffect(() => {
    // Zustand's persist middleware handles rehydration automatically.
    // The _hydrate method in the store is called via onRehydrateStorage.
    // No explicit call to useInventoryStore.persist.rehydrate() is needed here.
  }, []);

  return <AppShell>{children}</AppShell>;
}
