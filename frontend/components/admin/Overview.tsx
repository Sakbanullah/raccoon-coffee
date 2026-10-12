"use client";

import Link from "next/link";
import { Package, Tags, MapPin, CalendarDays, Newspaper, Image as Images, Plus, Settings2 } from "lucide-react";
import { QuickActionLink } from "./QuickActionLink";

export function SummaryCard({
  title,
  value,
  subtitle,
  href,
  icon: Icon,
}: {
  title: string;
  value: string | null;
  subtitle: string;
  href: string;
  icon: typeof Package;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm transition-all hover:border-border hover:bg-surface-elevated hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          <p className="mt-2 font-display text-2xl font-semibold leading-none tracking-tight text-foreground">
            {value ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-brand-accent">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-primary group-hover:underline">
        Open {title.toLowerCase()}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

export function QuickAction({
  label,
  href,
  hint,
  icon: Icon,
  primary,
}: {
  label: string;
  href: string;
  hint?: string;
  icon: typeof Plus;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium transition-colors " +
        (primary
          ? "border-brand-primary bg-brand-primary text-foreground hover:bg-brand-primary-hover"
          : "border-border bg-surface text-foreground hover:bg-surface-elevated")
      }
    >
      <Icon aria-hidden="true" className={"h-4 w-4 " + (primary ? "text-brand-accent" : "text-muted-foreground")} />
      <span className="flex-1">
        {label}
        {hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
    </Link>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof CalendarDays;
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-elevated text-brand-accent">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center justify-center rounded-md border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-primary-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

export const OVERVIEW_SUMMARY = [
  { title: "Products", subtitle: "From /api/products", href: "/admin/products", icon: Package, key: "products" },
  { title: "Categories", subtitle: "From /api/product-categories", href: "/admin/categories", icon: Tags, key: "categories" },
  { title: "Branches", subtitle: "From /api/branches", href: "/admin/branches", icon: MapPin, key: "branches" },
  { title: "Events", subtitle: "From /api/events", href: "/admin/events", icon: CalendarDays, key: "events" },
  { title: "Stories", subtitle: "From /api/stories", href: "/admin/stories", icon: Newspaper, key: "stories" },
  { title: "Raccoon Wall", subtitle: "Moderation queue", href: "/admin/raccoon-wall", icon: Images, key: "photos" },
] as const;

export function OverviewQuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <QuickActionLink label="Add product" href="/admin/products" hint="Menu Management → Products" primary />
      <QuickActionLink label="Add event" href="/admin/events" hint="Content Studio → Events" />
      <QuickActionLink label="Review photos" href="/admin/raccoon-wall" hint="Raccoon Wall moderation" />
    </div>
  );
}
