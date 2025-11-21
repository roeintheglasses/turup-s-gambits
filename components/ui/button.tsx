import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-cinzel font-semibold transition-all duration-200 ease-out cursor-pointer border-2 touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[60%] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 user-select-none",
  {
    variants: {
      variant: {
        default: "medieval-btn--primary rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(217,119,6,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] [background:linear-gradient(180deg,hsl(var(--amber-bright))_0%,hsl(var(--amber-primary))_100%)] border-[hsl(var(--gold))] text-[hsl(var(--dark-bg))]",
        destructive:
          "medieval-btn--destructive rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(127,29,29,0.4)] hover:-translate-y-0.5 [background:linear-gradient(180deg,hsl(var(--destructive))_0%,hsl(0_66%_25%)_100%)] border-[hsl(var(--burgundy))] text-[hsl(var(--cream-text))]",
        outline:
          "border-[hsl(var(--warm-brown))] bg-transparent text-[hsl(var(--cream-text))] hover:bg-[hsl(var(--warm-brown))]/20 rounded-lg",
        secondary:
          "medieval-btn--secondary rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_12px_rgba(107,124,46,0.4)] hover:-translate-y-0.5 [background:linear-gradient(180deg,hsl(var(--olive-bright))_0%,hsl(var(--olive-green))_100%)] border-[hsl(var(--warm-brown))] text-[hsl(var(--cream-text))]",
        ghost: "border-transparent hover:bg-[hsl(var(--warm-brown))]/20 rounded-lg text-[hsl(var(--foreground))]",
        link: "border-transparent text-[hsl(var(--amber-primary))] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-12 px-8 py-3 text-base min-h-[44px]",
        sm: "h-10 px-4 py-2 text-sm min-h-[44px]",
        lg: "h-14 px-12 py-4 text-lg min-h-[48px]",
        icon: "h-12 w-12 min-h-[44px] min-w-[44px]",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
