
import { Suspense } from 'react';
import { StoreLoginPageClient } from './page-client';
import { StorePortalLoading } from '@/components/common/store-portal-loading';

export default function StoreLoginPage() {
  return (
    <Suspense fallback={<StorePortalLoading />}>
      <StoreLoginPageClient />
    </Suspense>
  );
}
