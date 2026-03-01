import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex min-h-28 w-full rounded-xl border bg-white/80 px-4 py-3 text-base shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-[4px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
