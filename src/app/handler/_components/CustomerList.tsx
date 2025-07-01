
"use client";

import { useState, useEffect, useTransition } from 'react';
import type { Company, User, SubscriptionType } from '@/types';
import { getCustomers, markAsPaid } from '../actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomerData {
  company: Company;
  admin: User | null;
}

export function CustomerList() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdateTransition] = useTransition();
  const { toast } = useToast();

  const fetchAndSetCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAndSetCustomers();
  }, []);
  
  const handleMarkAsPaid = (companyId: string, subscriptionType: SubscriptionType) => {
    startUpdateTransition(async () => {
      const result = await markAsPaid(companyId, subscriptionType);
      if (result.success) {
        toast({ title: 'Success', description: `Company ${companyId} marked as paid.` });
        // Refresh the list
        await fetchAndSetCustomers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading customer data...</div>;
  }

  return (
    <div className="bg-card p-4 sm:p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Customer Subscriptions</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company / Admin</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan & Cycle</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status & Dates</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200 dark:divide-gray-700">
            {customers.map(({ company, admin }) => {
              const creationDate = company.creationDate ? parseISO(company.creationDate) : null;
              let trialEndDate: Date | null = null;
              if (creationDate) {
                  trialEndDate = new Date(creationDate);
                  trialEndDate.setDate(trialEndDate.getDate() + 7);
              }
              const isTrialActive = trialEndDate && new Date() < trialEndDate;

              return (
              <tr key={company.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{company.name}</div>
                  <div className="text-sm text-gray-500">{admin?.email || 'No admin found'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">{company.activeSubscriptionId}</div>
                  <div className="text-sm text-gray-500 capitalize">{company.subscriptionType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    {company.paymentStatus === 'paid' ? (
                        <>
                            <Badge className="bg-green-100 text-green-800">Paid</Badge>
                            <div className="text-xs text-gray-500 mt-1">
                                Expires: {company.subscriptionExpiryDate ? format(parseISO(company.subscriptionExpiryDate), 'PP') : 'N/A'}
                            </div>
                        </>
                    ) : (
                        <>
                            {isTrialActive ? (
                                <Badge className="bg-blue-100 text-blue-800">7-Day Trial</Badge>
                            ) : (
                                <Badge className="bg-yellow-100 text-yellow-800">Payment Pending</Badge>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                                {isTrialActive ? `Trial Ends: ${format(trialEndDate!, 'PP')}` : 'Trial Expired'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Signed up: {creationDate ? format(creationDate, 'PP') : 'N/A'}
                            </div>
                        </>
                    )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {company.paymentStatus === 'pending' ? (
                     <Button
                        size="sm"
                        onClick={() => handleMarkAsPaid(company.id, company.subscriptionType || 'monthly')}
                        disabled={isUpdating}
                      >
                         {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark as Paid
                      </Button>
                  ) : (
                    <span className="text-green-600 font-semibold">Active</span>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
