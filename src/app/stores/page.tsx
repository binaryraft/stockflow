
import { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { StoresTable } from '@/components/stores/stores-table';
import { Building } from 'lucide-react';

export default function StoresPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Store Management" icon={Building} />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Stores...</div>}>
        <StoresTable />
      </Suspense>
    </div>
  );
}
