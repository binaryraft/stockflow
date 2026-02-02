
"use client";

import { useState } from "react";
import { useInventoryStore } from "@/hooks/use-inventory-store";
import { type Product } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface PricingMatrixTableProps {
    products: Product[];
    storeId?: string;
}

export function PricingMatrixTable({ products }: PricingMatrixTableProps) {
    const { updateProduct } = useInventoryStore();
    const { toast } = useToast();
    // Map key: productId_field -> value
    const [editingValues, setEditingValues] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);

    const getFieldId = (productId: string, field: 'sellPrice' | 'costPrice') => `${productId}_${field}`;

    const handlePriceChange = (productId: string, field: 'sellPrice' | 'costPrice', value: string) => {
        const numValue = parseFloat(value);
        setEditingValues(prev => ({
            ...prev,
            [getFieldId(productId, field)]: isNaN(numValue) ? 0 : numValue
        }));
    };

    const hasChanges = Object.keys(editingValues).length > 0;

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const companyId = localStorage.getItem('companyId');
            if (!companyId) throw new Error("No company context");

            // Group changes by product
            const productUpdates: Record<string, Partial<Product>> = {};

            Object.entries(editingValues).forEach(([key, value]) => {
                const [productId, field] = key.split('_');

                if (!productUpdates[productId]) {
                    productUpdates[productId] = {};
                }

                if (field === 'sellPrice') productUpdates[productId].sellPrice = value;
                if (field === 'costPrice') productUpdates[productId].costPrice = value;
            });

            // Execute updates
            await Promise.all(
                Object.entries(productUpdates).map(([productId, updates]) =>
                    updateProduct(productId, updates, companyId) // Note: updateProduct signature in store might vary, checking usage
                )
            );

            toast({ title: "Pricing Updated", description: "All changes have been saved successfully." });
            setEditingValues({});
        } catch (error) {
            console.error("Error saving pricing matrix:", error);
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save changes." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg border">
                <h3 className="text-lg font-semibold">International Pricing Matrix</h3>
                <Button onClick={handleSaveAll} disabled={!hasChanges || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes ({Object.keys(editingValues).length})
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Product Name</TableHead>
                            <TableHead className="w-[150px]">SKU / Code</TableHead>
                            <TableHead className="w-[150px]">Cost Price</TableHead>
                            <TableHead className="w-[150px]">Selling Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => {
                            const sellKey = getFieldId(product.id, 'sellPrice');
                            const costKey = getFieldId(product.id, 'costPrice');

                            return (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                        {product.name}
                                        {product.variants && product.variants.length > 0 && (
                                            <span className="ml-2 text-xs text-muted-foreground bg-muted px-1 rounded">Variants Managed</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono text-muted-foreground">
                                        {product.sku || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={editingValues[costKey] !== undefined ? editingValues[costKey] : (product.costPrice || 0)}
                                            onChange={(e) => handlePriceChange(product.id, 'costPrice', e.target.value)}
                                            className="h-8 w-32"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={editingValues[sellKey] !== undefined ? editingValues[sellKey] : (product.sellPrice || 0)}
                                            onChange={(e) => handlePriceChange(product.id, 'sellPrice', e.target.value)}
                                            className="h-8 w-32"
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
