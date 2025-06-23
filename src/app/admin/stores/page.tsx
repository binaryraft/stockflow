
"use client";

import React, { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { StoresTable } from '@/components/stores/stores-table';
import { Building, Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
    <p className="text-muted-foreground">Loading Stores...</p>
  </div>
);

export default function StoresPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Store Management" icon={Building} />
      <Suspense fallback={<LoadingFallback />}>
        <StoresTable />
      </Suspense>
    </div>
  );
}
