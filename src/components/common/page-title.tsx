
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
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between mb-8 py-4 border-b-2 border-primary/20", className)}>
      <div className="flex items-center gap-3 mb-3 md:mb-0">
        {Icon && <Icon className="h-8 w-8 text-primary" />}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2 self-start md:self-center">{actions}</div>}
    </div>
  );
}

    