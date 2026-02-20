"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarContent, SidebarFooter, useSidebar, SidebarSeparator } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrandLogo } from '../common/BrandLogo';
import { Package2, ChevronRight, ChevronLeft, LayoutDashboard, DollarSign, Package, BookOpen, Settings as SettingsIcon, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react';
import { useP2P } from '@/hooks/use-p2p';
import { useTranslation } from 'react-i18next';

export const LOCAL_NAV_LINKS = [
  {
    title: "Main",
    links: [
      { href: '/local', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/local/billing', label: 'Billing', icon: DollarSign },
      { href: '/local/products', label: 'Products', icon: Package },
      { href: '/local/accounting', label: 'Accounting', icon: BookOpen },
      { href: '/local/profile', label: 'Profile', icon: Package2 },
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
  const { isConnected, peers } = useP2P();
  const { t } = useTranslation();

  return (
    <Sidebar className="border-r border-sidebar-border shadow-md" collapsible="icon">
      <SidebarHeader className="h-16">
        <div className={cn("flex items-center h-full", sidebarState === 'expanded' ? "justify-between pl-3 pr-2" : "justify-center")}>
          {sidebarState === 'expanded' ? (
            <Link href="/local" className="flex items-center gap-2.5 font-bold text-xl text-primary hover:opacity-80 transition-opacity">
              <BrandLogo className="h-7 w-7" />
              <span className="truncate">{APP_NAME} <span className="text-xs font-normal text-muted-foreground">(Local)</span></span>
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
                        tooltip={t(`common.${link.label.toLowerCase()}`, link.label)}
                        className="h-11 text-base font-medium text-sidebar-foreground/80 hover:text-primary data-[active=true]:text-primary data-[active=true]:bg-primary/10 data-[active=true]:font-semibold"
                      >
                        <Link href={link.href} className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 shrink-0" />
                          {sidebarState === 'expanded' && <span className="truncate">{t(`common.${link.label.toLowerCase()}`, link.label)}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {groupIndex < LOCAL_NAV_LINKS.length - 1 && <SidebarSeparator className="my-2" />}
              </React.Fragment>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t bg-sidebar-accent/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-lg transition-colors cursor-help",
              isConnected ? "hover:bg-green-500/10" : "hover:bg-muted"
            )}>
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                isConnected ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
              )}>
                {isConnected ? <Wifi className="h-4 w-4 animate-pulse" /> : <WifiOff className="h-4 w-4" />}
              </div>
              {sidebarState === 'expanded' && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">Distributed Sync</span>
                  <span className={cn(
                    "text-[10px] font-medium truncate",
                    isConnected ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {isConnected ? `${peers.length} active device${peers.length !== 1 ? 's' : ''}` : 'Local Mode Only'}
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="w-56 p-3 shadow-xl border-primary/20 bg-background/95 backdrop-blur-sm">
            <div className="space-y-2">
              <p className="font-semibold text-xs flex items-center gap-2 text-primary">
                {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                P2P Local Network
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Connect other devices on your WiFi to sync bills and inventory in real-time without internet.
              </p>
              {isConnected ? (
                <div className="pt-1.5 border-t mt-1.5 space-y-1.5">
                  <p className="text-[10px] font-bold text-foreground">Connected Devices:</p>
                  <ul className="space-y-1">
                    {peers.slice(0, 3).map(p => (
                      <li key={p.id} className="text-[10px] truncate flex items-center gap-1.5 py-0.5">
                        <div className="h-1 w-1 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                        <span className="truncate">{p.name}</span>
                        <span className="text-[8px] ml-auto bg-green-500/10 text-green-600 px-1 rounded-sm uppercase font-bold">Live</span>
                      </li>
                    ))}
                    {peers.length > 3 && <li className="text-[10px] text-muted-foreground italic pl-2.5">+ {peers.length - 3} more devices</li>}
                  </ul>
                </div>
              ) : (
                <div className="pt-1.5 border-t mt-1.5">
                  <p className="text-[10px] text-amber-600 font-medium">No other devices found</p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  );
}
