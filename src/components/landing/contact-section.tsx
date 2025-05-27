
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin } from "lucide-react";
import { APP_NAME, COMPANY_ADDRESS, COMPANY_CONTACT } from "@/lib/constants";

export function ContactSection() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here (e.g., send email, API call)
    alert("Message submitted! (This is a demo)");
  };

  // Extract email and phone from COMPANY_CONTACT for cleaner display
  const emailMatch = COMPANY_CONTACT.match(/Email: ([\w.-]+@[\w.-]+\.\w+)/);
  const phoneMatch = COMPANY_CONTACT.match(/Phone: ([\(\)\d\s-]+)/);
  const displayEmail = emailMatch ? emailMatch[1] : `contact@${APP_NAME.toLowerCase().replace(/\s+/g, '')}.com`;
  const displayPhone = phoneMatch ? phoneMatch[1] : '(555) 000-0000';


  return (
    <section id="contact" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Get in <span className="text-primary">Touch</span>
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-lg text-muted-foreground">
            Have questions or need support? We&apos;re here to help you succeed.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-primary mb-3">Contact Information</h3>
              <div className="space-y-3 text-muted-foreground">
                <p className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  {COMPANY_ADDRESS}
                </p>
                <p className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <a href={`mailto:${displayEmail}`} className="hover:text-primary transition-colors">{displayEmail}</a>
                </p>
                <p className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <a href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`} className="hover:text-primary transition-colors">{displayPhone}</a>
                </p>
              </div>
            </div>
            <div className="pt-4">
              <h3 className="text-xl font-semibold text-primary mb-3">Office Hours</h3>
              <p className="text-muted-foreground">Monday - Friday: 9:00 AM - 6:00 PM</p>
              <p className="text-muted-foreground">Saturday: 10:00 AM - 3:00 PM</p>
              <p className="text-muted-foreground">Sunday: Closed</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8 bg-card rounded-lg shadow-lg border-t-2 border-t-primary">
            <div>
              <Label htmlFor="contact-name" className="text-foreground">Full Name</Label>
              <Input id="contact-name" type="text" placeholder="Your Name" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contact-email" className="text-foreground">Email Address</Label>
              <Input id="contact-email" type="email" placeholder="you@example.com" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contact-message" className="text-foreground">Message</Label>
              <Textarea id="contact-message" placeholder="How can we help you?" required rows={5} className="mt-1" />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 text-base">
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
