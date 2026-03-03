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
        "overflow-hidden rounded-[1.2rem] border border-white/65 p-3.5 shadow-[0_4px_14px_rgba(17,24,39,0.04)] sm:p-4",
        "bg-page-header",
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
