
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartBig, Zap, CheckCircle, ShoppingCart, PackageSearch, Users } from 'lucide-react';

const features = [
  {
    icon: ShoppingCart,
    title: "Seamless Billing",
    description: "Create sales, expense, and return bills effortlessly with our intuitive interface and autopilot product entry.",
    color: "text-primary",
  },
  {
    icon: PackageSearch,
    title: "Advanced Inventory",
    description: "Track products, manage stock levels, and handle product variants with ease.",
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
    description: "Get a clear overview of your business health with dynamic charts and key performance indicators.",
    color: "text-purple-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-tertiary">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Why <span className="text-primary">Choose {process.env.NEXT_PUBLIC_APP_NAME || "StockFlow"}?</span>
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-muted-foreground">
            Empowering your business with features designed for growth and efficiency.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-2 border-t-primary/50 hover:border-t-primary">
              <CardHeader className="items-center text-center">
                <div className={`mb-4 p-3 rounded-full bg-primary/10 inline-block ${feature.color}`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl text-primary">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
