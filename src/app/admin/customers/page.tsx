
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { CustomersTable } from '@/components/customers/customers-table';
import { Contact, Loader2, PlusCircle } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function CustomersContent() {
  const fetchCustomers = useInventoryStore((state) => state.fetchCustomers);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedCompanyId = localStorage.getItem('companyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    } else {
      console.error("Company ID not found in localStorage for CustomersPage.");
      toast({ variant: "destructive", title: "Error", description: "Company context missing. Cannot load customers."});
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (companyId) {
      setIsLoading(true);
      fetchCustomers(companyId).finally(() => setIsLoading(false));
    }
  }, [companyId, fetchCustomers]);

  // Placeholder for Add Customer button action
  const handleAddCustomer = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Manually adding customers will be available in a future update.",
    });
  };
  
  if (isLoading && companyId) {
    return <div className="flex-1 flex items-center justify-center">Fetching customer data...</div>
  }
  if (!isLoading && !companyId) {
    return <div className="flex-1 flex items-center justify-center text-destructive">Could not load customers: Company ID missing.</div>
  }

  return (
    <>
      <PageTitle 
        title="Customers" 
        icon={Contact} 
        actions={
          <Button onClick={handleAddCustomer} disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer (Soon)
          </Button>
        }
      />
      <CustomersTable />
    </>
  );
}

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
    <p className="text-muted-foreground">Loading Customers...</p>
  </div>
);

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<LoadingFallback />}>
        <CustomersContent />
      </Suspense>
    </div>
  );
}
