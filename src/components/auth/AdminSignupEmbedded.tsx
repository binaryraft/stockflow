
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import { UserPlus, XCircle, Mail, KeyRound, Building, User as UserIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventoryStore } from '@/hooks/use-inventory-store';

interface AdminSignupEmbeddedProps {
  onSignupSuccess: () => void;
  onCancel: () => void;
  onSwitchToLogin: () => void;
}

const SHARED_AUTH_TOKEN_KEY = "appAuthToken";

export function AdminSignupEmbedded({ onSignupSuccess, onCancel, onSwitchToLogin }: AdminSignupEmbeddedProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { fetchCompanyProfile } = useInventoryStore(); // Added
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMounted) return;
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Signup Failed", description: "Passwords do not match." });
      return;
    }
    if (password.length < 6) {
      toast({ variant: "destructive", title: "Signup Failed", description: "Password must be at least 6 characters." });
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          adminName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        toast({ title: "Signup Successful!", description: data.message || "Your company and admin account have been created." });
        
        if (data.token) {
            localStorage.setItem(SHARED_AUTH_TOKEN_KEY, data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name || 'Admin');
            localStorage.setItem('userRole', data.user.role || 'admin');
            localStorage.setItem('companyId', data.user.companyId);
            // Fetch company profile after successful signup
            await fetchCompanyProfile(data.user.companyId);
        }
        onSignupSuccess(); // Callback will handle UI switch and HomePage will redirect
      } else {
        toast({ variant: "destructive", title: "Signup Failed", description: data.message || "Could not create account." });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({ variant: "destructive", title: "Signup Error", description: "Could not connect to the server." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasMounted) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-muted/40 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            <p className="text-muted-foreground">Loading Admin Signup...</p>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/90 backdrop-blur-sm">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close signup">
          <XCircle className="h-6 w-6 text-muted-foreground hover:text-foreground" />
        </Button>
      </div>
      <div className="flex flex-col items-center mb-6">
        <Image
          src="https://placehold.co/128x128.png"
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 rounded-lg shadow-md"
          data-ai-hint="logo company"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
        <p className="text-muted-foreground">Admin & Company Registration</p>
      </div>
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Admin Account</CardTitle>
          <CardDescription>Set up your company and admin profile.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="signup-company-name">
                <Building className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Company Name*
              </Label>
              <Input
                id="signup-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company LLC"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-admin-name">
                <UserIcon className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Your Name (Admin)*
              </Label>
              <Input
                id="signup-admin-name"
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">
                <Mail className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Admin Email*
              </Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">
                <KeyRound className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Password* (min. 6 characters)
              </Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-confirm-password">
                <KeyRound className="mr-2 h-4 w-4 inline-block text-muted-foreground" /> Confirm Password*
              </Label>
              <Input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
              {isSubmitting ? 'Creating Account...' : 'Sign Up & Create Company'}
            </Button>
            <Button variant="link" size="sm" onClick={onSwitchToLogin} className="text-xs" disabled={isSubmitting}>
              Already have an account? Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    