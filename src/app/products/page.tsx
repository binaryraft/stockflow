import { PageTitle } from '@/components/common/page-title';
import { ProductsTable } from '@/components/products/products-table';
import { Package } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Products" icon={Package} />
      <ProductsTable />
    </div>
  );
}
