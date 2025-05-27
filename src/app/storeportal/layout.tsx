
// Layout for store portal pages (login, billing terminal)
// This layout does NOT include the AppShell (sidebar, admin header)

export default function StorePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-muted/40">{children}</div>;
}
