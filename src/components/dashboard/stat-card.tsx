
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out border-l-4 border-l-primary rounded-lg dark:shadow-primary/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary/70" />
      </CardHeader>
      <CardContent className="pb-4 px-4">
        {isLoading ? (
          <Skeleton className="h-8 w-3/4 mt-1" />
        ) : (
          <div className={cn("text-3xl font-bold text-foreground", valueClassName)}>{value}</div> 
        )}
        {description && !isLoading && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
         {isLoading && description && (
          <Skeleton className="h-4 w-1/2 mt-2" />
        )}
      </CardContent>
    </Card>
  );
}

    