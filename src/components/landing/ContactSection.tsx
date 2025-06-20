
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { APP_NAME, COMPANY_ADDRESS, COMPANY_CONTACT } from "@/lib/constants";

export function ContactSection() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Message submitted! (This is a demo)");
  };

  const emailMatch = COMPANY_CONTACT.match(/Email: ([\w.-]+@[\w.-]+\.\w+)/);
  const phoneMatch = COMPANY_CONTACT.match(/Phone: ([\(\)\d\s-]+)/);
  const displayEmail = emailMatch ? emailMatch[1] : `contact@${APP_NAME.toLowerCase().replace(/\s+/g, '')}.com`;
  const displayPhone = phoneMatch ? phoneMatch[1] : '(555) 000-0000';

  return (
    <section id="contact" className="section-padding bg-background">
      <div className="section-container">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            Get in <span className="text-gradient-primary">Touch</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
            Have questions, feedback, or need support? We&apos;re here to help you succeed.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div className="space-y-8 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <div>
              <h3 className="text-2xl font-semibold text-primary mb-4">Contact Information</h3>
              <div className="space-y-4 text-muted-foreground">
                <p className="flex items-start gap-3 text-base">
                  <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <span>{COMPANY_ADDRESS}</span>
                </p>
                <p className="flex items-center gap-3 text-base">
                  <Mail className="h-6 w-6 text-primary shrink-0" />
                  <a href={`mailto:${displayEmail}`} className="hover:text-primary transition-colors">{displayEmail}</a>
                </p>
                <p className="flex items-center gap-3 text-base">
                  <Phone className="h-6 w-6 text-primary shrink-0" />
                  <a href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`} className="hover:text-primary transition-colors">{displayPhone}</a>
                </p>
              </div>
            </div>
            <div className="pt-4">
              <h3 className="text-2xl font-semibold text-primary mb-4">Office Hours</h3>
              <p className="text-muted-foreground text-base">Monday - Friday: 9:00 AM - 6:00 PM</p>
              <p className="text-muted-foreground text-base">Saturday: 10:00 AM - 3:00 PM</p>
              <p className="text-muted-foreground text-base">Sunday: Closed</p>
            </div>
          </div>
          <form 
            onSubmit={handleSubmit} 
            className="space-y-6 p-6 md:p-8 bg-card rounded-xl shadow-xl border border-border/70 animate-fadeInUp"
            style={{animationDelay: '0.4s'}}
          >
            <div>
              <Label htmlFor="contact-name" className="text-foreground font-medium">Full Name</Label>
              <Input id="contact-name" type="text" placeholder="Your Name" required className="mt-2 h-11" />
            </div>
            <div>
              <Label htmlFor="contact-email" className="text-foreground font-medium">Email Address</Label>
              <Input id="contact-email" type="email" placeholder="you@example.com" required className="mt-2 h-11" />
            </div>
            <div>
              <Label htmlFor="contact-subject" className="text-foreground font-medium">Subject</Label>
              <Input id="contact-subject" type="text" placeholder="Regarding..." className="mt-2 h-11" />
            </div>
            <div>
              <Label htmlFor="contact-message" className="text-foreground font-medium">Message</Label>
              <Textarea id="contact-message" placeholder="How can we help you?" required rows={5} className="mt-2" />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground py-3 text-base rounded-lg group">
              Send Message <Send className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
