import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AIInsightLoading } from '@/components/common/AIInsightLoading';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  isLoading?: boolean;
  valueClassName?: string;
}

export function StatCard({ title, value, icon: Icon, description, isLoading = false, valueClassName }: StatCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow rounded-lg overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary/70" />
      </CardHeader>
      <CardContent className="pb-4 px-4 min-h-[90px] flex flex-col justify-center">
        {isLoading ? (
          <AIInsightLoading context="dashboard" minimal className="mt-1" />
        ) : (
          <>
            <div className={cn("text-3xl font-bold text-foreground", valueClassName)}>{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground pt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
