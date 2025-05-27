"use client";

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { HeaderMain } from '@/components/layout/header-main';
import { Toaster } from '@/components/ui/toaster';
import { useEffect } from 'react';
import { useInventoryStore } from '@/hooks/use-inventory-store';

export function AppShell({ children }: { children: React.ReactNode }) {
  // Ensure Zustand store is hydrated on client
  useEffect(() => {
    useInventoryStore.persist.rehydrate();
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <SidebarNav />
        <div className="flex flex-col sm:gap-4 sm:py-4 md:pl-[var(--sidebar-width-icon)] group-data-[state=expanded]:md:pl-[var(--sidebar-width)] transition-[padding-left] duration-200 ease-linear">
           {/* The actual sidebar width adjustment is handled by the Sidebar component itself.
               This pl-[...] is a fallback or for content that might not be inside SidebarInset.
               For the main content, SidebarInset should handle its own margins based on sidebar state.
            */}
          <HeaderMain />
          <main className="flex-1 p-4 sm:px-6 sm:py-0">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
