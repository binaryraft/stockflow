
"use client";

import { useState, useEffect, useTransition } from 'react';
import type { Company, User, SubscriptionType } from '@/types';
import { getCustomers, markAsPaid, approveSubscriptionChange, rejectSubscriptionChange, extendSubscription } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isAfter } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, Check, X, CalendarPlus, Power, Search, Building2, User as UserIcon, Mail, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CustomerData {
  company: Company;
  admin: User | null;
}

export function CustomerList() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [extensions, setExtensions] = useState<Record<string, { count: number, unit: 'months' | 'years' }>>({});
  const { toast } = useToast();

  const fetchAndSetCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAndSetCustomers();
  }, []);

  const setRowLoading = (id: string, loading: boolean) => {
    setLoadingMap(prev => ({ ...prev, [id]: loading }));
  };

  const handleUpdateExtension = (companyId: string, field: 'count' | 'unit', value: any) => {
    setExtensions(prev => ({
      ...prev,
      [companyId]: {
        ...(prev[companyId] || { count: 1, unit: 'months' }),
        [field]: value
      }
    }));
  };

  const handleMarkAsPaid = async (companyId: string, subscriptionType: SubscriptionType) => {
    setRowLoading(companyId, true);
    try {
      const result = await markAsPaid(companyId, subscriptionType);
      if (result.success) {
        toast({ title: 'Success', description: `Company activated successfully.` });
        await fetchAndSetCustomers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } finally {
      setRowLoading(companyId, false);
    }
  };

  const handleExtend = async (companyId: string) => {
    const ext = extensions[companyId] || { count: 1, unit: 'months' };
    setRowLoading(companyId, true);
    try {
      const result = await extendSubscription(companyId, ext.count, ext.unit);
      if (result.success) {
        toast({ title: 'Success', description: `Subscription extended by ${ext.count} ${ext.unit}.` });
        await fetchAndSetCustomers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } finally {
      setRowLoading(companyId, false);
    }
  };

  const handleApproveSubscription = async (companyId: string) => {
    setRowLoading(companyId, true);
    try {
      const result = await approveSubscriptionChange(companyId);
      if (result.success) {
        toast({ title: 'Approved', description: 'Subscription change approved.' });
        await fetchAndSetCustomers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } finally {
      setRowLoading(companyId, false);
    }
  };

  const handleRejectSubscription = async (companyId: string) => {
    setRowLoading(companyId, true);
    try {
      const result = await rejectSubscriptionChange(companyId);
      if (result.success) {
        toast({ title: 'Rejected', description: 'Subscription change rejected.' });
        await fetchAndSetCustomers();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } finally {
      setRowLoading(companyId, false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.admin?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-card rounded-2xl border-2 border-dashed border-primary/20 shadow-xl">
        <LoadingSpinner text="Connecting to Sub-Net..." size={50} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/80 backdrop-blur-md p-4 rounded-2xl border border-border shadow-lg">
        <div className="relative w-full md:max-w-lg group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search for companies, owners, or IDs..."
            className="pl-11 bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 h-11 transition-all rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-4 py-2 rounded-xl border border-border">
            Database: {filteredCustomers.length} Records
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Enterprise / Owner</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Deployment Plan</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Subscription Integrity</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Command Center</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map(({ company, admin }) => {
                const creationDate = company.creationDate ? parseISO(company.creationDate) : null;
                let trialEndDate: Date | null = null;
                if (creationDate) {
                  trialEndDate = new Date(creationDate);
                  trialEndDate.setDate(trialEndDate.getDate() + 7);
                }
                const isTrialActive = trialEndDate && new Date() < trialEndDate;
                const isExpired = company.subscriptionExpiryDate && isAfter(new Date(), parseISO(company.subscriptionExpiryDate));
                const currentExt = extensions[company.id] || { count: 1, unit: 'months' };
                const isRowLoading = loadingMap[company.id];

                return (
                  <tr key={company.id} className="hover:bg-muted/10 transition-all group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-foreground tracking-tight group-hover:translate-x-1 transition-transform">{company.name}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-1">
                            <Mail className="h-3 w-3 opacity-60" /> {admin?.email || 'unassigned@system'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-medium">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-sm font-black text-foreground uppercase tracking-tighter">{company.activeSubscriptionId?.replace('plan_', '').replace('_', ' ')}</div>
                        <Badge variant="outline" className="w-fit text-[10px] px-2 py-0 border-primary/20 bg-primary/5 text-primary opacity-80">
                          {company.subscriptionType || 'Monthly'}
                        </Badge>
                        {company.pendingSubscriptionId && (
                          <div className="mt-3 p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 animate-pulse">
                            <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                              <AlertTriangle className="h-3 w-3" /> Upgrade Request
                            </div>
                            <div className="text-[11px] text-amber-900 dark:text-amber-200 font-bold mb-3">
                              To: {company.pendingSubscriptionId}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-7 w-full border-green-500/40 text-green-600 hover:bg-green-500/10" onClick={() => handleApproveSubscription(company.id)} disabled={isRowLoading}>
                                {isRowLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve'}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-full border-red-500/40 text-red-600 hover:bg-red-500/10" onClick={() => handleRejectSubscription(company.id)} disabled={isRowLoading}>
                                {isRowLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reject'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="relative pl-4">
                        <div className={cn("absolute left-0 top-1.5 w-1 h-5 rounded-full transition-all duration-500",
                          company.paymentStatus === 'paid' && !isExpired ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                            isExpired ? "bg-red-500" : "bg-amber-500"
                        )} />

                        {company.paymentStatus === 'paid' ? (
                          <>
                            <div className={cn("text-xs font-black tracking-widest uppercase transition-colors", isExpired ? "text-red-600" : "text-green-600")}>
                              {isExpired ? 'Account Locked' : 'Verified & Active'}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-bold mt-1.5 flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              {isExpired ? 'Terminated:' : 'Renews:'} <span className="text-foreground">{company.subscriptionExpiryDate ? format(parseISO(company.subscriptionExpiryDate), 'MMM d, yyyy') : 'PERMANENT'}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-black tracking-widest uppercase text-amber-600">
                              {isTrialActive ? 'Incubation (Trial)' : 'Action Required'}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-bold mt-1.5 flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              {isTrialActive ? `Ends ${format(trialEndDate!, 'PP')}` : 'Trial Expired'}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex flex-col gap-3 items-end">
                        {company.paymentStatus === 'pending' && !isExpired && (
                          <Button
                            className="bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 h-10 w-full md:w-44 rounded-xl font-bold transition-all"
                            onClick={() => handleMarkAsPaid(company.id, company.subscriptionType || 'monthly')}
                            disabled={isRowLoading}
                          >
                            {isRowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                            Initialize Service
                          </Button>
                        )}

                        <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-transparent group-hover:border-primary/20 group-hover:bg-muted/60 transition-all shadow-inner">
                          <Input
                            type="number"
                            min="1"
                            className="h-9 w-14 text-center px-1 bg-transparent border-none shadow-none font-bold focus-visible:ring-0"
                            value={currentExt.count}
                            onChange={(e) => handleUpdateExtension(company.id, 'count', parseInt(e.target.value) || 1)}
                            disabled={isRowLoading}
                          />
                          <Select
                            value={currentExt.unit}
                            onValueChange={(val) => handleUpdateExtension(company.id, 'unit', val)}
                            disabled={isRowLoading}
                          >
                            <SelectTrigger className="h-9 w-24 text-[11px] font-black uppercase bg-transparent border-none shadow-none focus-visible:ring-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-primary/20 shadow-2xl">
                              <SelectItem value="months">Months</SelectItem>
                              <SelectItem value="years">Years</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant={isExpired ? "default" : "outline"}
                            className={cn("h-9 px-4 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all",
                              isExpired ? "bg-primary hover:bg-primary shadow-md shadow-primary/20" : "bg-background/50 hover:bg-background"
                            )}
                            onClick={() => handleExtend(company.id)}
                            disabled={isRowLoading}
                          >
                            {isRowLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isExpired ? <Power className="h-3.5 w-3.5 mr-1.5" /> : <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />)}
                            {isExpired ? 'Reactivate' : 'Extend'}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="p-32 text-center">
              <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-muted-foreground opacity-30" />
              </div>
              <h3 className="text-lg font-black text-foreground">No records matched</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">We couldn't find any enterprise matching "{searchQuery}" in our subscription grid.</p>
              <Button variant="link" onClick={() => setSearchQuery('')} className="mt-4 text-primary font-black">Clear Search Parameters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
