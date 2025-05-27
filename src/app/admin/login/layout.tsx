
// Layout for the admin login page
// This layout does NOT include the AppShell (sidebar, admin header)

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      {/* You can add a temporary border to see if this layout is rendering */}
      {/* <div style={{ border: '2px solid blue', width: '100%', height: '100%' }}> */}
        {children}
      {/* </div> */}
    </div>
  );
}
