
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
    <div className={cn("flex items-center justify-between mb-6 py-4 border-b", className)}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-7 w-7 text-primary" />}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

    