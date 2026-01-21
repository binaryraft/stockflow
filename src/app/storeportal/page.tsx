
import { Suspense } from 'react';
import { StoreLoginPageClient } from './page-client';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Image
        src="/logo.svg"
        alt={`${APP_NAME} Logo`}
        width={64}
        height={64}
        className="mb-8 animate-pulse"
      />
      <LoadingSpinner text="Loading Store Portal..." size={50} />
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
