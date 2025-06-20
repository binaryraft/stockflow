
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { CustomersTable } from '@/components/customers/customers-table';
import { Contact } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomersPage() {
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

  return (
    <div className="flex flex-col gap-6">
      <PageTitle 
        title="Customers" 
        icon={Contact} 
        actions={
          <Button onClick={handleAddCustomer} disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer (Soon)
          </Button>
        }
      />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Customers...</div>}>
        {isLoading && companyId && <div className="flex-1 flex items-center justify-center">Fetching customer data...</div>}
        {!isLoading && !companyId && <div className="flex-1 flex items-center justify-center text-destructive">Could not load customers: Company ID missing.</div>}
        {!isLoading && companyId && <CustomersTable />}
      </Suspense>
    </div>
  );
}
