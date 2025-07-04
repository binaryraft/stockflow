
import { Suspense } from 'react';
import { StoreLoginPageClient } from './page-client';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Image
        src="https://placehold.co/128x128.png"
        alt={`${APP_NAME} Logo`}
        width={64}
        height={64}
        className="mb-3 rounded-lg shadow-md animate-pulse"
        data-ai-hint="logo company"
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
