
"use client";

import React, { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { StaffTable } from '@/components/staff/staff-table';
import { Loader2, Users } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
    <p className="text-muted-foreground">Loading Staff...</p>
  </div>
);

export default function StaffPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Staff Management" icon={Users} />
      <Suspense fallback={<LoadingFallback />}>
        <StaffTable />
      </Suspense>
    </div>
  );
}
