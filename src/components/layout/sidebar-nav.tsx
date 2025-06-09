
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LINKS, APP_NAME, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarContent, useSidebar } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package2, ChevronRight, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import React, { useState, useEffect } from 'react';

export function SidebarNav() {
  const pathname = usePathname();
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const getActiveSubscriptionPlan = useInventoryStore((state) => state.getActiveSubscriptionPlan);
  
  const [hasMounted, setHasMounted] = useState(false);
  const [activePlanId, setActivePlanId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      const plan = getActiveSubscriptionPlan();
      setActivePlanId(plan?.id);
    }
  }, [hasMounted, getActiveSubscriptionPlan]);

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader>
        <div className={cn("flex items-center", sidebarState === 'expanded' ? "justify-between" : "justify-center")}>
          {sidebarState === 'expanded' ? (
            <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg text-primary hover:text-primary/80">
              <Package2 className="h-7 w-7" />
              <span className="truncate">{APP_NAME}</span>
            </Link>
          ) : (
             <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-primary hover:text-primary/80"
                  onClick={toggleSidebar}
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center"><p>Expand Sidebar</p></TooltipContent>
            </Tooltip>
          )}

          {sidebarState === 'expanded' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 ml-auto hidden md:flex"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="flex-1">
          <SidebarMenu className="p-2 pt-0">
            {NAV_LINKS.map((link) => {
              // For SSR and initial client render (before hasMounted or activePlanId is set),
              // assume features are enabled to avoid href="#" mismatches.
              // Actual disabling logic runs client-side.
              const isAdminOnlyPlanOnClient = hasMounted && activePlanId === SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY;
              const isDisabledBySubscription =
                (link.href === '/admin/stores' || link.href === '/admin/staff' || link.href === '/admin/chat') && isAdminOnlyPlanOnClient;

              const menuItemContent = (
                <SidebarMenuButton
                  asChild
                  size="default"
                  isActive={pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))}
                  tooltip={link.label}
                  aria-disabled={isDisabledBySubscription} // Use aria-disabled for <a> tag accessibility
                  className={cn(isDisabledBySubscription && "opacity-50 cursor-not-allowed")}
                >
                  <Link
                    href={link.href} // Always use the actual href
                    className={cn("flex items-center gap-3", isDisabledBySubscription && "pointer-events-none")} // pointer-events-none for visual click disabling
                    onClick={(e) => { if (isDisabledBySubscription) e.preventDefault(); }}
                  >
                    <link.icon className={cn("h-5 w-5 shrink-0")} />
                    {sidebarState === 'expanded' && <span className="truncate">{link.label}</span>}
                  </Link>
                </SidebarMenuButton>
              );

              return (
                <SidebarMenuItem key={link.href}>
                  {(isDisabledBySubscription && sidebarState === 'expanded') ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{menuItemContent}</TooltipTrigger>
                      <TooltipContent side="right" align="start">
                        <p>Upgrade to access this feature.</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    menuItemContent
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
    