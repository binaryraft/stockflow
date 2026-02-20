
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { APP_NAME } from '@/lib/constants';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AITrigger } from '@/components/ai/AITrigger';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  weight: ['400', '700']
});

export const metadata: Metadata = {
  title: 'StockFlow | Free Smart Inventory & Billing Management System',
  description: 'Experience the best free inventory management system. StockFlow helps businesses handle billing, stock tracking, and professional reports with ease. Cloud-ready and local-first.',
  keywords: ['free inventory management system', 'billing software', 'stock tracking', 'open source erp', 'inventory app', 'gst billing software'],
  authors: [{ name: 'StockFlow Team' }],
  openGraph: {
    title: 'StockFlow | Smart Free Inventory & Billing',
    description: 'The ultimate free tool for small businesses to manage stock and billing.',
    url: 'https://stockflow.tech',
    siteName: 'StockFlow',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockFlow | Free Inventory Management',
    description: 'Manage your business stock and billing for free.',
  },
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

import { P2PProvider } from '@/hooks/use-p2p';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <P2PProvider>
            {children}
            <Toaster />
            <AITrigger />
          </P2PProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
