
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { PageTitle } from '@/components/common/page-title';
import { ProductForm } from '@/components/products/product-form';
import type { Product, Bill, ProductAnalytics } from '@/types';
import { useEffect, useState, useMemo } from 'react';
import { Edit, PackageSearch, ChevronLeft, BarChart2, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/utils';
import { ProductFinancialsChart } from '@/components/products/ProductFinancialsChart';
import { ProductSummaryCard } from '@/components/products/ProductSummaryCard';
import { StockLevelsCard } from '@/components/products/StockLevelsCard';


function getQuantityAndContextualInfoInBill(bill: Bill, productId: string): { quantity: number; label: string; colorClass: string } {
    const item = bill.items.find(i => i.productId === productId);
    const quantity = item ? item.quantity : 0;
    
    if (bill.type === 'sell') {
        return { quantity, label: 'Sold', colorClass: 'bg-primary text-primary-foreground hover:bg-primary/90' };
    } else if (bill.type === 'buy') {
        return { quantity, label: 'Purchased', colorClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' };
    } else if (bill.type === 'return') {
        const isDefectiveReturn = item?.isDefective;
        return { 
            quantity, 
            label: isDefectiveReturn ? 'Def. Return' : 'Restock Return', 
            colorClass: isDefectiveReturn 
                ? 'bg-amber-500 text-amber-950 dark:bg-amber-600 dark:text-amber-50' 
                : 'bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-300 border border-green-300 dark:border-green-600' 
        };
    }
    return { quantity, label: 'Qty', colorClass: 'bg-muted text-muted-foreground' };
}


export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  
  const { getProductById, getBillsForProduct, getProductAnalytics, userProfile } = useInventoryStore(state => ({
    getProductById: state.getProductById,
    getBillsForProduct: state.getBillsForProduct,
    getProductAnalytics: state.getProductAnalytics,
    userProfile: state.userProfile
  }));

  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  useEffect(() => {
    setCurrencySymbol(getCurrencySymbol(userProfile.companyCurrency));
  }, [userProfile.companyCurrency]);
  
  useEffect(() => {
    if (productId) {
      setIsLoading(true);
      const fetchedProduct = getProductById(productId);
      setProduct(fetchedProduct || null);
      if (fetchedProduct) {
        setPurchaseHistory(getBillsForProduct(productId));
        setAnalytics(getProductAnalytics(productId));
      }
      setIsLoading(false);
    }
  }, [productId, getProductById, getBillsForProduct, getProductAnalytics]);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center py-10">
        <PageTitle title="Product Not Found" icon={PackageSearch} />
        <p className="text-destructive">The product you are trying to view could not be found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/products">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Products List
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageTitle 
        title={product.name} 
        icon={Package}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/products">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to List
            </Link>
          </Button>
        }
      />
      
      {product.isArchived && (
          <Card className="bg-amber-100 dark:bg-amber-900/30 border-amber-500">
             <CardHeader>
                <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2"><AlertTriangle/> Archived Product</CardTitle>
                <CardDescription className="text-amber-600 dark:text-amber-500">
                    This product has been archived. It is hidden from searches and cannot be added to new bills, but its historical data is preserved. You can unarchive it in the main product list.
                </CardDescription>
             </CardHeader>
          </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-lg h-full">
            <CardHeader>
              <CardTitle>Monthly Financials</CardTitle>
              <CardDescription>
                Revenue, Cost of Goods Sold (COGS), and Profit over the last 12 months.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] pb-4">
              <ProductFinancialsChart productId={product.id} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <ProductSummaryCard analytics={analytics} currencySymbol={currencySymbol} />
          <StockLevelsCard product={product} />
        </div>
      </div>
      
      <div className="mt-2 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Edit Product Details</CardTitle>
            <CardDescription>Modify product information, variants, and other settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm initialData={product} />
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Transaction History</CardTitle>
            <CardDescription>A detailed list of all bills involving this product.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bill ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price/Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseHistory.length > 0 ? (
                    purchaseHistory.map(bill => {
                      const item = bill.items.find(i => i.productId === product.id);
                      if (!item) return null;
                      
                      const transactionInfo = getQuantityAndContextualInfoInBill(bill, product.id);
                      const pricePerUnit = bill.type === 'buy' ? item.costPrice : item.sellPrice;
                      const lineTotal = pricePerUnit * item.quantity;

                      return (
                        <TableRow key={bill.id}>
                          <TableCell className="text-xs">{format(new Date(bill.date), 'PP p')}</TableCell>
                          <TableCell className="font-mono text-xs">{bill.id}</TableCell>
                          <TableCell>
                            <Badge
                                variant={'outline'}
                                className={transactionInfo.colorClass}
                            >
                                {transactionInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.quantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{currencySymbol}{pricePerUnit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">{currencySymbol}{lineTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No transaction history found for this product.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
