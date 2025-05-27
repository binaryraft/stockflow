
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google'; // Changed
import './globals.css';
import { APP_NAME } from '@/lib/constants';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ // Changed
  variable: '--font-inter', // Changed
  subsets: ['latin'],
});

const robotoMono = Roboto_Mono({ // Changed
  variable: '--font-roboto-mono', // Changed
  subsets: ['latin'],
  weight: ['400', '700'] // Added weight for Roboto Mono
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
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}> {/* Changed */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
