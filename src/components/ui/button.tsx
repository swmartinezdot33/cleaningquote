import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:shadow-lg transition-all duration-200",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border bg-background hover:shadow-lg transition-all duration-200",
        secondary:
          "hover:shadow-lg transition-all duration-200",
        ghost: "transition-all duration-200",
        link: "underline-offset-4 hover:underline transition-colors",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Get primary color from CSS variable
    const getButtonStyle = (): React.CSSProperties => {
      if (typeof window === 'undefined') return style || {};
      
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-color')
        .trim() || '#7c3aed';
      const baseStyle = (style || {}) as React.CSSProperties;
      // When parent passes explicit borderColor/color (e.g. out-of-service page primaryColor), use them so outline matches theme
      const outlineBorder = baseStyle.borderColor ?? primaryColor;
      const outlineColor = baseStyle.color ?? primaryColor;

      if (variant === 'default') {
        return {
          ...baseStyle,
          backgroundColor: primaryColor,
          color: '#ffffff',
        };
      } else if (variant === 'outline') {
        return {
          ...baseStyle,
          borderColor: outlineBorder,
          color: outlineColor,
        };
      } else if (variant === 'secondary') {
        return {
          ...baseStyle,
          backgroundColor: `${primaryColor}1a`,
          color: primaryColor,
        };
      } else if (variant === 'ghost') {
        return baseStyle;
      } else if (variant === 'link') {
        return {
          ...baseStyle,
          color: primaryColor,
        };
      }
      
      return baseStyle;
    };
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={getButtonStyle()}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
