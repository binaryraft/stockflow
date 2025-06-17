
"use client"; // Ensure this page is a client component

import React, { Suspense, useEffect, useState } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { StaffTable } from '@/components/staff/staff-table';
import { Users } from 'lucide-react';
import { useInventoryStore } from '@/hooks/use-inventory-store';

export default function StaffPage() {
  const fetchStaff = useInventoryStore((state) => state.fetchStaff);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem('companyId');
    if (storedCompanyId) {
      setCompanyId(storedCompanyId);
    } else {
      console.error("Company ID not found in localStorage for StaffPage.");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      setIsLoading(true);
      fetchStaff(companyId).finally(() => setIsLoading(false));
    }
  }, [companyId, fetchStaff]);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Staff Management" icon={Users} />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Staff...</div>}>
        {isLoading && companyId && <div className="flex-1 flex items-center justify-center">Fetching staff...</div>}
        {!isLoading && !companyId && <div className="flex-1 flex items-center justify-center text-destructive">Could not load staff: Company ID missing.</div>}
        {!isLoading && companyId && <StaffTable />}
      </Suspense>
    </div>
  );
}
