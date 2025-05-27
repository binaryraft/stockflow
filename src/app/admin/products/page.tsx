
import { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { ProductsTable } from '@/components/products/products-table';
import { Package } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Products" icon={Package} />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Products...</div>}>
        <ProductsTable />
      </Suspense>
    </div>
  );
}
