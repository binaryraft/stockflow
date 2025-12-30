
import { Suspense } from 'react';
import { StoreLoginPageClient } from './page-client';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Image
        src="/logo.svg"
        alt={`${APP_NAME} Logo`}
        width={64}
        height={64}
        className="mb-3 animate-pulse"
      />
      <div className="flex items-center gap-2 text-lg text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading Store Portal...</span>
      </div>
    </div>
  );
}

export default function StoreLoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StoreLoginPageClient />
    </Suspense>
  );
}
