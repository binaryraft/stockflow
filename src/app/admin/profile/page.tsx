
"use client";

import { useState, useEffect } from 'react';
import { PageTitle } from '@/components/common/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { useToast } from '@/hooks/use-toast';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import type { SubscriptionPlan } from '@/types';
import { CheckCircle, Edit3, Save, User, BadgeCheck, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { userProfile, updateCompanyName, updateSubscription, getActiveSubscriptionPlan } = useInventoryStore();
  const { toast } = useToast();

  const [companyNameInput, setCompanyNameInput] = useState('');
  const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | undefined>(undefined);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      setCompanyNameInput(userProfile.companyName);
      const currentPlan = getActiveSubscriptionPlan();
      setActivePlan(currentPlan);
    }
  }, [hasMounted, userProfile, getActiveSubscriptionPlan]);

  const handleCompanyNameSave = () => {
    if (companyNameInput.trim() === '') {
      toast({ variant: 'destructive', title: 'Error', description: 'Company name cannot be empty.' });
      return;
    }
    updateCompanyName(companyNameInput.trim());
    setIsEditingCompanyName(false);
    toast({ title: 'Success', description: 'Company name updated.' });
  };

  const handleSubscriptionSelect = (planId: string) => {
    if (planId === SUBSCRIPTION_PLAN_IDS.ENTERPRISE) {
      // In a real app, this would open a contact form or redirect
      toast({ title: 'Enterprise Plan', description: 'Please contact sales for Enterprise pricing and setup.' });
      return;
    }
    updateSubscription(planId);
    // activePlan will be updated by the useEffect watching getActiveSubscriptionPlan
    const selectedPlanDetails = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    toast({ title: 'Subscription Updated', description: `Your plan has been changed to ${selectedPlanDetails?.name}.` });
  };
  
  if (!hasMounted || !activePlan) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <User className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
        <p className="text-lg text-muted-foreground">Loading profile & subscription information...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Profile & Subscription" icon={User} />

      <Card className="shadow-md border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Manage your company details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company Name</Label>
            <div className="flex items-center gap-2">
              {isEditingCompanyName ? (
                <Input
                  id="companyName"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  className="flex-grow"
                />
              ) : (
                <p className="flex-grow p-2 border border-input rounded-md min-h-[40px] flex items-center bg-muted/30">{userProfile.companyName}</p>
              )}
              {isEditingCompanyName ? (
                <Button onClick={handleCompanyNameSave} size="sm">
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingCompanyName(true)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          </div>
           <div className="space-y-1.5">
            <Label>Your Name (Placeholder)</Label>
            <p className="text-sm text-muted-foreground p-2 border border-input rounded-md min-h-[40px] flex items-center bg-muted/30">
              Current User (Full user auth not implemented)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle>Subscription Plan</CardTitle>
          <CardDescription>Choose the plan that best fits your business needs. Your current plan is highlighted.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"> {/* Adjusted grid for 4 plans */}
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={cn(
                "flex flex-col transition-all hover:shadow-xl",
                activePlan.id === plan.id ? 'border-primary ring-2 ring-primary shadow-xl relative' : 'border-border hover:border-primary/50'
              )}
            >
              {activePlan.id === plan.id && (
                <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md">
                  <BadgeCheck className="h-5 w-5" />
                </div>
              )}
               {plan.isPopular && activePlan.id !== plan.id && (
                <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-0.5 text-xs rounded-full font-semibold shadow">
                  Popular
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className={cn("text-xl mb-1", activePlan.id === plan.id && "text-primary")}>{plan.name}</CardTitle>
                {plan.price === -1 ? (
                    <span className="text-3xl font-bold">Contact Us</span>
                ) : (
                    <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-foreground">₹{plan.price}</span>
                        <span className="text-sm text-muted-foreground ml-1">{plan.priceSuffix}</span>
                    </div>
                )}
              </CardHeader>
              <CardContent className="flex-grow space-y-3 pt-0">
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.price === -1 ? (
                    <Button asChild className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                        <a href="mailto:sales@stockflow.app"> {/* Example mailto link */}
                            <Mail className="mr-2 h-4 w-4" /> Contact Sales
                        </a>
                    </Button>
                ) : (
                    <Button
                    className={cn("w-full", activePlan.id === plan.id ? "bg-primary/80 hover:bg-primary/70" : "bg-secondary hover:bg-secondary/90 text-secondary-foreground")}
                    onClick={() => handleSubscriptionSelect(plan.id)}
                    disabled={activePlan.id === plan.id}
                    >
                    {activePlan.id === plan.id ? 'Current Plan' : 'Choose Plan'}
                    </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
