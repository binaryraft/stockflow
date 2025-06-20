
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LINKS, APP_NAME, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarContent, useSidebar } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package2, ChevronRight, PanelLeftOpen, ChevronLeft } from 'lucide-react';
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
    <Sidebar className="border-r border-sidebar-border shadow-md" collapsible="icon">
      <SidebarHeader className="h-16">
        <div className={cn("flex items-center h-full", sidebarState === 'expanded' ? "justify-between pl-3 pr-2" : "justify-center")}>
          {sidebarState === 'expanded' ? (
            <Link href="/admin" className="flex items-center gap-2.5 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
              <Package2 className="h-7 w-7" />
              <span className="truncate">{APP_NAME}</span>
            </Link>
          ) : (
             <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-primary hover:text-primary/80 hover:bg-sidebar-accent"
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
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hidden md:flex text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    onClick={toggleSidebar}
                    aria-label="Collapse sidebar"
                    >
                    <ChevronLeft className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center"><p>Collapse Sidebar</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <ScrollArea className="flex-1">
          <SidebarMenu className="px-2">
            {NAV_LINKS.map((link) => {
              const isAdminOnlyPlanOnClient = hasMounted && activePlanId === SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY;
              const isDisabledBySubscription =
                (link.href === '/admin/stores' || link.href === '/admin/staff' || link.href === '/admin/chat') && isAdminOnlyPlanOnClient;

              const menuItemContent = (
                <SidebarMenuButton
                  asChild
                  size="default"
                  isActive={pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))}
                  tooltip={link.label}
                  aria-disabled={isDisabledBySubscription}
                  className={cn(
                    "h-11 text-base font-medium text-sidebar-foreground/80 hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-primary/10 data-[active=true]:font-semibold",
                    isDisabledBySubscription && "opacity-50 cursor-not-allowed !bg-transparent !text-sidebar-foreground/50 hover:!text-sidebar-foreground/50"
                  )}
                >
                  <Link
                    href={link.href} 
                    className={cn("flex items-center gap-3", isDisabledBySubscription && "pointer-events-none")} 
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
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>{menuItemContent}</TooltipTrigger>
                      <TooltipContent side="right" align="start" className="ml-2">
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

    