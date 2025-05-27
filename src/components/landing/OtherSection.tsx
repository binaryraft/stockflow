
"use client";

import { BrainCircuit, Lightbulb, Zap } from 'lucide-react'; // Example icons

export function OtherSection() {
  return (
    <section id="other" className="py-16 md:py-24 bg-tertiary">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Discover <span className="text-primary">More Possibilities</span>
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-muted-foreground">
            Our platform is built to adapt and grow with your business, offering unique advantages.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <BrainCircuit className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Intelligent Insights</h3>
            <p className="text-muted-foreground text-sm">
              Leverage data-driven analytics to make informed decisions and optimize your inventory.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Lightbulb className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Innovative Solutions</h3>
            <p className="text-muted-foreground text-sm">
              Continuously evolving with cutting-edge features to meet the demands of modern commerce.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Unmatched Speed</h3>
            <p className="text-muted-foreground text-sm">
              Experience a lightning-fast interface designed for maximum productivity and minimal friction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
