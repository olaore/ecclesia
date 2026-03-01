import * as React from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.2rem] border border-white/65 bg-white/70 p-3.5 shadow-[0_4px_14px_rgba(17,24,39,0.04)] sm:p-4",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='224' height='224' viewBox='0 0 224 224' fill='none'%3E%3Cg opacity='0.46'%3E%3Cpath d='M136 -10L246 100' stroke='%23d86622' stroke-opacity='0.16' stroke-width='30' stroke-linecap='round'/%3E%3Cpath d='M100 -22L224 102' stroke='white' stroke-opacity='0.28' stroke-width='30' stroke-linecap='round'/%3E%3Cpath d='M62 -16L198 120' stroke='%23d86622' stroke-opacity='0.12' stroke-width='30' stroke-linecap='round'/%3E%3Cpath d='M28 -8L172 136' stroke='white' stroke-opacity='0.24' stroke-width='30' stroke-linecap='round'/%3E%3C/g%3E%3C/svg%3E\"),linear-gradient(34deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.99)_44%,rgba(250,241,235,0.9)_68%,rgba(244,221,206,0.72)_84%,rgba(234,120,47,0.34)_100%)] bg-[size:220px_220px,100%_100%] bg-[position:top_right,right_center] bg-no-repeat",
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-1.5">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-secondary">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[1.5rem]">
              {title}
            </h1>
            <p className="max-w-xl text-sm leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  )
}
