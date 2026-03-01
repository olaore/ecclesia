import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-11 w-full min-w-0 rounded-xl border bg-white/80 px-4 py-2 text-base shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-[border-color,box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:bg-white focus-visible:ring-ring/15 focus-visible:ring-[4px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Input }
