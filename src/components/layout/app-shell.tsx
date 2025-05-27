
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
      <div className="flex min-h-screen w-full bg-muted/40"> {/* Base container */}
        <SidebarNav /> {/* Renders the 'peer' Sidebar component */}
        {/* SidebarInset is the main content area that respects the sidebar */}
        <SidebarInset className="flex flex-col flex-1 overflow-x-hidden bg-background"> {/* flex-1 to take remaining space, overflow-x-hidden for safety. Added bg-background here. */}
          <HeaderMain /> {/* Sticky header, child of SidebarInset */}
          {/* This div is the main scrollable content area within SidebarInset */}
          <div className="flex-1 p-4 sm:px-6 sm:py-0 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
