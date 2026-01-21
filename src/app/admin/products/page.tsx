
import { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { ProductsTable } from '@/components/products/products-table';
import { Package } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center p-12">
    <LoadingSpinner text="Loading Products..." />
  </div>
);

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Products" icon={Package} />
      <Suspense fallback={<LoadingFallback />}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}
