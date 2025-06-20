
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartBig, PackageSearch, Users, ShoppingCart, Zap, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: ShoppingCart,
    title: "Seamless Billing",
    description: "Create sales, expense, and return bills effortlessly with our intuitive interface, variant support, and payment tracking.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: PackageSearch,
    title: "Advanced Inventory",
    description: "Track products, manage stock levels per SKU, and handle complex product variants with ease.",
    color: "text-green-600 dark:text-green-500",
    bgColor: "bg-green-600/10 dark:bg-green-500/10",
  },
  {
    icon: Users,
    title: "Multi-Store & Staff",
    description: "Manage multiple store locations and staff members with role-based access and dedicated terminal views.",
     color: "text-blue-600 dark:text-blue-500",
     bgColor: "bg-blue-600/10 dark:bg-blue-500/10",
  },
  {
    icon: BarChartBig,
    title: "Insightful Dashboard",
    description: "Get a clear overview of your business health with dynamic charts, expense tracking, and key performance indicators.",
    color: "text-purple-600 dark:text-purple-500",
    bgColor: "bg-purple-600/10 dark:bg-purple-500/10",
  },
   {
    icon: Zap,
    title: "Fast & Responsive",
    description: "Experience a lightning-fast UI designed for maximum productivity and minimal friction across all devices.",
    color: "text-orange-600 dark:text-orange-500",
    bgColor: "bg-orange-600/10 dark:bg-orange-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Your data is protected with robust security measures, ensuring reliability and peace of mind for your business operations.",
    color: "text-teal-600 dark:text-teal-500",
    bgColor: "bg-teal-600/10 dark:bg-teal-500/10",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-padding bg-tertiary dark:bg-secondary/10">
      <div className="section-container">
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground animate-fadeInDown">
            Why <span className="text-gradient-primary">{APP_NAME}</span> is Your Best Choice
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground animate-fadeInDown delay-200">
            Empowering your business with features designed for growth, efficiency, and modern demands.
          </p>
        </div>
        <div className="grid gap-8 md:gap-10 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className={cn(
                "bg-card shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out",
                "border-t-4 border-transparent hover:border-primary rounded-xl group animate-fadeInUp" 
              )}
              style={{ animationDelay: `${index * 150 + 300}ms` }} /* Staggered animation */
            >
              <CardHeader className="items-center text-center pt-10 pb-5">
                <div className={cn(
                  "mb-6 p-5 rounded-full inline-block group-hover:scale-110 transition-transform duration-300",
                  feature.bgColor, 
                  feature.color
                )}>
                  <feature.icon className="h-12 w-12" />
                </div>
                <CardTitle className="text-xl md:text-2xl text-foreground font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-10 px-8">
                <p className="text-muted-foreground text-base leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
