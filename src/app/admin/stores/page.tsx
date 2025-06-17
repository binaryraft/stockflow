
"use client"; // Ensure this page is a client component to use hooks

import React, { Suspense, useEffect, useState } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { StoresTable } from '@/components/stores/stores-table';
import { Building } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';

export default function StoresPage() {
  const fetchStores = useInventoryStore((state) => state.fetchStores);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem('companyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    } else {
      console.error("Company ID not found in localStorage for StoresPage.");
      setIsLoading(false); // Allow rendering of error or empty state
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      setIsLoading(true);
      fetchStores(companyId).finally(() => setIsLoading(false));
    }
  }, [companyId, fetchStores]);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Store Management" icon={Building} />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Stores...</div>}>
        {isLoading && companyId && <div className="flex-1 flex items-center justify-center">Fetching stores...</div>}
        {!isLoading && !companyId && <div className="flex-1 flex items-center justify-center text-destructive">Could not load stores: Company ID missing.</div>}
        {!isLoading && companyId && <StoresTable />}
      </Suspense>
    </div>
  );
}
