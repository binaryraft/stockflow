
"use client";

import React, { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { StaffTable } from '@/components/staff/staff-table';
import { Users } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center p-12">
    <LoadingSpinner text="Loading Staff..." />
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
