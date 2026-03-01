import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ConfirmActionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  title: string
  description: string
  details?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  disabled?: boolean
}

export function ConfirmAction({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Edit",
  onConfirm,
  disabled,
}: ConfirmActionProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[320px] rounded-[1.25rem] border-white/70 bg-white/96 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
      >
        <PopoverHeader className="gap-2">
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        {details ? <div className="mt-4">{details}</div> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={disabled}>
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
