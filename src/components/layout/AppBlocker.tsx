
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { APP_NAME } from '@/lib/constants';
import { CreditCard, LogOut, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useThemeLogo } from '@/hooks/use-theme-logo';

interface AppBlockerProps {
  reason: 'pending' | 'expired';
}

export function AppBlocker({ reason }: AppBlockerProps) {
  const router = useRouter();
  const themeLogo = useThemeLogo();

  const handleLogout = () => {
    // A more robust logout would involve a global function, but for simplicity:
    localStorage.removeItem("appAuthToken");
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('companyId');
    localStorage.removeItem('assignedStoreIds');
    router.replace('/');
  };

  const title = reason === 'pending' ? 'Payment Pending' : 'Subscription Expired';
  const description = reason === 'pending'
    ? "Your account is awaiting payment confirmation. We will contact you shortly to complete the process. Access to the application will be granted once the payment is confirmed."
    : "Your subscription has expired. Please contact support to renew your plan and regain access to your account.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center mb-8">
        <Image
          src={themeLogo}
          alt={`${APP_NAME} Logo`}
          width={64}
          height={64}
          className="mb-3 animate-pulse"
        />
        <h1 className="text-3xl font-bold text-primary">{APP_NAME}</h1>
      </div>
      <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl mt-4">{title}</CardTitle>
          <CardDescription className="text-base leading-relaxed pt-2">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            For any queries, please contact our support team.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
