
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarContent, useSidebar, SidebarSeparator } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronLeft, LayoutDashboard, DollarSign, Package, BookOpen, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';
import { BrandMark } from '@/components/common/brand-mark';

export const LOCAL_NAV_LINKS = [
  {
    title: "Main",
    links: [
      { href: '/local', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/local/billing', label: 'Billing', icon: DollarSign },
      { href: '/local/products', label: 'Products', icon: Package },
      { href: '/local/accounting', label: 'Accounting', icon: BookOpen },
    ]
  },
  {
      title: "Settings",
      links: [
        { href: '/local/settings', label: 'Settings', icon: SettingsIcon },
      ]
  }
];

export function LocalSidebarNav() {
  const pathname = usePathname();
  const { state: sidebarState, toggleSidebar } = useSidebar();

  return (
    <Sidebar className="border-r border-sidebar-border shadow-md" collapsible="icon">
      <SidebarHeader className="h-16">
        <div className={cn("flex items-center h-full", sidebarState === 'expanded' ? "justify-between pl-3 pr-2" : "justify-center")}>
          {sidebarState === 'expanded' ? (
            <BrandMark href="/local" preferCompanyBrand showLocalBadge textClassName="text-xl" />
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
            {LOCAL_NAV_LINKS.map((group, groupIndex) => (
              <React.Fragment key={group.title || `group-${groupIndex}`}>
                {group.title && sidebarState === 'expanded' && (
                  <h4 className="text-xs font-semibold text-muted-foreground/70 tracking-wider uppercase px-3 py-2">
                    {group.title}
                  </h4>
                )}
                {group.links.map((link) => {
                  const isActive = pathname === link.href || (link.href !== "/local" && pathname.startsWith(link.href));
                  return (
                    <SidebarMenuItem key={link.href}>
                        <SidebarMenuButton
                        asChild
                        size="default"
                        isActive={isActive}
                        tooltip={link.label}
                        className="h-11 text-base font-medium text-sidebar-foreground/80 hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-primary/10 data-[active=true]:font-semibold"
                        >
                        <Link href={link.href} className="flex items-center gap-3">
                            <link.icon className="h-5 w-5 shrink-0" />
                            {sidebarState === 'expanded' && <span className="truncate">{link.label}</span>}
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {groupIndex < LOCAL_NAV_LINKS.length -1 && <SidebarSeparator className="my-2" />}
              </React.Fragment>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
