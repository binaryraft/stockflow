
"use client";

import { useParams } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { PageTitle } from '@/components/common/page-title';
import { ProductForm } from '@/components/products/product-form';
import type { Product } from '@/types';
import { useEffect, useState } from 'react';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function EditProductPage() {
  const params = useParams();
  const productId = params.productId as string;
  const { getProductById } = useInventoryStore();

  const [product, setProduct] = useState<Product | null | undefined>(undefined); // undefined for loading, null for not found

  useEffect(() => {
    if (productId) {
      const fetchedProduct = getProductById(productId);
      setProduct(fetchedProduct || null);
    }
  }, [productId, getProductById]);

  if (product === undefined) {
    return <div className="flex-1 flex items-center justify-center">Loading product details...</div>;
  }

  if (product === null) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center py-10">
        <PageTitle title="Product Not Found" icon={Edit} />
        <p className="text-destructive">The product you are trying to edit could not be found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/products">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Products List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={`Edit Product: ${product.name}`} icon={Edit} 
        actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to List
              </Link>
            </Button>
        }
      />
      <ProductForm initialData={product} />
    </div>
  );
}

    