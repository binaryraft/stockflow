
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LINKS, APP_NAME, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarContent, useSidebar } from '@/components/ui/sidebar'; // Removed SidebarTrigger as it's in header for mobile
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package2, ChevronRight, PanelLeftOpen } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { useInventoryStore } from '@/hooks/use-inventory-store'; // Added for subscription check
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SidebarNav() {
  const pathname = usePathname();
  const { state: sidebarState, toggleSidebar } = useSidebar(); 
  const { getActiveSubscriptionPlan } = useInventoryStore();
  const activePlan = getActiveSubscriptionPlan();

  const isAdminOnlyPlan = activePlan?.id === SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY;

  return (
    <Sidebar className="border-r" collapsible="icon"> 
      <SidebarHeader>
        <div className={cn("flex items-center", sidebarState === 'expanded' ? "justify-between" : "justify-center")}>
          {sidebarState === 'expanded' ? (
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary hover:text-primary/80">
              <Package2 className="h-7 w-7" />
              <span className="truncate">{APP_NAME}</span>
            </Link>
          ) : (
            // When collapsed, header logo acts as expand button
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
              const isDisabledBySubscription = 
                (link.href === '/stores' || link.href === '/staff') && isAdminOnlyPlan;
              
              const menuItemContent = (
                <SidebarMenuButton
                  asChild
                  size="default" 
                  isActive={pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))}
                  tooltip={link.label}
                  disabled={isDisabledBySubscription}
                  aria-disabled={isDisabledBySubscription}
                  className={cn(isDisabledBySubscription && "opacity-50 cursor-not-allowed pointer-events-none")}
                >
                  <Link 
                    href={isDisabledBySubscription ? "#" : link.href} 
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
                  {isDisabledBySubscription && sidebarState === 'expanded' ? (
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
