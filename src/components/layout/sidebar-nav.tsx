"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package2 } from 'lucide-react'; // Using Package2 as a logo icon

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Package2 className="h-7 w-7 text-primary" />
          <span>{APP_NAME}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent asChild>
        <ScrollArea className="flex-1">
          <SidebarMenu className="p-4 pt-0">
            {NAV_LINKS.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))}
                  tooltip={link.label}
                  className={cn(
                    (pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)))
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "hover:bg-accent/50 dark:hover:bg-accent/10",
                    "justify-start"
                  )}
                >
                  <Link href={link.href}>
                    <link.icon className="h-5 w-5 mr-3" />
                    <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
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
