
import { cn } from "@/lib/utils"
import { AIInsightLoading } from "@/components/common/AIInsightLoading"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  className?: string
  text?: string
  context?: string
}

export function LoadingSpinner({
  size = 48,
  className,
  text,
  context = 'general',
  ...props
}: LoadingSpinnerProps) {
  // If a text is provided, we can show it below the AI insight
  return (
    <div
      className={cn("flex flex-col items-center justify-center min-h-[200px] w-full animate-in fade-in duration-300", className)}
      {...props}
    >
      <AIInsightLoading
        context={context as any}
        size={size > 60 ? 'lg' : 'md'}
      />
      {text && (
        <p className="text-muted-foreground text-xs font-mono mt-2 animate-pulse uppercase tracking-wider">
          {text}
        </p>
      )}
    </div>
  )
}
