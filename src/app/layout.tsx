import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; // Corrected import
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { APP_NAME } from '@/lib/constants';

const geistSans = Geist({ // Corrected usage
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({ // Corrected usage
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${APP_NAME} - Inventory Management`,
  description: 'Modern inventory management and billing solution.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
