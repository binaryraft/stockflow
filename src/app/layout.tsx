
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { APP_NAME } from '@/lib/constants';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster'; 

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${APP_NAME} - Inventory Management & Billing`,
  description: 'Modern inventory management and billing solution for businesses of all sizes.',
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
          {children} {/* Children will be the specific page content with its own layout if defined */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
