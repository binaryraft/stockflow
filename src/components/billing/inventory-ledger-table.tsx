
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, PackageSearch, TrendingUp, TrendingDown, RotateCcw, AlertTriangle, Archive } from 'lucide-react';
import type { ProductLedgerEntry } from '@/types';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import Image from 'next/image';

type SortableLedgerColumns = keyof Omit<ProductLedgerEntry, 'productId' | 'category'> | 'category' | 'productName';


export function InventoryLedgerTable() {
  const getProductLedgerSummary = useInventoryStore(state => state.getProductLedgerSummary);
  const getProductById = useInventoryStore(state => state.getProductById); // To fetch image URL

  const [ledgerEntries, setLedgerEntries] = useState<ProductLedgerEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableLedgerColumns; direction: 'ascending' | 'descending' } | null>({ key: 'productName', direction: 'ascending' });
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      setLedgerEntries(getProductLedgerSummary());
    }
  }, [hasMounted, getProductLedgerSummary]);


  const filteredAndSortedEntries = useMemo(() => {
    let processEntries = [...ledgerEntries];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processEntries = processEntries.filter(entry =>
        entry.productName.toLowerCase().includes(lowerSearchTerm) ||
        (entry.category && entry.category.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (sortConfig !== null) {
      processEntries.sort((a, b) => {
        let valA = a[sortConfig.key as keyof ProductLedgerEntry];
        let valB = b[sortConfig.key as keyof ProductLedgerEntry];

        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (valA === 'N/A' && typeof valB === 'number') {
          comparison = 1; // N/A comes after numbers
        } else if (typeof valA === 'number' && valB === 'N/A') {
          comparison = -1; // N/A comes after numbers
        }
        
        return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
      });
    }
    return processEntries;
  }, [ledgerEntries, searchTerm, sortConfig]);

  const requestSort = (key: SortableLedgerColumns) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between mb-4 gap-2 p-4 border rounded-lg bg-muted/50 shadow">
        <Input
          placeholder="Search products (name, category)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md w-full md:w-auto bg-background"
        />
        {/* Add other filters like category if needed later */}
      </div>
      <div className="border rounded-lg overflow-hidden shadow-lg border-t-2 border-t-primary">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] py-3 px-4">Img</TableHead>
              <TableHead onClick={() => requestSort('productName')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 min-w-[200px]">
                Product Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('category')} className="cursor-pointer hover:bg-muted/50 py-3 px-4 hidden md:table-cell">
                Category <ArrowUpDown className="ml-2 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('totalPurchased')} className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4">
                Purchased <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('totalSold')} className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4">
                Sold <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('totalRestockedReturns')} className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4 hidden sm:table-cell">
                Restocked <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('totalDefectiveReturns')} className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4 hidden sm:table-cell">
                Defective <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('currentStock')} className="text-right cursor-pointer hover:bg-muted/50 py-3 px-4">
                Current Stock <ArrowUpDown className="ml-1 h-3 w-3 inline" />
              </TableHead>
              <TableHead className="text-right py-3 px-4 w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedEntries.length > 0 ? (
              filteredAndSortedEntries.map((entry) => {
                const productDetails = getProductById(entry.productId);
                return (
                <TableRow key={entry.productId}>
                  <TableCell className="py-2 px-3">
                    <Image
                      src={productDetails?.imageUrl || `https://placehold.co/48x48.png?text=${entry.productName.charAt(0)}`}
                      alt={entry.productName}
                      width={32}
                      height={32}
                      className="rounded object-cover aspect-square"
                      data-ai-hint="product item generic"
                    />
                  </TableCell>
                  <TableCell className="font-medium py-3 px-4">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href={`/admin/products/${entry.productId}`} className="hover:underline hover:text-primary transition-colors">
                                {entry.productName}
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent><p>View/Edit Product Details</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="py-3 px-4 hidden md:table-cell">
                    {entry.category ? <Badge variant="secondary">{entry.category}</Badge> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4 text-blue-600 dark:text-blue-400">{entry.totalPurchased}</TableCell>
                  <TableCell className="text-right py-3 px-4 text-green-600 dark:text-green-400">{entry.totalSold}</TableCell>
                  <TableCell className="text-right py-3 px-4 text-teal-600 dark:text-teal-400 hidden sm:table-cell">{entry.totalRestockedReturns}</TableCell>
                  <TableCell className="text-right py-3 px-4 text-orange-600 dark:text-orange-400 hidden sm:table-cell">{entry.totalDefectiveReturns}</TableCell>
                  <TableCell className={cn("text-right py-3 px-4 font-semibold", entry.currentStock !== 'N/A' && entry.currentStock <= 0 ? "text-destructive" : "text-primary")}>
                    {entry.currentStock}
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild>
                                <Link href={`/admin/products/${entry.productId}`}>
                                    <PackageSearch className="h-4 w-4" />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>View Product Details & History</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center py-3 px-4">
                  No product ledger data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
