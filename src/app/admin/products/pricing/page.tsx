
"use client";

import { useEffect } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { PricingMatrixTable } from '@/components/products/pricing-matrix-table';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Globe, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PricingMatrixPage() {
    const { products, fetchProducts } = useInventoryStore();

    useEffect(() => {
        const companyId = localStorage.getItem('companyId');
        if (companyId) {
            fetchProducts(companyId);
        }
    }, [fetchProducts]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <PageTitle title="International Pricing" icon={Globe} />
                <Button variant="outline" asChild>
                    <Link href="/admin/products">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Global Pricing Configuration</CardTitle>
                    <CardDescription>
                        Manage cost and selling prices for all your product variants in a grid view.
                        This is helpful for quick bulk updates.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PricingMatrixTable products={products} />
                </CardContent>
            </Card>
        </div>
    );
}
