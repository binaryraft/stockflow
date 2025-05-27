
import { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { StaffTable } from '@/components/staff/staff-table';
import { Users } from 'lucide-react';

export default function StaffPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Staff Management" icon={Users} />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Staff...</div>}>
        <StaffTable />
      </Suspense>
    </div>
  );
}
