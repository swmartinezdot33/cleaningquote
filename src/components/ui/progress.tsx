import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, style, ...props }, ref) => {
  // Get primary color from CSS variable if available
  const getIndicatorStyle = (): React.CSSProperties => {
    if (typeof window === 'undefined') {
      return { transform: `translateX(-${100 - (value || 0)}%)` };
    }
    
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color')
      .trim();
    
    if (primaryColor) {
      return {
        backgroundColor: primaryColor,
        transform: `translateX(-${100 - (value || 0)}%)`,
      };
    }
    
    return { transform: `translateX(-${100 - (value || 0)}%)` };
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      style={style}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all duration-500 ease-in-out"
        style={getIndicatorStyle()}
      />
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
