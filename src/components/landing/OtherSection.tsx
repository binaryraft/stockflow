
"use client";

import { BrainCircuit, Lightbulb, Zap, ShieldCheck, Scaling, Users2, BarChartHorizontal } from 'lucide-react';

const otherFeatures = [
  {
    icon: BrainCircuit,
    title: "Intelligent Insights",
    description: "Leverage data-driven analytics to make informed decisions and optimize your inventory for maximum profitability.",
  },
  {
    icon: Scaling,
    title: "Scalable Architecture",
    description: "Built for growth, our system handles increasing complexity as your business expands to new products and locations.",
  },
  {
    icon: Users2,
    title: "Collaborative Platform",
    description: "Efficiently manage staff access and operations across multiple stores with granular controls and role-based permissions.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Your data is protected with industry-standard security measures, ensuring reliability and peace of mind.",
  },
  {
    icon: Lightbulb,
    title: "Continuous Innovation",
    description: "We're constantly evolving with cutting-edge features to meet the dynamic demands of modern commerce.",
  },
  {
    icon: BarChartHorizontal,
    title: "Comprehensive Reporting",
    description: "Gain deep understanding of your sales, expenses, and product performance with detailed and customizable reports.",
  },
];


export function OtherSection() {
  return (
    <section id="other" className="section-padding bg-tertiary">
      <div className="section-container">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            More Than Just <span className="text-gradient-primary">Inventory</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Our platform is engineered to adapt and grow with your business, offering unique advantages and robust solutions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {otherFeatures.map((feature, index) => (
            <InfoCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, title, description, index }) => {
  return (
    <div 
      className="p-6 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out border border-border/70 hover:border-primary/50 flex flex-col items-center text-center animate-fadeInUp"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="p-4 bg-primary/10 rounded-full mb-5 inline-flex text-primary">
        <Icon className="h-10 w-10" />
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm md:text-base flex-grow">{description}</p>
    </div>
  );
};
