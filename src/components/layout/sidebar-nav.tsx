
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarContent, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package2 } from 'lucide-react'; 

export function SidebarNav() {
  const pathname = usePathname();
  const { state: sidebarState, toggleSidebar } = useSidebar(); 

  return (
    <Sidebar className="border-r" collapsible="icon"> 
      <SidebarHeader>
        <div className={cn("flex items-center", sidebarState === 'expanded' ? "justify-between" : "justify-center")}>
            <Link href="/" className={cn("flex items-center gap-2 font-semibold text-lg text-primary hover:text-primary/80", sidebarState === 'collapsed' && "w-full justify-center")}>
              <Package2 className="h-7 w-7" />
              {sidebarState === 'expanded' && <span className="truncate">{APP_NAME}</span>}
            </Link>
          {/* Desktop sidebar toggle button - shown when expanded to allow collapsing */}
          {sidebarState === 'expanded' && (
            <SidebarTrigger className="ml-auto hidden md:flex" />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent> 
        <ScrollArea className="flex-1">
          <SidebarMenu className="p-2 pt-0"> 
            {NAV_LINKS.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  size="default" 
                  isActive={pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))}
                  tooltip={link.label}
                >
                  <Link href={link.href} className="flex items-center gap-3"> 
                    <link.icon className={cn("h-5 w-5 shrink-0")} /> 
                    {sidebarState === 'expanded' && <span className="truncate">{link.label}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
