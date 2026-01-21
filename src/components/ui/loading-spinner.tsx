import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  className?: string
  text?: string
}

export function LoadingSpinner({ 
  size = 48, 
  className, 
  text,
  ...props 
}: LoadingSpinnerProps) {
  return (
    <div 
      className={cn("flex flex-col items-center justify-center gap-4 min-h-[200px] w-full animate-in fade-in duration-300", className)} 
      {...props}
    >
      <div className="relative">
        <div 
          className="absolute inset-0 rounded-full border-4 border-primary/20" 
          style={{ width: size, height: size }}
        />
        <div 
          className="rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ width: size, height: size }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
      {text && (
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}
