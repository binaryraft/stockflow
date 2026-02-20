
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  icon?: LucideIcon;
  className?: string;
  actions?: React.ReactNode;
}

export function PageTitle({ title, icon: Icon, className, actions }: PageTitleProps) {
  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between mb-8 py-4", className)}>
      <div className="flex items-center gap-3 mb-3 md:mb-0">
        {Icon && <Icon className="h-8 w-8 text-primary" />}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {actions && <div className="flex flex-col items-stretch gap-3 self-stretch w-full mt-4 md:flex-row md:items-center md:gap-3 md:self-center md:w-auto md:mt-0 no-print">{actions}</div>}
    </div>
  );
}
