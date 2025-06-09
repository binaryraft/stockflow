
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { CheckCircle, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PricingSectionLanding() {
  // For landing page, no plan is "active" by default. We can highlight a popular one.
  const popularPlanId = SUBSCRIPTION_PLANS.find(p => p.isPopular)?.id;

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Flexible <span className="text-primary">Pricing Plans</span>
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-lg text-muted-foreground">
            Choose the plan that best fits your business needs. No hidden fees, upgrade anytime.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3 items-start max-w-5xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={cn(
                "flex flex-col transition-all hover:shadow-xl shadow-md",
                plan.id === popularPlanId ? 'border-primary ring-2 ring-primary relative' : 'border-border hover:border-primary/50'
              )}
            >
              {plan.id === popularPlanId && (
                <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground p-1.5 rounded-full shadow-md">
                  <BadgeCheck className="h-5 w-5" />
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className={cn("text-2xl mb-1", plan.id === popularPlanId && "text-primary")}>{plan.name}</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">₹{plan.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">{plan.priceSuffix}</span>
                </div>
                <CardDescription>{/* Placeholder if needed, e.g., "Perfect for startups" */}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4 pt-0">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className={cn("w-full", plan.id === popularPlanId ? "bg-primary hover:bg-primary/90" : "bg-secondary hover:bg-secondary/90 text-secondary-foreground")} size="lg">
                  <Link href="/"> {/* All plans link to admin login for now */}
                    Get Started
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
