
// Layout for store portal pages (login, billing terminal)
// This layout does NOT include the AppShell (sidebar, admin header)
import { TooltipProvider } from '@/components/ui/tooltip';

export default function StorePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted/40">{children}</div>
    </TooltipProvider>
  );
}
