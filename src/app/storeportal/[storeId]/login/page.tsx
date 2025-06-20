
"use client";

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams as useNextSearchParams } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function DeprecatedStoreSpecificLoginPage() {
  const router = useRouter();
  const params = useParams();
  const nextSearchParams = useNextSearchParams();
  const storeId = params.storeId as string;

  useEffect(() => {
    const newUrl = new URL('/storeportal', window.location.origin);
    if (storeId) {
      newUrl.searchParams.set('storeId', storeId);
    }
    // Preserve other query params if needed, e.g., companyId if it was ever passed here
    const companyId = nextSearchParams.get('companyId');
    if (companyId) {
        newUrl.searchParams.set('companyId', companyId);
    }
    
    router.replace(newUrl.toString());
  }, [router, storeId, nextSearchParams]);

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
        <span>Redirecting to Store Login...</span>
      </div>
    </div>
  );
}
