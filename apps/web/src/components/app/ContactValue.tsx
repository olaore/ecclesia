import * as React from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ContactValueProps {
  phone?: string | null
  email?: string | null
}

export function ContactValue({ phone, email }: ContactValueProps) {
  const [copied, setCopied] = React.useState(false)

  const value = phone || email || "N/A"
  const canCopy = value !== "N/A"
  const isEmail = !phone && !!email

  const handleCopy = async () => {
    if (!canCopy) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error("Failed to copy contact value:", error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={isEmail ? "max-w-[220px] truncate text-sm text-foreground/85" : "text-sm text-foreground/85"}>
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="shrink-0"
        onClick={handleCopy}
        disabled={!canCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="sr-only">Copy contact value</span>
      </Button>
    </div>
  )
}
