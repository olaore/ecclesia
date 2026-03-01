import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none active:translate-y-px focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-[4px] aria-invalid:ring-destructive/15 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(37,52,90,0.12)] hover:bg-primary/94 hover:shadow-[0_8px_18px_rgba(37,52,90,0.14)]",
        destructive:
          "bg-destructive text-white shadow-[0_4px_12px_rgba(190,24,93,0.12)] hover:bg-destructive/92 focus-visible:ring-destructive/15",
        outline:
          "border border-border bg-white/80 text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-secondary/35 hover:bg-white hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_4px_12px_rgba(234,120,47,0.14)] hover:bg-secondary/92 hover:shadow-[0_8px_18px_rgba(234,120,47,0.16)]",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-lg gap-1.5 px-3.5 has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
