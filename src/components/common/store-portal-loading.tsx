"use client";

import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useThemeLogo } from '@/hooks/use-theme-logo';

export function StorePortalLoading() {
  const themeLogo = useThemeLogo();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <Image
        src={themeLogo}
        alt={`${APP_NAME} Logo`}
        width={64}
        height={64}
        className="mb-8 animate-pulse"
      />
      <LoadingSpinner text="Loading Store Portal..." size={50} />
    </div>
  );
}
