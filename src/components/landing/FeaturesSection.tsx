
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartBig, PackageSearch, Users, ShoppingCart, CreditCard, LayoutList, Zap, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const features = [
  {
    icon: ShoppingCart,
    title: "Seamless Billing",
    description: "Create sales, expense, and return bills effortlessly with our intuitive interface, variant support, and payment tracking.",
    color: "text-primary",
  },
  {
    icon: PackageSearch,
    title: "Advanced Inventory",
    description: "Track products, manage stock levels per SKU, and handle complex product variants with ease.",
    color: "text-green-500",
  },
  {
    icon: Users,
    title: "Multi-Store & Staff",
    description: "Manage multiple store locations and staff members with role-based access and dedicated terminal views.",
     color: "text-blue-500",
  },
  {
    icon: BarChartBig,
    title: "Insightful Dashboard",
    description: "Get a clear overview of your business health with dynamic charts, expense tracking, and key performance indicators.",
    color: "text-purple-500",
  },
   {
    icon: Zap,
    title: "Fast & Responsive",
    description: "Experience a lightning-fast UI designed for maximum productivity and minimal friction across all devices.",
    color: "text-orange-500",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Your data is protected with robust security measures, ensuring reliability and peace of mind for your business operations.",
    color: "text-teal-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="section-padding bg-tertiary">
      <div className="section-container">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Why <span className="text-gradient-primary">{APP_NAME}</span> is Your Best Choice
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Empowering your business with features designed for growth, efficiency, and modern demands.
          </p>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="bg-card shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border-t-4 border-transparent hover:border-primary rounded-xl group animate-fadeInUp"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <CardHeader className="items-center text-center pt-8 pb-4">
                <div className={`mb-5 p-4 rounded-full bg-primary/10 inline-block group-hover:scale-110 transition-transform duration-300 ${feature.color}`}>
                  <feature.icon className="h-10 w-10" />
                </div>
                <CardTitle className="text-xl md:text-2xl text-foreground font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8 px-6">
                <p className="text-muted-foreground text-sm md:text-base">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
