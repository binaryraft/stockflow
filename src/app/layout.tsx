
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
// Removed AppShell import
import { APP_NAME } from '@/lib/constants';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster'; // Keep Toaster here

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${APP_NAME} - Inventory Management & Billing`, // Updated title
  description: 'Modern inventory management and billing solution for businesses of all sizes.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children} {/* AppShell is no longer here */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
