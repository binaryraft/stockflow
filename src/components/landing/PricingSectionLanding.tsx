
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SUBSCRIPTION_PLANS, APP_NAME, SUBSCRIPTION_PLAN_IDS } from '@/lib/constants'; // Added SUBSCRIPTION_PLAN_IDS
import { CheckCircle, BadgeCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PricingSectionLanding() {
  const popularPlanId = SUBSCRIPTION_PLANS.find(p => p.isPopular)?.id || SUBSCRIPTION_PLANS[1]?.id; // Fallback to second plan if no popular
  const plansToShow = SUBSCRIPTION_PLANS.filter(p => p.price !== -1 && p.id !== SUBSCRIPTION_PLAN_IDS.ADMIN_ONLY); // Exclude contact and admin_only from main display

  return (
    <section id="pricing" className="section-padding bg-background">
      <div className="section-container">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Flexible <span className="text-gradient-primary">Pricing Plans</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
            Choose the plan that best fits your business needs. No hidden fees, transparent value.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3 items-stretch max-w-6xl mx-auto">
          {plansToShow.map((plan, index) => (
            <Card 
              key={plan.id} 
              className={cn(
                "flex flex-col transition-all duration-300 hover:shadow-2xl shadow-lg rounded-xl border-border/70 animate-fadeInUp",
                plan.id === popularPlanId ? 'border-2 border-primary ring-4 ring-primary/20 relative' : 'hover:border-primary/50',
                "bg-card"
              )}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.id === popularPlanId && (
                <div className="absolute -top-3 -right-3 bg-primary text-primary-foreground p-2 rounded-full shadow-lg z-10">
                  <BadgeCheck className="h-6 w-6" />
                </div>
              )}
              <CardHeader className="pb-6 pt-8 px-6">
                <CardTitle className={cn(
                  "text-2xl md:text-3xl font-bold mb-2", 
                  plan.id === popularPlanId ? "text-primary" : "text-foreground"
                )}>
                  {plan.name}
                </CardTitle>
                <div className="flex items-baseline">
                  <span className="text-4xl md:text-5xl font-extrabold text-foreground">₹{plan.price}</span>
                  <span className="text-base text-muted-foreground ml-1.5">{plan.priceSuffix}</span>
                </div>
                <CardDescription className="text-sm text-muted-foreground h-10">
                  {plan.name === 'Starter' ? "Perfect for new businesses and solo entrepreneurs." : 
                   plan.name === 'Growth' ? "Ideal for growing businesses needing more capacity." :
                   "For established businesses scaling operations." }
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4 pt-0 px-6">
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="h-5 w-5 mr-2.5 mt-0.5 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-6 mt-auto">
                <Button 
                  asChild 
                  className={cn(
                    "w-full text-base py-3 rounded-lg group", 
                    plan.id === popularPlanId ? "bg-primary hover:bg-primary/80 text-primary-foreground" : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  )} 
                  size="lg"
                >
                  <Link href="/admin"> {/* All plans link to admin login/signup */}
                    Get Started <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Need more? We offer an <Link href="#contact" className="text-primary hover:underline font-medium">Enterprise plan</Link> with custom solutions.
          </p>
        </div>
      </div>
    </section>
  );
}
