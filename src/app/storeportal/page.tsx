
import { Suspense } from 'react';
import { StoreLoginPageClient } from './page-client';
import { APP_NAME } from '@/lib/constants';
import { BrandLogo } from '@/components/common/BrandLogo';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <BrandLogo size={72} glow className="mb-8 animate-pulse rounded-2xl" />
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
