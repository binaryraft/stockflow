
"use client";

import { BrainCircuit, Lightbulb, Zap, ShieldCheck, Scaling, Users2 } from 'lucide-react';

export function OtherSection() {
  return (
    <section id="other" className="py-16 md:py-24 bg-tertiary">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            More Than Just Inventory <span className="text-primary">Management</span>
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-muted-foreground">
            Our platform is engineered to adapt and grow with your business, offering unique advantages.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <InfoCard
            icon={BrainCircuit}
            title="Intelligent Insights"
            description="Leverage data-driven analytics to make informed decisions and optimize your inventory for maximum profitability."
          />
          <InfoCard
            icon={Scaling}
            title="Scalable Architecture"
            description="Built for growth, our system handles increasing complexity as your business expands to new products and locations."
          />
          <InfoCard
            icon={Zap}
            title="Unmatched Speed & UI"
            description="Experience a lightning-fast, intuitive interface designed for maximum productivity and minimal friction."
          />
          <InfoCard
            icon={ShieldCheck}
            title="Secure & Reliable"
            description="Your data is protected with industry-standard security measures, ensuring reliability and peace of mind."
          />
          <InfoCard
            icon={Users2}
            title="Collaborative Platform"
            description="Efficiently manage staff access and operations across multiple stores with granular controls."
          />
          <InfoCard
            icon={Lightbulb}
            title="Continuous Innovation"
            description="We're constantly evolving with cutting-edge features to meet the dynamic demands of modern commerce."
          />
        </div>
      </div>
    </section>
  );
}

interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="p-6 bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-2 border-t-primary/30 hover:border-t-primary flex flex-col items-center text-center">
      <Icon className="h-12 w-12 text-primary mb-4" />
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm flex-grow">{description}</p>
    </div>
  );
};
