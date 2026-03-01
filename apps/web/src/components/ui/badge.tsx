import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-[4px] aria-invalid:ring-destructive/15 aria-invalid:border-destructive transition-[color,box-shadow,background-color] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/92",
        secondary:
          "bg-secondary/14 text-secondary border-secondary/15 [a&]:hover:bg-secondary/20",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/15 [a&]:hover:bg-destructive/15 focus-visible:ring-destructive/15",
        outline:
          "border-border/80 bg-white/70 text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
