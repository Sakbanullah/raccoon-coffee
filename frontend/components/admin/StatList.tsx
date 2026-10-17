"use client";

import Link from "next/link";
import { OverviewCounts } from "./useOverviewCounts";
import { OVERVIEW_SUMMARY } from "./Overview";

/**
 * Overview statistics as real card surfaces.
 *
 * Cards (not bare text rows) so every part of the page scales visibly together
 * when the browser font size / zoom changes: rem padding, rem typography and
 * rem icon size, no px-locked dimensions.
 */
export function StatList({ counts }: { counts: OverviewCounts }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {OVERVIEW_SUMMARY.map((s) => {
        const count = counts[s.key];
        const display = counts.loading ? "\u2026" : count.value?.toString() ?? "\u2014";
        const sub =
          s.key === "photos"
            ? "Pending moderation"
            : s.key === "events" || s.key === "stories"
            ? "Published"
            : "Total";
        const Icon = s.icon;

        return (
          <Link
            key={s.key}
            href={s.href}
            className="group flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors hover:border-brand-primary/60 hover:bg-surface-elevated"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.title}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold leading-none tracking-tight text-foreground">
                  {display}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
              </div>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-brand-accent">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
