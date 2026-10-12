"use client";

import { Plus } from "lucide-react";

export function QuickActionLink({
  label,
  href,
  hint,
  primary,
}: {
  label: string;
  href: string;
  hint?: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={
        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
        (primary
          ? "border-brand-primary bg-brand-primary text-foreground hover:bg-brand-primary-hover"
          : "border-border bg-surface-elevated text-foreground hover:bg-surface")
      }
    >
      {primary && <Plus aria-hidden="true" className="h-3 w-3" />}
      <span>{label}</span>
      {hint && <span className="ml-1 text-xs opacity-70">{hint}</span>}
    </a>
  );
}
