
import { Suspense } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { ProductsTable } from '@/components/products/products-table';
import { Loader2, Package } from 'lucide-react';

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
    <p className="text-muted-foreground">Loading Products...</p>
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
