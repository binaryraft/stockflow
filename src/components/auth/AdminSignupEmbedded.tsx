
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME, SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants';
import Image from 'next/image';
import { UserPlus, XCircle, Mail, KeyRound, Building, User as UserIcon, Loader2, CreditCard, Calendar, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventoryStore } from '@/hooks/use-inventory-store';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SubscriptionType } from '@/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AdminSignupEmbeddedProps {
  onSignupSuccess: () => void;
  onCancel: () => void;
  onSwitchToLogin: () => void;
}

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";

export function AdminSignupEmbedded({ onSignupSuccess, onCancel, onSwitchToLogin }: AdminSignupEmbeddedProps) {
  const { toast } = useToast();
  const { fetchCompanyProfile } = useInventoryStore(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [step, setStep] = useState(1);
  
  // Step 1 state
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 state
  const [selectedPlanId, setSelectedPlanId] = useState<string>(SUBSCRIPTION_PLAN_IDS.GROWTH);
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>('monthly');

  const plansToShow = SUBSCRIPTION_PLANS.filter(p => p.price !== -1 && p.id !== SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Signup Failed", description: "Passwords do not match." });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Signup Failed", description: "Password must be at least 6 characters." });
      return;
    }
    if (!companyName || !adminName || !email) {
      toast({ variant: "destructive", title: "Signup Failed", description: "Please fill all required fields." });
      return;
    }
    setStep(2);
  };

  const handleFinalSignup = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName, adminName, email, password,
          planId: selectedPlanId,
          subscriptionType,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        toast({ title: "Account Created!", description: "Your account is ready. Payment confirmation is pending." });
        
        if (data.token) {
            localStorage.setItem(SHARED_AUTH_TOKEN_KEY, data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name || 'Admin');
            localStorage.setItem('userRole', data.user.role || 'admin');
            localStorage.setItem('companyId', data.user.companyId);
            await fetchCompanyProfile(data.user.companyId);
        }
        onSignupSuccess(); 
      } else {
        toast({ variant: "destructive", title: "Signup Failed", description: data.message || "Could not create account." });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({ variant: "destructive", title: "Signup Error", description: "Could not connect to the server." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderStep1 = () => (
    <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Admin Account (1/2)</CardTitle>
        <CardDescription>Set up your company and admin profile.</CardDescription>
      </CardHeader>
      <form onSubmit={handleStep1Submit}>
        <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signup-company-name"><Building className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Company Name*</Label>
              <Input id="signup-company-name" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Company LLC" required disabled={isSubmitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-admin-name"><UserIcon className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Your Name (Admin)*</Label>
              <Input id="signup-admin-name" type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="John Doe" required disabled={isSubmitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email"><Mail className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Admin Email*</Label>
              <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@yourcompany.com" required disabled={isSubmitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password"><KeyRound className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Password* (min. 6 characters)</Label>
              <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a strong password" required minLength={6} disabled={isSubmitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-confirm-password"><KeyRound className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Confirm Password*</Label>
              <Input id="signup-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required minLength={6} disabled={isSubmitting} />
            </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full">Next: Choose Plan <ArrowRight className="ml-2 h-4 w-4"/></Button>
          <Button variant="link" size="sm" onClick={onSwitchToLogin} className="text-xs">Already have an account? Login</Button>
        </CardFooter>
      </form>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-primary">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose Your Plan (2/2)</CardTitle>
        <CardDescription>Select a plan and billing cycle to get started.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={selectedPlanId}
          onValueChange={setSelectedPlanId}
          className="grid grid-cols-1 gap-4"
        >
          {plansToShow.map(plan => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <Label
                key={plan.id}
                htmlFor={plan.id}
                className={cn(
                  "flex flex-col md:flex-row items-start md:items-center gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <RadioGroupItem value={plan.id} id={plan.id} className="h-5 w-5 mt-1 md:mt-0" />
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row justify-between md:items-center">
                    <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                    <p className="text-lg font-bold text-primary">
                      ₹{plan.price}
                      <span className="text-sm font-normal text-muted-foreground">{plan.priceSuffix}</span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {
                      plan.id === SUBSCRIPTION_PLAN_IDS.STARTER ? "Perfect for new businesses getting started." :
                      plan.id === SUBSCRIPTION_PLAN_IDS.GROWTH ? "Ideal for growing businesses needing more capacity." :
                      "For established businesses scaling operations."
                    }
                  </p>
                </div>
              </Label>
            )
          })}
        </RadioGroup>

        <div className="pt-4 border-t">
          <Label className="font-semibold text-center block mb-3">Select Billing Cycle</Label>
          <RadioGroup 
            value={subscriptionType} 
            onValueChange={(v) => setSubscriptionType(v as SubscriptionType)} 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Label htmlFor="monthly-cycle" className={cn("text-center p-4 border rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all", subscriptionType === 'monthly' && 'border-primary bg-primary/5 ring-1 ring-primary')}>
              <RadioGroupItem value="monthly" id="monthly-cycle" />
              <div className="flex flex-col items-center">
                <span className="font-medium">Monthly</span>
                <span className="text-xs text-muted-foreground">Billed every month</span>
              </div>
            </Label>
            <Label htmlFor="yearly-cycle" className={cn("text-center p-4 border rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all", subscriptionType === 'yearly' && 'border-primary bg-primary/5 ring-1 ring-primary')}>
              <RadioGroupItem value="yearly" id="yearly-cycle" />
              <div className="flex flex-col items-center">
                 <span className="font-medium">Yearly</span>
                 <span className="text-xs text-primary">Save 15%</span>
              </div>
            </Label>
          </RadioGroup>
        </div>
        
        <div className="text-center p-3 bg-tertiary rounded-md text-sm text-tertiary-foreground">
          <p className="font-semibold">Manual Payment Process</p>
          <p className="text-xs">After registration, your account is pending. Our team will contact you to complete the payment.</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>Back</Button>
        <Button onClick={handleFinalSignup} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Complete Signup
        </Button>
      </CardFooter>
    </Card>
  );

  if (!hasMounted) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-muted/40 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            <p className="text-muted-foreground">Loading Admin Signup...</p>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
       <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close signup"><XCircle className="h-6 w-6 text-muted-foreground hover:text-foreground" /></Button>
      </div>
      <div className="flex flex-col items-center mb-6">
        <Image src="https://placehold.co/128x128.png" alt={`${APP_NAME} Logo`} width={64} height={64} className="mb-3 rounded-lg shadow-md" data-ai-hint="logo company" />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Admin & Company Registration</p>
      </div>
      {step === 1 ? renderStep1() : renderStep2()}
    </div>
  );
}

