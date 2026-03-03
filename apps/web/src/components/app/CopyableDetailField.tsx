import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

interface CopyableDetailFieldProps {
  label: string;
  value?: string | null;
  emptyLabel?: string;
  href?: string;
  multiline?: boolean;
}

export function CopyableDetailField({
  label,
  value,
  emptyLabel = "Not available",
  href,
  multiline = false,
}: CopyableDetailFieldProps) {
  const [copied, setCopied] = React.useState(false);
  const displayValue = value?.trim() || emptyLabel;
  const canCopy = Boolean(value?.trim());

  const handleCopy = async () => {
    if (!value?.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(`Failed to copy ${label.toLowerCase()}:`, error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </p>
          {href && canCopy ? (
            <a
              href={href}
              className={`mt-2 block text-sm text-foreground underline-offset-4 hover:underline ${
                multiline ? "whitespace-pre-wrap break-words" : "truncate"
              }`}
            >
              {displayValue}
            </a>
          ) : (
            <p
              className={`mt-2 text-sm ${canCopy ? "text-foreground" : "text-muted-foreground"} ${
                multiline ? "whitespace-pre-wrap break-words" : "truncate"
              }`}
            >
              {displayValue}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!canCopy}
          className="shrink-0"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
