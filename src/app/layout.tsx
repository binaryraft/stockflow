
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import '@/lib/i18n';
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
  title: 'EcBills | Smart Inventory & Billing',
  description: 'EcBills - The most efficient billing and inventory management software for modern businesses.',
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
