
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
    const plan = getActiveSubscriptionPlan();
    setActivePlanId(plan?.id);
  }, [getActiveSubscriptionPlan]);

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
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-primary hover:text-primary/80"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
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
              const defaultIsAdminOnlyPlan = getActiveSubscriptionPlan()?.id === SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY && !hasMounted;
              const isAdminOnlyPlan = hasMounted ? activePlanId === SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY : defaultIsAdminOnlyPlan;
              
              const isDisabledBySubscription =
                (link.href === '/admin/stores' || link.href === '/admin/staff' || link.href === '/admin/chat') && isAdminOnlyPlan;

              const menuItemContent = (
                <SidebarMenuButton
                  asChild
                  size="default"
                  isActive={pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))}
                  tooltip={link.label}
                  aria-disabled={hasMounted ? isDisabledBySubscription : false}
                  className={cn(hasMounted && isDisabledBySubscription && "opacity-50 cursor-not-allowed")}
                >
                  <Link
                    href={(hasMounted && isDisabledBySubscription) ? "#" : link.href}
                    className={cn("flex items-center gap-3", (hasMounted && isDisabledBySubscription) && "pointer-events-none")}
                    onClick={(e) => { if (hasMounted && isDisabledBySubscription) e.preventDefault(); }}
                  >
                    <link.icon className={cn("h-5 w-5 shrink-0")} />
                    {sidebarState === 'expanded' && <span className="truncate">{link.label}</span>}
                  </Link>
                </SidebarMenuButton>
              );

              return (
                <SidebarMenuItem key={link.href}>
                  {(hasMounted && isDisabledBySubscription && sidebarState === 'expanded') ? (
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
