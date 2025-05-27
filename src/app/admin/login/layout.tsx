
// Layout for the admin login page
// This layout does NOT include the AppShell (sidebar, admin header)

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      {children}
    </div>
  );
}
