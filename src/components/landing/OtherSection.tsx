
"use client";

import { BrainCircuit, Lightbulb, Zap, ShieldCheck, Scaling, Users2, BarChartHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const otherFeatures = [
  {
    icon: BrainCircuit,
    title: "Intelligent Insights",
    description: "Leverage data-driven analytics to make informed decisions and optimize your inventory for maximum profitability.",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-600/10 dark:bg-purple-400/10",
  },
  {
    icon: Scaling,
    title: "Scalable Architecture",
    description: "Built for growth, our system handles increasing complexity as your business expands to new products and locations.",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-600/10 dark:bg-indigo-400/10",
  },
  {
    icon: Users2,
    title: "Collaborative Platform",
    description: "Efficiently manage staff access and operations across multiple stores with granular controls and role-based permissions.",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-600/10 dark:bg-sky-400/10",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Reliable",
    description: "Your data is protected with industry-standard security measures, ensuring reliability and peace of mind.",
     color: "text-green-600 dark:text-green-500",
    bgColor: "bg-green-600/10 dark:bg-green-500/10",
  },
  {
    icon: Lightbulb,
    title: "Continuous Innovation",
    description: "We're constantly evolving with cutting-edge features to meet the dynamic demands of modern commerce.",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-600/10 dark:bg-yellow-400/10",
  },
  {
    icon: BarChartHorizontal,
    title: "Comprehensive Reporting",
    description: "Gain deep understanding of your sales, expenses, and product performance with detailed and customizable reports.",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-600/10 dark:bg-rose-400/10",
  },
];


export function OtherSection() {
  return (
    <section id="other" className="section-padding bg-tertiary dark:bg-secondary/10">
      <div className="section-container">
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground animate-fadeInDown">
            More Than Just <span className="text-gradient-primary">Inventory</span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground animate-fadeInDown delay-200">
            Our platform is engineered to adapt and grow with your business, offering unique advantages and robust solutions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          {otherFeatures.map((feature, index) => (
            <InfoCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              color={feature.color}
              bgColor={feature.bgColor}
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
  color: string;
  bgColor: string;
  index: number;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, title, description, color, bgColor, index }) => {
  return (
    <div 
      className="p-8 bg-card rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out border border-border/70 hover:border-primary/50 flex flex-col items-center text-center animate-fadeInUp group"
      style={{ animationDelay: `${index * 150 + 300}ms` }}
    >
      <div className={cn(
        "p-5 rounded-full mb-6 inline-flex transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
        bgColor,
        color
        )}>
        <Icon className="h-10 w-10" />
      </div>
      <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-4">{title}</h3>
      <p className="text-muted-foreground text-base leading-relaxed flex-grow">{description}</p>
    </div>
  );
};
